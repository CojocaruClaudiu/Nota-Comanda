import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import type { Equipment } from '../../api/equipment';
import { listEquipment } from '../../api/equipment';
import { tableLocalization } from '../../localization/tableLocalization';

interface SelectEquipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (equipment: Equipment) => void;
}

export const SelectEquipmentModal: React.FC<SelectEquipmentModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadEquipment();
    }
  }, [open]);

  const loadEquipment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEquipment();
      setEquipment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea echipamentelor');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Equipment>[]>(
    () => [
      {
        accessorKey: 'category',
        header: 'Categorie',
        size: 150,
      },
      {
        accessorKey: 'code',
        header: 'Cod',
        size: 100,
      },
      {
        accessorKey: 'description',
        header: 'Descriere',
        size: 300,
      },
      {
        accessorKey: 'hourlyCost',
        header: 'Cost Orar',
        size: 100,
        Cell: ({ cell }) => {
          const value = cell.getValue<number>();
          return `${value.toFixed(2)} lei/oră`;
        },
      },
    ],
    []
  );

  const handleRowClick = (row: Equipment) => {
    onSelect(row);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Selectează Echipament</DialogTitle>
      <DialogContent>
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CircularProgress />
          </div>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && !error && (
          <MaterialReactTable
            columns={columns}
            data={equipment}
            enableColumnActions={false}
            enableColumnFilters={true}
            enablePagination={true}
            enableSorting={true}
            enableBottomToolbar={true}
            enableTopToolbar={true}
            enableRowSelection={false}
            enableMultiRowSelection={false}
            enableDensityToggle={false}
            enableFullScreenToggle={false}
            enableHiding={false}
            initialState={{
              density: 'compact',
              sorting: [
                { id: 'category', desc: false },
                { id: 'code', desc: false },
              ],
              pagination: { pageSize: 15, pageIndex: 0 },
            }}
            muiTableBodyRowProps={({ row }) => ({
              onClick: () => handleRowClick(row.original),
              sx: {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              },
            })}
            localization={tableLocalization}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulează</Button>
      </DialogActions>
    </Dialog>
  );
};
