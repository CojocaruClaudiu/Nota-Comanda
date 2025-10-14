import { api } from './axios';

export interface ExchangeRates {
  base: string;
  target: string;
  eurRon: number;
  ronEur: number;
  fetchedAt: string;
}

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const response = await api.get<ExchangeRates>('/exchange-rates');
  return response.data;
};
