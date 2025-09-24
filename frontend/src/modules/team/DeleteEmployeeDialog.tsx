// src/modules/team/DeleteEmployeeDialog.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  Button, Stack, IconButton, Typography,
  Box, CircularProgress, Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { deleteEmployee, type EmployeeWithStats } from '../../api/employees';
import useNotistack from '../orders/hooks/useNotistack';

interface DeleteEmployeeDialogProps {
  open: boolean;
  employee: EmployeeWithStats | null;
  onClose: () => void;
  onEmployeeDeleted: (employeeId: string) => void;
}

export const DeleteEmployeeDialog: React.FC<DeleteEmployeeDialogProps> = ({
  open,
  employee,
  onClose,
  onEmployeeDeleted
}) => {
  const [deleting, setDeleting] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const handleDelete = async () => {
    if (!employee) return;
    
    try {
      setDeleting(true);
      await deleteEmployee(employee.id);
      onEmployeeDeleted(employee.id);
      handleClose();
      successNotistack('Angajatul a fost șters cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut șterge angajatul';
      errorNotistack(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (deleting) return;
    onClose();
  };

  // Only render dialog if employee exists and open is true
  if (!open || !employee) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }
      }}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
          color: 'white',
          p: 3,
          position: 'relative'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <WarningAmberIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="600">
              Confirmare Ștergere Angajat
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Această acțiune nu poate fi anulată
            </Typography>
          </Box>
        </Stack>
        
        <IconButton
          onClick={handleClose}
          disabled={deleting}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <DeleteIcon 
            sx={{ 
              fontSize: 80, 
              color: 'error.main', 
              mb: 2,
              opacity: 0.7
            }} 
          />
          <Typography variant="h6" gutterBottom>
            Ești sigur că vrei să ștergi angajatul?
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
            Angajatul <strong>{employee.name}</strong> va fi șters permanent din sistem.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Concedii luate: <strong>{employee.takenDays || 0}</strong> zile din <strong>{employee.entitledDays || 0}</strong> disponibile
          </Typography>
          <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
            Această acțiune nu poate fi anulată!
          </Typography>
        </Box>
      </DialogContent>

      {/* Actions */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 3
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            onClick={handleClose}
            disabled={deleting}
            variant="outlined"
            size="large"
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 120
            }}
          >
            Anulează
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            size="large"
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 120
            }}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Se șterge...' : 'Șterge Angajat'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};
