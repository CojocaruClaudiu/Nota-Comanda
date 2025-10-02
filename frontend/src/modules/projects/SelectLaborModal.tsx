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
import type { LaborLine } from '../../api/laborLines';
import { getQualificationsWithLines, type QualificationWithLines } from '../../api/qualifications';
import { tableLocalization } from '../../localization/tableLocalization';

interface SelectLaborModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (laborLine: LaborLine, qualificationName: string) => void;
}

// Flattened labor line with qualification name for table display
interface LaborLineRow extends LaborLine {
  qualificationName: string;
}

export const SelectLaborModal: React.FC<SelectLaborModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [qualifications, setQualifications] = useState<QualificationWithLines[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadQualifications();
    }
  }, [open]);

  const loadQualifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQualificationsWithLines();
      setQualifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea manoperei');
    } finally {
      setLoading(false);
    }
  };

  // Flatten qualifications and their labor lines into a single array
  const laborLineRows = useMemo<LaborLineRow[]>(() => {
    const rows: LaborLineRow[] = [];
    for (const qual of qualifications) {
      for (const line of qual.laborLines) {
        if (line.active) { // Only show active labor lines
          rows.push({
            ...line,
            qualificationName: qual.name,
          });
        }
      }
    }
    return rows;
  }, [qualifications]);

  const columns = useMemo<MRT_ColumnDef<LaborLineRow>[]>(
    () => [
      {
        accessorKey: 'qualificationName',
        header: 'Calificare',
        size: 150,
      },
      {
        accessorKey: 'name',
        header: 'Denumire',
        size: 250,
      },
      {
        accessorKey: 'unit',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'hourlyRate',
        header: 'Tarif Orar',
        size: 120,
        Cell: ({ cell }) => {
          const value = cell.getValue<number>();
          const currency = cell.row.original.currency;
          return `${value.toFixed(2)} ${currency}`;
        },
      },
    ],
    []
  );

  const handleRowClick = (row: LaborLineRow) => {
    onSelect(row, row.qualificationName);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Selectează Manoperă</DialogTitle>
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
            data={laborLineRows}
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
                { id: 'qualificationName', desc: false },
                { id: 'name', desc: false },
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
