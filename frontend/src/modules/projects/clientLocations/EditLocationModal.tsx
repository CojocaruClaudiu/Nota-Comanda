import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material';
import type { ClientLocation } from '../../../types/types';

interface EditLocationModalProps {
  open: boolean;
  location: ClientLocation | null;
  clients: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (location: Partial<ClientLocation>) => void;
}

const EditLocationModal: React.FC<EditLocationModalProps> = ({ open, location, clients, onClose, onSave }) => {
  const [form, setForm] = useState({
    clientId: location?.client?.id || '',
    name: location?.name || '',
    address: location?.address || '',
  });

  React.useEffect(() => {
    setForm({
      clientId: location?.client?.id || '',
      name: location?.name || '',
      address: location?.address || '',
    });
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...form, id: location?.id });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Editează locația</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Client"
          name="clientId"
          value={form.clientId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          {clients.map(c => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Nume Locație"
          name="name"
          value={form.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Adresă"
          name="address"
          value={form.address}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulează</Button>
        <Button onClick={handleSave} variant="contained">Salvează</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditLocationModal;
