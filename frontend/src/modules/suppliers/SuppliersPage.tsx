
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ro";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import useNotistack from "../orders/hooks/useNotistack";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
  type SupplierPayload,
} from "../../api/suppliers";

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

// ---------- columns
const mkColumns = (): MRT_ColumnDef<Supplier>[] => [
  { accessorKey: "denumire", header: "Denumire", size: 280 },
  { accessorKey: "cui_cif", header: "CUI / CIF", size: 130 },
  {
    accessorKey: "tip",
    header: "Tip",
    size: 90,
    Cell: ({ cell }) => <Chip size="small" label={cell.getValue<string>()} />,
  },
  {
    accessorKey: "tva",
    header: "TVA",
    size: 80,
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
    Cell: ({ cell }) => dmy(cell.getValue<string>()),
  },
  {
    id: "loc",
    header: "Locație",
    size: 220,
    accessorFn: (r) => [r.oras, r.judet, r.tara].filter(Boolean).join(", "),
  },
  { accessorKey: "contactNume", header: "Contact", size: 180 },
  { accessorKey: "telefon", header: "Telefon", size: 130 },
  {
    accessorKey: "email",
    header: "Email",
    size: 220,
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
    accessorKey: "status",
    header: "Status",
    size: 100,
    Cell: ({ cell }) => {
      const v = cell.getValue<string>();
      return (
        <Chip
          size="small"
          label={v}
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
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  // upsert form
  const emptyForm: SupplierPayload = {
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
      setConfirmDelete(null);
      await load();
      successNotistack("Furnizor șters");
    } catch (e: any) {
      errorNotistack(e?.message || "Nu am putut șterge furnizorul");
    } finally {
      setSaving(false);
    }
  };

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
        <MaterialReactTable
          columns={cols}
          data={rows}
          state={{ isLoading: loading }}
          enableRowActions
          positionActionsColumn="last"
          initialState={{
            density: "compact",
            pagination: { pageIndex: 0, pageSize: 10 },
            sorting: [{ id: "denumire", desc: false }],
          }}
          renderRowActions={({ row }) => (
            <Stack direction="row" spacing={1}>
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
              <Tooltip title="Editează" arrow>
                <span>
                  <IconButton size="small" onClick={() => startEdit(row.original)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Șterge" arrow>
                <span>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => setConfirmDelete(row.original)}
                    disabled={saving}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        />
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
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Denumire"
                  value={form.denumire}
                  onChange={(e) => setForm((f) => ({ ...f, denumire: e.target.value }))}
                  fullWidth
                  required
                  error={!!errs.denumire}
                  helperText={errs.denumire}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="CUI / CIF"
                  value={form.cui_cif}
                  onChange={(e) => setForm((f) => ({ ...f, cui_cif: e.target.value.trim() }))}
                  fullWidth
                  required
                  error={!!errs.cui_cif}
                  helperText={errs.cui_cif}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Nr. Reg. Com."
                  value={form.nrRegCom ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nrRegCom: e.target.value }))}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Tip"
                  value={form.tip}
                  onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.tip}
                  helperText={errs.tip}
                >
                  {TIP_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.tva}
                      onChange={(e) => setForm((f) => ({ ...f, tva: e.target.checked }))}
                    />
                  }
                  label="Plătitor TVA"
                />
              </Grid>
              <Grid item xs={12} md={3}>
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
              </Grid>
            </Grid>

            <Divider />

            {/* Adresă & Contact */}
            <Typography variant="subtitle2" color="text.secondary">Adresă & Contact</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Adresă"
                  value={form.adresa}
                  onChange={(e) => setForm((f) => ({ ...f, adresa: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.adresa}
                  helperText={errs.adresa}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Oraș"
                  value={form.oras}
                  onChange={(e) => setForm((f) => ({ ...f, oras: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.oras}
                  helperText={errs.oras}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Județ"
                  value={form.judet}
                  onChange={(e) => setForm((f) => ({ ...f, judet: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.judet}
                  helperText={errs.judet}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Țara"
                  value={form.tara}
                  onChange={(e) => setForm((f) => ({ ...f, tara: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.tara}
                  helperText={errs.tara}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Site"
                  value={form.site ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  fullWidth
                  placeholder="ex: https://exemplu.ro"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Nume persoană contact"
                  value={form.contactNume}
                  onChange={(e) => setForm((f) => ({ ...f, contactNume: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.contactNume}
                  helperText={errs.contactNume}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.trim() }))}
                  fullWidth
                  error={!!errs.email}
                  helperText={errs.email}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Telefon"
                  value={form.telefon}
                  onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value.trim() }))}
                  fullWidth
                  error={!!errs.telefon}
                  helperText={errs.telefon}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Plăți & Bancă */}
            <Typography variant="subtitle2" color="text.secondary">Plăți & Bancă</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Metodă plată"
                  value={form.metodaPlata}
                  onChange={(e) => setForm((f) => ({ ...f, metodaPlata: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.metodaPlata}
                  helperText={errs.metodaPlata}
                >
                  {PLATA_OPTIONS.map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  type="number"
                  label="Termen plată (zile)"
                  inputProps={{ min: 0 }}
                  value={form.termenPlata}
                  onChange={(e) => setForm((f) => ({ ...f, termenPlata: Math.max(0, Number(e.target.value || 0)) }))}
                  fullWidth
                  // required
                  error={!!errs.termenPlata}
                  helperText={errs.termenPlata}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Cont bancar (IBAN)"
                  value={form.contBancar}
                  onChange={(e) => setForm((f) => ({ ...f, contBancar: e.target.value.trim() }))}
                  fullWidth
                  // required
                  error={!!errs.contBancar}
                  helperText={errs.contBancar}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Banca"
                  value={form.banca}
                  onChange={(e) => setForm((f) => ({ ...f, banca: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.banca}
                  helperText={errs.banca}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Status & Note */}
            <Typography variant="subtitle2" color="text.secondary">Status & Note</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  fullWidth
                  // required
                  error={!!errs.status}
                  helperText={errs.status}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField
                  label="Notițe"
                  value={form.notite ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notite: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpsert(null)}>Anulează</Button>
          <Button variant="contained" onClick={doSave} disabled={saving || !valid}>
            {saving ? <CircularProgress size={18} /> : "Salvează"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Ștergere furnizor</DialogTitle>
        <DialogContent>
          Doriți să ștergeți furnizorul <strong>{confirmDelete?.denumire}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Anulează</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDelete && doDelete(confirmDelete)}
            disabled={saving}
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
