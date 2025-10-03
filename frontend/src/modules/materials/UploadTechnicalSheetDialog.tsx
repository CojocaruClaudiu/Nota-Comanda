import React, { useState } from 'react';
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
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { uploadTechnicalSheet, deleteTechnicalSheet } from '../../api/materials';

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Fișierul este prea mare. Dimensiunea maximă: 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        setError('Tip de fișier invalid. Permise: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    
    try {
      await uploadTechnicalSheet(materialId, selectedFile);
      onUploadSuccess();
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Eroare la încărcarea fișierului');
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
      setError(err?.response?.data?.error || 'Eroare la ștergerea fișierului');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Fișă Tehnică</Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {materialName}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {currentFile && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Fișier curent:
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<InsertDriveFileIcon />}
                label={currentFile.split('/').pop() || 'Fișier existent'}
                color="success"
                variant="outlined"
              />
              <Button
                size="small"
                color="error"
                onClick={handleDelete}
                disabled={deleting || uploading}
              >
                {deleting ? 'Ștergere...' : 'Șterge'}
              </Button>
            </Stack>
          </Box>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {currentFile ? 'Încarcă fișier nou:' : 'Selectează fișier:'}
          </Typography>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            disabled={uploading || deleting}
            fullWidth
          >
            Alege fișier
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
          </Button>
        </Box>
        
        {selectedFile && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Fișier selectat:
            </Typography>
            <Chip
              icon={<InsertDriveFileIcon />}
              label={`${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
        
        {uploading && <LinearProgress sx={{ mt: 2 }} />}
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Tipuri permise: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
          <br />
          Dimensiune maximă: 10MB
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading || deleting}>
          Anulează
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading || deleting}
          startIcon={<CloudUploadIcon />}
        >
          {uploading ? 'Încărcare...' : 'Încarcă'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
