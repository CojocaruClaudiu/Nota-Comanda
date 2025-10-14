import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchExchangeRates, type ExchangeRates } from '../../api/exchangeRates';

const formatNumber = (value: number) =>
  value.toLocaleString('ro-RO', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const ExchangeRatesPage = () => {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchExchangeRates();
      setRates(data);
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
      setError('Nu am putut prelua cursul valutar. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto', bgcolor: 'background.default' }}>
      <Stack spacing={3} maxWidth={640} mx="auto">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Curs valutar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ratele sunt preluate automat din exchangerate.host (EUR → RON)
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => void loadRates()}
            disabled={loading}
          >
            Actualizează
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              {loading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Se preiau cele mai noi cursuri...
                  </Typography>
                </Stack>
              )}

              {rates && !loading && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box flex={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        1 EUR în RON
                      </Typography>
                      <Typography variant="h3" fontWeight={700}>
                        {formatNumber(rates.eurRon)} <Typography component="span">RON</Typography>
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        1 RON în EUR
                      </Typography>
                      <Typography variant="h3" fontWeight={700}>
                        {formatNumber(rates.ronEur)} <Typography component="span">EUR</Typography>
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Ultima actualizare: {formatTimestamp(rates.fetchedAt)}
                  </Typography>
                </>
              )}

              {!loading && !error && !rates && (
                <Typography variant="body2" color="text.secondary">
                  Nicio informație disponibilă momentan.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default ExchangeRatesPage;
