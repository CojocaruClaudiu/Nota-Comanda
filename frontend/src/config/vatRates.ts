/**
 * VAT Rates Configuration for Romania
 * 
 * Update this file when VAT rates change.
 * Last updated: January 2026
 */

export interface VatRate {
  value: number;
  label: string;
  description?: string;
}

// Available VAT rates in Romania
export const VAT_RATES: VatRate[] = [
  { value: 0, label: '0% (Scutit)', description: 'Scutit de TVA' },
  { value: 5, label: '5% (Redus)', description: 'Cotă redusă - alimente de bază, cărți, etc.' },
  { value: 9, label: '9% (Redus)', description: 'Cotă redusă - turism, restaurante, etc.' },
  { value: 11, label: '11% (Intermediar)', description: 'Cotă intermediară (2024-2025)' },
  { value: 19, label: '19% (Vechi)', description: 'Cotă standard veche (până în 2024)' },
  { value: 21, label: '21% (Standard)', description: 'Cotă standard actuală' },
];

// Current default VAT rate in Romania
export const DEFAULT_VAT_RATE = 21;

// Helper function to get VAT rate label
export const getVatRateLabel = (value: number): string => {
  const rate = VAT_RATES.find(r => r.value === value);
  return rate?.label ?? `${value}%`;
};

// Helper function to get VAT rate by value
export const getVatRate = (value: number): VatRate | undefined => {
  return VAT_RATES.find(r => r.value === value);
};
