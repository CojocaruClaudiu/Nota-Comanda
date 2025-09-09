// src/modules/clients/DeleteClientDialog.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent,
  Button, Stack, IconButton, Typography,
  Box, CircularProgress, Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { deleteClient, type Client } from '../../api/clients';
import useNotistack from '../orders/hooks/useNotistack';

interface DeleteClientDialogProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onClientDeleted: (clientId: string) => void;
}

export const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  open,
  client,
  onClose,
  onClientDeleted
}) => {
  const [deleting, setDeleting] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();

  const handleDelete = async () => {
    if (!client) return;
    
    try {
      setDeleting(true);
      await deleteClient(client.id);
      onClientDeleted(client.id);
      handleClose();
      successNotistack('Clientul a fost șters cu succes!');
    } catch (e: any) {
      const msg = e?.message || 'Nu am putut șterge clientul';
      errorNotistack(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (deleting) return;
    onClose();
  };

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
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
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
              Confirmare Ștergere
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
            Ești sigur că vrei să ștergi clientul?
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
            Clientul <strong>{client?.name}</strong> va fi șters permanent.
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
            {deleting ? 'Se șterge...' : 'Șterge Client'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};
