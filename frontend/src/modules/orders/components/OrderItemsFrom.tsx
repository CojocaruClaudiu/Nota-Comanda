import React from 'react';
import {
  Button, Grid, TextField, IconButton, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { OrderItem } from '../hooks/useOrders';

interface Props {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

const blankItem = (): OrderItem => ({
  id: Date.now().toString(), product: '', category: '', sku: '', unit: '', quantity: 0, unitPrice: 0,
});

export const OrderItemsForm: React.FC<Props> = ({ items, onChange }) => {
  const updateItem = (id: string, key: keyof OrderItem, value: any) =>
    onChange(items.map(i => i.id === id ? { ...i, [key]: value } : i));

  return (
    <Box>
      {items.map(item => (
        <Grid container spacing={1} key={item.id} alignItems="center">
          <Grid item xs={3}>
            <TextField
              fullWidth label="Produs" value={item.product}
              onChange={e => updateItem(item.id, 'product', e.target.value)}
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              fullWidth label="Categorie" value={item.category}
              onChange={e => updateItem(item.id, 'category', e.target.value)}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth label="Cod" value={item.sku}
              onChange={e => updateItem(item.id, 'sku', e.target.value)}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth label="Unitate" value={item.unit}
              onChange={e => updateItem(item.id, 'unit', e.target.value)}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              type="number" fullWidth label="Cantitate" value={item.quantity}
              onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              type="number" fullWidth label="Preț unitar" value={item.unitPrice}
              onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={1}>
            <IconButton onClick={() => onChange(items.filter(i => i.id !== item.id))}>
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}

      <Button startIcon={<AddIcon />} onClick={() => onChange([...items, blankItem()])}>
        Adaugă articol
      </Button>
    </Box>
  );
};

export default OrderItemsForm;