import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Paper,
  Stack,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import 'dayjs/locale/ro';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { tableLocalization } from '../../localization/tableLocalization';
import type { ProjectDevizLine } from '../../api/projectDeviz';
import { saveProjectDevizMaterials } from '../../api/projectDevize';
import { fetchProjectSheet } from '../../api/projectSheet';
import { fetchUniqueMaterials, type Material } from '../../api/materials';
import { fetchClients, type Client } from '../../api/clients';
import { projectsApi } from '../../api/projects';
import SelectOperationModal from './SelectOperationModal';
import DevizeModal, { type MaterialItem, type LaborItem } from './DevizeModal';
import * as operationSheetsApi from '../../api/operationSheets';
import type { OperationSheetItemDTO, ProjectOperationSheetDTO } from '../../api/operationSheets';
import { useConfirm } from '../common/confirm/ConfirmProvider';
import { FisaOperatieModal } from './FisaOperatieModal';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type ProjectSheetData = {
  id?: string;
  projectId: string;
  devizLineId: string;
  initiationDate?: Date | null;
  estimatedStartDate?: Date | null;
  estimatedEndDate?: Date | null;
  standardMarkupPercent?: number | null;
  standardDiscountPercent?: number | null;
  indirectCostsPercent?: number | null;
  operations: ProjectSheetOperation[];
};

export type ProjectSheetOperation = {
  id: string; // Required for MRT
  operationItemId?: string; // OperationItem ID for templates (optional for backward compatibility)
  orderNum: number;
  operationName: string;
  unit: string;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  notes?: string | null;
};

interface ProjectSheetModalProps {
  open: boolean;
  devizLine: ProjectDevizLine | null;
  projectName: string;
  onClose: () => void;
  onSave: (data: ProjectSheetData) => Promise<void>;
}

const ProjectSheetModal: React.FC<ProjectSheetModalProps> = ({
  open,
  devizLine,
  projectName,
  onClose,
  onSave,
}) => {
  const confirm = useConfirm();
  const [initiationDate, setInitiationDate] = useState<Dayjs | null>(null);
  const [estimatedStartDate, setEstimatedStartDate] = useState<Dayjs | null>(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState<Dayjs | null>(null);
  const [standardMarkup, setStandardMarkup] = useState<number>(0);
  const [standardDiscount, setStandardDiscount] = useState<number>(0);
  const [indirectCosts, setIndirectCosts] = useState<number>(0);
  const [operations, setOperations] = useState<ProjectSheetOperation[]>([]);
  const [showSelectOperation, setShowSelectOperation] = useState(false);
  const [editingOperation, setEditingOperation] = useState<ProjectSheetOperation | null>(null);
  const [showDevize, setShowDevize] = useState(false);
  const [showOfferExport, setShowOfferExport] = useState(false);
  const [isExportingOffer, setIsExportingOffer] = useState(false);
  const [projectClient, setProjectClient] = useState<Client | null>(null);
  const [projectLocation, setProjectLocation] = useState<string>('');
  const [devizeMaterials, setDevizeMaterials] = useState<MaterialItem[] | null>(null);
  const [devizeLabor, setDevizeLabor] = useState<LaborItem[] | null>(null);
  const [showFisaOperatie, setShowFisaOperatie] = useState(false);
  const [selectedOperationForFisa, setSelectedOperationForFisa] = useState<ProjectSheetOperation | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing project sheet data when modal opens
  useEffect(() => {
    if (open && devizLine) {
      // reset visible state immediately to avoid flicker when switching lines or opening
      setInitiationDate(null);
      setEstimatedStartDate(null);
      setEstimatedEndDate(null);
      setStandardMarkup(0);
      setStandardDiscount(0);
      setIndirectCosts(0);
      setOperations([]);
      const loadData = async () => {
        try {
          setLoading(true);
          const sheet = await fetchProjectSheet(devizLine.projectId, devizLine.id);
          
          // Populate form with existing data
          setInitiationDate(sheet.initiationDate ? dayjs(sheet.initiationDate) : null);
          setEstimatedStartDate(sheet.estimatedStartDate ? dayjs(sheet.estimatedStartDate) : null);
          setEstimatedEndDate(sheet.estimatedEndDate ? dayjs(sheet.estimatedEndDate) : null);
          setStandardMarkup(sheet.standardMarkupPercent ?? 0);
          setStandardDiscount(sheet.standardDiscountPercent ?? 0);
          setIndirectCosts(sheet.indirectCostsPercent ?? 0);
          setOperations(sheet.operations?.map(op => ({
            ...op,
            id: op.id || `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          })) || []);
        } catch (error: unknown) {
          // If 404, it means no sheet exists yet - that's OK, start fresh
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status !== 404) {
              console.error('Error loading project sheet:', error);
            }
          } else {
            console.error('Unexpected error loading project sheet:', error);
          }
          // Reset to empty state
          setInitiationDate(null);
          setEstimatedStartDate(null);
          setEstimatedEndDate(null);
          setStandardMarkup(0);
          setStandardDiscount(0);
          setIndirectCosts(0);
          setOperations([]);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [open, devizLine]);

  useEffect(() => {
    if (!open || !devizLine?.projectId) {
      setProjectClient(null);
      setProjectLocation('');
      return;
    }

    let cancelled = false;

    const loadClient = async () => {
      try {
        const project = await projectsApi.getById(devizLine.projectId);
        if (cancelled) return;

        setProjectLocation(project.location || '');

        if (!project.clientId) {
          setProjectClient(null);
          return;
        }

        const clients = await fetchClients();
        if (cancelled) return;

        const client = clients.find((c) => c.id === project.clientId) || null;
        setProjectClient(client);
      } catch (error) {
        if (!cancelled) {
          setProjectClient(null);
          setProjectLocation('');
        }
      }
    };

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [open, devizLine?.projectId]);

  const handleAddOperation = (item: { id: string; name: string; unit: string; categoryName: string; operationName: string }) => {
    const newId = `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setOperations((prev) => [
      ...prev,
      {
        id: newId,
        operationItemId: item.id, // Store the OperationItem ID
        orderNum: prev.length + 1,
        operationName: item.name,
        unit: item.unit,
        quantity: null,
        unitPrice: null,
        totalPrice: null,
        notes: null,
      },
    ]);
  };

  const handleSaveDevize = async (materials: MaterialItem[], labor: LaborItem[]) => {
    if (!devizLine?.projectId || !devizLine?.id) return;
    
    try {
      await saveProjectDevizMaterials(devizLine.projectId, devizLine.id, materials);
    } catch (error) {
      console.error('Failed to save devize materials:', error);
      alert('Eroare la salvare materiale');
    }
  };

  const handleExportOfferExcel = () => {
    if (!devizLine) return;
    if (operations.length === 0) {
      alert('Nu există operații pentru a genera oferta.');
      return;
    }

    setIsExportingOffer(true);
    (async () => {
      try {
        const hasStandardDiscount = Number(standardDiscount) !== 0;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Topaz Construct';

        const templateResponse = await fetch('/offer-template.xlsx');
        if (!templateResponse.ok) {
          throw new Error('Nu am putut încărca template-ul Excel');
        }

        const templateBuffer = await templateResponse.arrayBuffer();
        await workbook.xlsx.load(templateBuffer);

        const worksheet = workbook.getWorksheet('Oferta') ?? workbook.getWorksheet(1);
        if (!worksheet) {
          throw new Error('Nu am găsit foaia de lucru în template');
        }

        const removeTemplateTables = () => {
          const sheetWithTables = worksheet as ExcelJS.Worksheet & {
            getTables?: () => { name: string }[];
            removeTable?: (name: string) => void;
          };
          if (typeof sheetWithTables.getTables === 'function' && typeof sheetWithTables.removeTable === 'function') {
            const tables = sheetWithTables.getTables() as unknown as Array<{ name: string }>;
            tables.forEach(table => {
              sheetWithTables.removeTable?.(table.name);
            });
          }
        };

        removeTemplateTables();

        if ('conditionalFormattings' in worksheet) {
          (worksheet as any).conditionalFormattings = [];
        }

        const normalizeCellValue = (value: ExcelJS.CellValue) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'object' && 'text' in value) return String(value.text ?? '');
          return String(value);
        };

        const findCellByText = (needle: string, minCol = 1): { row: number; col: number } | null => {
          const target = needle.trim().toLowerCase();
          let found: { row: number; col: number } | null = null;
          worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
              if (colNumber < minCol) return;
              const cellText = normalizeCellValue(cell.value).trim().toLowerCase();
              if (!found && cellText.includes(target)) {
                found = { row: rowNumber, col: colNumber };
              }
            });
          });
          return found;
        };

        const setValueRightOfLabel = (label: string, value: string, minCol = 1) => {
          const cellPosition = findCellByText(label, minCol);
          if (!cellPosition) return;
          const targetCell = worksheet.getCell(cellPosition.row, cellPosition.col + 1);
          const writableCell = targetCell.isMerged ? targetCell.master : targetCell;
          writableCell.value = value;
        };

        const setValueRightOfAnyLabel = (labels: string[], value: string, minCol = 1) => {
          for (const label of labels) {
            const cellPosition = findCellByText(label, minCol);
            if (!cellPosition) continue;
            const targetCell = worksheet.getCell(cellPosition.row, cellPosition.col + 1);
            const writableCell = targetCell.isMerged ? targetCell.master : targetCell;
            writableCell.value = value;
            return;
          }
        };

        const alignCell = (needle: string, alignment: ExcelJS.Alignment, minCol = 1) => {
          const pos = findCellByText(needle, minCol);
          if (!pos) return;
          const cell = worksheet.getCell(pos.row, pos.col);
          const writableCell = cell.isMerged ? cell.master : cell;
          writableCell.alignment = { ...(writableCell.alignment || {}), ...alignment };
        };

        const clearCellByText = (needle: string) => {
          const pos = findCellByText(needle, 1);
          if (!pos) return;
          const cell = worksheet.getCell(pos.row, pos.col);
          const writableCell = cell.isMerged ? cell.master : cell;
          writableCell.value = '';
        };

        let headerRow = 0;
        let totalRow = 0;
        worksheet.eachRow((row, rowNumber) => {
          let rowText = '';
          row.eachCell(cell => {
            rowText += ` ${normalizeCellValue(cell.value).toUpperCase()}`;
          });
          if (!headerRow && rowText.includes('MATERIAL') && rowText.includes('CANTITATE')) {
            headerRow = rowNumber;
          }
          if (headerRow && !totalRow && rowNumber > headerRow && rowText.includes('TOTAL')) {
            totalRow = rowNumber;
          }
        });

        if (!headerRow) headerRow = 15;
        if (!totalRow) totalRow = headerRow + 10;

        // Client info - populate from project/client data
        const clientLabelPos = findCellByText('client', 1);
        
        // Use client label column as reference, or default to 4 (D)
        const clientRefCol = clientLabelPos ? clientLabelPos.col : 4; 
        const infoValCol = clientRefCol + 1; // Value is next to label

        // Search for Adresa globally first, checking proximity
        let adresaLabelPos = findCellByText('adresa', 1);
        
        // If found but presumably the header address (too far up or wrong column), try searching constrained
        // Logic: specific "Adresa" for client is usually below Client label
        if (clientLabelPos && adresaLabelPos && adresaLabelPos.row <= clientLabelPos.row) {
             // If the found address is ABOVE or ON SAME ROW as client, it's likely the company header. 
             // Try to find another one below.
             adresaLabelPos = null;
             // Manual search starting from client row
             worksheet.eachRow((row, rowNumber) => {
               if (rowNumber <= clientLabelPos.row) return;
                row.eachCell((cell, colNumber) => {
                   // Optimization: only check columns close to clientRefCol
                   if (colNumber < clientRefCol - 2) return; 
                   const cellText = normalizeCellValue(cell.value).trim().toLowerCase();
                   if (!adresaLabelPos && cellText.includes('adresa')) {
                      adresaLabelPos = { row: rowNumber, col: colNumber };
                   }
                });
             });
        }

        // 1. Client Name
        if (clientLabelPos) {
             const cell = worksheet.getCell(clientLabelPos.row, infoValCol);
             (cell.isMerged ? cell.master : cell).value = projectClient?.name || '';
        }

        // 2. Adresa
        const clientAddress = projectClient?.location || projectLocation || '';
        
        // Define columns based on where we found the Adresa label, to keep everything aligned vertically
        const labelColIndex = adresaLabelPos ? adresaLabelPos.col : (clientRefCol - 1 || 1);
        const valueColIndex = labelColIndex + 1;

        if (adresaLabelPos) {
             const cell = worksheet.getCell(adresaLabelPos.row, valueColIndex);
             
             // ROBUST UNMERGE: Scan both Down AND Right to find the full block
             try {
                if (cell.isMerged && cell.master) {
                    const master = cell.master;
                    let endRow = master.row;
                    let endCol = master.col;
                    
                    // Scan Down
                    while (true) {
                        const nextRow = worksheet.getCell(endRow + 1, master.col);
                         // Check if next row's cell is part of the SAME merge (same master address)
                        if (nextRow.isMerged && nextRow.master.address === master.address) {
                            endRow++;
                        } else {
                            break;
                        }
                        if (endRow > master.row + 20) break; // Safety break
                    }

                    // Scan Right
                    while (true) {
                         const nextCol = worksheet.getCell(master.row, endCol + 1);
                         if (nextCol.isMerged && nextCol.master.address === master.address) {
                             endCol++;
                         } else {
                             break;
                         }
                         if (endCol > master.col + 20) break; // Safety break
                    }

                    // Perform the unmerge on the specific block
                    if (endRow > master.row || endCol > master.col) {
                        worksheet.unMergeCells(master.row, master.col, endRow, endCol);
                    }
                }
             } catch (e) { console.warn('Unmerge attempt failed', e); }

             const finalCell = worksheet.getCell(adresaLabelPos.row, valueColIndex);
             finalCell.value = clientAddress;
             finalCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
        }

        // 3. Reg Com - Stick strictly to the rows below Adresa
        if (adresaLabelPos) {
             const row = adresaLabelPos.row + 1;
             
             // Label
             const labelCell = worksheet.getCell(row, labelColIndex);
             
             // Direct Write
             const safeLabel = labelCell.isMerged ? labelCell.master : labelCell;
             safeLabel.value = 'Reg. com.:';
             safeLabel.font = { bold: true };
             safeLabel.alignment = { horizontal: 'right' };

             // Value
             const valCell = worksheet.getCell(row, valueColIndex);
             const safeVal = valCell.isMerged ? valCell.master : valCell;
             safeVal.value = projectClient?.registrulComertului || '';
             safeVal.alignment = { horizontal: 'right', wrapText: true };
        }

        // 4. CUI - Stick strictly to the row below Reg Com
        if (adresaLabelPos) {
             const row = adresaLabelPos.row + 2;

             // Label
             const labelCell = worksheet.getCell(row, labelColIndex);
             const safeLabel = labelCell.isMerged ? labelCell.master : labelCell;
             safeLabel.value = 'CUI:';
             safeLabel.font = { bold: true };
             safeLabel.alignment = { horizontal: 'right' };

             // Value
             const valCell = worksheet.getCell(row, valueColIndex);
             const safeVal = valCell.isMerged ? valCell.master : valCell;
             safeVal.value = projectClient?.cui || '';
             safeVal.alignment = { horizontal: 'right' };
        }

        // Compatibility cleanup: If we forced these rows, clear potential duplicates found elsewhere? 
        // (Optional, but might help clean up if previous "Reg Com" search found something in header)
        // ... skipping optimization to avoid side effects.

        const getHeaderColumn = (match: (text: string) => boolean) => {
          const header = worksheet.getRow(headerRow);
          let colFound: number | null = null;
          header.eachCell((cell, colNumber) => {
            const cellText = normalizeCellValue(cell.value).trim().toLowerCase();
            if (!colFound && match(cellText)) {
              if (cell.isMerged && cell.master?.address) {
                const masterCol = worksheet.getCell(cell.master.address).col;
                colFound = typeof masterCol === 'number' ? masterCol : colNumber;
              } else {
                colFound = colNumber;
              }
            }
          });
          return colFound;
        };

        let colDescription = getHeaderColumn(text => text.includes('material') || text.includes('manoper')) ?? 1;
        let colQuantity = getHeaderColumn(text => text.includes('cant')) ?? 3;
        let colUnit = getHeaderColumn(text => text.includes('u.m') && !text.includes('pret')) ?? 4;
        let colObs = getHeaderColumn(text => text.includes('observ')) ?? 5;
        let colUnitPrice = getHeaderColumn(text => text.includes('/u') && text.includes('pret')) ?? 6;
        let colTotal = getHeaderColumn(text => text.includes('pret') && text.includes('euro') && !text.includes('/u')) ?? 7;

        let colDiscount: number | null = getHeaderColumn(text => text.includes('discount'));

        if (hasStandardDiscount && !colDiscount) {
          const insertAt = colTotal;
          worksheet.spliceColumns(insertAt, 0, []);

          const bump = (col: number) => (col >= insertAt ? col + 1 : col);
          colDescription = bump(colDescription);
          colQuantity = bump(colQuantity);
          colUnit = bump(colUnit);
          colObs = bump(colObs);
          colUnitPrice = bump(colUnitPrice);
          colTotal = bump(colTotal);
          colDiscount = insertAt;

          // Set width for the new Discount column to fit "Discount %"
          worksheet.getColumn(colDiscount).width = 12;

          const headerCell = worksheet.getRow(headerRow).getCell(colDiscount);
          const sourceHeaderCell = worksheet.getRow(headerRow).getCell(colUnitPrice);
          headerCell.value = 'Discount %';
          if (sourceHeaderCell.style) {
            headerCell.style = { ...sourceHeaderCell.style };
          }
        }
        
        // Fix "Total" column width (Column H usually) when Discount is added
        if (hasStandardDiscount && colDiscount) {
            const nextColIndex = colDiscount + 1; // This is the shifted Total column
            const nextCol = worksheet.getColumn(nextColIndex);
            
            // Force a safer width (25) to prevent text cutting (especially for right-aligned currency headers)
            // Default Excel width (8.43) causes issues when columns shift.
            if ((nextCol.width || 0) < 25) {
                nextCol.width = 25; 
            }

            // Also ensure the header cell in this shifted column has Wrap Text enabled
            // This prevents "Pret..." from being chopped if it's still tight
            const headerCell = worksheet.getCell(headerRow, nextColIndex);
            const safeHeader = headerCell.isMerged ? headerCell.master : headerCell;
            safeHeader.alignment = { 
                ...safeHeader.alignment, 
                wrapText: true 
            };
        }

        const dataStartRow = headerRow + 1;
        const filteredRows = operations
          .filter(op => (op.operationName || '').trim() !== '')
          .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));

        const templateRowCount = Math.max(totalRow - dataStartRow, 0);
        const extraRowsNeeded = filteredRows.length - templateRowCount;
        if (extraRowsNeeded > 0) {
          const templateDataRow = worksheet.getRow(dataStartRow);
          for (let i = 0; i < extraRowsNeeded; i++) {
            const newRowNum = totalRow;
            worksheet.insertRow(newRowNum, []);
            const newRow = worksheet.getRow(newRowNum);
            templateDataRow.eachCell({ includeEmpty: true }, (templateCell, colNumber) => {
              const newCell = newRow.getCell(colNumber);
              if (templateCell.style) {
                newCell.style = { ...templateCell.style };
              }
            });
            newRow.height = templateDataRow.height;
          }
          totalRow = totalRow + extraRowsNeeded;
        }

        const dataCols = [colDescription, colQuantity, colUnit, colObs, colUnitPrice, colTotal];
        if (hasStandardDiscount && colDiscount) dataCols.push(colDiscount);
        const firstDataCol = Math.min(...dataCols);
        const lastDataCol = Math.max(...dataCols);

        // --- Fix alignments and merges (moved after splice) ---
        clearCellByText('oferta manopera');
        
        // 1. Title Merge: Ensure "OFERTĂ PREȚ" spans the full table width
        const titlePos = findCellByText('ofert', 1);
        if (titlePos) {
           const rowIdx = titlePos.row;
           const cell = worksheet.getCell(rowIdx, titlePos.col);
           const val = cell.value; // Save value

           // If found column is not the first data column, clear it to move to first
           if (titlePos.col !== firstDataCol) {
             cell.value = null;
           }

           // Try to merge from firstDataCol to lastDataCol 
           try {
             // Attempt merge. If it overlaps with existing weirdly, it might fail, 
             // but usually extending a merge works if we cover the origin.
             worksheet.mergeCells(rowIdx, firstDataCol, rowIdx, lastDataCol);
           } catch (e) {
             // Fallback: try to unmerge a likely previous range then merge
             try {
                // Heuristic: previous merge likely ended 1 col before or same
                worksheet.unMergeCells(rowIdx, firstDataCol, rowIdx, lastDataCol - 1);
                worksheet.mergeCells(rowIdx, firstDataCol, rowIdx, lastDataCol);
             } catch (e2) {
                 // Ignore errors
             }
           }

           // Set value and alignment on the master cell (top-left)
           const master = worksheet.getCell(rowIdx, firstDataCol);
           master.value = val;
           master.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // 2. Dates Alignment & Population
        const setDateRow = (needle: string, date: Date, defaultLabel: string) => {
          let pos = findCellByText(needle, 1);
          
          // Fallback row if not found
          const defaultRow = needle.includes('emiterii') ? (headerRow > 10 ? headerRow - 3 : 10) : (headerRow > 10 ? headerRow - 2 : 11);
          const rowIdx = pos ? pos.row : defaultRow;

          // Align strictly to Total (PRET EURO) Column
          const valueCol = colTotal;
          const labelCol = colTotal;

          // Clear old location if found and different from new target
          // This prevents duplicate labels if splice shifted things weirdly
          if (pos && pos.col !== labelCol) {
             const oldCell = worksheet.getCell(pos.row, pos.col);
             // Verify it contains the needle before clearing, to avoid clearing innocent cells
             if (oldCell.value && String(oldCell.value).toLowerCase().includes(needle.toLowerCase())) {
                 oldCell.value = null; 
             }
             // Also check the "value" slot next to it
             const oldValCell = worksheet.getCell(pos.row, pos.col + 1);
             // Simple heuristic: if it looks like a date or is empty, clear it
             const oldVal = normalizeCellValue(oldValCell.value);
             if (!oldVal || oldVal.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                if (pos.col + 1 !== labelCol && pos.col + 1 !== valueCol) {
                   oldValCell.value = null;
                }
             }
          }

          // Safety: Unmerge the target cells to ensure we can write cleanly into them
          // This prevents writing into the middle of a merge which usually fails or hides text
          try {
             const labelCell = worksheet.getCell(rowIdx, labelCol);
             if (labelCell.isMerged) {
                // Find extent of merge and unmerge if it's not what we want
                // Ideally we just want single cells here
                if (labelCell.master && labelCell.master.address !== labelCell.address) {
                   // e.g. unmerge the master
                   const master = worksheet.getCell(labelCell.master.address);
                   // We can't easily unmerge just one cell if it's part of a block, 
                   // but usually these are small merges. 
                   // Accessing worksheet.unMergeCells with a range string is safest if we knew it.
                   // Here we just accept writing to master if it exists.
                }
             }
          } catch(e) { /* ignore */ }

           // Write Label + Date in the same cell to avoid shifting issues
           const labelCell = worksheet.getCell(rowIdx, labelCol);
           const writableLabel = labelCell.isMerged ? labelCell.master : labelCell;
          
          // Ensure label column has space
          const colObj = worksheet.getColumn(labelCol);
          if ((colObj.width || 8) < 18) {
              colObj.width = 18; 
          }

          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
           const formattedDate = `${day}.${month}.${year}`;

           writableLabel.value = `${defaultLabel} ${formattedDate}`;
           writableLabel.alignment = { horizontal: 'right', vertical: 'middle' };
           writableLabel.font = { 
             name: 'Arial', 
             size: 10, 
             bold: true,
             color: { argb: 'FF000000' } 
           };

           // Clear the value cell to avoid duplicate/overflowed text, ONLY if it's a different column
           if (valueCol !== labelCol) {
             const valCell = worksheet.getCell(rowIdx, valueCol);
             const writableVal = valCell.isMerged ? valCell.master : valCell;
             writableVal.value = null;
           }
        };

        const now = new Date();
        const issueDate = now; // Always use current generation date
        
        // Default validity 30 days if not specified
        const validUntil = estimatedEndDate 
             ? estimatedEndDate.toDate() 
             : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); 

        setDateRow('data emiterii', issueDate, 'Data emiterii:');
        setDateRow('valabil', validUntil, 'Valabilă până la:');

        // 3. Footer confidentiality message should span full table width
        const footerPos = findCellByText('ofertă confidențială', 1);
        if (footerPos) {
          const rowIdx = footerPos.row;
          const cell = worksheet.getCell(rowIdx, footerPos.col);
          const val = cell.value;

          // Extend merge to include column H (8) since the template has text there
          // lastDataCol is typically G (7), but we need to go to at least H (8)
          const mergeEndCol = Math.max(lastDataCol + 1, footerPos.col, 8);

          // Clear ALL cells in the footer row from first to end column
          for (let c = firstDataCol; c <= mergeEndCol; c++) {
            const cellToClear = worksheet.getCell(rowIdx, c);
            if (!cellToClear.isMerged || cellToClear.address === cellToClear.master?.address) {
              cellToClear.value = null;
            }
          }

          // Unmerge any existing merges in that row first
          try {
            worksheet.unMergeCells(rowIdx, firstDataCol, rowIdx, mergeEndCol);
          } catch (e) {
            // Ignore unmerge errors
          }

          try {
            worksheet.mergeCells(rowIdx, firstDataCol, rowIdx, mergeEndCol);
          } catch (e) {
            // If merge fails, try a smaller range
            try {
              worksheet.mergeCells(rowIdx, firstDataCol, rowIdx, lastDataCol);
            } catch (e2) {
              // Ignore merge errors
            }
          }

          const master = worksheet.getCell(rowIdx, firstDataCol);
          master.value = val;
          master.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        }
        
        const thinBorder: ExcelJS.Border = {
          top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        };

        for (let r = dataStartRow; r < totalRow; r++) {
          const row = worksheet.getRow(r);
          for (let c = firstDataCol; c <= lastDataCol; c++) {
            const cell = row.getCell(c);
            if (!cell.isMerged || cell.address === cell.master?.address) {
              cell.value = null;
            }
          }
        }

        for (let r = dataStartRow; r < totalRow; r++) {
          const row = worksheet.getRow(r);
          const rowIndex = r - dataStartRow;
          const isGrayRow = rowIndex % 2 === 1;
          const zebraFill: ExcelJS.Fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isGrayRow ? 'FFE0E0E0' : 'FFFFFFFF' },
          };

          for (let col = firstDataCol; col <= lastDataCol; col++) {
            const cell = row.getCell(col);
            const writableCell = cell.isMerged ? cell.master : cell;
            writableCell.style = {
              ...writableCell.style,
              fill: zebraFill,
            };

            const existingBorder = writableCell.border || {};
            const safeBorder = (side: ExcelJS.BorderLine | undefined) => side ? side : undefined;
            
            // If this is the new discount column, force full borders because spliceColumns inserts naked cells
            const isDiscountCol = hasStandardDiscount && col === colDiscount;

            writableCell.border = {
              ...existingBorder,
              top: thinBorder.top,
              bottom: thinBorder.bottom,
              left: (col === firstDataCol || isDiscountCol) ? thinBorder.left : safeBorder(existingBorder.left),
              right: (col === lastDataCol || isDiscountCol) ? thinBorder.right : safeBorder(existingBorder.right),
            };
          }
        }

        // --- Fix "White Cell" in Total Row for Discount Column ---
        if (hasStandardDiscount && colDiscount) {
           const totalRowCell = worksheet.getRow(totalRow).getCell(colDiscount);
           // Copy style from the column to the left (Unit Price) to match footer background/border
           const neighborCol = colUnitPrice; 
           const neighborCellRaw = worksheet.getRow(totalRow).getCell(neighborCol);
           const neighborCell = neighborCellRaw.isMerged ? neighborCellRaw.master : neighborCellRaw;
            
           if (neighborCell.style) {
               const target = totalRowCell.isMerged ? totalRowCell.master : totalRowCell;
               
               // Copy style (fill, font, alignment)
               target.style = JSON.parse(JSON.stringify(neighborCell.style));
               target.value = null;

               // Apply border
               target.border = {
                   top: thinBorder.top,
                   bottom: thinBorder.bottom,
                   left: thinBorder.left,
                   right: thinBorder.right
               };
           }
        }

        const getColLetter = (colNum: number) => {
          let letter = '';
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

        filteredRows.forEach((op, index) => {
          const rowNum = dataStartRow + index;
          const row = worksheet.getRow(rowNum);
          const setCellValue = (col: number, value: ExcelJS.CellValue, numFmt?: string) => {
            const cell = row.getCell(col);
            const writableCell = cell.isMerged ? cell.master : cell;
            writableCell.value = value;
            if (numFmt) writableCell.numFmt = numFmt;
            return writableCell;
          };

          const qty = op.quantity ?? 0;
          const unitPrice = op.unitPrice ?? 0;
          setCellValue(colDescription, op.operationName || '-');
          setCellValue(colQuantity, qty);
          setCellValue(colUnit, op.unit || '-');
          setCellValue(colObs, op.notes || '');
          setCellValue(colUnitPrice, unitPrice, '#,##0.00');

          if (hasStandardDiscount && colDiscount) {
            setCellValue(colDiscount, standardDiscount, '0.00');
          }

          const totalCell = row.getCell(colTotal);
          const writableTotalCell = totalCell.isMerged ? totalCell.master : totalCell;
          writableTotalCell.value = {
            formula: `${qtyColLetter}${rowNum}*${unitPriceColLetter}${rowNum}`,
            result: op.totalPrice ?? qty * unitPrice,
          };
          writableTotalCell.numFmt = '#,##0.00 €';
        });

        const totalColLetter = getColLetter(colTotal);
        const totalCell = worksheet.getRow(totalRow).getCell(colTotal);
        const writableTotalCell = totalCell.isMerged ? totalCell.master : totalCell;
        if (filteredRows.length > 0) {
          const firstDataRow = dataStartRow;
          const lastDataRow = dataStartRow + filteredRows.length - 1;
          writableTotalCell.value = {
            formula: `SUM(${totalColLetter}${firstDataRow}:${totalColLetter}${lastDataRow})`,
            result: filteredRows.reduce((sum, op) => sum + (op.totalPrice ?? (op.quantity ?? 0) * (op.unitPrice ?? 0)), 0),
          };
        } else {
          writableTotalCell.value = 0;
        }
        writableTotalCell.numFmt = '#,##0.00 €';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Oferta_${devizLine.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (error) {
        console.error('Eroare la exportul ofertei:', error);
        alert('A apărut o eroare la exportul ofertei.');
      } finally {
        setIsExportingOffer(false);
      }
    })();
  };

  // Load or build materials list for Devize modal
  useEffect(() => {
    const load = async () => {
      if (!showDevize) return;
      if (!devizLine) return;
      if (!devizLine.projectId) return;

      try {
        // Always aggregate from operation sheets (ignore saved materials)
        // This ensures the devize always reflects current recipe data
        
        // Fetch materials catalog for supplier and packaging info
        const allMaterials = await fetchUniqueMaterials();
        const materialsByCode = new Map<string, Material>();
        for (const m of allMaterials) {
          const codeKey = (m.code || '').trim().toUpperCase();
          if (codeKey) {
            const existing = materialsByCode.get(codeKey);
            if (!existing || (m.purchaseDate && (!existing.purchaseDate || new Date(m.purchaseDate) > new Date(existing.purchaseDate)))) {
              materialsByCode.set(codeKey, m);
            }
          }
        }
        
        const ops = operations.filter(op => !!op.operationItemId && (op.quantity || 0) > 0);
        if (ops.length === 0) {
          setDevizeMaterials([]);
          return;
        }

        // Fetch all project operation sheets in parallel
      const sheets: Array<{ opId: string; qty: number; sheet: ProjectOperationSheetDTO | null }> = await Promise.all(
        ops.map(async (op) => {
          try {
            const sheet = await operationSheetsApi.fetchProjectOperationSheet(devizLine.projectId, op.operationItemId!);
            return { opId: op.operationItemId!, qty: op.quantity || 0, sheet };
          } catch (err: any) {
            if (err?.response?.status === 404) {
              return { opId: op.operationItemId!, qty: op.quantity || 0, sheet: null };
            }
            console.error('Failed to fetch operation sheet', op.operationItemId, err);
            return { opId: op.operationItemId!, qty: op.quantity || 0, sheet: null };
          }
        })
      );

      type Agg = {
        key: string;
        materialCode: string;
        materialDescription: string;
        unit: string;
        totalQty: number;
        totalBase: number;
        weightedPriceAccum: number; // sum(price * qty)
        packQuantity?: number | null;
        packUnit?: string | null;
      };
      const map = new Map<string, Agg>();

      type LaborAgg = {
        key: string;
        laborDescription: string;
        totalQty: number;
        totalBase: number;
        weightedPriceAccum: number;
      };
      const laborMap = new Map<string, LaborAgg>();

      const addItem = (item: OperationSheetItemDTO, qtyMultiplier: number) => {
        const perUnitQty = Number(item.quantity || 0);
        const totalQty = perUnitQty * qtyMultiplier;
        if (!Number.isFinite(totalQty) || totalQty <= 0) return;
        const unitPrice = Number(item.unitPrice || 0);
        const base = totalQty * (Number.isFinite(unitPrice) ? unitPrice : 0);
        
        if (item.itemType === 'MATERIAL') {
          const key = item.referenceId || item.code || `${item.description}|${item.unit}`;
          const prev = map.get(key);
          const packQuantity = item.packQuantity ?? null;
          const packUnit = item.packUnit ?? null;
          if (prev) {
            prev.totalQty += totalQty;
            prev.totalBase += base;
            prev.weightedPriceAccum += unitPrice * totalQty;
          } else {
            map.set(key, {
              key,
              materialCode: item.code || '',
              materialDescription: item.description,
              unit: item.unit,
              totalQty,
              totalBase: base,
              weightedPriceAccum: unitPrice * totalQty,
              packQuantity,
              packUnit,
            });
          }
        } else if (item.itemType === 'LABOR') {
          const key = item.description || `labor_${item.id}`;
          const prev = laborMap.get(key);
          if (prev) {
            prev.totalQty += totalQty;
            prev.totalBase += base;
            prev.weightedPriceAccum += unitPrice * totalQty;
          } else {
            laborMap.set(key, {
              key,
              laborDescription: item.description,
              totalQty,
              totalBase: base,
              weightedPriceAccum: unitPrice * totalQty,
            });
          }
        }
      };

      sheets.forEach(({ qty, sheet }) => {
        const items = sheet?.items || [];
        items.forEach((it) => addItem(it, qty));
      });

      const result: MaterialItem[] = Array.from(map.values()).map((agg, idx) => {
        const avgPrice = agg.totalQty > 0 ? agg.weightedPriceAccum / agg.totalQty : 0;
        
        // Look up material from catalog to get supplier and package info
        const codeKey = (agg.materialCode || '').trim().toUpperCase();
        const catalogMaterial = codeKey ? materialsByCode.get(codeKey) : undefined;
        
        const packsText = agg.packQuantity && agg.packQuantity > 0 && agg.packUnit
          ? ` (~${(agg.totalQty / agg.packQuantity).toFixed(2)} x ${agg.packQuantity} ${agg.packUnit})`
          : '';
        return {
          id: `agg_${idx}_${agg.key}`,
          orderNum: idx + 1,
          operationCode: devizLine.code,
          operationDescription: devizLine.description,
          materialCode: agg.materialCode,
          materialDescription: agg.materialDescription + packsText,
          unit: agg.unit,
          quantity: Number(agg.totalQty.toFixed(2)),
          unitPrice: Number(avgPrice.toFixed(4)),
          baseValue: null,
          markupPercent: null,
          valueWithMarkup: null,
          discountPercent: null,
          finalValue: null,
          // Get supplier and package info from materials catalog
          supplier: catalogMaterial?.supplierName || undefined,
          packageSize: catalogMaterial?.packQuantity != null ? Number(catalogMaterial.packQuantity) : null,
          packageUnit: catalogMaterial?.packUnit || undefined,
        } as MaterialItem;
      });

      const laborResult: LaborItem[] = Array.from(laborMap.values()).map((agg, idx) => {
        const avgPrice = agg.totalQty > 0 ? agg.weightedPriceAccum / agg.totalQty : 0;
        return {
          id: `labor_agg_${idx}_${agg.key}`,
          orderNum: idx + 1,
          operationCode: devizLine.code,
          operationDescription: devizLine.description,
          laborDescription: agg.laborDescription,
          quantity: Number(agg.totalQty.toFixed(2)),
          unitPrice: Number(avgPrice.toFixed(4)),
          baseValue: null,
          markupPercent: null,
          valueWithMarkup: null,
          discountPercent: null,
          finalValue: null,
        } as LaborItem;
      });

      setDevizeMaterials(result);
      setDevizeLabor(laborResult);
      } catch (error) {
        console.error('Error loading/building materials:', error);
        setDevizeMaterials([]);
        setDevizeLabor([]);
      }
    };
    load();
  }, [showDevize, devizLine, operations]);

  const handleUpdateOperation = (id: string, updates: Partial<ProjectSheetOperation>) => {
    setOperations(prev => prev.map((op) => {
      if (op.id === id) {
        const updated = { ...op, ...updates };
        // Auto-calculate total
        const qty = updates.quantity !== undefined ? updates.quantity : updated.quantity;
        const price = updates.unitPrice !== undefined ? updates.unitPrice : updated.unitPrice;
        if (qty && price) {
          updated.totalPrice = qty * price;
        } else {
          updated.totalPrice = null;
        }
        return updated;
      }
      return op;
    }));
  };

  const handleDeleteOperation = async (id: string, operationName: string) => {
      const ok = await confirm({
      title: 'Confirmare Ștergere',
      bodyTitle: 'Ștergi această operație?',
      description: (
        <>
          Operația <strong>{operationName}</strong> va fi ștearsă din fișa de proiect.
        </>
      ),
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      danger: true,
    });
    
    if (!ok) return;
    
    setOperations(prev => {
      const filtered = prev.filter(op => op.id !== id);
      // Reindex orderNum to keep 1..n sequence
      return filtered.map((op, idx) => ({ ...op, orderNum: idx + 1 }));
    });
  };

  // Callback for when recipe is calculated in FisaOperatieModal
  const handleRecipeCalculated = useCallback((unitPrice: number) => {
    if (selectedOperationForFisa) {
      handleUpdateOperation(selectedOperationForFisa.id, { unitPrice });
    }
  }, [selectedOperationForFisa]);

  const handleSave = async () => {
    if (!devizLine) return;

    const data: ProjectSheetData = {
      projectId: devizLine.projectId,
      devizLineId: devizLine.id,
      initiationDate: initiationDate ? initiationDate.toDate() : null,
      estimatedStartDate: estimatedStartDate ? estimatedStartDate.toDate() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toDate() : null,
      standardMarkupPercent: standardMarkup,
      standardDiscountPercent: standardDiscount,
      indirectCostsPercent: indirectCosts,
      operations,
    };

    try {
      setSaving(true);
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save project sheet:', error);
    } finally {
      setSaving(false);
    }
  };

  // Columns for operations table
  const operationsColumns = useMemo<MRT_ColumnDef<ProjectSheetOperation>[]>(
    () => [
      {
        accessorKey: 'orderNum',
        header: 'Nr.',
        size: 60,
        enableEditing: false,
        enableSorting: false,
      },
      {
        accessorKey: 'operationName',
        header: 'Denumire operație',
        size: 250,
        muiEditTextFieldProps: {
          required: true,
          placeholder: 'Ex: Zidărie cărămidă',
        },
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
        muiEditTextFieldProps: {
          required: true,
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Cantitate',
        size: 110,
        muiEditTextFieldProps: {
          type: 'number',
          inputProps: { step: 0.01, min: 0 },
        },
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—';
        },
      },
      {
  accessorKey: 'unitPrice',
  header: 'Preț unitar (din rețetă)',
        size: 150,
        enableEditing: false, // Read-only - calculated from recipe
        Cell: ({ cell, row }) => {
          const val = cell.getValue<number | null>();
          const hasRecipe = row.original.operationItemId; // Has recipe if operationItemId exists
          return (
            <Tooltip title={hasRecipe ? "Calculat din Fișa Operație" : "Fără rețetă definită"}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: hasRecipe ? 'success.main' : 'text.secondary',
                  fontStyle: hasRecipe ? 'normal' : 'italic'
                }}
              >
                {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'totalPrice',
        header: 'Total',
        size: 120,
        enableEditing: false,
        Cell: ({ cell }) => {
          const val = cell.getValue<number | null>();
          return (
            <Typography variant="body2" fontWeight="bold">
                {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
            </Typography>
          );
        },
      },
    ],
    []
  );

  const operationsTable = useMaterialReactTable({
    columns: operationsColumns,
    data: operations,
    localization: tableLocalization,
    enablePagination: false,
    enableBottomToolbar: true,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: true,
    enableEditing: true,
    editDisplayMode: 'table',
    enableRowActions: true,
    positionActionsColumn: 'last',
    muiTableContainerProps: {
      sx: { maxHeight: '400px' },
    },
    muiEditTextFieldProps: ({ column, row }) => ({
      onBlur: (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        const rowId = row.original.id;
        const columnId = column.id;

        if (columnId === 'quantity' || columnId === 'unitPrice') {
          handleUpdateOperation(rowId, {
            [columnId]: value ? parseFloat(value) : null,
          });
        } else if (columnId === 'operationName' || columnId === 'unit') {
          handleUpdateOperation(rowId, {
            [columnId]: value,
          });
        }
      },
    }),
    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={0.5}>
        <Tooltip 
          title={
            row.original.operationItemId 
              ? "Editează Fișa Operație" 
              : "Fișa Operație disponibilă doar pentru operațiile din catalog"
          }
        >
          <span>
            <IconButton
              size="small"
              onClick={() => {
                setSelectedOperationForFisa(row.original);
                setShowFisaOperatie(true);
              }}
              disabled={!row.original.operationItemId}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
  <Tooltip title="Șterge operație">
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteOperation(row.original.id, row.original.operationName)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          TOTAL OPERAȚII: {operations.reduce((sum, op) => sum + (op.totalPrice || 0), 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
        </Typography>
      </Box>
    ),
  });

  if (!devizLine) return null;

  const operationsTotal = operations.reduce((sum, op) => sum + (op.totalPrice || 0), 0);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5" component="div">
                Fișa Proiect
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Proiect: {projectName} | Cod: {devizLine.code} - {devizLine.description}
              </Typography>
            </Box>
            <Stack direction="row" gap={1} alignItems="center">
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => setShowDevize(true)}
              >
                Devize
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => setShowOfferExport(true)}
              >
                Ofertare
              </Button>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Project Timeline Section */}
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Date Proiect
                </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DatePicker
                label="Data inițiere proiect"
                value={initiationDate}
                onChange={(newValue) => setInitiationDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
              <DatePicker
                label="Data începere proiect (estimativ)"
                value={estimatedStartDate}
                onChange={(newValue) => setEstimatedStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
              <DatePicker
                label="Data finalizare proiect (estimativ)"
                value={estimatedEndDate}
                onChange={(newValue) => setEstimatedEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
            </Stack>
          </Paper>

          {/* Financial Parameters moved to Devize modal */}

          {/* Operations Table Section */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} gap={2}>
              <Stack direction="row" alignItems="center" gap={2}>
                <Typography variant="h6" color="primary">
                  Operații
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Total: {operationsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI
                </Typography>
              </Stack>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowSelectOperation(true)}
              >
                Adaugă operație
              </Button>
            </Stack>

            <MaterialReactTable table={operationsTable} />
          </Paper>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Anulează
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Se salvează...' : 'Salvează'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Select Operation Modal */}
      <SelectOperationModal
        open={showSelectOperation}
        onClose={() => setShowSelectOperation(false)}
        onSelect={handleAddOperation}
      />
      
      {/* Edit Operation Modal */}
      <Dialog open={!!editingOperation} onClose={() => setEditingOperation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Editează Operație</Typography>
            <IconButton onClick={() => setEditingOperation(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Denumire operație"
              value={editingOperation?.operationName || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, operationName: e.target.value } : null)}
            />
            <TextField
              fullWidth
              label="Unitate măsură"
              value={editingOperation?.unit || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, unit: e.target.value } : null)}
            />
            <TextField
              fullWidth
              label="Cantitate"
              type="number"
              value={editingOperation?.quantity || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, quantity: e.target.value ? parseFloat(e.target.value) : null } : null)}
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              fullWidth
              label="Preț unitar"
              type="number"
              value={editingOperation?.unitPrice || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, unitPrice: e.target.value ? parseFloat(e.target.value) : null } : null)}
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              fullWidth
              label="Observații"
              multiline
              rows={3}
              value={editingOperation?.notes || ''}
              onChange={(e) => setEditingOperation(prev => prev ? { ...prev, notes: e.target.value } : null)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingOperation(null)} variant="outlined">
            Anulează
          </Button>
          <Button 
            onClick={() => {
              if (editingOperation) {
                handleUpdateOperation(editingOperation.id, editingOperation);
                setEditingOperation(null);
              }
            }} 
            variant="contained"
          >
            Salvează
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offer Export Modal */}
      <Dialog open={showOfferExport} onClose={() => setShowOfferExport(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Export Ofertă</Typography>
            <IconButton onClick={() => setShowOfferExport(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Exportă oferta în format Excel pe baza operațiilor curente.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Discount standard: {standardDiscount}%
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOfferExport(false)} variant="outlined">
            Închide
          </Button>
          <Button onClick={handleExportOfferExcel} variant="contained" disabled={isExportingOffer}>
            {isExportingOffer ? 'Se exportă...' : 'Export Excel'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Devize Modal */}
      <DevizeModal
        open={showDevize}
        devizLine={devizLine}
        projectName={projectName}
        standardMarkup={standardMarkup}
        standardDiscount={standardDiscount}
        standardIndirectCosts={indirectCosts}
        initialMaterials={devizeMaterials || []}
        initialLabor={devizeLabor || []}
        onClose={() => setShowDevize(false)}
        onSave={handleSaveDevize}
        onUpdateParameters={({ standardMarkup: m, standardDiscount: d, indirectCosts: i }) => {
          setStandardMarkup(m);
          setStandardDiscount(d);
          setIndirectCosts(i);
        }}
      />

      {/* Fisa Operatie Modal */}
      {showFisaOperatie && selectedOperationForFisa && (
        <FisaOperatieModal
          open={showFisaOperatie}
          onClose={() => {
            // Unmount first to avoid intermediate state flicker
            setShowFisaOperatie(false);
            setSelectedOperationForFisa(null);
          }}
          operationId={selectedOperationForFisa.operationItemId}
          operationName={selectedOperationForFisa.operationName}
          projectId={devizLine?.projectId}
          onRecipeCalculated={handleRecipeCalculated}
        />
      )}
    </LocalizationProvider>
  );
};

export default ProjectSheetModal;

