import axios from 'axios';

type ExchangeRates = {
  eurRon: number;
  ronEur: number;
  fetchedAt: Date;
};

let cachedRates: ExchangeRates | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const EXTERNAL_API = 'https://api.frankfurter.app/latest?from=EUR&to=RON';

export const getExchangeRates = async (): Promise<ExchangeRates> => {
  const now = Date.now();

  if (cachedRates && now - cachedRates.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cachedRates;
  }

  const response = await axios.get(EXTERNAL_API);
  const rawData = response.data;

  const eurRon = Number(rawData?.rates?.RON);

  if (!eurRon || !Number.isFinite(eurRon)) {
    throw new Error('Invalid response when fetching EUR/RON rate');
  }

  const ronEur = 1 / eurRon;

  cachedRates = {
    eurRon,
    ronEur,
    fetchedAt: new Date(),
  };

  return cachedRates;
};
