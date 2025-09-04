import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { Order } from '../hooks/useOrders';
import { OrderItemsForm } from './OrderItemsFrom';

interface Props {
  order: Order;
  open: boolean;
  onClose: () => void;
  onSave: (order: Order) => void;
}

const EditOrderDialog: React.FC<Props> = ({ order, open, onClose, onSave }) => {
  const [form, setForm] = useState<Order>({
    ...order,
    initiator: order.initiator ?? '',
    items: Array.isArray(order.items) ? order.items : [],
  });

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle>Editează Comanda</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              select
              label="Inițiator"
              fullWidth
              value={form.initiator}
              onChange={e => setForm({ ...form, initiator: e.target.value })}
            >
              <MenuItem value="Nicoleta">Nicoleta</MenuItem>
              <MenuItem value="Simona">Simona</MenuItem>
              <MenuItem value="Claudiu">Claudiu</MenuItem>
              <MenuItem value="Razvan">Razvan</MenuItem>
            </TextField>
          </Grid>
          {/* Adaugă alte câmpuri de antet similar... */}
          <Grid item xs={12}>
            <OrderItemsForm
              items={form.items}
              onChange={items => setForm({ ...form, items })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulează</Button>
        <Button variant="contained" onClick={handleSave}>Salvează</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditOrderDialog;