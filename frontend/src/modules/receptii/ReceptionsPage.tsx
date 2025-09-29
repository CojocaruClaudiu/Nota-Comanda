import { Box, Typography } from '@mui/material';

// Placeholder page for future receptions (goods receipts) module.
export default function ReceptionsPage() {
  return (
    <Box p={2} display="flex" flexDirection="column" gap={2} height="100%" sx={{overflow:'auto'}}>
      <Typography variant="h5" fontWeight={600}>Recepții</Typography>
      <Typography variant="body1" color="text.secondary">
        Modulul de recepții (intrări materiale) va fi dezvoltat. Aici veți putea înregistra documente de intrare (NIR / aviz / factură), articole și legături la furnizori / proiecte.
      </Typography>
    </Box>
  );
}
