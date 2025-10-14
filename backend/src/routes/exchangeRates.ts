import { Router } from 'express';
import { getExchangeRates } from '../services/exchangeRateService';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rates = await getExchangeRates();
    res.json({
      base: 'EUR',
      target: 'RON',
      eurRon: rates.eurRon,
      ronEur: rates.ronEur,
      fetchedAt: rates.fetchedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;
