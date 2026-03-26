import { Box, Button, Checkbox, Chip, CircularProgress, Collapse, Divider, FormControlLabel, IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ClearIcon from '@mui/icons-material/Clear';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { CarDocumentType, CarDocumentHistoryEntry } from '../../api/cars';

export type CarDocumentFileMap = Record<CarDocumentType, File | null>;
export type CarDocumentPathMap = Partial<Record<CarDocumentType, string | null>>;

export const EMPTY_CAR_DOCUMENT_FILES: CarDocumentFileMap = {
  RCA: null,
  CASCO: null,
  VINIETA: null,
  ITP: null,
};

const DOC_TYPES: { type: CarDocumentType; label: string; color: string; bg: string }[] = [
  { type: 'RCA',    label: 'RCA',    color: '#1565c0', bg: '#e3f2fd' },
  { type: 'CASCO',  label: 'CASCO',  color: '#e65100', bg: '#fff3e0' },
  { type: 'VINIETA',label: 'Vinieta',color: '#6a1b9a', bg: '#f3e5f5' },
  { type: 'ITP',    label: 'ITP',    color: '#1b5e20', bg: '#e8f5e9' },
];

const DOC_EXPIRY_LABELS: Record<CarDocumentType, string> = {
  ITP:    'Expirare ITP',
  RCA:    'Expirare RCA',
  CASCO:  'Expirare CASCO',
  VINIETA:'Expirare Rovinietă',
};

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

export interface CarDocumentsSectionProps {
  files: CarDocumentFileMap;
  existingPaths?: CarDocumentPathMap;
  deletingTypes?: Partial<Record<CarDocumentType, boolean>>;
  disableActions?: boolean;
  onPickFile: (type: CarDocumentType, file: File | null) => void;
  onDeleteExisting?: (type: CarDocumentType) => void;
  toPublicUrl: (storedPath: string) => string;
  expiryDates?: Partial<Record<CarDocumentType, Dayjs | null>>;
  onExpiryDateChange?: (type: CarDocumentType, date: Dayjs | null) => void;
  rcaDecontareDirecta?: boolean;
  onRcaDecontareChange?: (checked: boolean) => void;
  history?: CarDocumentHistoryEntry[];
  onDeleteHistory?: (historyId: string) => Promise<void>;
}

export default function CarDocumentsSection({
  files,
  existingPaths,
  deletingTypes,
  disableActions,
  onPickFile,
  onDeleteExisting,
  toPublicUrl,
  expiryDates,
  onExpiryDateChange,
  rcaDecontareDirecta,
  onRcaDecontareChange,
  history = [],
  onDeleteHistory,
}: CarDocumentsSectionProps) {
  const [openHistory, setOpenHistory] = useState<Partial<Record<CarDocumentType, boolean>>>({});
  const [deletingHistory, setDeletingHistory] = useState<Record<string, boolean>>({});

  const toggleHistory = (type: CarDocumentType) =>
    setOpenHistory((prev) => ({ ...prev, [type]: !prev[type] }));

  const handleDeleteHistory = async (historyId: string) => {
    if (!onDeleteHistory) return;
    setDeletingHistory((prev) => ({ ...prev, [historyId]: true }));
    try { await onDeleteHistory(historyId); }
    finally { setDeletingHistory((prev) => ({ ...prev, [historyId]: false })); }
  };

  return (
    <Stack spacing={1.5}>
      {DOC_TYPES.map(({ type, label, color, bg }) => {
        const selectedFile = files[type];
        const existingPath = existingPaths?.[type] || null;
        const deleting = Boolean(deletingTypes?.[type]);
        const typeHistory = history.filter((h) => h.docType === type);
        const historyOpen = Boolean(openHistory[type]);

        return (
          <Box
            key={type}
            sx={{
              border: '2px solid',
              borderColor: color,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {/* Colored header bar */}
            <Box sx={{ bgcolor: bg, px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>
                {label}
              </Typography>

              {/* Status chips */}
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                {existingPath && (
                  <Chip
                    size="small"
                    icon={<DescriptionOutlinedIcon />}
                    label="Document curent"
                    sx={{ bgcolor: color, color: '#fff', '& .MuiChip-icon': { color: '#fff' }, fontWeight: 600, fontSize: 11 }}
                  />
                )}
                {selectedFile && (
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<UploadFileOutlinedIcon />}
                    label={`Nou: ${selectedFile.name}`}
                    sx={{ borderColor: color, color, '& .MuiChip-icon': { color }, maxWidth: 220, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  />
                )}
                {!existingPath && !selectedFile && (
                  <Chip size="small" variant="outlined" label="Fără document" sx={{ borderColor: color, color }} />
                )}
              </Stack>
            </Box>

            <Box sx={{ p: 1.5 }}>
              {/* Current document row */}
              {existingPath && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <DescriptionOutlinedIcon sx={{ color, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">
                    Document curent
                  </Typography>
                  <Link
                    href={toPublicUrl(existingPath)}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{ fontSize: 13, color, display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} /> Deschide
                  </Link>
                  {onDeleteExisting && (
                    <Tooltip title="Șterge documentul curent">
                      <span>
                        <IconButton color="error" size="small" onClick={() => onDeleteExisting(type)} disabled={disableActions || deleting}>
                          {deleting ? <CircularProgress size={14} /> : <DeleteOutlineIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              )}

              {/* Pending new file row */}
              {selectedFile && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, p: 0.75, bgcolor: '#f0f7ff', borderRadius: 1, border: '1px dashed', borderColor: color }}>
                  <UploadFileOutlinedIcon sx={{ color, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </Typography>
                  <Tooltip title="Anulează alegerea">
                    <IconButton size="small" onClick={() => onPickFile(type, null)} disabled={disableActions || deleting}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}

              {/* Upload button + expiry date */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileOutlinedIcon />}
                  disabled={disableActions || deleting}
                  sx={{ borderColor: color, color, '&:hover': { borderColor: color, bgcolor: bg } }}
                >
                  {selectedFile ? 'Schimbă fișierul' : existingPath ? 'Înlocuiește' : 'Încarcă document'}
                  <input
                    hidden
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onPickFile(type, file);
                      e.currentTarget.value = '';
                    }}
                  />
                </Button>

                {onExpiryDateChange && (
                  <DatePicker
                    label={DOC_EXPIRY_LABELS[type]}
                    format="DD/MM/YYYY"
                    value={expiryDates?.[type] ?? null}
                    onChange={(d) => onExpiryDateChange(type, d)}
                    disabled={disableActions}
                    slotProps={{ textField: { size: 'small', sx: { minWidth: 185 } } }}
                  />
                )}

                {type === 'RCA' && onRcaDecontareChange !== undefined && onExpiryDateChange && (
                  <FormControlLabel
                    sx={{
                      m: 0, px: 1, py: 0.5, borderRadius: 1,
                      bgcolor: rcaDecontareDirecta ? 'success.light' : 'grey.100',
                      '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 500, color: rcaDecontareDirecta ? 'success.dark' : 'text.secondary' },
                    }}
                    control={
                      <Checkbox
                        size="small" sx={{ p: 0.25, mr: 0.75 }}
                        checked={Boolean(rcaDecontareDirecta)}
                        onChange={(e) => onRcaDecontareChange(e.target.checked)}
                        color="success"
                      />
                    }
                    label="✓ Decontare directă"
                  />
                )}
              </Stack>

              {/* History toggle */}
              {typeHistory.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                    endIcon={<ExpandMoreIcon sx={{ fontSize: 16, transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                    onClick={() => toggleHistory(type)}
                    sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 500, fontSize: 12, py: 0.25 }}
                  >
                    Istoric ({typeHistory.length} {typeHistory.length === 1 ? 'versiune' : 'versiuni'})
                  </Button>

                  <Collapse in={historyOpen}>
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      {typeHistory.map((entry) => (
                        <Stack
                          key={entry.id}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ py: 0.5, px: 1, borderRadius: 1, bgcolor: 'grey.50', '&:hover': { bgcolor: 'grey.100' } }}
                        >
                          <DescriptionOutlinedIcon sx={{ color: 'text.disabled', fontSize: 15 }} />
                          <Stack sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                              {entry.filename}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                              {dayjs(entry.uploadedAt).format('DD/MM/YYYY HH:mm')}
                            </Typography>
                          </Stack>
                          <Link
                            href={toPublicUrl(entry.path)}
                            target="_blank"
                            rel="noreferrer"
                            underline="hover"
                            sx={{ fontSize: 12, color, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.25 }}
                          >
                            <OpenInNewOutlinedIcon sx={{ fontSize: 13 }} />
                          </Link>
                          {onDeleteHistory && (
                            <Tooltip title="Șterge din istoric">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteHistory(entry.id)}
                                  disabled={deletingHistory[entry.id]}
                                  sx={{ p: 0.25 }}
                                >
                                  {deletingHistory[entry.id]
                                    ? <CircularProgress size={12} />
                                    : <DeleteOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </Collapse>
                </>
              )}
            </Box>
          </Box>
        );
      })}

      <Typography variant="caption" color="text.secondary">
        Formate permise: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, WEBP (max 50MB / fișier).
      </Typography>
    </Stack>
  );
}
