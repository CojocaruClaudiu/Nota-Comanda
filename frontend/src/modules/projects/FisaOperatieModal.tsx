import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState } from 'react';
import { tableLocalization } from '../../localization/tableLocalization';
import { SelectEquipmentModal } from './SelectEquipmentModal';
import { SelectLaborModal } from './SelectLaborModal';
import type { Equipment } from '../../api/equipment';
import type { LaborLine } from '../../api/laborLines';

interface FisaOperatieModalProps {
  open: boolean;
  onClose: () => void;
  operationName: string;
}

// Material item type
interface MaterialItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Consumabile item type
interface ConsumabilItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Scule si echipamente item type
interface EchipamentItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

// Manopera item type
interface ManoperaItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  cantitate: number;
  pretUnitar: number;
  valoare: number;
}

export const FisaOperatieModal: React.FC<FisaOperatieModalProps> = ({
  open,
  onClose,
  operationName,
}) => {
  // State for each table
  const [materiale, setMateriale] = useState<MaterialItem[]>([]);
  const [consumabile, setConsumabile] = useState<ConsumabilItem[]>([]);
  const [echipamente, setEchipamente] = useState<EchipamentItem[]>([]);
  const [manopera, setManopera] = useState<ManoperaItem[]>([]);

  // State for equipment selection modal
  const [showSelectEquipment, setShowSelectEquipment] = useState(false);
  // State for labor selection modal
  const [showSelectLabor, setShowSelectLabor] = useState(false);

  // Handle equipment selection
  const handleSelectEquipment = (equipment: Equipment) => {
    const newItem: EchipamentItem = {
      id: crypto.randomUUID(),
      cod: equipment.code,
      denumire: equipment.description,
      um: 'oră',
      cantitate: 1,
      pretUnitar: Number(equipment.hourlyCost),
      valoare: Number(equipment.hourlyCost),
    };
    setEchipamente((prev) => [...prev, newItem]);
  };

  // Handle labor selection
  const handleSelectLabor = (laborLine: LaborLine, qualificationName: string) => {
    const newItem: ManoperaItem = {
      id: crypto.randomUUID(),
      cod: qualificationName,
      denumire: laborLine.name,
      um: laborLine.unit,
      cantitate: 1,
      pretUnitar: laborLine.hourlyRate,
      valoare: laborLine.hourlyRate,
    };
    setManopera((prev) => [...prev, newItem]);
  };

  // Columns for Materiale
  const materialeColumns = useMemo<MRT_ColumnDef<MaterialItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 100,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Material',
        size: 200,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 100,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț Unitar',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
    ],
    []
  );

  // Columns for Consumabile (same structure)
  const consumabileColumns = useMemo<MRT_ColumnDef<ConsumabilItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 100,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Consumabil',
        size: 200,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 100,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț Unitar',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
    ],
    []
  );

  // Columns for Scule si Echipamente
  const echipamenteColumns = useMemo<MRT_ColumnDef<EchipamentItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 100,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Echipament',
        size: 200,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 100,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț Unitar',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
    ],
    []
  );

  // Columns for Manopera
  const manoperaColumns = useMemo<MRT_ColumnDef<ManoperaItem>[]>(
    () => [
      {
        accessorKey: 'cod',
        header: 'Cod',
        size: 100,
      },
      {
        accessorKey: 'denumire',
        header: 'Denumire Manoperă',
        size: 200,
      },
      {
        accessorKey: 'um',
        header: 'UM',
        size: 80,
      },
      {
        accessorKey: 'cantitate',
        header: 'Cantitate',
        size: 100,
        Cell: ({ cell }) => cell.getValue<number>().toFixed(2),
      },
      {
        accessorKey: 'pretUnitar',
        header: 'Preț Unitar',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
      {
        accessorKey: 'valoare',
        header: 'Valoare',
        size: 120,
        Cell: ({ cell }) => `${cell.getValue<number>().toFixed(2)} LEI`,
      },
    ],
    []
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        Fișa Operație: {operationName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Stack direction="column" spacing={2}>
            {/* Top Row */}
            <Stack direction="row" spacing={2}>
              {/* Top Left - Materiale */}
              <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Materiale
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <MaterialReactTable
                    columns={materialeColumns}
                    data={materiale}
                    enablePagination={false}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                    enableColumnActions={false}
                    enableSorting={true}
                    localization={tableLocalization}
                    muiTableContainerProps={{ sx: { maxHeight: '300px' } }}
                    renderTopToolbarCustomActions={() => (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          // TODO: Open material selection modal
                          console.log('Add material');
                        }}
                      >
                        Adaugă Material
                      </Button>
                    )}
                  />
                </Box>
              </Paper>
              </Box>

              {/* Top Right - Consumabile */}
              <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Consumabile
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <MaterialReactTable
                    columns={consumabileColumns}
                    data={consumabile}
                    enablePagination={false}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                    enableColumnActions={false}
                    enableSorting={true}
                    localization={tableLocalization}
                    muiTableContainerProps={{ sx: { maxHeight: '300px' } }}
                    renderTopToolbarCustomActions={() => (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          // TODO: Open consumable selection modal
                          console.log('Add consumable');
                        }}
                      >
                        Adaugă Consumabil
                      </Button>
                    )}
                  />
                </Box>
              </Paper>
              </Box>
            </Stack>

            {/* Bottom Row */}
            <Stack direction="row" spacing={2}>
              {/* Bottom Left - Scule si Echipamente */}
              <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Scule și Echipamente
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <MaterialReactTable
                    columns={echipamenteColumns}
                    data={echipamente}
                    enablePagination={false}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                    enableColumnActions={false}
                    enableSorting={true}
                    localization={tableLocalization}
                    muiTableContainerProps={{ sx: { maxHeight: '300px' } }}
                    renderTopToolbarCustomActions={() => (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setShowSelectEquipment(true)}
                      >
                        Adaugă Echipament
                      </Button>
                    )}
                  />
                </Box>
              </Paper>
              </Box>

              {/* Bottom Right - Manopera */}
              <Box sx={{ flex: 1 }}>
              <Paper elevation={2} sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Manoperă
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <MaterialReactTable
                    columns={manoperaColumns}
                    data={manopera}
                    enablePagination={false}
                    enableBottomToolbar={false}
                    enableTopToolbar={true}
                    enableColumnActions={false}
                    enableSorting={true}
                    localization={tableLocalization}
                    muiTableContainerProps={{ sx: { maxHeight: '300px' } }}
                    renderTopToolbarCustomActions={() => (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setShowSelectLabor(true)}
                      >
                        Adaugă Manoperă
                      </Button>
                    )}
                  />
                </Box>
              </Paper>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Închide</Button>
        <Button
          variant="contained"
          onClick={() => {
            // TODO: Save all data
            console.log('Saving fisa operatie...', {
              materiale,
              consumabile,
              echipamente,
              manopera,
            });
            onClose();
          }}
        >
          Salvează
        </Button>
      </DialogActions>

      {/* Equipment Selection Modal */}
      <SelectEquipmentModal
        open={showSelectEquipment}
        onClose={() => setShowSelectEquipment(false)}
        onSelect={handleSelectEquipment}
      />

      {/* Labor Selection Modal */}
      <SelectLaborModal
        open={showSelectLabor}
        onClose={() => setShowSelectLabor(false)}
        onSelect={handleSelectLabor}
      />
    </Dialog>
  );
};
