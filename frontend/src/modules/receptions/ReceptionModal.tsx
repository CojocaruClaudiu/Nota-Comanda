import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReceptionDTO, CreateReceptionRequest } from '../../api/receptions';

interface ReceptionModalProps {
  open: boolean;
  reception: ReceptionDTO | null;
  onClose: () => void;
  onSave: (data: CreateReceptionRequest) => void;
}

const ReceptionModal: React.FC<ReceptionModalProps> = ({ open, reception, onClose, onSave }) => {
  const [formData, setFormData] = useState<CreateReceptionRequest>({
    date: new Date().toISOString().split('T')[0],
    invoice: '',
    supplier: '',
    manufacturer: '',
    material: '',
    unit: '',
    quantity: 0,
    unitPrice: 0,
    orderId: null,
    receptionType: 'MAGAZIE',
  });

  useEffect(() => {
    if (reception) {
      setFormData({
        date: reception.date.split('T')[0],
        invoice: reception.invoice,
        supplier: reception.supplier,
        manufacturer: reception.manufacturer,
        material: reception.material,
        unit: reception.unit,
        quantity: reception.quantity,
        unitPrice: reception.unitPrice,
        orderId: reception.orderId || null,
        receptionType: reception.receptionType,
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        invoice: '',
        supplier: '',
        manufacturer: '',
        material: '',
        unit: '',
        quantity: 0,
        unitPrice: 0,
        orderId: null,
        receptionType: 'MAGAZIE',
      });
    }
  }, [reception, open]);

  const handleChange = (field: keyof CreateReceptionRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const isFormValid = () => {
    return (
      formData.date &&
      formData.invoice &&
      formData.supplier &&
      formData.manufacturer &&
      formData.material &&
      formData.unit &&
      formData.quantity > 0 &&
      formData.unitPrice > 0 &&
      formData.receptionType
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {reception ? 'Editare Recepție' : 'Adaugă Recepție Nouă'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2.5}>
          {/* Data */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Data"
              type="date"
              value={formData.date}
              onChange={handleChange('date')}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          {/* Factură */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Factură"
              placeholder="ex: ANR TGV 56836"
              value={formData.invoice}
              onChange={handleChange('invoice')}
              required
            />
          </Grid>

          {/* Furnizor */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Furnizor"
              value={formData.supplier}
              onChange={handleChange('supplier')}
              required
            />
          </Grid>

          {/* Producător */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Producător"
              value={formData.manufacturer}
              onChange={handleChange('manufacturer')}
              required
            />
          </Grid>

          {/* Material */}
          <Grid size={12}>
            <TextField
              fullWidth
              label="Material"
              value={formData.material}
              onChange={handleChange('material')}
              required
            />
          </Grid>

          {/* U.M. */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="U.M."
              placeholder="ex: kg, buc, m"
              value={formData.unit}
              onChange={handleChange('unit')}
              required
            />
          </Grid>

          {/* Cantitate */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Cantitate"
              type="number"
              value={formData.quantity}
              onChange={handleChange('quantity')}
              inputProps={{ step: '0.01', min: '0' }}
              required
            />
          </Grid>

          {/* Preț Unitar */}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Preț Unitar (LEI)"
              type="number"
              value={formData.unitPrice}
              onChange={handleChange('unitPrice')}
              inputProps={{ step: '0.01', min: '0' }}
              required
            />
          </Grid>

          {/* Tip Recepție */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Tip Recepție</InputLabel>
              <Select
                value={formData.receptionType}
                onChange={handleChange('receptionType')}
                label="Tip Recepție"
              >
                <MenuItem value="SANTIER">Șantier</MenuItem>
                <MenuItem value="MAGAZIE">Magazie</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Comandă (optional for now - will be populated from orders later) */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Comandă (opțional)"
              value={formData.orderId || ''}
              onChange={handleChange('orderId')}
              placeholder="ID comandă"
              helperText="Va fi implementat cu dropdown în viitor"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Anulează
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isFormValid()}>
          {reception ? 'Actualizează' : 'Adaugă'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceptionModal;
