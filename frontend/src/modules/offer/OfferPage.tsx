import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Box, Typography, Paper, Button, Grid, TextField, Snackbar, Alert,
  CircularProgress, Checkbox, FormControlLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Select, MenuItem, FormControl, Stack, Tooltip, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";
import { API_BASE_URL } from '../../api/baseUrl';

interface OfferRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  observations: string;
  pricePerUnit: number;
  totalPrice: number;
}

interface ClientInfo { name: string; address: string; regCom: string; cif: string; }

interface OfferData {
  name: string;
  clientInfo: ClientInfo;
  issueDate: string;
  validUntil: string;
  rows: OfferRow[];
  notes: string;
  includeVat: boolean;
  vatRate: number;
  currency: string;
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#333", display: "flex", flexDirection: "column" },
  
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  logoContainer: { width: "50%" },
  logo: { width: 140, height: 70, objectFit: "contain", marginBottom: 10 },
  headerRight: { width: "50%", alignItems: "flex-end", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "heavy", color: "#003366", letterSpacing: 1 },
  offerNumber: { fontSize: 12, color: "#666", marginTop: 5 },
  
  // Provider & Client Section
  infoSection: { flexDirection: "row", marginBottom: 30, justifyContent: "space-between" },
  
  // Provider (Left)
  providerBox: { width: "45%" },
  providerName: { fontSize: 11, fontWeight: "bold", color: "#003366", marginBottom: 5, textTransform: "uppercase" },
  infoLabel: { fontSize: 8, color: "#888", marginBottom: 1 },
  infoText: { fontSize: 9, color: "#333", marginBottom: 4 },
  
  // Client (Right)
  clientBox: { width: "45%" },
  clientTitle: { fontSize: 11, fontWeight: "bold", color: "#003366", marginBottom: 5, textTransform: "uppercase", borderBottom: "1 solid #eee", paddingBottom: 2 },
  
  // Dates (Within Client Box or Below)
  datesContainer: { marginTop: 15, borderTop: "1 solid #eee", paddingTop: 8 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  
  // Table
  table: { width: "100%", marginTop: 10, borderTop: "2 solid #003366" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f4f6f8", paddingVertical: 8, borderBottom: "1 solid #ddd" },
  tableHeaderCell: { fontSize: 9, fontWeight: "bold", color: "#003366", paddingHorizontal: 4 },
  
  tableRow: { flexDirection: "row", borderBottom: "1 solid #eee", paddingVertical: 6 },
  tableCell: { fontSize: 9, paddingHorizontal: 4, color: "#444" },
  
  // Column Styles
  colNr: { width: "5%", textAlign: "center" },
  colItem: { width: "40%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "10%", textAlign: "center" },
  colObs: { width: "15%" },
  colPrice: { width: "10%", textAlign: "right" },
  colTotal: { width: "10%", textAlign: "right" },

  // Totals
  totalsContainer: { flexDirection: "row", justifyContent: "flex-end", marginTop: 15 },
  totalsBox: { width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { fontSize: 10, color: "#666" },
  totalValue: { fontSize: 10, fontWeight: "bold", color: "#333", textAlign: "right" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTop: "2 solid #003366", marginTop: 5 },
  grandTotalLabel: { fontSize: 12, fontWeight: "bold", color: "#003366" },
  grandTotalValue: { fontSize: 12, fontWeight: "bold", color: "#c00000", textAlign: "right" },

  // Footer & Notes
  notesSection: { marginTop: 30, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 4, marginBottom: 20 },
  noteLabel: { fontSize: 9, fontWeight: "bold", color: "#003366", marginBottom: 3 },
  noteText: { fontSize: 9, color: "#555", lineHeight: 1.4 },
  
  footer: { position: "absolute", bottom: 40, left: 40, right: 40 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signatures: { flexDirection: "row", gap: 50 },
  signatureBlock: { width: 120, borderTop: "1 solid #ccc", paddingTop: 5 },
  signatureText: { fontSize: 8, color: "#999", textAlign: "center" },
  
  pageNumber: { fontSize: 8, color: "#ccc", textAlign: "right", marginTop: 10 },
});

interface OfferPdfProps { data: OfferData; logoBase64?: string; }

const OfferPdfDocument: React.FC<OfferPdfProps> = ({ data, logoBase64 }) => {
  const grandTotal = data.rows.reduce((sum, row) => sum + row.totalPrice, 0);
  const vatAmount = data.includeVat ? grandTotal * (data.vatRate / 100) : 0;
  const totalWithVat = grandTotal + vatAmount;
  const currencySymbol = data.currency === "EUR" ? "€" : "RON";

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.logoContainer}>
             {logoBase64 && <Image style={pdfStyles.logo} src={logoBase64} />}
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.title}>OFERTĂ DE PREȚ</Text>
            <Text style={pdfStyles.offerNumber}>Nr. {data.name?.replace(/[^0-9]/g, "") || "PROIECT"}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={pdfStyles.infoSection}>
          {/* Provider (Left) */}
          <View style={pdfStyles.providerBox}>
            <Text style={pdfStyles.providerName}>S.C TOPAZ CONSTRUCT S.R.L</Text>
            <Text style={pdfStyles.infoText}>Str. 9 MAI, nr. 102, Băicoi, Prahova</Text>
            <Text style={pdfStyles.infoText}>CIF: RO22845111 · Reg. com: J29/3121/2007</Text>
            <Text style={pdfStyles.infoText}>Email: office@topazconstruct.ro</Text>
            <Text style={pdfStyles.infoText}>Tel: +40 724 081 565</Text>
          </View>

          {/* Client (Right) */}
          <View style={pdfStyles.clientBox}>
            <Text style={pdfStyles.clientTitle}>Client / Beneficiar</Text>
            <Text style={[pdfStyles.infoText, { fontSize: 10, fontWeight: "bold" }]}>{data.clientInfo.name || "Nespecificat"}</Text>
            <Text style={pdfStyles.infoText}>{data.clientInfo.address}</Text>
            {data.clientInfo.cif && <Text style={pdfStyles.infoText}>CIF: {data.clientInfo.cif}</Text>}
            {data.clientInfo.regCom && <Text style={pdfStyles.infoText}>Reg. Com: {data.clientInfo.regCom}</Text>}
              
            {/* Dates */}
            <View style={pdfStyles.datesContainer}>
              <View style={pdfStyles.dateRow}>
                <Text style={pdfStyles.infoLabel}>Data emiterii:</Text>
                <Text style={pdfStyles.infoText}>{data.issueDate}</Text>
              </View>
              <View style={pdfStyles.dateRow}>
                <Text style={pdfStyles.infoLabel}>Valabilă până la:</Text>
                <Text style={pdfStyles.infoText}>{data.validUntil}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.colNr, pdfStyles.tableHeaderCell]}>Nr.</Text>
            <Text style={[pdfStyles.colItem, pdfStyles.tableHeaderCell]}>Material / Manoperă</Text>
            <Text style={[pdfStyles.colQty, pdfStyles.tableHeaderCell]}>Cant.</Text>
            <Text style={[pdfStyles.colUnit, pdfStyles.tableHeaderCell]}>U.M.</Text>
            <Text style={[pdfStyles.colObs, pdfStyles.tableHeaderCell]}>Obs.</Text>
            <Text style={[pdfStyles.colPrice, pdfStyles.tableHeaderCell]}>Preț Unit.</Text>
            <Text style={[pdfStyles.colTotal, pdfStyles.tableHeaderCell]}>Total</Text>
          </View>
          
          {data.rows.map((row, index) => (
             <View key={index} style={[pdfStyles.tableRow, index % 2 === 1 ? { backgroundColor: "#f9f9f9" } : {}]}>
                <Text style={[pdfStyles.colNr, pdfStyles.tableCell]}>{index + 1}</Text>
                <Text style={[pdfStyles.colItem, pdfStyles.tableCell]}>{row.description}</Text>
                <Text style={[pdfStyles.colQty, pdfStyles.tableCell]}>{row.quantity}</Text>
                <Text style={[pdfStyles.colUnit, pdfStyles.tableCell]}>{row.unit}</Text>
                <Text style={[pdfStyles.colObs, pdfStyles.tableCell, { fontSize: 8, color: "#666" }]}>{row.observations}</Text>
                <Text style={[pdfStyles.colPrice, pdfStyles.tableCell]}>{row.pricePerUnit.toFixed(2)}</Text>
                <Text style={[pdfStyles.colTotal, { ...pdfStyles.tableCell, fontWeight: "bold" }]}>{row.totalPrice.toFixed(2)}</Text>
             </View>
          ))}
        </View>

        {/* Totals */}
        <View style={pdfStyles.totalsContainer}>
          <View style={pdfStyles.totalsBox}>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Subtotal:</Text>
              <Text style={pdfStyles.totalValue}>{grandTotal.toFixed(2)} {currencySymbol}</Text>
            </View>
            {data.includeVat && (
              <View style={pdfStyles.totalRow}>
                <Text style={pdfStyles.totalLabel}>TVA ({data.vatRate}%):</Text>
                <Text style={pdfStyles.totalValue}>{vatAmount.toFixed(2)} {currencySymbol}</Text>
              </View>
            )}
            <View style={pdfStyles.grandTotalRow}>
              <Text style={pdfStyles.grandTotalLabel}>TOTAL:</Text>
              <Text style={pdfStyles.grandTotalValue}>{(data.includeVat ? totalWithVat : grandTotal).toFixed(2)} {currencySymbol}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={pdfStyles.notesSection}>
            <Text style={pdfStyles.noteLabel}>Note:</Text>
            <Text style={pdfStyles.noteText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
           {/* Standard terms */}
           <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 8, color: "#777", marginBottom: 2 }}>1. Oferta este valabilă numai cu semnătura și ștampila ofertantului.</Text>
              <Text style={{ fontSize: 8, color: "#777", marginBottom: 2 }}>2. Prețurile sunt în {data.currency === "EUR" ? "EURO. Facturarea se face în lei la cursul B.N.R. din ziua facturării." : "RON."}</Text>
              <Text style={{ fontSize: 8, color: "#777" }}>3. Termenul de livrare/execuție se stabilește la confirmarea comenzii.</Text>
           </View>

           <View style={pdfStyles.footerRow}>
              <View style={pdfStyles.signatures}>
                <View style={pdfStyles.signatureBlock}>
                  <Text style={pdfStyles.signatureText}>Furnizor</Text>
                </View>
                <View style={pdfStyles.signatureBlock}>
                  <Text style={pdfStyles.signatureText}>Beneficiar</Text>
                </View>
              </View>
              <Text style={{ fontSize: 8, color: "#ccc" }}>Generat automat de TopazSoft</Text>
           </View>
           <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  );
};

const unitOptions = ["buc", "mp", "ml", "kg", "l", "set", "ora", "zi"];
const currencyOptions = ["EUR", "RON"] as const;
type CurrencyType = typeof currencyOptions[number];

const STORAGE_KEY = "offer_draft";
const API_BASE = API_BASE_URL;

const OfferPage: React.FC = () => {
  const [rows, setRows] = useState<OfferRow[]>([{ id: "1", description: "", quantity: 1, unit: "buc", observations: "", pricePerUnit: 0, totalPrice: 0 }]);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ name: "", address: "", regCom: "", cif: "" });
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [includeVat, setIncludeVat] = useState(false);
  const [vatRate, setVatRate] = useState(19);
  const [currency, setCurrency] = useState<CurrencyType>("EUR");
  const [currentOfferId, setCurrentOfferId] = useState<string | null>(null);
  const [savedOffers, setSavedOffers] = useState<Array<{ id: string; name: string; clientName: string; createdAt: string; grandTotal: number }>>([]);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ open: false, message: "", severity: "info" });
  const [isExporting, setIsExporting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | undefined>();
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.rows?.length) setRows(draft.rows);
        if (draft.clientInfo) setClientInfo(draft.clientInfo);
        if (draft.issueDate) setIssueDate(draft.issueDate);
        if (draft.validUntil) setValidUntil(draft.validUntil);
        if (draft.notes) setNotes(draft.notes);
        if (typeof draft.includeVat === "boolean") setIncludeVat(draft.includeVat);
        if (draft.vatRate) setVatRate(draft.vatRate);
        if (draft.currency) setCurrency(draft.currency);
      }
    } catch (e) {
      console.log("Failed to load draft:", e);
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = { rows, clientInfo, issueDate, validUntil, notes, includeVat, vatRate, currency };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [rows, clientInfo, issueDate, validUntil, notes, includeVat, vatRate, currency]);

  useEffect(() => {
    fetch("/LogoTopaz-full.png").then(res => res.ok ? res.blob() : Promise.reject()).then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(blob);
    }).catch(() => console.log("Logo not found"));
  }, []);

  const grandTotal = useMemo(() => rows.reduce((sum, row) => sum + row.totalPrice, 0), [rows]);
  const vatAmount = useMemo(() => includeVat ? grandTotal * (vatRate / 100) : 0, [grandTotal, includeVat, vatRate]);
  const totalWithVat = useMemo(() => grandTotal + vatAmount, [grandTotal, vatAmount]);

  const getOfferData = useCallback((): OfferData => ({
    name: `Oferta_${clientInfo.name || "Client"}_${issueDate}`,
    clientInfo, issueDate, validUntil,
    rows: rows.filter(r => r.description.trim() !== ""),
    notes, includeVat, vatRate, currency,
  }), [clientInfo, issueDate, validUntil, rows, notes, includeVat, vatRate, currency]);

  const updateRow = (id: string, field: keyof OfferRow, value: string | number) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      if (field === "quantity" || field === "pricePerUnit") {
        updated.totalPrice = updated.quantity * updated.pricePerUnit;
      }
      return updated;
    }));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, { id: String(Date.now()), description: "", quantity: 1, unit: "buc", observations: "", pricePerUnit: 0, totalPrice: 0 }]);
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleDuplicateRow = (row: OfferRow) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === row.id);
      const newRow = { ...row, id: String(Date.now()) };
      const updated = [...prev];
      updated.splice(idx + 1, 0, newRow);
      return updated;
    });
  };

  const handleClearDraft = () => {
    if (!confirm("Ștergi datele salvate? Această acțiune nu poate fi anulată.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setRows([{ id: "1", description: "", quantity: 1, unit: "buc", observations: "", pricePerUnit: 0, totalPrice: 0 }]);
    setClientInfo({ name: "", address: "", regCom: "", cif: "" });
    setIssueDate(new Date().toISOString().split("T")[0]);
    setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setNotes("");
    setIncludeVat(false);
    setVatRate(19);
    setSnackbar({ open: true, message: "Ofertă golită!", severity: "info" });
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedRowId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedRowId || draggedRowId === targetId) return;
    
    setRows(prev => {
      const draggedIdx = prev.findIndex(r => r.id === draggedRowId);
      const targetIdx = prev.findIndex(r => r.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const newRows = [...prev];
      const [removed] = newRows.splice(draggedIdx, 1);
      newRows.splice(targetIdx, 0, removed);
      return newRows;
    });
    setDraggedRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
  };

  const handleSaveToDatabase = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: `Oferta_${clientInfo.name || "Client"}_${issueDate}`,
        clientName: clientInfo.name,
        clientAddress: clientInfo.address,
        clientRegCom: clientInfo.regCom,
        clientCif: clientInfo.cif,
        issueDate,
        validUntil,
        notes,
        includeVat,
        vatRate,
        currency,
        items: rows.filter(r => r.description.trim()).map(r => ({
          description: r.description,
          quantity: r.quantity,
          unit: r.unit,
          observations: r.observations,
          pricePerUnit: r.pricePerUnit,
          totalPrice: r.totalPrice,
        })),
      };

      const url = currentOfferId ? `${API_BASE}/offers/${currentOfferId}` : `${API_BASE}/offers`;
      const method = currentOfferId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Eroare la salvare");
      const saved = await res.json();
      setCurrentOfferId(saved.id);
      setSnackbar({ open: true, message: "Oferta a fost salvată!", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Eroare la salvarea ofertei", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  }, [clientInfo, issueDate, validUntil, notes, includeVat, vatRate, currency, rows, currentOfferId]);

  const handleLoadOffers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/offers?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSavedOffers(data.offers.map((o: any) => ({
        id: o.id,
        name: o.name,
        clientName: o.clientName,
        createdAt: o.createdAt,
        grandTotal: o.grandTotal,
      })));
      setShowLoadDialog(true);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Nu am putut încărca ofertele", severity: "error" });
    }
  }, []);

  const handleLoadOffer = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/offers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const offer = await res.json();
      
      setCurrentOfferId(offer.id);
      setClientInfo({
        name: offer.clientName || "",
        address: offer.clientAddress || "",
        regCom: offer.clientRegCom || "",
        cif: offer.clientCif || "",
      });
      setIssueDate(offer.issueDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
      setValidUntil(offer.validUntil?.split("T")[0] || "");
      setNotes(offer.notes || "");
      setIncludeVat(offer.includeVat || false);
      setVatRate(offer.vatRate || 19);
      setCurrency(offer.currency || "EUR");
      setRows(offer.items?.map((item: any, idx: number) => ({
        id: String(idx + 1),
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        observations: item.observations || "",
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.totalPrice,
      })) || []);
      
      setShowLoadDialog(false);
      setSnackbar({ open: true, message: "Oferta a fost încărcată!", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Eroare la încărcarea ofertei", severity: "error" });
    }
  }, []);

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Topaz Construct";

      const templateResponse = await fetch("/offer-template.xlsx");
      if (!templateResponse.ok) {
        throw new Error("Nu am putut încărca template-ul Excel");
      }

      const templateBuffer = await templateResponse.arrayBuffer();
      await workbook.xlsx.load(templateBuffer);

      const worksheet = workbook.getWorksheet("Oferta") ?? workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("Nu am găsit foaia de lucru în template");
      }

      const removeTemplateTables = () => {
        const sheetWithTables = worksheet as ExcelJS.Worksheet & {
          getTables?: () => { name: string }[];
          removeTable?: (name: string) => void;
        };
        if (typeof sheetWithTables.getTables === "function" && typeof sheetWithTables.removeTable === "function") {
          const tables = sheetWithTables.getTables() as unknown as Array<{ name: string }>;
          tables.forEach(table => {
            sheetWithTables.removeTable?.(table.name);
          });
        }
      };

      // Prevent Excel recovery warnings by removing structured tables from the template
      removeTemplateTables();

      // Clear conditional formatting which might interfere with our zebra styling
      if ("conditionalFormattings" in worksheet) {
         (worksheet as any).conditionalFormattings = [];
      }

      const normalizeCellValue = (value: ExcelJS.CellValue) => {
        if (value === null || value === undefined) return "";
        if (typeof value === "object" && "text" in value) return String(value.text ?? "");
        return String(value);
      };

      const findCellByText = (needle: string, minCol = 1): { row: number; col: number } | null => {
        const target = needle.trim().toLowerCase();
        let found: { row: number; col: number } | null = null;
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            // Only search in columns >= minCol
            if (colNumber < minCol) return;
            const cellText = normalizeCellValue(cell.value).trim().toLowerCase();
            if (!found && cellText.includes(target)) {
              found = { row: rowNumber, col: colNumber };
            }
          });
        });
        return found;
      };

      // Find where CLIENT section starts (right side of page, typically column D or later)
      const clientSectionStart = findCellByText("client", 4); // Start from column D
      const clientMinCol = clientSectionStart ? clientSectionStart.col : 4;

      const setValueRightOfLabel = (label: string, value: string, minCol = 1) => {
        const cellPosition = findCellByText(label, minCol);
        if (!cellPosition) return;
        const targetCell = worksheet.getCell(cellPosition.row, cellPosition.col + 1);
        const writableCell = targetCell.isMerged ? targetCell.master : targetCell;
        writableCell.value = value;
      };

      const appendValueToLabel = (label: string, value: string, minCol = 1) => {
        const cellPosition = findCellByText(label, minCol);
        if (!cellPosition) return;
        const labelCell = worksheet.getCell(cellPosition.row, cellPosition.col);
        const writableCell = labelCell.isMerged ? labelCell.master : labelCell;
        const currentValue = normalizeCellValue(writableCell.value);
        // Keep label text and append the value
        if (currentValue.toLowerCase().includes(label.toLowerCase())) {
          writableCell.value = `${currentValue.split(":")[0]}: ${value}`;
        } else {
          writableCell.value = `${label}: ${value}`;
        }
      };

      // Client info fields - search only in CLIENT section (right side, column D+)
      setValueRightOfLabel("client", clientInfo.name, clientMinCol);
      setValueRightOfLabel("adresa", clientInfo.address, clientMinCol);
      setValueRightOfLabel("reg. com", clientInfo.regCom, clientMinCol);
      setValueRightOfLabel("cif", clientInfo.cif, clientMinCol);
      
      // Date fields - append value to label cell (keeps "Data emiterii:" visible)
      appendValueToLabel("data emiterii", issueDate, clientMinCol);
      appendValueToLabel("valabil", validUntil, clientMinCol);

      // Identify table header and total row in template (scan all cells)
      // Header row must contain BOTH "MATERIAL" AND "CANTITATE" to be the actual table header
      let headerRow = 0;
      let totalRow = 0;
      worksheet.eachRow((row, rowNumber) => {
        let rowText = "";
        row.eachCell(cell => {
          rowText += ` ${normalizeCellValue(cell.value).toUpperCase()}`;
        });
        // Header must have both MATERIAL and CANTITATE to be the real table header (not section title)
        if (!headerRow && rowText.includes("MATERIAL") && rowText.includes("CANTITATE")) {
          headerRow = rowNumber;
        }
        // Total row comes after header
        if (headerRow && !totalRow && rowNumber > headerRow && rowText.includes("TOTAL")) {
          totalRow = rowNumber;
        }
      });

      // Clear ALL cells in data rows (between header and total) to remove broken #REF! formulas
      if (headerRow && totalRow) {
        for (let r = headerRow + 1; r < totalRow; r++) {
          const row = worksheet.getRow(r);
          for (let c = 1; c <= 7; c++) {
            const cell = row.getCell(c);
            if (!cell.isMerged || cell.address === cell.master?.address) {
              cell.value = null;
            }
          }
        }
      }

      if (!headerRow) {
        headerRow = 15;
      }
      if (!totalRow) {
        totalRow = headerRow + 10;
      }

      const dataStartRow = headerRow + 1;
      const filteredRows = rows.filter(r => r.description.trim() !== "");
      const templateRowCount = Math.max(totalRow - dataStartRow, 0);
      
      // If we have more rows than template space, insert additional rows before totalRow
      const extraRowsNeeded = filteredRows.length - templateRowCount;
      if (extraRowsNeeded > 0) {
        // Get the style from the first data row to copy to new rows
        const templateDataRow = worksheet.getRow(dataStartRow);
        
        for (let i = 0; i < extraRowsNeeded; i++) {
          // Insert row and copy style from template row
          const newRowNum = totalRow;
          worksheet.insertRow(newRowNum, []);
          const newRow = worksheet.getRow(newRowNum);
          
          // Copy cell styles from template row
          templateDataRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            if (templateCell.style) {
              newCell.style = { ...templateCell.style };
            }
          });
          
          // Copy row height
          newRow.height = templateDataRow.height;
        }
        // Update totalRow position since we inserted rows above it
        totalRow = totalRow + extraRowsNeeded;
      }
      
      // Now we have enough rows for all data
      const availableRowCount = filteredRows.length;

      const getHeaderColumn = (match: (text: string) => boolean) => {
        const header = worksheet.getRow(headerRow);
        let colFound: number | null = null;
        header.eachCell((cell, colNumber) => {
          const cellText = normalizeCellValue(cell.value).trim().toLowerCase();
          if (!colFound && match(cellText)) {
            if (cell.isMerged && cell.master?.address) {
              const masterCol = worksheet.getCell(cell.master.address).col;
              colFound = typeof masterCol === "number" ? masterCol : colNumber;
            } else {
              colFound = colNumber;
            }
          }
        });
        return colFound;
      };

      // Template columns: A=Material, B=?, C=Cantitate, D=U.M., E=Observatii, F=Pret-Euro/U.M., G=Pret Euro
      const colDescription = getHeaderColumn(text => text.includes("material") || text.includes("manoper")) ?? 1;  // A
      const colQuantity = getHeaderColumn(text => text.includes("cant")) ?? 3;  // C
      const colUnit = getHeaderColumn(text => text.includes("u.m") && !text.includes("pret")) ?? 4;  // D
      const colObs = getHeaderColumn(text => text.includes("observ")) ?? 5;  // E
      // Unit price: column F - must contain both "pret" AND "/u" (not just one)
      const colUnitPrice = getHeaderColumn(text => text.includes("/u") && text.includes("pret")) ?? 6;  // F
      // Total: column G - "pret euro" but NOT containing "/u"
      const colTotal = getHeaderColumn(text => text.includes("pret") && text.includes("euro") && !text.includes("/u")) ?? 7;  // G
      
      // Debug: log detected columns
      console.log("Detected columns:", { colDescription, colQuantity, colUnit, colObs, colUnitPrice, colTotal });

      const rowsToWrite = filteredRows.slice(0, availableRowCount);

      const dataCols = [colDescription, colQuantity, colUnit, colObs, colUnitPrice, colTotal];
      const firstDataCol = Math.min(...dataCols); // Start from first actual data column
      const lastDataCol = Math.max(...dataCols);  // End at last actual data column
      const thinBorder: ExcelJS.Border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };

      // Apply zebra fill + grid borders for all data rows (even empty ones)
      for (let r = dataStartRow; r < totalRow; r++) {
        const row = worksheet.getRow(r);
        const rowIndex = r - dataStartRow;
        const isGrayRow = rowIndex % 2 === 1; // 0=White, 1=Gray, 2=White...
        
        // Define the zebra fill color
        const zebraFill: ExcelJS.Fill = {
          type: "pattern",
          pattern: "solid", 
          fgColor: { argb: isGrayRow ? "FFE0E0E0" : "FFFFFFFF" }
        };
        
        // Iterate through all columns in the table range to ensure no gaps
        for (let col = firstDataCol; col <= lastDataCol; col++) {
          const cell = row.getCell(col);
          const writableCell = cell.isMerged ? cell.master : cell;
          
          // Clear any existing fill from template/style copy, then apply zebra
          // We intentionally create a new style object to break any shared style references
          writableCell.style = {
            ...writableCell.style,
            fill: zebraFill
          };

          // Preserve existing internal borders (e.g. dotted lines) from template
          const existingBorder = writableCell.border || {};
          
          // Helper to treat 'undefined' border as truly absent, but keep objects if they exist
          const safeBorder = (side: ExcelJS.BorderLine | undefined) => side ? side : undefined;

          writableCell.border = {
            ...existingBorder,
            top: thinBorder.top,
            bottom: thinBorder.bottom,
            // Only force outer borders, preserve inner
            left: col === firstDataCol ? thinBorder.left : safeBorder(existingBorder.left),
            right: col === lastDataCol ? thinBorder.right : safeBorder(existingBorder.right),
          };
        }
      }

      // Get column letters for formula
      const getColLetter = (colNum: number) => {
        let letter = "";
        let temp = colNum;
        while (temp > 0) {
          const mod = (temp - 1) % 26;
          letter = String.fromCharCode(65 + mod) + letter;
          temp = Math.floor((temp - mod) / 26);
        }
        return letter;
      };

      const qtyColLetter = getColLetter(colQuantity);
      const unitPriceColLetter = getColLetter(colUnitPrice);

      rowsToWrite.forEach((rowData, index) => {
        const rowNum = dataStartRow + index;
        const row = worksheet.getRow(rowNum);
        const setCellValue = (col: number, value: ExcelJS.CellValue, numFmt?: string) => {
          const cell = row.getCell(col);
          const writableCell = cell.isMerged ? cell.master : cell;
          writableCell.value = value;
          if (numFmt) {
            writableCell.numFmt = numFmt;
          }
          return writableCell;
        };

        setCellValue(colDescription, rowData.description);
        setCellValue(colQuantity, rowData.quantity);
        setCellValue(colUnit, rowData.unit);
        setCellValue(colObs, rowData.observations);
        setCellValue(colUnitPrice, rowData.pricePerUnit, "#,##0.00");
        
        // Write formula: PRET EURO = CANTITATE * PRET-EURO/U.M.
        const totalCell = row.getCell(colTotal);
        const writableTotalCell = totalCell.isMerged ? totalCell.master : totalCell;
        writableTotalCell.value = {
          formula: `${qtyColLetter}${rowNum}*${unitPriceColLetter}${rowNum}`,
          result: rowData.totalPrice,
        };
        writableTotalCell.numFmt = "#,##0.00 €";
      });

      // Update total row with SUM formula
      const totalColLetter = getColLetter(colTotal);
      const totalCell = worksheet.getRow(totalRow).getCell(colTotal);
      const writableTotalCell = totalCell.isMerged ? totalCell.master : totalCell;
      
      if (rowsToWrite.length > 0) {
        const firstDataRow = dataStartRow;
        const lastDataRow = dataStartRow + rowsToWrite.length - 1;
        // SUM formula for all PRET EURO values
        writableTotalCell.value = {
          formula: `SUM(${totalColLetter}${firstDataRow}:${totalColLetter}${lastDataRow})${includeVat ? `*(1+${vatRate}/100)` : ""}`,
          result: includeVat ? totalWithVat : grandTotal,
        };
      } else {
        writableTotalCell.value = 0;
      }
      writableTotalCell.numFmt = "#,##0.00 €";

      setSnackbar({ open: true, message: "Excel exportat cu succes!", severity: "success" });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Oferta_${clientInfo.name || "Client"}_${issueDate}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      setSnackbar({ open: true, message: "Eroare la exportul Excel", severity: "error" });
    } finally {
      setIsExporting(false);
    }
  }, [rows, clientInfo, issueDate, validUntil, includeVat, vatRate, grandTotal, totalWithVat]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const pdfBlob = await pdf(<OfferPdfDocument data={getOfferData()} logoBase64={logoBase64} />).toBlob();
      saveAs(pdfBlob, `Oferta_${clientInfo.name || "Client"}_${issueDate}.pdf`);
      setSnackbar({ open: true, message: "PDF exportat cu succes!", severity: "success" });
    } catch (error) {
      console.error("PDF export error:", error);
      setSnackbar({ open: true, message: "Eroare la exportul PDF", severity: "error" });
    } finally {
      setIsExporting(false);
    }
  }, [getOfferData, logoBase64, clientInfo.name, issueDate]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #f5f9ff 0%, #ffffff 60%)",
          border: "1px solid #e6eef9",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: "#003366", fontWeight: "bold" }}>
              Generator Oferte
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creați oferte profesionale cu export Excel și PDF.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
              <Chip label={`${rows.length} rânduri`} variant="outlined" size="small" />
              <Chip label={`Subtotal ${grandTotal.toFixed(2)} €`} size="small" />
              {includeVat && (
                <Chip label={`TVA ${vatAmount.toFixed(2)} €`} color="warning" size="small" />
              )}
              <Chip label={`Total ${(includeVat ? totalWithVat : grandTotal).toFixed(2)} €`} color="primary" size="small" />
            </Stack>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
            <Button
              variant="contained"
              startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <TableChartIcon />}
              onClick={handleExportExcel}
              disabled={isExporting}
              sx={{
                backgroundColor: "#217346",
                minWidth: 180,
                "&:hover": { backgroundColor: "#1a5c38" },
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleExportPdf}
              disabled={isExporting}
              sx={{
                backgroundColor: "#c00000",
                minWidth: 180,
                "&:hover": { backgroundColor: "#a00000" },
              }}
            >
              Export PDF
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" gutterBottom sx={{ color: "#003366", fontWeight: 600 }}>
          Informații Client
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Completează datele clientului și perioada de valabilitate a ofertei.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Nume Client / Companie" value={clientInfo.name} onChange={e => setClientInfo(prev => ({ ...prev, name: e.target.value }))} size="small" /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Adresă" value={clientInfo.address} onChange={e => setClientInfo(prev => ({ ...prev, address: e.target.value }))} size="small" /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Reg. Com." value={clientInfo.regCom} onChange={e => setClientInfo(prev => ({ ...prev, regCom: e.target.value }))} size="small" /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="CIF" value={clientInfo.cif} onChange={e => setClientInfo(prev => ({ ...prev, cif: e.target.value }))} size="small" /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Data Emiterii" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Valabilă Până La" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} size="small" InputLabelProps={{ shrink: true }} /></Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #eef2f7" }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ color: "#003366", fontWeight: 600 }}>Articole Ofertă</Typography>
            <Typography variant="caption" color="text.secondary">Actualizează materialele și manopera pentru ofertă.</Typography>
          </Box>
          <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddRow} size="small" sx={{ alignSelf: { sm: "center" } }}>Adaugă Rând</Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer sx={{ border: "1px solid #e8eef6", borderRadius: 2, overflow: "hidden" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#003366" }}>
                <TableCell sx={{ color: "#fff", width: 30 }} align="center"></TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600 }}>Material / Manoperă</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600, width: 100 }} align="center">Cantitate</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600, width: 80 }} align="center">U.M.</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600, width: 170 }}>Observații</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600, width: 140 }} align="right">{`Preț/U.M. (${currency === "EUR" ? "€" : "RON"})`}</TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: 600, width: 140 }} align="right">{`Preț Total (${currency === "EUR" ? "€" : "RON"})`}</TableCell>
                <TableCell sx={{ color: "#fff", width: 80 }} align="center"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  draggable
                  onDragStart={e => handleDragStart(e, row.id)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, row.id)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    backgroundColor: idx % 2 === 1 ? "#f5f5f5" : "inherit",
                    opacity: draggedRowId === row.id ? 0.5 : 1,
                    cursor: "grab",
                    "&:active": { cursor: "grabbing" },
                  }}
                >
                  <TableCell sx={{ cursor: "grab" }}>
                    <DragIndicatorIcon fontSize="small" sx={{ color: "#999" }} />
                  </TableCell>
                  <TableCell><TextField fullWidth size="small" value={row.description} onChange={e => updateRow(row.id, "description", e.target.value)} placeholder="Descriere..." /></TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.quantity}
                      onChange={e => updateRow(row.id, "quantity", parseFloat(e.target.value) || 0)}
                      sx={{ width: 80 }}
                      inputProps={{ style: { textAlign: "right" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 70 }}>
                      <Select value={row.unit} onChange={e => updateRow(row.id, "unit", e.target.value)}>
                        {unitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell><TextField fullWidth size="small" value={row.observations} onChange={e => updateRow(row.id, "observations", e.target.value)} placeholder="Obs..." /></TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.pricePerUnit}
                      onChange={e => updateRow(row.id, "pricePerUnit", parseFloat(e.target.value) || 0)}
                      sx={{ width: 110 }}
                      inputProps={{ step: 0.01, style: { textAlign: "right" } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>{row.totalPrice.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Duplică rând">
                      <IconButton size="small" onClick={() => handleDuplicateRow(row)} color="primary">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Șterge rând">
                      <IconButton size="small" onClick={() => handleDeleteRow(row.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, p: 2, backgroundColor: "#f7f9fc", borderRadius: 2, border: "1px solid #e9eef6", display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { md: "center" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <ToggleButtonGroup
              value={currency}
              exclusive
              onChange={(_, val) => val && setCurrency(val)}
              size="small"
            >
              <ToggleButton value="EUR" sx={{ fontWeight: 600 }}>€ EUR</ToggleButton>
              <ToggleButton value="RON" sx={{ fontWeight: 600 }}>RON</ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel control={<Checkbox checked={includeVat} onChange={e => setIncludeVat(e.target.checked)} />} label="Include TVA" />
            {includeVat && <TextField label="TVA %" type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} size="small" sx={{ width: 80 }} />}
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">Subtotal: {grandTotal.toFixed(2)} {currency === "EUR" ? "€" : "RON"}</Typography>
            {includeVat && <Typography variant="body2" color="text.secondary">TVA ({vatRate}%): {vatAmount.toFixed(2)} {currency === "EUR" ? "€" : "RON"}</Typography>}
            <Typography variant="h5" sx={{ color: "#c00000", fontWeight: "bold", mt: 1 }}>TOTAL: {(includeVat ? totalWithVat : grandTotal).toFixed(2)} {currency === "EUR" ? "€" : "RON"}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" gutterBottom sx={{ color: "#003366", fontWeight: 600 }}>Note Adiționale</Typography>
        <TextField fullWidth label="Note" multiline rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observații suplimentare care vor apărea în ofertă..." />
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7" }}>
        <Typography variant="h6" gutterBottom sx={{ color: "#003366", fontWeight: 600 }}>Export</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Salvează, încarcă sau exportă oferta.</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            sx={{ backgroundColor: "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
          >
            {currentOfferId ? "Actualizează" : "Salvează"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={handleLoadOffers}
          >
            Încarcă Ofertă
          </Button>
          <Button
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <TableChartIcon />}
            onClick={handleExportExcel}
            disabled={isExporting}
            sx={{ backgroundColor: "#217346", "&:hover": { backgroundColor: "#1a5c38" } }}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={isExporting}
            sx={{ backgroundColor: "#c00000", "&:hover": { backgroundColor: "#a00000" } }}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={handleClearDraft}
            color="warning"
          >
            Golește
          </Button>
        </Stack>
        {currentOfferId && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Oferta salvată · ID: {currentOfferId.slice(0, 8)}...
          </Typography>
        )}
      </Paper>

      {/* Load Offers Dialog */}
      <Dialog open={showLoadDialog} onClose={() => setShowLoadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Încarcă Ofertă Salvată</DialogTitle>
        <DialogContent dividers>
          {savedOffers.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>Nu există oferte salvate.</Typography>
          ) : (
            <List>
              {savedOffers.map(offer => (
                <ListItem key={offer.id} disablePadding>
                  <ListItemButton onClick={() => handleLoadOffer(offer.id)}>
                    <ListItemText
                      primary={offer.name || offer.clientName || "Ofertă fără nume"}
                      secondary={`${new Date(offer.createdAt).toLocaleDateString("ro-RO")} · ${offer.grandTotal.toFixed(2)} ${currency}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoadDialog(false)}>Închide</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default OfferPage;
