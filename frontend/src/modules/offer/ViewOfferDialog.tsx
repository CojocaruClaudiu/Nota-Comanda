import React, { FC, forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

export interface Offer {
  id: number;
  secretaryEntry?: { number?: string | number | null } | null;
  externalReference?: string | null;
  date?: string | null;
  clientName?: string | null;
  companyContactPerson?: string | null;
  deliveryDays?: string | number | null;
  invoicePaymentTerm?: string | number | null;
  validity?: string | number | null;
  currency?: string | null;
  person?: string | null;
}

export interface ViewOfferDialogRef {
  open: (data: Offer) => void;
  close: () => void;
}

const SectionTitle: FC<{ title: string }> = ({ title }) => (
  <Typography sx={{ backgroundColor: '#f3f3f3', borderRadius: '10px', px: 2, py: 0.5 }}>{title}</Typography>
);

const ViewOfferDialog = forwardRef<ViewOfferDialogRef, { onEdit?: (offerId: number) => void }>(({ onEdit }, ref) => {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<Offer | null>(null);

  const handleClose = () => {
    setOpen(false);
    setOffer(null);
  };

  useImperativeHandle(
    ref,
    () => ({
      open: (data: Offer) => {
        setOffer(data);
        setOpen(true);
      },
      close: () => handleClose(),
    }),
    []
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Vizualizare ofertă</DialogTitle>
      <DialogContent dividers>
        {offer && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
            <Box>
              <SectionTitle title="General" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, pt: 2 }}>
                <Typography>
                  Număr ofertă: <strong>{offer.id}</strong>
                </Typography>
                <Typography>
                  Număr înregistrare: <strong>{offer.secretaryEntry?.number ?? '-'}</strong>
                </Typography>
                <Typography>
                  Referință externă: <strong>{offer.externalReference ?? '-'}</strong>
                </Typography>
                <Typography>
                  Dată: <strong>{offer.date ?? '-'}</strong>
                </Typography>
              </Box>
            </Box>

            <Box>
              <SectionTitle title="Date client" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, pt: 2 }}>
                <Typography>
                  Nume client: <strong>{offer.clientName ?? '-'}</strong>
                </Typography>
                <Typography>
                  Persoană contact: <strong>{offer.companyContactPerson ?? '-'}</strong>
                </Typography>
              </Box>
            </Box>

            <Box>
              <SectionTitle title="Livrare" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, pt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, minWidth: 240 }}>
                  <Typography>
                    Zile livrare: <strong>{offer.deliveryDays ?? '-'}</strong>
                  </Typography>
                  <Typography>
                    Termen plată: <strong>{offer.invoicePaymentTerm ?? '-'}</strong>
                  </Typography>
                  <Typography>
                    Valabilitate ofertă: <strong>{offer.validity ?? '-'}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, minWidth: 240 }}>
                  <Typography>
                    Monedă: <strong>{offer.currency ?? '-'}</strong>
                  </Typography>
                  <Typography>
                    Responsabil: <strong>{offer.person ?? '-'}</strong>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {offer && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => onEdit && onEdit(offer.id)}>
            Editează
          </Button>
        )}
        <Button onClick={handleClose}>Închide</Button>
      </DialogActions>
    </Dialog>
  );
});

export default ViewOfferDialog;
