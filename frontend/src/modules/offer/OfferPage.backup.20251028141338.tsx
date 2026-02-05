// src/modules/offer/OfferPage.tsx
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  TextField,
  IconButton,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
  Image,
} from "@react-pdf/renderer";
import * as XLSX from "xlsx";

const OFFER_TEMPLATE_URL = "/offer-template.xlsx";
const COMPANY_LOGO_URL = "/LogoTopaz-full.png";

type OfferItem = { name: string; qty: number; price: number };

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: { marginBottom: 16 },
  logo: { width: 260, alignSelf: "flex-start", marginBottom: 8 },
  companyInfo: { marginBottom: 12 },
  companyName: { fontSize: 13, fontWeight: "bold", marginBottom: 4 },
  companyLine: { fontSize: 11, color: "#4b5563", marginBottom: 2 },
  contactLine: { fontSize: 11, color: "#4b5563", marginTop: 6 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 11, color: "#4b5563", marginBottom: 16, textAlign: "center" },
  tableOuter: { marginTop: 12, borderTopWidth: 2, borderBottomWidth: 2, borderColor: "#008DD2", borderStyle: "solid" },
  table: {},
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", borderBottomStyle: "solid", paddingVertical: 6 },
  headerRow: { backgroundColor: "#f3f4f6", borderBottomColor: "#d1d5db", fontWeight: "bold" },
  cellName: { flex: 2 },
  cellQty: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1, textAlign: "right" },
  cellTotal: { flex: 1, textAlign: "right" },
  summary: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 16 },
  summaryLabel: { fontSize: 12, fontWeight: "bold", marginRight: 12 },
  summaryValue: { fontSize: 12, fontWeight: "bold" },
  emptyState: { marginTop: 16, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed", textAlign: "center", color: "#6b7280" },
  signature: { marginTop: 14, fontSize: 11, fontWeight: "bold" },
  signatureContact: { fontSize: 11, color: "#374151", marginTop: 2 },
  footerNote: { marginTop: 20, fontSize: 11, color: "#374151" },
});

type OfferDocumentProps = {
  items: Array<OfferItem & { lineTotal: number }>;
  total: number;
  formatCurrency: (value: number) => string;
};

const OfferDocument: React.FC<OfferDocumentProps> = ({ items, total, formatCurrency }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <Image src={COMPANY_LOGO_URL} style={pdfStyles.logo} />
      </View>

      <Text style={pdfStyles.title}>Ofertă Preț</Text>

      <View style={pdfStyles.companyInfo}>
        <Text style={pdfStyles.companyName}>S.C TOPAZ CONSTRUCT S.R.L</Text>
        <Text style={pdfStyles.companyLine}>Str. 9 MAI, nr. 102, Băicoi – Prahova</Text>
        <Text style={pdfStyles.companyLine}>Reg. com.:  J29/3121/2007</Text>
        <Text style={pdfStyles.companyLine}>CIF: RO22845111</Text>
        <Text style={pdfStyles.companyLine}>mail: office@topazconstruct.ro</Text>
        <Text style={pdfStyles.contactLine}>Răzvan Cojocaru, Manager General</Text>
        <Text style={pdfStyles.companyLine}>+40 724 081 565</Text>
      </View>

      <Text style={pdfStyles.subtitle}>Detalii produse și valori estimate pentru client.</Text>

      <View style={pdfStyles.tableOuter}>
        <View style={pdfStyles.table}>
          <View style={[pdfStyles.row, pdfStyles.headerRow]}>
            <Text style={pdfStyles.cellName}>Produs</Text>
            <Text style={pdfStyles.cellQty}>Cantitate</Text>
            <Text style={pdfStyles.cellPrice}>Preț unitar</Text>
            <Text style={pdfStyles.cellTotal}>Total</Text>
          </View>
          {items.length === 0 ? (
            <Text style={pdfStyles.emptyState}>Nu există produse în oferta curentă.</Text>
          ) : (
            items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={pdfStyles.row}>
                <Text style={pdfStyles.cellName}>{item.name || "Produs fără nume"}</Text>
                <Text style={pdfStyles.cellQty}>{item.qty.toLocaleString("ro-RO")}</Text>
                <Text style={pdfStyles.cellPrice}>{formatCurrency(item.price)}</Text>
                <Text style={pdfStyles.cellTotal}>{formatCurrency(item.lineTotal)}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={pdfStyles.summary}>
        <Text style={pdfStyles.summaryLabel}>Total general:</Text>
        <Text style={pdfStyles.summaryValue}>{formatCurrency(total)}</Text>
      </View>

      <Text style={pdfStyles.signature}>Răzvan Cojocaru, Manager General</Text>
      <Text style={pdfStyles.signatureContact}>+40 724 081 565</Text>
      <Text style={pdfStyles.footerNote}>
        Sperăm să vă punem la dispoziție o ofertă avantajoasă și rămânem la dispoziția Dvs.
      </Text>
    </Page>
  </Document>
);

const OfferPage: React.FC = () => {
  const [items, setItems] = useState<OfferItem[]>([{ name: "", qty: 1, price: 0 }]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }),
    [],
  );

  const itemsWithTotals = useMemo(
    () => items.map(i => ({ ...i, lineTotal: Number(i.qty) * Number(i.price) || 0 })),
    [items],
  );
  const grandTotal = useMemo(
    () => itemsWithTotals.reduce((s, i) => s + i.lineTotal, 0),
    [itemsWithTotals],
  );

  const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

  const handleItemChange = (idx: number, field: keyof OfferItem, value: string) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: field === "qty" || field === "price" ? (Number(value) || 0) : value } : it)));
  };
  const handleAddItem = () => setItems(prev => [...prev, { name: "", qty: 1, price: 0 }]);
  const handleRemoveItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  async function exportOfferToExcel() {
    const response = await fetch(OFFER_TEMPLATE_URL);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    itemsWithTotals.forEach((item, i) => {
      const row = 5 + i;
      ws[`A${row}`] = { t: "s", v: item.name };
      ws[`B${row}`] = { t: "n", v: item.qty };
      ws[`C${row}`] = { t: "n", v: item.price };
      ws[`D${row}`] = { t: "n", v: item.lineTotal };
    });
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oferta-export.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Box component="img" src={COMPANY_LOGO_URL} alt="Topaz Construct" sx={{ display: "block", width: { xs: 200, sm: 260 }, height: "auto" }} />
        <Typography variant="h4" fontWeight={700} align="center" gutterBottom>
          Ofertă Preț
        </Typography>
        <Box sx={{ textAlign: "center", mt: 1 }}>
          <Typography fontWeight={600}>S.C TOPAZ CONSTRUCT S.R.L</Typography>
          <Typography variant="body2" color="text.secondary">Str. 9 MAI, nr. 102, Băicoi – Prahova</Typography>
          <Typography variant="body2" color="text.secondary">Reg. com.:  J29/3121/2007 • CIF: RO22845111</Typography>
          <Typography variant="body2" color="text.secondary">mail: office@topazconstruct.ro</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Răzvan Cojocaru, Manager General • +40 724 081 565</Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="contained" color="primary" onClick={handleAddItem}>Adaugă produs</Button>
          <Button variant="outlined" color="success" onClick={exportOfferToExcel}>Exportă în Excel</Button>
          <PDFDownloadLink
            document={<OfferDocument items={itemsWithTotals} total={grandTotal} formatCurrency={formatCurrency} />}
            fileName="oferta.pdf"
            style={{ textDecoration: "none" }}
          >
            {({ loading }) => (
              <Button variant="outlined" color="secondary" disabled={loading}>
                {loading ? "Se generează PDF..." : "Descarcă PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        </Stack>
      </Paper>

      <Stack spacing={3} direction={{ xs: "column", lg: "row" }} alignItems="stretch" sx={{ minHeight: { lg: "60vh" } }}>
        <Paper elevation={1} sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Produse ofertă</Typography>
          <Stack spacing={2}>
            {items.map((item, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2, borderStyle: "dashed", borderColor: "divider" }}>
                <Stack spacing={2}>
                  <TextField label="Produs" value={item.name} onChange={e => handleItemChange(idx, "name", e.target.value)} />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField label="Cantitate" type="number" inputProps={{ min: 0, step: 1 }} value={item.qty} onChange={e => handleItemChange(idx, "qty", e.target.value)} />
                    <TextField label="Preț unitar" type="number" inputProps={{ min: 0, step: 0.01 }} value={item.price} onChange={e => handleItemChange(idx, "price", e.target.value)} />
                    <TextField label="Total linie" value={formatCurrency(itemsWithTotals[idx].lineTotal)} InputProps={{ readOnly: true }} />
                  </Stack>
                  <Box display="flex" justifyContent="flex-end">
                    <IconButton onClick={() => handleRemoveItem(idx)} color="error" disabled={items.length === 1}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>Total general:</Typography>
            <Typography variant="h6">{formatCurrency(grandTotal)}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Sperăm să vă punem la dispoziție o ofertă avantajoasă și rămânem la dispoziția Dvs.
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ p: 3, flex: 1.2, minHeight: { xs: 480, lg: "100%" } }}>
          <Typography variant="h6" gutterBottom>Previzualizare PDF</Typography>
          <Box sx={{ mt: 2, height: { xs: 480, sm: 560, lg: "100%" }, borderRadius: 1, overflow: "hidden" }}>
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <OfferDocument items={itemsWithTotals} total={grandTotal} formatCurrency={formatCurrency} />
            </PDFViewer>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
};

export default OfferPage;

