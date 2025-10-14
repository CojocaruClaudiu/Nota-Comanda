import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { uploadTechnicalSheet, deleteTechnicalSheet } from '../../api/materials';

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const buildDownloadUrl = (materialId: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return `${baseUrl}/materials/${materialId}/download-sheet`;
};

const formatFileSize = (size: number) => `${(size / (1024 * 1024)).toFixed(2)} MB`;

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <PictureAsPdfIcon />;
    case 'doc':
    case 'docx':
      return <DescriptionIcon />;
    case 'xls':
    case 'xlsx':
      return <TableChartIcon />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <ImageIcon />;
    default:
      return <InsertDriveFileIcon />;
  }
};

const getFileColor = (fileName: string): 'error' | 'info' | 'success' | 'warning' => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'error';
    case 'doc':
    case 'docx':
      return 'info';
    case 'xls':
    case 'xlsx':
      return 'success';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return 'warning';
    default:
      return 'info';
  }
};

interface UploadTechnicalSheetDialogProps {
  open: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
  currentFile?: string | null;
  onUploadSuccess: () => void;
}

export const UploadTechnicalSheetDialog: React.FC<UploadTechnicalSheetDialogProps> = ({
  open,
  onClose,
  materialId,
  materialName,
  currentFile,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const downloadUrl = buildDownloadUrl(materialId);
  const currentFileName = currentFile?.split('/').pop() ?? null;
  const acceptedTypesText = ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ');

  const clearSelection = () => {
    setSelectedFile(null);
  };

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Fisierul este prea mare. Dimensiunea maxima: ${MAX_FILE_SIZE_MB}MB`;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() as AllowedExtension | undefined;
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return `Tip de fisier invalid. Permise: ${acceptedTypesText}`;
    }

    return null;
  };

  const assignFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsDragActive(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      assignFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    if (uploading || deleting) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      assignFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (uploading || deleting) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleManualSelect = () => {
    if (uploading || deleting) return;
    fileInputRef.current?.click();
  };

  const handleRemoveSelected = () => {
    clearSelection();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      await uploadTechnicalSheet(materialId, selectedFile);
      onUploadSuccess();
      clearSelection();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Eroare la incarcarea fisierului');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteTechnicalSheet(materialId);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Eroare la stergerea fisierului');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    clearSelection();
    setError(null);
    setIsDragActive(false);
    onClose();
  };

  const selectedFileName = selectedFile?.name ?? null;
  const selectedFileSize = selectedFile ? formatFileSize(selectedFile.size) : null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Fișă Tehnică
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {materialName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={uploading || deleting}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current File Section with Enhanced Visual */}
        {currentFile && (
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: 'success.50',
              border: '1px solid',
              borderColor: 'success.200',
              borderRadius: 2
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                Fișă tehnică existentă
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Chip
                icon={getFileIcon(currentFileName || '')}
                label={currentFileName || 'Fisier existent'}
                color={getFileColor(currentFileName || '')}
                variant="filled"
                sx={{ fontWeight: 500 }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<FileOpenIcon fontSize="small" />}
                  onClick={() => window.open(downloadUrl, '_blank')}
                  disabled={deleting || uploading}
                >
                  Vizualizează
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={handleDelete}
                  disabled={deleting || uploading}
                >
                  {deleting ? 'Ștergere...' : 'Șterge'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {currentFile && <Divider sx={{ my: 2 }} />}

        {/* Upload Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            {currentFile ? 'Înlocuiește cu un fișier nou' : 'Încarcă fișa tehnică'}
          </Typography>
          <Box
            role="button"
            tabIndex={0}
            onClick={handleManualSelect}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleManualSelect();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              bgcolor: isDragActive ? 'primary.50' : 'background.paper',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: uploading || deleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              mb: 1,
              '&:hover': {
                borderColor: uploading || deleting ? 'divider' : 'primary.main',
                bgcolor: uploading || deleting ? 'background.paper' : 'primary.50',
              }
            }}
          >
            <Stack spacing={1.5} alignItems="center">
              <CloudUploadIcon 
                color={isDragActive ? 'primary' : 'action'} 
                sx={{ fontSize: 48 }} 
              />
              <Typography variant="h6" fontWeight={500}>
                Trage și plasează fișierul aici
              </Typography>
              <Typography variant="body2" color="text.secondary">
                sau folosește butonul de mai jos
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                disabled={uploading || deleting}
                sx={{ mt: 1 }}
              >
                Alege fișier
              </Button>
            </Stack>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
          />
        </Box>

        {/* Selected File Preview */}
        {selectedFile && (
          <Paper 
            elevation={0}
            sx={{ 
              mb: 2, 
              p: 2,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.200',
              borderRadius: 2
            }}
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Fișier selectat pentru încărcare
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Chip
                icon={getFileIcon(selectedFileName || '')}
                label={`${selectedFileName} (${selectedFileSize})`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 500 }}
              />
              <Button
                size="small"
                variant="text"
                onClick={handleRemoveSelected}
                disabled={uploading || deleting}
              >
                Renunță
              </Button>
            </Stack>
          </Paper>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="primary">
                Se încarcă fișierul...
              </Typography>
            </Stack>
            <LinearProgress />
          </Box>
        )}

        {currentFile && selectedFile && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Atenție:</strong> Noul fișier îl va înlocui pe cel existent.
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }} icon={<InsertDriveFileIcon />}>
          <Typography variant="caption" display="block" fontWeight={500}>
            <strong>Tipuri permise:</strong> {acceptedTypesText}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>Dimensiune maximă:</strong> {MAX_FILE_SIZE_MB}MB
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploading || deleting}>
          Anulează
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading || deleting}
          startIcon={uploading ? null : <CloudUploadIcon />}
          size="large"
        >
          {uploading ? 'Se încarcă...' : 'Încarcă fișa tehnică'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
