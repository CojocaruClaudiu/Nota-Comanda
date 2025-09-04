import React, { useMemo, useState } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useOrders, type Order } from '../hooks/useOrders';
import useNotistack from '../hooks/useNotistack';
import { Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EditOrderDialog from './EditOrderDialog'; // Default import
import { AddOrderDialog } from './addOrderDialog';

export const OrdersList: React.FC = () => {
  const { orders, updateOrder, deleteOrder } = useOrders();
  const { successNotistack } = useNotistack();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  const columns = useMemo<MRT_ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
      },
      {
        accessorKey: 'customer',
        header: 'Client',
      },
      {
        accessorKey: 'amount',
        header: 'Sumă',
        Cell: ({ cell }) => `Lei ${Number(cell.getValue()).toFixed(2)}`,
      },
      {
        accessorKey: 'createdAt',
        header: 'Data',
        Cell: ({ cell }) => new Date(cell.getValue() as Date).toLocaleString('ro-RO'),
      },
      {
        header: 'Acțiuni',
        Cell: ({ row }) => (
          <>
            <IconButton onClick={() => setEditingOrder(row.original)}>
              <EditIcon />
            </IconButton>
            <IconButton color="error" onClick={() => setDeletingOrder(row.original)}>
              <DeleteIcon />
            </IconButton>
          </>
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ mt: 2, maxWidth: '100%' }}>
      <AddOrderDialog />
      <MaterialReactTable
        columns={columns}
        data={orders}
        enableSorting
        enableColumnFilters
        initialState={{ showColumnFilters: false }}
        muiTablePaperProps={{ sx: { boxShadow: 2 } }}
      />
      {editingOrder && (
        <EditOrderDialog
          order={editingOrder}
          open={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={order => {
            updateOrder(order);
            setEditingOrder(null);
          }}
        />
      )}
      {deletingOrder && (
        <Dialog open={!!deletingOrder} onClose={() => setDeletingOrder(null)}>
          <DialogTitle>Confirmare ștergere</DialogTitle>
          <DialogContent>
            Sigur doriți să ștergeți comanda cu ID-ul {deletingOrder.id}?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletingOrder(null)}>Anulează</Button>
            <Button color="error" onClick={() => {
              deleteOrder(deletingOrder.id);
              setDeletingOrder(null);
              successNotistack('Comanda a fost ștearsă cu succes!');
            }}>Șterge</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};