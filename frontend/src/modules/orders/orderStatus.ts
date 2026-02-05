export const ORDER_STATUSES = [
  'Lipsă Stoc Furnizor',
  'Neachitată',
  'Achitată Integral',
  'Achitată Parțial',
  'În Curs de Livrare',
  'Livrată / Recepționată',
  'Anulată',
  'Returnată / Refuzată',
  'Finalizata',
] as const;

export type StatusChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

export const STATUS_COLOR_BY_LABEL: Record<(typeof ORDER_STATUSES)[number], StatusChipColor> = {
  'Lipsă Stoc Furnizor': 'error',
  'Neachitată': 'error',
  'Achitată Integral': 'success',
  'Achitată Parțial': 'warning',
  'În Curs de Livrare': 'info',
  'Livrată / Recepționată': 'success',
  'Anulată': 'error',
  'Returnată / Refuzată': 'secondary',
  'Finalizata': 'success',
} as const;

export const UI_TO_BACKEND_STATUS: Record<(typeof ORDER_STATUSES)[number], string> = {
  'Lipsă Stoc Furnizor': 'SUPPLIER_OUT_OF_STOCK',
  'Neachitată': 'UNPAID_ORDER',
  'Achitată Integral': 'PAID_FULL_ORDER',
  'Achitată Parțial': 'PAID_PARTIAL_ORDER',
  'În Curs de Livrare': 'IN_DELIVERY',
  'Livrată / Recepționată': 'RECEIVED',
  'Anulată': 'CANCELLED',
  'Returnată / Refuzată': 'RETURNED_REFUSED',
  'Finalizata': 'CLOSED',
};

export const BACKEND_TO_UI_STATUS: Record<string, (typeof ORDER_STATUSES)[number]> = {
  DRAFT: 'Neachitată',
  WAITING_APPROVAL: 'Lipsă Stoc Furnizor',
  APPROVED: 'Achitată Integral',
  ORDERED: 'În Curs de Livrare',
  PARTIALLY_RECEIVED: 'În Curs de Livrare',
  RECEIVED: 'Livrată / Recepționată',
  CLOSED: 'Finalizata',
  CANCELLED: 'Anulată',
  SUPPLIER_OUT_OF_STOCK: 'Lipsă Stoc Furnizor',
  UNPAID_ORDER: 'Neachitată',
  PAID_FULL_ORDER: 'Achitată Integral',
  PAID_PARTIAL_ORDER: 'Achitată Parțial',
  IN_DELIVERY: 'În Curs de Livrare',
  RETURNED_REFUSED: 'Returnată / Refuzată',
};

export const STATUS_CHOICES = ORDER_STATUSES;
