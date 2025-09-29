// src/pages/suppliers/SuppliersPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { Box, Paper, Stack, Typography, Button, TextField, IconButton, Tooltip, CircularProgress, Chip, Divider, MenuItem, Switch, FormControlLabel, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
// Removed MUI Grid usage (type issues) and replaced with simple CSS grid Boxes below.
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ro";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import useNotistack from "../orders/hooks/useNotistack";
import { useConfirm } from "../common/confirm/ConfirmProvider";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
  type SupplierPayload,
} from "../../api/suppliers";
import { tableLocalization } from "../../localization/tableLocalization";

dayjs.locale("ro");

// ---------- helpers
const dmy = (v?: string | Date | null) => {
  if (!v) return "—";
  const d = typeof v === "string" ? dayjs(v) : dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY") : "—";
};
const toIsoDate = (d: Dayjs | null) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");

const TIP_OPTIONS = ["SRL", "SA", "PFA", "II", "IF", "ONG", "Altul"];
const PLATA_OPTIONS = ["OP", "Numerar", "Card"];
const STATUS_OPTIONS = ["activ", "inactiv"] as const;

// ---------- columns (aligned with ClientsTable: filters, global search, fallback "—")
const mkColumns = (): MRT_ColumnDef<Supplier>[] => [
  {
    accessorKey: "denumire",
    header: "Denumire",
    size: 280,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    Cell: ({ renderedCellValue }) => renderedCellValue || "—",
  },
  {
    accessorKey: "id_tert",
    header: "ID Tert",
    size: 120,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (row) => row.id_tert || "",
    Cell: ({ renderedCellValue }) => renderedCellValue || "—",
  },
  {
    accessorKey: "cui_cif",
    header: "CUI / CIF",
    size: 130,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (row) => row.cui_cif || "",
    Cell: ({ renderedCellValue }) => renderedCellValue || "—",
  },
  {
    accessorKey: "nrRegCom",
    header: "Nr. Reg. Com.",
    size: 150,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (row) => row.nrRegCom || "",
    Cell: ({ renderedCellValue }) => renderedCellValue || "—",
  },
  {
    accessorKey: "tip",
    header: "Tip",
    size: 90,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    Cell: ({ cell }) => <Chip size="small" label={cell.getValue<string>() || "—"} />,
  },
  {
    accessorKey: "tva",
    header: "TVA",
    size: 80,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    Cell: ({ row }) =>
      row.original.tva ? (
        <Chip size="small" color="success" label="Plătitor" />
      ) : (
        <Chip size="small" label="Neplătitor" />
      ),
  },
  {
    accessorKey: "tvaData",
    header: "TVA din",
    size: 110,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (row) => row.tvaData || "",
    Cell: ({ cell }) => dmy(cell.getValue<string>()),
  },
  {
    id: "loc",
    header: "Locație",
    size: 220,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (r) => [r.oras, r.judet, r.tara].filter(Boolean).join(", "),
    Cell: ({ renderedCellValue }) => renderedCellValue || "—",
  },
  { accessorKey: "adresa", header: "Adresă", size: 260, enableColumnFilter: true, enableGlobalFilter: true, Cell: ({ renderedCellValue }) => renderedCellValue || "—" },
  { accessorKey: "contactNume", header: "Contact", size: 180, enableColumnFilter: true, enableGlobalFilter: true, accessorFn: (r) => r.contactNume || "", Cell: ({ renderedCellValue }) => renderedCellValue || "—" },
  { accessorKey: "telefon", header: "Telefon", size: 130, enableColumnFilter: true, enableGlobalFilter: true, accessorFn: (r) => r.telefon || "", Cell: ({ renderedCellValue }) => renderedCellValue || "—" },
  {
    accessorKey: "email",
    header: "Email",
    size: 220,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (r) => r.email || "",
    Cell: ({ cell }) => {
      const v = cell.getValue<string>();
      return v ? (
        <a href={`mailto:${v}`} style={{ textDecoration: "none" }}>
          {v}
        </a>
      ) : (
        "—"
      );
    },
  },
  {
    accessorKey: "site",
    header: "Site",
    size: 220,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (r) => r.site || "",
    Cell: ({ cell }) => {
      const v = (cell.getValue<string>() || "").trim();
      if (!v) return "—";
      const href = v.startsWith("http") ? v : `https://${v}`;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          {v}
        </a>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 100,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    accessorFn: (r) => r.status || "",
    Cell: ({ cell }) => {
      const v = cell.getValue<string>();
      return (
        <Chip
          size="small"
          label={v || "—"}
          color={v === "activ" ? "success" : "default"}
          variant={v === "activ" ? "filled" : "outlined"}
        />
      );
    },
  },
];

// ---------- component
export default function SuppliersPage() {
  const { successNotistack, errorNotistack } = useNotistack();

  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [openUpsert, setOpenUpsert] = useState<null | { mode: "add" | "edit"; row?: Supplier }>(null);
  const confirm = useConfirm();

  // upsert form
  const emptyForm: SupplierPayload = {
  id_tert: "",
    denumire: "",
    cui_cif: "",
    nrRegCom: "",
    tip: "SRL",
    tva: false,
    tvaData: null,
    adresa: "",
    oras: "",
    judet: "",
    tara: "România",
    contactNume: "",
    email: "",
    telefon: "",
    site: "",
    metodaPlata: "OP",
    termenPlata: 30,
    contBancar: "",
    banca: "",
    status: "activ",
    notite: "",
  };

  const [form, setForm] = useState<SupplierPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSuppliers();
      setRows(data);
    } catch (e: any) {
      const msg = e?.message || "Eroare la încărcarea furnizorilor";
      setError(msg);
      errorNotistack(msg);
    } finally {
      setLoading(false);
    }
  }, [errorNotistack]);

  useEffect(() => {
    void load();
  }, [load]);

  const cols = useMemo(() => mkColumns(), []);

  // ---------- validation
  const validate = (f: SupplierPayload) => {
    const errs: Record<string, string | undefined> = {};
    if (!f.denumire?.trim()) errs.denumire = "Denumirea este obligatorie";
    if (!f.cui_cif?.trim()) errs.cui_cif = "CUI/CIF este obligatoriu";
    const valid = Object.values(errs).every((v) => !v);
    return { errs, valid };
  };
  const { errs, valid } = useMemo(() => validate(form), [form]);

  // ---------- CRUD
  const startAdd = () => {
    setForm(emptyForm);
    setOpenUpsert({ mode: "add" });
  };
  const startEdit = (row: Supplier) => {
    setForm({
  id_tert: row.id_tert ?? "",
      denumire: row.denumire,
      cui_cif: row.cui_cif,
      nrRegCom: row.nrRegCom ?? "",
      tip: row.tip,
      tva: row.tva,
      tvaData: row.tvaData ?? null,
      adresa: row.adresa,
      oras: row.oras,
      judet: row.judet,
      tara: row.tara,
      contactNume: row.contactNume,
      email: row.email,
      telefon: row.telefon,
      site: row.site ?? "",
      metodaPlata: row.metodaPlata,
      termenPlata: row.termenPlata,
      contBancar: row.contBancar,
      banca: row.banca,
      status: row.status,
      notite: row.notite ?? "",
    });
    setOpenUpsert({ mode: "edit", row });
  };

  const doSave = async () => {
    try {
      setSaving(true);
      if (openUpsert?.mode === "add") {
        await createSupplier(form);
        successNotistack("Furnizor creat");
      } else if (openUpsert?.mode === "edit" && openUpsert.row) {
        await updateSupplier(openUpsert.row.id, form);
        successNotistack("Furnizor actualizat");
      }
      setOpenUpsert(null);
      await load();
    } catch (e: any) {
      errorNotistack(e?.message || "Nu am putut salva furnizorul");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (row: Supplier) => {
    try {
      setSaving(true);
      await deleteSupplier(row.id);
      await load();
      successNotistack("Furnizor șters");
    } catch (e: any) {
      errorNotistack(e?.message || "Nu am putut șterge furnizorul");
    } finally {
      setSaving(false);
    }
  };

  // ---------- table (mirrors ClientsTable settings/styling)
  const table = useMaterialReactTable({
    columns: cols,
    data: rows,
    localization: tableLocalization,
    state: { isLoading: loading, showAlertBanner: !!error },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
      density: "comfortable",
      showGlobalFilter: true,
    },
    enableGlobalFilter: true,
    enableFacetedValues: true,
    enableColumnFilters: true,
    enableColumnFilterModes: true,
    enableSorting: true,
    enableMultiSort: true,
    enableRowSelection: false, // same as ClientsTable
    enableRowActions: true,
    enableDensityToggle: true,
    enableFullScreenToggle: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
    enableHiding: true,

    globalFilterFn: "includesString",
    paginationDisplayMode: "pages",

    positionActionsColumn: "last",
    positionGlobalFilter: "right",
    positionToolbarAlertBanner: "bottom",

    muiTableBodyRowProps: ({ row, table }) => {
      const visibleRows = table.getRowModel().rows;
      const displayIndex = visibleRows.findIndex((r) => r.id === row.id);
      return {
        sx: {
          backgroundColor: displayIndex % 2 === 0 ? "action.hover" : "inherit",
          cursor: "pointer",
        },
        onClick: () => {
          // optional click
          // console.log('Row clicked:', row.original);
        },
      };
    },

    muiSearchTextFieldProps: {
      placeholder: "Caută furnizori...",
      sx: { minWidth: "300px" },
      variant: "outlined",
    },

    renderRowActions: ({ row }) => (
      <Stack direction="row" gap={1}>
        {row.original.site ? (
          <Tooltip title="Deschide site" arrow>
            <span>
              <IconButton
                size="small"
                component="a"
                href={row.original.site.startsWith("http") ? row.original.site : `https://${row.original.site}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip title="Editează">
          <span>
            <IconButton size="small" onClick={() => startEdit(row.original)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Șterge">
          <span>
            <IconButton
              color="error"
              size="small"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Ștergere furnizor',
                  bodyTitle: 'Ești sigur că vrei să ștergi?',
                  description: (
                    <>Furnizorul <strong>{row.original.denumire}</strong> va fi șters permanent.</>
                  ),
                  confirmText: 'Șterge',
                  cancelText: 'Anulează',
                  danger: true,
                });
                if (!ok) return;
                await doDelete(row.original);
              }}
              disabled={saving}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    ),
  });

  return (
    <Box sx={{ width: "100vw", height: "100vh", p: 0, m: 0, bgcolor: "background.default" }}>
      <Paper elevation={2} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Furnizori</Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={startAdd}>
              Adaugă furnizor
            </Button>
            <Button variant="outlined" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : "Reîncarcă"}
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Table */}
        <Box sx={{ flex: 1, minHeight: 0, maxHeight: "calc(100vh - 150px)", overflow: "auto" }}>
          <MaterialReactTable table={table} />
        </Box>
      </Paper>

      {/* Add / Edit dialog */}
      <Dialog
        open={!!openUpsert}
        onClose={() => setOpenUpsert(null)}
        fullWidth
        maxWidth="md"
        keepMounted={false}
      >
        <DialogTitle>
          {openUpsert?.mode === "add" ? "Adaugă furnizor" : `Editează — ${openUpsert?.row?.denumire}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {/* Identificare */}
            <Typography variant="subtitle2" color="text.secondary">Identificare</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' } }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <TextField
                  label="Denumire"
                  value={form.denumire}
                  onChange={(e) => setForm((f) => ({ ...f, denumire: e.target.value }))}
                  fullWidth
                  required
                  error={!!errs.denumire}
                  helperText={errs.denumire}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  label="ID Tert contabil"
                  value={form.id_tert ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, id_tert: e.target.value }))}
                  fullWidth
                  placeholder="ex: 12345"
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  label="CUI / CIF"
                  value={form.cui_cif}
                  onChange={(e) => setForm((f) => ({ ...f, cui_cif: e.target.value.trim() }))}
                  fullWidth
                  required
                  error={!!errs.cui_cif}
                  helperText={errs.cui_cif}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  label="Nr. Reg. Com."
                  value={form.nrRegCom ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nrRegCom: e.target.value }))}
                  fullWidth
                />
              </Box>

              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  select
                  label="Tip"
                  value={form.tip}
                  onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
                  fullWidth
                >
                  {TIP_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' }, display: 'flex', alignItems: 'center', pl: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.tva}
                      onChange={(e) => setForm((f) => ({ ...f, tva: e.target.checked }))}
                    />
                  }
                  label="Plătitor TVA"
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <DatePicker
                  label="TVA din data"
                  disabled={!form.tva}
                  format="DD/MM/YYYY"
                  value={form.tvaData ? dayjs(form.tvaData) : null}
                  onChange={(d) => setForm((f) => ({ ...f, tvaData: toIsoDate(d) || null }))}
                  slotProps={{
                    textField: { fullWidth: true, error: !!errs.tvaData, helperText: errs.tvaData },
                  }}
                />
              </Box>
            </Box>

            <Divider />

            {/* Adresă & Contact */}
            <Typography variant="subtitle2" color="text.secondary">Adresă & Contact</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' } }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 8' } }}>
                <TextField
                  label="Adresă"
                  value={form.adresa}
                  onChange={(e) => setForm((f) => ({ ...f, adresa: e.target.value }))}
                  fullWidth
                  error={!!errs.adresa}
                  helperText={errs.adresa}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Oraș"
                  value={form.oras}
                  onChange={(e) => setForm((f) => ({ ...f, oras: e.target.value }))}
                  fullWidth
                  error={!!errs.oras}
                  helperText={errs.oras}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Județ"
                  value={form.judet}
                  onChange={(e) => setForm((f) => ({ ...f, judet: e.target.value }))}
                  fullWidth
                  error={!!errs.judet}
                  helperText={errs.judet}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Țara"
                  value={form.tara}
                  onChange={(e) => setForm((f) => ({ ...f, tara: e.target.value }))}
                  fullWidth
                  error={!!errs.tara}
                  helperText={errs.tara}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Site"
                  value={form.site ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  fullWidth
                  placeholder="ex: https://exemplu.ro"
                />
              </Box>

              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Nume persoană contact"
                  value={form.contactNume}
                  onChange={(e) => setForm((f) => ({ ...f, contactNume: e.target.value }))}
                  fullWidth
                  error={!!errs.contactNume}
                  helperText={errs.contactNume}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.trim() }))}
                  fullWidth
                  error={!!errs.email}
                  helperText={errs.email}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                <TextField
                  label="Telefon"
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value.trim() }))}
                  fullWidth
                  error={!!errs.telefon}
                  helperText={errs.telefon}
                />
              </Box>
            </Box>

            <Divider />

            {/* Plăți & Bancă */}
            <Typography variant="subtitle2" color="text.secondary">Plăți & Bancă</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' } }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  select
                  label="Metodă plată"
                  value={form.metodaPlata}
                  onChange={(e) => setForm((f) => ({ ...f, metodaPlata: e.target.value }))}
                  fullWidth
                  error={!!errs.metodaPlata}
                  helperText={errs.metodaPlata}
                >
                  {PLATA_OPTIONS.map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  type="number"
                  label="Termen plată (zile)"
                  inputProps={{ min: 0 }}
                  value={form.termenPlata}
                  onChange={(e) => setForm((f) => ({ ...f, termenPlata: Math.max(0, Number(e.target.value || 0)) }))}
                  fullWidth
                  error={!!errs.termenPlata}
                  helperText={errs.termenPlata}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  label="Cont bancar (IBAN)"
                  value={form.contBancar}
                  onChange={(e) => setForm((f) => ({ ...f, contBancar: e.target.value.trim() }))}
                  fullWidth
                  error={!!errs.contBancar}
                  helperText={errs.contBancar}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  label="Banca"
                  value={form.banca}
                  onChange={(e) => setForm((f) => ({ ...f, banca: e.target.value }))}
                  fullWidth
                  error={!!errs.banca}
                  helperText={errs.banca}
                />
              </Box>
            </Box>

            <Divider />

            {/* Status & Note */}
            <Typography variant="subtitle2" color="text.secondary">Status & Note</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' } }}>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof STATUS_OPTIONS[number] }))}
                  fullWidth
                  error={!!errs.status}
                  helperText={errs.status}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 9' } }}>
                <TextField
                  label="Notițe"
                  value={form.notite ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notite: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpsert(null)}>Anulează</Button>
          <Button variant="contained" onClick={doSave} disabled={saving || !valid}>
            {saving ? <CircularProgress size={18} /> : "Salvează"}
          </Button>
        </DialogActions>
      </Dialog>

  {/* delete handled by global ConfirmProvider */}
    </Box>
  );
}
