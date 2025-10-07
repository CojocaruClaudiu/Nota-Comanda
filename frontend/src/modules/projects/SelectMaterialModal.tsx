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
import type { Material } from '../../api/materials';
import { fetchUniqueMaterials } from '../../api/materials';
import { tableLocalization } from '../../localization/tableLocalization';

interface SelectMaterialModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (material: Material) => void;
  type: 'material' | 'consumable';
}

export const SelectMaterialModal: React.FC<SelectMaterialModalProps> = ({
  open,
  onClose,
  onSelect,
  type,
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadMaterials();
    }
  }, [open]);

  const loadMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUniqueMaterials();
      setMaterials(data.filter(m => m.active));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea materialelor');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Material>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Cod',
        size: 120,
      },
      {
        accessorKey: 'description',
        header: 'Denumire',
        size: 300,
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'price',
        header: 'Preț',
        size: 120,
        Cell: ({ cell, row }) => {
          const value = cell.getValue<number>();
          const currency = row.original.currency || 'RON';
          if (value == null || isNaN(value)) {
            return '-';
          }
          return `${Number(value).toFixed(2)} ${currency}`;
        },
      },
      {
        accessorKey: 'supplierName',
        header: 'Furnizor',
        size: 200,
        Cell: ({ cell }) => cell.getValue<string>() || '-',
      },
    ],
    []
  );

  const handleRowClick = (row: Material) => {
    onSelect(row);
    onClose();
  };

  const title = type === 'material' ? 'Selectează Material' : 'Selectează Consumabil';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{title}</DialogTitle>
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
            data={materials}
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
