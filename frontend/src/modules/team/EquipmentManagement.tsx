import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import {
  workerEquipmentApi,
  type EquipmentIssue,
  type EquipmentType,
  type EquipmentCondition,
  getEquipmentTypeName,
  getEquipmentConditionName,
  getEquipmentIcon,
} from '../../api/workerEquipment';
import useNotistack from '../orders/hooks/useNotistack';

interface EquipmentManagementProps {
  employeeId: string;
  employeeName: string;
}

const equipmentTypes: EquipmentType[] = ['BOOTS', 'PANTS', 'JACKET', 'GLOVES', 'HELMET', 'VEST', 'OTHER'];
const equipmentConditions: EquipmentCondition[] = ['NEW', 'GOOD', 'WORN', 'DAMAGED'];

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({ employeeId, employeeName }) => {
  const [equipment, setEquipment] = useState<EquipmentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const { successNotistack, errorNotistack } = useNotistack();
  

  // Form state for new equipment
  const [newEquipmentType, setNewEquipmentType] = useState<EquipmentType>('BOOTS');
  const [newSize, setNewSize] = useState('');
  const [newCondition, setNewCondition] = useState<EquipmentCondition>('NEW');
  const [newNotes, setNewNotes] = useState('');
  const [newIssuedDate, setNewIssuedDate] = useState<Dayjs | null>(dayjs());

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const data = await workerEquipmentApi.getEmployeeEquipment(employeeId);
      setEquipment(data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      errorNotistack('Eroare la încărcarea echipamentului');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [employeeId]);

  const handleIssueEquipment = async () => {
    try {
      setIssuing(true);
      await workerEquipmentApi.issueEquipment(employeeId, {
        equipmentType: newEquipmentType,
        size: newSize || null,
        condition: newCondition,
        notes: newNotes || null,
        issuedDate: newIssuedDate?.toDate(),
      });
      successNotistack('Echipament distribuit cu succes');
      setShowIssueDialog(false);
      resetForm();
      loadEquipment();
    } catch (error) {
      console.error('Failed to issue equipment:', error);
      errorNotistack('Eroare la distribuirea echipamentului');
    } finally {
      setIssuing(false);
    }
  };

  const handleMarkReturned = async (id: string) => {
    try {
      await workerEquipmentApi.updateEquipment(id, {
        returnedDate: new Date(),
      });
      successNotistack('Echipament marcat ca returnat');
      loadEquipment();
    } catch (error) {
      console.error('Failed to mark equipment as returned:', error);
      errorNotistack('Eroare la marcarea echipamentului');
    }
  };

  const handleMarkDestroyed = async (id: string) => {
    try {
      await workerEquipmentApi.updateEquipment(id, {
        destroyedDate: new Date(),
        condition: 'DESTROYED',
      });
      successNotistack('Echipament marcat ca distrus');
      loadEquipment();
    } catch (error) {
      console.error('Failed to mark equipment as destroyed:', error);
      errorNotistack('Eroare la marcarea echipamentului');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workerEquipmentApi.deleteEquipment(id);
      successNotistack('Echipament șters');
      loadEquipment();
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      errorNotistack('Eroare la ștergerea echipamentului');
    }
  };

  const resetForm = () => {
    setNewEquipmentType('BOOTS');
    setNewSize('');
    setNewCondition('NEW');
    setNewNotes('');
    setNewIssuedDate(dayjs());
  };

  const activeEquipment = equipment.filter((e) => !e.returnedDate && !e.destroyedDate);
  const returnedEquipment = equipment.filter((e) => e.returnedDate);
  const destroyedEquipment = equipment.filter((e) => e.destroyedDate);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🦺 Echipament de Protecție
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowIssueDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          Distribuie echipament
        </Button>
      </Stack>

      {/* Active Equipment */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
        Echipament Activ ({activeEquipment.length})
      </Typography>
      
      {activeEquipment.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            Niciun echipament distribuit
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {activeEquipment.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h5">{getEquipmentIcon(item.equipmentType)}</Typography>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {getEquipmentTypeName(item.equipmentType)}
                      </Typography>
                      {item.size && (
                        <Typography variant="caption" color="text.secondary">
                          Mărime: {item.size}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Chip
                    label={getEquipmentConditionName(item.condition)}
                    size="small"
                    color={
                      item.condition === 'NEW'
                        ? 'success'
                        : item.condition === 'GOOD'
                        ? 'primary'
                        : item.condition === 'WORN'
                        ? 'warning'
                        : item.condition === 'DESTROYED'
                        ? 'error'
                        : 'error'
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Distribuit: {dayjs(item.issuedDate).format('DD.MM.YYYY')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Marchează ca returnat">
                      <IconButton size="small" color="success" onClick={() => handleMarkReturned(item.id)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Marchează ca distrus">
                      <IconButton size="small" color="warning" onClick={() => handleMarkDestroyed(item.id)}>
                        <BrokenImageIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Șterge">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
                {item.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {item.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Returned Equipment */}
      {returnedEquipment.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
            Echipament Returnat ({returnedEquipment.length})
          </Typography>
          <Stack spacing={1}>
            {returnedEquipment.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5, opacity: 0.6, bgcolor: 'grey.50' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      {getEquipmentIcon(item.equipmentType)} {getEquipmentTypeName(item.equipmentType)}
                      {item.size && ` (${item.size})`}
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary">
                      Returnat: {dayjs(item.returnedDate!).format('DD.MM.YYYY')}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Destroyed Equipment */}
      {destroyedEquipment.length > 0 && (
        <>
          <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 3 }}>
            🚫 Echipament Distrus ({destroyedEquipment.length})
          </Typography>
          <Stack spacing={1}>
            {destroyedEquipment.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5, opacity: 0.5, bgcolor: 'error.50', borderColor: 'error.200' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={5}>
                    <Typography variant="body2">
                      {getEquipmentIcon(item.equipmentType)} {getEquipmentTypeName(item.equipmentType)}
                      {item.size && ` (${item.size})`}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Distribuit: {dayjs(item.issuedDate).format('DD.MM.YYYY')}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="error">
                      Distrus: {dayjs(item.destroyedDate!).format('DD.MM.YYYY')}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Issue Equipment Dialog */}
      <Dialog open={showIssueDialog} onClose={() => setShowIssueDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Distribuie Echipament</Typography>
            <IconButton onClick={() => setShowIssueDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tip echipament</InputLabel>
              <Select
                value={newEquipmentType}
                label="Tip echipament"
                onChange={(e) => setNewEquipmentType(e.target.value as EquipmentType)}
              >
                {equipmentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getEquipmentIcon(type)} {getEquipmentTypeName(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Mărime (opțional)"
              placeholder="ex: 42, L, XL"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Stare</InputLabel>
              <Select
                value={newCondition}
                label="Stare"
                onChange={(e) => setNewCondition(e.target.value as EquipmentCondition)}
              >
                {equipmentConditions.map((condition) => (
                  <MenuItem key={condition} value={condition}>
                    {getEquipmentConditionName(condition)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Data distribuirii"
              value={newIssuedDate}
              onChange={(date) => setNewIssuedDate(date)}
              slotProps={{ textField: { fullWidth: true } }}
            />

            <TextField
              label="Observații (opțional)"
              placeholder="Note suplimentare..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setShowIssueDialog(false)} variant="outlined">
            Anulează
          </Button>
          <Button
            onClick={handleIssueEquipment}
            variant="contained"
            disabled={issuing}
            startIcon={issuing ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {issuing ? 'Se distribuie...' : 'Distribuie'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
