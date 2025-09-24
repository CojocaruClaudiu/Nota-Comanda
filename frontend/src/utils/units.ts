// Central list of units of measurement used in the app
// Keep short, conventional abbreviations relevant to construction domain

export const units: string[] = [
  'buc', // bucăți
  'mp',  // metri pătrați
  'ml',  // metri liniari
  'mc',  // metri cubi
  'm',   // metri
  'kg',
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

export const isValidUnit = (val?: string | null) =>
  val == null || val === '' || units.includes(String(val));
