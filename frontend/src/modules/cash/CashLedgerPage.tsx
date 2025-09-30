import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  Tooltip,
  IconButton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from "@mui/material";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import {
  listCashEntries,
  createCashEntry,
  transferCash,
  getBalances,
  listCompanies,
  listCashAccounts,
} from "../../api/cash";
import { api } from "../../api/axios";
import useNotistack from "../orders/hooks/useNotistack";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MRT_Localization_RO } from "material-react-table/locales/ro";
import { useConfirm } from "../common/confirm/ConfirmProvider";
import AddCashEntryModal from "./AddCashEntryModal";
import EditCashEntryModal from "./EditCashEntryModal";

const transferSchemaUI = z.object({
  sourceAccountId: z.string().min(1, "Alege sursa"),
  destinationAccountId: z.string().min(1, "Alege destinația"),
  effectiveAt: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().max(500).optional().nullable(),
  employeeId: z.string().optional().nullable(),
  overrideNegative: z.boolean().optional(),
});
type TransferFormValues = z.infer<typeof transferSchemaUI>;

// helpers for file naming
const slug = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const niceRange = (from?: string, to?: string) => {
  if (from && to) return `${from}_to_${to}`;
  if (from) return `${from}_to_present`;
  if (to) return `until_${to}`;
  return "all-dates";
};

type QuickRange = "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR";

export default function CashLedgerPage() {
  const qc = useQueryClient();
  const { errorNotistack, successNotistack } = useNotistack();
  const confirm = useConfirm();

  const [companyId, setCompanyId] = useState<string>("");
  const [cashAccountId, setCashAccountId] = useState<string>("");

  // separate modal "open" from "type" to avoid flicker on close
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<"IN" | "OUT">("IN");

  const [showTransfer, setShowTransfer] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [editing, setEditing] = useState<null | any>(null);

  // date range (YYYY-MM-DD), inclusive
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [quickRange, setQuickRange] = useState<QuickRange>("ALL");

  // debounced global search
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [pendingFilter, setPendingFilter] = useState<string>("");
  useEffect(() => {
    const t = setTimeout(() => setGlobalFilter(pendingFilter), 250);
    return () => clearTimeout(t);
  }, [pendingFilter]);

  // quick ranges
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const applyQuickRange = useCallback((range: QuickRange) => {
    const now = new Date();
    setQuickRange(range);
    if (range === "ALL") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    if (range === "TODAY") {
      const s = fmt(now);
      setDateFrom(s);
      setDateTo(s);
      return;
    }
    if (range === "WEEK") {
      const day = (now.getDay() + 6) % 7; // 0=Mon
      const start = new Date(now);
      start.setDate(now.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
      return;
    }
    if (range === "MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
      return;
    }
    if (range === "YEAR") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
      return;
    }
  }, []);

  // persist user choices
  const STORAGE_KEY = "cashLedger.prefs.v2";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.companyId) setCompanyId(saved.companyId);
      if (saved.cashAccountId) setCashAccountId(saved.cashAccountId);
      if (saved.typeFilter) setTypeFilter(saved.typeFilter);
      if (typeof saved.dateFrom === "string") setDateFrom(saved.dateFrom);
      if (typeof saved.dateTo === "string") setDateTo(saved.dateTo);
      if (saved.quickRange) setQuickRange(saved.quickRange);
    } catch {}
  }, []);
  useEffect(() => {
    const data = { companyId, cashAccountId, typeFilter, dateFrom, dateTo, quickRange };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [companyId, cashAccountId, typeFilter, dateFrom, dateTo, quickRange]);

  const companiesQ = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(),
    placeholderData: (prev) => prev,
  });
  const accountsQ = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => listCashAccounts(companyId),
    enabled: !!companyId,
    placeholderData: (prev) => prev,
  });
  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await api.get("/employees");
      return data as { id: string; name: string }[];
    },
    placeholderData: (prev) => prev,
  });

  const entriesQ = useQuery({
    queryKey: ["cashEntries", { companyId, cashAccountId }],
    queryFn: () => listCashEntries({ companyId, cashAccountId }),
    enabled: !!companyId && !!cashAccountId,
    placeholderData: (prev) => prev,
  });

  const balancesQ = useQuery({
    queryKey: ["balances", { companyId }],
    queryFn: () => getBalances({ companyId }),
    enabled: !!companyId,
    placeholderData: (prev) => prev,
  });

  // Initialize defaults after lists load
  useEffect(() => {
    if (!companyId && companiesQ.data?.length)
      setCompanyId(companiesQ.data[0].id);
  }, [companiesQ.data, companyId]);
  useEffect(() => {
    if (companyId && accountsQ.data?.length && !cashAccountId)
      setCashAccountId(accountsQ.data[0].id);
  }, [accountsQ.data, companyId, cashAccountId]);

  const createMut = useMutation({
    mutationFn: createCashEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashEntries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      successNotistack("Înregistrare salvată");
    },
    onError: (err: any) => {
      errorNotistack(err?.response?.data?.error || "Eroare salvare");
    },
  });

  const transferMut = useMutation({
    mutationFn: transferCash,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashEntries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      successNotistack("Transfer salvat");
    },
    onError: (err: any) => {
      errorNotistack(err?.response?.data?.error || "Eroare transfer");
    },
  });

  // Transfer form
  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchemaUI),
    defaultValues: {
      sourceAccountId: cashAccountId || "",
      destinationAccountId: "",
      effectiveAt: new Date().toISOString().slice(0, 10),
      amount: 0,
    } as any,
  });

  useEffect(() => {
    transferForm.setValue("sourceAccountId", cashAccountId);
  }, [cashAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitTransfer = transferForm.handleSubmit(
    (values: TransferFormValues) => {
      if (values.sourceAccountId === values.destinationAccountId) {
        errorNotistack("Sursa și destinația nu pot fi identice");
        return;
      }
      const iso = toIso(values.effectiveAt);
      transferMut.mutate(
        { ...values, effectiveAt: iso, amount: Number(values.amount) },
        {
          onSuccess: () => {
            setShowTransfer(false);
            transferForm.reset({
              sourceAccountId: cashAccountId,
              destinationAccountId: "",
              effectiveAt: new Date().toISOString().slice(0, 10),
              amount: 0,
            } as any);
          },
        }
      );
    }
  );

  function toIso(dateStr: string) {
    // Accept YYYY-MM-DD; convert to midnight UTC ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      return new Date(dateStr + "T00:00:00Z").toISOString();
    return new Date(dateStr).toISOString();
  }

  // Date helpers (local timezone), inclusive
  const toMsStart = (yyyyMmDd: string) =>
    new Date(`${yyyyMmDd}T00:00:00`).getTime();
  const toMsEnd = (yyyyMmDd: string) =>
    new Date(`${yyyyMmDd}T23:59:59.999`).getTime();

  const currentBalance = useMemo(() => {
    if (!balancesQ.data || !cashAccountId) return undefined;
    return balancesQ.data.find((b) => b.accountId === cashAccountId)?.balance;
  }, [balancesQ.data, cashAccountId]);

  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  // Apply filters: type + date range (client-side)
  const displayedRows = useMemo(() => {
    let rows = entriesQ.data?.rows || [];

    if (typeFilter !== "ALL")
      rows = rows.filter((r: any) => r.type === typeFilter);

    if (dateFrom) {
      const fromMs = toMsStart(dateFrom);
      rows = rows.filter(
        (r: any) => new Date(r.effectiveAt).getTime() >= fromMs
      );
    }
    if (dateTo) {
      const toMs = toMsEnd(dateTo);
      rows = rows.filter((r: any) => new Date(r.effectiveAt).getTime() <= toMs);
    }

    return rows;
  }, [entriesQ.data, typeFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const rows = displayedRows;
    let inSum = 0;
    let outSum = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (r.type === "IN") inSum += amt;
      else outSum += amt;
    }
    return { inSum, outSum, net: inSum - outSum };
  }, [displayedRows]);

  const handleDelete = async (row: any) => {
    const ok = await confirm({
      title: "Ștergere înregistrare",
      bodyTitle: "Confirmi ștergerea?",
      danger: true,
      description: "Această acțiune va elimina definitiv înregistrarea.",
    });
    if (!ok) return;
    try {
      await api.delete(`/api/cash-entries/${row.id}`);
      qc.invalidateQueries({ queryKey: ["cashEntries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
      successNotistack("Înregistrare ștearsă");
    } catch (e: any) {
      errorNotistack(e?.response?.data?.error || "Eroare ștergere");
    }
  };

  // Excel export (.xlsx) for current view (SOLD NET uses D)
  function exportXlsx() {
    const companyName =
      companiesQ.data?.find((c) => c.id === companyId)?.name || "companie";
    const accountName =
      accountsQ.data?.find((a) => a.id === cashAccountId)?.name || "cont";
    const typeName =
      typeFilter === "ALL"
        ? "toate"
        : typeFilter === "IN"
        ? "intrari"
        : "iesiri";

    const fileName = `registru-casa_${slug(companyName)}_${slug(
      accountName
    )}_${typeName}_${niceRange(dateFrom, dateTo)}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    const HEADER = [
      "Data",
      "Tip",
      "Sumă (RON)",
      "Sold (RON)",
      "Angajat",
      "Notițe",
    ];
    const body = displayedRows.map((r: any) => {
      const d = new Date(r.effectiveAt); // Excel Date
      const tip = r.type === "IN" ? "Intrare" : "Ieșire";
      const suma = Number(r.amount) || 0; // numbers, not formatted strings
      const sold = Number(r.runningBalance) || 0;
      const angajat = r.employee?.name || "";
      const notite = r.notes || "";
      return [d, tip, suma, sold, angajat, notite];
    });

    const dataStart = 2; // header is row 1
    const dataEnd = body.length + 1; // inclusive
    const typeCol = "B";
    const amountCol = "C";
    const soldCol = "D";

    const totalsRows = [
      [],
      [
        "",
        "",
        "TOTAL INTRĂRI",
        {
          f: `SUMIF(${typeCol}${dataStart}:${typeCol}${dataEnd},"Intrare",${amountCol}${dataStart}:${amountCol}${dataEnd})`,
        },
        "",
        "",
      ],
      [
        "",
        "",
        "TOTAL IEȘIRI",
        {
          f: `SUMIF(${typeCol}${dataStart}:${typeCol}${dataEnd},"Ieșire", ${amountCol}${dataStart}:${amountCol}${dataEnd})`,
        },
        "",
        "",
      ],
      [
        "",
        "",
        "SOLD NET",
        { f: `${soldCol}${dataEnd + 2}-${soldCol}${dataEnd + 3}` },
        "",
        "",
      ],
    ];

    const aoa = [HEADER, ...body, ...totalsRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, // Data
      { wch: 10 }, // Tip
      { wch: 14 }, // Sumă
      { wch: 14 }, // Sold
      { wch: 28 }, // Angajat
      { wch: 60 }, // Notițe
    ];

    // Autofilter over header+data (no totals)
    if (body.length > 0) ws["!autofilter"] = { ref: `A1:F${dataEnd}` };

    // Formats
    for (let r = 2; r <= dataEnd; r++) {
      const dateCell = ws[`A${r}`];
      if (dateCell) dateCell.z = "dd.mm.yyyy";
      const sumCell = ws[`C${r}`];
      if (sumCell && typeof sumCell.v === "number") sumCell.z = "#,##0.00";
      const soldCell = ws[`D${r}`];
      if (soldCell && typeof soldCell.v === "number") soldCell.z = "#,##0.00";
    }
    const totalsStart = dataEnd + 2;
    ["C", "C", "C"].forEach((col, idx) => {
      const cell = ws[`${col}${totalsStart + idx}`];
      if (cell) cell.z = "#,##0.00";
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registru");

    const wbout = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellDates: true,
    });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- GLOBAL SHORTCUTS (context-aware) ----------
  const shortcutsBlocked = entryOpen || showTransfer || !!editing;

  useEffect(() => {
    const isTypingOrUiOverlay = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();

      // direct typing targets
      if (el.isContentEditable) return true;
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (el.getAttribute('role') === 'textbox') return true; // e.g., MUI Autocomplete input

      // any ancestor explicitly opts out
      if (el.closest('[data-no-shortcuts="true"]')) return true;

      // dialogs/overlays (MUI)
      if (el.closest('[role="dialog"]')) return true;                  // Dialog
      if (document.querySelector('.MuiPickersPopper-root')) return true; // DatePicker open
      if (document.querySelector('.MuiPopover-root')) return true;       // Menus/Popovers

      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const active = (document.activeElement as HTMLElement | null) || null;

      // ignore IME composing, held keys, and modifier combos
      if (e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      // ignore if our modals are open or focus is in a typing/overlay context
      if (shortcutsBlocked || isTypingOrUiOverlay(target) || isTypingOrUiOverlay(active)) return;

      switch (e.key.toLowerCase()) {
        case '/': {
          const el = document.querySelector<HTMLInputElement>('input[aria-label="cautare-globala"]');
          if (el) { el.focus(); e.preventDefault(); }
          break;
        }
        case 'i':
          if (!cashAccountId) break;
          setEntryType('IN');
          setEntryOpen(true);
          break;
        case 'o':
          if (!cashAccountId) break;
          setEntryType('OUT');
          setEntryOpen(true);
          break;
        case 't':
          if (!cashAccountId) break;
          transferForm.reset({
            sourceAccountId: cashAccountId,
            destinationAccountId: '',
            effectiveAt: new Date().toISOString().slice(0,10),
            amount: 0,
          } as any);
          setShowTransfer(true);
          break;
        case 'r':
          entriesQ.refetch();
          balancesQ.refetch();
          break;
        case 'e':
          if (displayedRows.length) exportXlsx();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    shortcutsBlocked,
    cashAccountId,
    displayedRows.length,
    transferForm,
    entriesQ,
    balancesQ,
  ]);
  // ------------------------------------------------------

  // Columns
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "effectiveAt",
        header: "Data",
        size: 120,
        Cell: ({ cell }) => {
          const d = new Date(cell.getValue<string>());
          return (
            <Tooltip title={d.toLocaleString("ro-RO")}>
              <span>
                {d.toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: "rowIndex",
        header: "#",
        size: 56,
        Cell: ({ row }) => row.index + 1,
        enableColumnFilter: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "type",
        header: "Tip",
        size: 74,
        Cell: ({ cell }) => (
          <Chip
            size="small"
            variant="outlined"
            color={cell.getValue<string>() === "IN" ? "success" : "error"}
            label={cell.getValue<string>() === "IN" ? "Intrare" : "Ieșire"}
            sx={{ fontWeight: 600 }}
          />
        ),
        enableColumnFilter: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "amount",
        header: "Sumă",
        size: 110,
        Cell: ({ row }) => {
          const val = Number(row.original.amount) || 0;
          const isOut = row.original.type === "OUT";
          return (
            <Box
              sx={{
                textAlign: "right",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                color: isOut ? "error.main" : "success.dark",
                fontWeight: 600,
              }}
            >
              {isOut ? "-" : ""}{numberFmt.format(val)}
            </Box>
          );
        },
        enableGlobalFilter: false,
      },
      {
        accessorKey: "runningBalance",
        header: "Sold",
        size: 120,
        Cell: ({ cell }) => (
          <Box
            sx={{
              textAlign: "right",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
          >
            {numberFmt.format(Number(cell.getValue<number>() || 0))}
          </Box>
        ),
        enableColumnFilter: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: "employee.name",
        header: "Angajat",
        size: 220,
        accessorFn: (row) => row.employee?.name || "",
        Cell: ({ renderedCellValue }) => (
          <Box
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderedCellValue || "—"}
          </Box>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notițe",
        size: 420,
        Cell: ({ renderedCellValue }) => (
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {renderedCellValue}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acțiuni",
        size: 110,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        Cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Editează">
              <span>
                <IconButton
                  aria-label="edit-entry"
                  size="small"
                  onClick={() => setEditing(row.original)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Șterge">
              <span>
                <IconButton
                  aria-label="delete-entry"
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row.original)}
                  disabled={
                    createMut.status === "pending" ||
                    transferMut.status === "pending"
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [numberFmt, createMut.status, transferMut.status]
  );

  // full reset
  const resetAllFilters = () => {
    setTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setQuickRange("ALL");
    setPendingFilter("");
    setGlobalFilter("");
  };

  const table = useMaterialReactTable({
    columns,
    data: displayedRows,
    state: { isLoading: entriesQ.isLoading, globalFilter },
    onGlobalFilterChange: setPendingFilter,
    getRowId: (row) => row.id,

    layoutMode: "grid",
    defaultColumn: { minSize: 80, size: 120, maxSize: 1000 },
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    enableStickyHeader: true,

    enableRowVirtualization: true,
    enableColumnVirtualization: true,
    rowVirtualizerProps: { overscan: 10 },
    columnVirtualizerProps: { overscan: 2 },

    enableGlobalFilter: true,
    enableFacetedValues: true,
    enableColumnFilters: true,
    columnFilterDisplayMode: "popover",
    enableColumnFilterModes: true,
    enableSorting: true,
    enableMultiSort: true,
    enableRowSelection: false,
    enableDensityToggle: true,
    enableFullScreenToggle: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableHiding: true,
    enableFilterMatchHighlighting: true,

    globalFilterFn: "includesString",
    paginationDisplayMode: "pages",

    positionGlobalFilter: "right",
    positionToolbarAlertBanner: "bottom",

    initialState: {
      density: "compact",
      showGlobalFilter: true,
      showColumnFilters: false,
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ id: "effectiveAt", desc: true }],
    },

    muiTablePaperProps: {
      elevation: 0,
      sx: { borderRadius: 2, border: "1px solid", borderColor: "divider" },
    },
    muiTopToolbarProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 3,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      },
    },
    muiBottomToolbarProps: {
      sx: {
        position: "sticky",
        bottom: 0,
        zIndex: 3,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        backdropFilter: "saturate(140%) blur(6px)",
      },
    },

    muiTableBodyCellProps: {
      sx: {
        "& mark": {
          backgroundColor: "transparent",
          fontWeight: 700,
          textDecoration: "underline",
        },
      },
    },
    muiTableHeadCellProps: { sx: { whiteSpace: "nowrap" } },

    muiSearchTextFieldProps: {
      placeholder: "Căutare în toate coloanele… (/)",
      sx: { minWidth: "320px" },
      variant: "outlined",
      "aria-label": "cautare-globala",
    },

    localization: MRT_Localization_RO,

    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor:
          row.original.type === "IN"
            ? "rgba(56,142,60,0.06)"
            : "rgba(211,47,47,0.06)",
        "&:hover": {
          backgroundColor:
            row.original.type === "IN"
              ? "rgba(56,142,60,0.14)"
              : "rgba(211,47,47,0.14)",
        },
      },
    }),

    // Top toolbar: grouped filters & actions
    renderTopToolbarCustomActions: () => (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ p: 0.5, flexWrap: "wrap", rowGap: 1 }}
      >
        {/* Context selectors */}
        <TextField
          select
          size="small"
          label="Companie"
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setCashAccountId("");
          }}
          sx={{ minWidth: 200 }}
        >
          {companiesQ.data?.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Casierie"
          value={cashAccountId}
          onChange={(e) => setCashAccountId(e.target.value)}
          sx={{ minWidth: 200 }}
          disabled={!companyId}
        >
          {accountsQ.data?.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Filters */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={typeFilter}
          onChange={(_, v) => v && setTypeFilter(v)}
          aria-label="filtru-tip"
        >
          <ToggleButton value="ALL" aria-label="toate">
            Toate
          </ToggleButton>
          <ToggleButton value="IN" aria-label="intrari">
            Intrări
          </ToggleButton>
          <ToggleButton value="OUT" aria-label="iesiri">
            Ieșiri
          </ToggleButton>
        </ToggleButtonGroup>

        <DatePicker
          label="De la"
          format="DD.MM.YYYY"
          value={dateFrom ? dayjs(dateFrom) : null}
          onChange={(d) => {
            const valid = d && d.isValid();
            setDateFrom(valid ? d.format('YYYY-MM-DD') : '');
          }}
          slotProps={{
            textField: {
              size: 'small',
              sx: { minWidth: 160 },
              InputLabelProps: { shrink: true },
            },
          }}
        />
        <DatePicker
          label="Până la"
          format="DD.MM.YYYY"
          value={dateTo ? dayjs(dateTo) : null}
          onChange={(d) => {
            const valid = d && d.isValid();
            setDateTo(valid ? d.format('YYYY-MM-DD') : '');
          }}
          minDate={dateFrom ? dayjs(dateFrom) : undefined}
          slotProps={{
            textField: {
              size: 'small',
              sx: { minWidth: 160 },
              InputLabelProps: { shrink: true },
            },
          }}
        />

        {/* Quick ranges as toggle */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={quickRange}
          onChange={(_, v: QuickRange) => v && applyQuickRange(v)}
          aria-label="interval-rapid"
        >
          <ToggleButton value="TODAY">Azi</ToggleButton>
          <ToggleButton value="WEEK">Săpt.</ToggleButton>
          <ToggleButton value="MONTH">Luna</ToggleButton>
          <ToggleButton value="YEAR">An</ToggleButton>
          <ToggleButton value="ALL">Toate</ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title="Resetează toate filtrele (tip, interval, căutare)">
          <span>
            <IconButton
              aria-label="reset-filtre"
              size="small"
              onClick={resetAllFilters}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Primary actions */}
        <Tooltip title="Scurtături: / i o t r e">
          <span>
            <IconButton size="small" aria-label="scurtaturi">
              <KeyboardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={exportXlsx}
          disabled={entriesQ.isLoading || displayedRows.length === 0}
        >
          Export Excel
        </Button>

        <Tooltip title="Transfer">
          <span>
            <IconButton
              aria-label="transfer"
              size="small"
              onClick={() => {
                if (!cashAccountId) return;
                transferForm.reset({
                  sourceAccountId: cashAccountId,
                  destinationAccountId: "",
                  effectiveAt: new Date().toISOString().slice(0, 10),
                  amount: 0,
                } as any);
                setShowTransfer(true);
              }}
            >
              <CompareArrowsIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Reîncarcă (r)">
          <span>
            <IconButton
              aria-label="refresh"
              size="small"
              onClick={() => {
                entriesQ.refetch();
                balancesQ.refetch();
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Add actions */}
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<AddRoundedIcon />}
          onClick={() => {
            if (!cashAccountId) return;
            setEntryType("IN");
            setEntryOpen(true);
          }}
        >
          Intrare
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          startIcon={<RemoveCircleOutlineIcon />}
          onClick={() => {
            if (!cashAccountId) return;
            setEntryType("OUT");
            setEntryOpen(true);
          }}
        >
          Ieșire
        </Button>

        {/* Balance */}
        <Paper
          variant="outlined"
          sx={{
            ml: 1,
            px: 1,
            py: 0.5,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Sold
          </Typography>
          <Chip
            size="small"
            color={currentBalance && currentBalance < 0 ? "error" : "success"}
            label={
              currentBalance !== undefined
                ? `${numberFmt.format(currentBalance)} RON`
                : "—"
            }
          />
        </Paper>
      </Stack>
    ),

    // Sticky totals bar
    renderBottomToolbarCustomActions: () => (
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        sx={{ px: 1, py: 0.75, flexWrap: "wrap" }}
      >
        <Typography variant="body2">
          Total Intrări:{" "}
          <strong style={{ color: "#2e7d32" }}>
            {numberFmt.format(totals.inSum)}
          </strong>
        </Typography>
        <Typography variant="body2">
          Total Ieșiri:{" "}
          <strong style={{ color: "#d32f2f" }}>
            {numberFmt.format(totals.outSum)}
          </strong>
        </Typography>
        <Typography variant="body2">
          Sold Net:{" "}
          <strong style={{ color: totals.net >= 0 ? "#2e7d32" : "#d32f2f" }}>
            {numberFmt.format(totals.net)}
          </strong>
        </Typography>
      </Stack>
    ),

    // Friendly empty state when no matching data
    renderEmptyRowsFallback: () => (
      <Box
        sx={{
          py: 6,
          textAlign: "center",
          color: "text.secondary",
          width: "100%",
        }}
      >
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Nicio înregistrare pentru filtrele curente
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Ajustează intervalul sau tipul de tranzacție, ori adaugă una nouă.
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={resetAllFilters}
          >
            Resetează filtre
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              if (!cashAccountId) return;
              setEntryType("IN");
              setEntryOpen(true);
            }}
          >
            Adaugă intrare
          </Button>
        </Stack>
      </Box>
    ),
  });

  return (
    <Stack p={2} gap={2} height="100%" overflow="hidden">
      <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Inventory2RoundedIcon color="primary" sx={{ fontSize: 32, mr: 1 }} />
        Registru de Casă
      </Typography>

      {entriesQ.isError && (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={() => { entriesQ.refetch(); balancesQ.refetch(); }}>
              Reîncearcă
            </Button>
          }
        >
          Eroare la încărcare
        </Alert>
      )}

      <Box flex={1} minHeight={0}>
        <MaterialReactTable table={table} />
      </Box>

      {/* Add Entry Modal */}
      <AddCashEntryModal
        open={entryOpen}
        type={entryType}
        cashAccountId={cashAccountId}
        onClose={() => setEntryOpen(false)}
        onCreate={(payload) => createMut.mutateAsync(payload)}
      />

      {/* Edit Entry Modal */}
      <EditCashEntryModal
        open={!!editing}
        entry={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["cashEntries"] });
          successNotistack("Înregistrare actualizată");
        }}
      />

      {/* Transfer Dialog */}
      <Dialog
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ 'data-no-shortcuts': true }} // opt-out inside this dialog
      >
        <DialogTitle>Transfer între casierii</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <Stack direction="row" spacing={2}>
            <TextField
              select
              size="small"
              label="Din cont"
              value={transferForm.watch("sourceAccountId")}
              onChange={(e) =>
                transferForm.setValue("sourceAccountId", e.target.value)
              }
              sx={{ flex: 1 }}
            >
              {accountsQ.data?.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="În cont"
              value={transferForm.watch("destinationAccountId")}
              onChange={(e) =>
                transferForm.setValue("destinationAccountId", e.target.value)
              }
              sx={{ flex: 1 }}
            >
              {accountsQ.data
                ?.filter((a) => a.id !== transferForm.watch("sourceAccountId"))
                .map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Data"
              type="date"
              size="small"
              value={transferForm.watch("effectiveAt")}
              onChange={(e) =>
                transferForm.setValue("effectiveAt", e.target.value)
              }
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Sumă"
              type="number"
              size="small"
              value={transferForm.watch("amount")}
              onChange={(e) =>
                transferForm.setValue("amount", Number(e.target.value))
              }
              sx={{ width: 160 }}
            />
          </Stack>
          <Autocomplete
            size="small"
            options={employeesQ.data || []}
            getOptionLabel={(o) => o.name}
            value={
              employeesQ.data?.find(
                (e) => e.id === transferForm.watch("employeeId")
              ) || null
            }
            onChange={(_e, val) =>
              transferForm.setValue("employeeId", val?.id || null)
            }
            renderInput={(params) => <TextField {...params} label="Angajat" />}
          />
          <TextField
            label="Notițe"
            size="small"
            multiline
            minRows={2}
            value={transferForm.watch("notes") || ""}
            onChange={(e) => transferForm.setValue("notes", e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={transferForm.watch("overrideNegative") || false}
                onChange={(e) =>
                  transferForm.setValue("overrideNegative", e.target.checked)
                }
              />
            }
            label="Permite sold negativ la sursă"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransfer(false)}>Anulează</Button>
          <Button
            variant="contained"
            onClick={submitTransfer}
            disabled={transferMut.status === "pending"}
          >
            {transferMut.status === "pending" ? "Transfer..." : "Transferă"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
