// Central list of units of measurement used in the app
// Keep short, conventional abbreviations relevant to construction domain

export const units: string[] = [
  'buc', // bucăți
  'mp',  // metri pătrați
  'ml',  // metri liniari
  'mc',  // metri cubi
  'm',   // metri
  'kg',
  'sac',
  'galeata',
  'tona',
  'l',
  'set',
  'pachet',
  'ora',
  'zi',
];

export const unitSelectOptions: Array<{ label: string; value: string }> = [
  { label: '— (fără)', value: '' },
  ...units.map((u) => ({ label: u, value: u })),
];

// Normalize a unit value (trim, lowercase, remove trailing dots)
export const normalizeUnit = (val?: string | null): string => {
  if (val == null) return '';
  return String(val).trim().toLowerCase().replace(/\.+$/, '');
};

// Check if a unit is valid (case-insensitive, ignores trailing dots)
export const isValidUnit = (val?: string | null): boolean => {
  if (val == null || val === '') return true;
  const normalized = normalizeUnit(val);
  return normalized === '' || units.includes(normalized);
};

// Get the matching unit from the units list (normalized)
export const getMatchingUnit = (val?: string | null): string => {
  if (val == null || val === '') return '';
  const normalized = normalizeUnit(val);
  return units.find(u => u === normalized) ?? '';
};
