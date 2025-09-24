// src/modules/auto/DeleteCarDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, Button, Stack, IconButton, Typography, Box, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import useNotistack from '../orders/hooks/useNotistack';
import { deleteCar, type Car } from '../../api/cars';

export interface DeleteCarDialogProps {
  open: boolean;
  car: Car | null;
  onClose: () => void;
  onCarDeleted: (carId: string) => void;
}

export const DeleteCarDialog: React.FC<DeleteCarDialogProps> = ({ open, car, onClose, onCarDeleted }) => {
  const [deleting] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const handleDelete = async () => {
    if (!car) return;
    const id = car.id;
    // Close immediately for snappy UX; perform delete in background
    onClose();
    try {
      await deleteCar(id);
      onCarDeleted(id);
      successNotistack('Mașina a fost ștearsă cu succes!');
    } catch (e: any) {
      errorNotistack(e?.message || 'Nu am putut șterge mașina');
    }
  };

  const handleClose = () => { if (!deleting) onClose(); };

  return (  
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' } }} TransitionComponent={Fade} transitionDuration={300}>
      <Box sx={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', color: 'white', p: 3, position: 'relative' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningAmberIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="600">Confirmare Ștergere</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Această acțiune nu poate fi anulată</Typography>
          </Box>
        </Stack>
        <IconButton onClick={handleClose} disabled={deleting} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <DeleteIcon sx={{ fontSize: 80, color: 'error.main', mb: 2, opacity: 0.7 }} />
          <Typography variant="h6" gutterBottom>Ești sigur că vrei să ștergi mașina?</Typography>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
            Mașina <strong>{car?.placute}</strong> ({car?.marca} {car?.model}) va fi ștearsă permanent.
          </Typography>
          <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>Această acțiune nu poate fi anulată!</Typography>
        </Box>
      </DialogContent>

      <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button onClick={handleClose} disabled={deleting} variant="outlined" size="large" sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 500, minWidth: 120 }}>
            Anulează
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" size="large" sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600, minWidth: 120 }} startIcon={<DeleteIcon />}>
            Șterge Mașină
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DeleteCarDialog;
