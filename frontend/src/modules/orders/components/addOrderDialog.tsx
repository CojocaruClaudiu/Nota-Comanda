import React, { useMemo, useState } from 'react';
import {
  Button,
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Stack, InputAdornment, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useNotistack from '../hooks/useNotistack';
import { useOrders } from '../hooks/useOrders';

type AddOrderDialogProps = {
  open?: boolean;              // dacă e definit, componenta devine controlată
  onClose?: () => void;        // închis din părinte
  confirmOnClose?: boolean;    // confirmare când formularul e “dirty”
  showTriggerButton?: boolean; // ascunde butonul implicit când controlezi din părinte
};

export const AddOrderDialog: React.FC<AddOrderDialogProps> = ({
  open: openProp,
  onClose,
  confirmOnClose = true,
  showTriggerButton = openProp === undefined, // arată butonul doar în modul necontrolat
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isControlled = openProp !== undefined;

  const { addOrder } = useOrders();
  const { successNotistack, infoNotistack, errorNotistack } = useNotistack();

  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = isControlled ? (openProp as boolean) : openUncontrolled;

  const [customer, setCustomer] = useState('');
  const [amountInput, setAmountInput] = useState(''); // păstrăm ca string pentru introducere ușoară
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{customer:boolean; amount:boolean}>({ customer:false, amount:false });

  const isDirty = customer.trim() !== '' || amountInput !== '';

  const parsedAmount = useMemo(() => {
    const n = Number(amountInput.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [amountInput]);

  const errors = useMemo(() => {
    const e: { customer?: string; amount?: string } = {};
    if (touched.customer) {
      if (!customer.trim()) e.customer = 'Clientul este obligatoriu';
      else if (customer.trim().length < 2) e.customer = 'Minim 2 caractere';
    }
    if (touched.amount) {
      if (amountInput === '') e.amount = 'Suma este obligatorie';
      else if (!Number.isFinite(parsedAmount)) e.amount = 'Introduceți un număr valid';
      else if (parsedAmount <= 0) e.amount = 'Suma trebuie să fie > 0';
    }
    return e;
  }, [customer, amountInput, parsedAmount, touched]);

  const isValid = !errors.customer && !errors.amount && customer.trim() && amountInput !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleOpen = () => {
    if (!isControlled) setOpenUncontrolled(true);
  };

  const requestClose = () => {
    if (confirmOnClose && isDirty && !submitting) {
      const ok = window.confirm('Aveți modificări nesalvate. Închideți dialogul?');
      if (!ok) return;
    }
    if (isControlled) onClose?.();
    else setOpenUncontrolled(false);
  };

  const resetForm = () => {
    setCustomer('');
    setAmountInput('');
    setTouched({ customer:false, amount:false });
  };

  const handleSubmit = async () => {
    setTouched({ customer:true, amount:true });
    if (!isValid) {
      infoNotistack('Verifică datele introduse.');
      return;
    }

    try {
      setSubmitting(true);
      await Promise.resolve(addOrder({ customer: customer.trim(), amount: parsedAmount }));
      successNotistack('Comanda a fost adăugată cu succes!');
      resetForm();
      if (isControlled) onClose?.();
      else setOpenUncontrolled(false);
    } catch (e) {
      errorNotistack('A apărut o eroare la salvare.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key.toLowerCase() === 'enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {showTriggerButton && (
        <Button variant="contained" onClick={handleOpen}>
          Adaugă comandă
        </Button>
      )}

      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        keepMounted
        aria-labelledby="add-order-title"
        PaperProps={{
          component: 'form',
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            handleSubmit();
          },
          onKeyDown: handleKeyDown,
        }}
      >
        <DialogTitle id="add-order-title">Adaugă Comandă Nouă</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Client"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, customer: true }))}
              error={Boolean(errors.customer)}
              helperText={errors.customer || ' '}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              label="Sumă"
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
              error={Boolean(errors.amount)}
              helperText={errors.amount || 'Apasă Enter sau Ctrl+Enter pentru a salva'}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">RON</InputAdornment>,
                inputProps: { step: '0.01', min: '0' },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={requestClose} disabled={submitting}>Anulează</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || submitting}
          >
            {submitting ? 'Se salvează…' : 'Adaugă'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
