import { api as axios } from './axios';

export interface PurchaseOrderItemDTO {
  id: string;
  orderId: string;
  name: string;
  category?: string | null;
  sku?: string | null;
  unit?: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: number;
  currency?: string | null;
  vatPercent?: number | null;
  discountPercent?: number | null;
  promisedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  allocations?: POItemAllocationDTO[];
  invoiceDistributions?: InvoiceDistributionDTO[];
}

export interface PurchaseOrderDTO {
  id: string;
  poNumber: string;
  orderDate: string;
  requestedBy?: string | null;
  orderedBy?: string | null;
  supplierId?: string | null;
  supplierContactName?: string | null;
  supplierContactPhone?: string | null;
  supplierContactEmail?: string | null;
  projectId?: string | null;
  deliveryAddress?: string | null;
  priority: string;
  status: string;
  notes?: string | null;
  promisedDeliveryDate?: string | null;
  currency: string;
  exchangeRate?: number | null;
  subTotal: number;
  totalVat: number;
  totalGross: number;
  receivedPercent: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemDTO[];
}

export interface POItemAllocationDTO {
  id: string;
  orderItemId: string;
  projectId: string;
  qty?: number | null;
  percent?: number | null;
  valueOverride?: number | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItemDTO {
  id: string;
  receiptId: string;
  orderItemId: string;
  quantity: number;
  damagedQuantity?: number | null;
  returnQuantity?: number | null;
  note?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDistributionDTO {
  id: string;
  invoiceId: string;
  projectId: string;
  amount: number;
  note?: string | null;
  orderItemId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemPayload {
  name: string;
  category?: string;
  sku?: string;
  unit?: string;
  qtyOrdered: number;
  unitPrice?: number;
  currency?: string;
  vatPercent?: number;
  discountPercent?: number;
  promisedDate?: string;
}

export interface CreateOrderPayload {
  poNumber?: string;
  orderDate?: string;
  requestedBy?: string;
  orderedBy?: string;
  supplierId?: string;
  supplierContactName?: string;
  supplierContactPhone?: string;
  supplierContactEmail?: string;
  projectId?: string;
  deliveryAddress?: string;
  priority?: string;
  notes?: string;
  promisedDeliveryDate?: string;
  currency?: string;
  exchangeRate?: number;
  items: CreateOrderItemPayload[];
}

export async function listOrders(): Promise<PurchaseOrderDTO[]> {
  const { data } = await axios.get('/orders');
  return data as PurchaseOrderDTO[];
}

export async function getOrder(id: string): Promise<PurchaseOrderDTO> {
  const { data } = await axios.get(`/orders/${id}`);
  return data as PurchaseOrderDTO;
}

export async function createOrder(payload: CreateOrderPayload): Promise<PurchaseOrderDTO> {
  const { data } = await axios.post('/orders', payload);
  return data as PurchaseOrderDTO;
}

export async function addOrderItem(orderId: string, item: CreateOrderItemPayload): Promise<PurchaseOrderItemDTO> {
  const { data } = await axios.post(`/orders/${orderId}/items`, item);
  return data as PurchaseOrderItemDTO;
}

export async function updateOrderStatus(id: string, status: string) {
  const { data } = await axios.patch(`/orders/${id}/status`, { status });
  return data;
}

export async function recalcOrder(id: string) {
  const { data } = await axios.post(`/orders/${id}/recalc`);
  return data;
}

export async function deleteOrder(id: string) {
  await axios.delete(`/orders/${id}`);
}

// Receipts
export interface ReceiptItemPayload { orderItemId: string; quantity: number; damagedQuantity?: number; returnQuantity?: number; note?: string }
export interface ReceiptPayload { deliveredDate?: string; transporter?: string; awb?: string; tracking?: string; note?: string; items: ReceiptItemPayload[] }
export async function createReceipt(orderId: string, payload: ReceiptPayload) {
  const { data } = await axios.post(`/orders/${orderId}/receipts`, payload);
  return data;
}

// Invoices
export interface InvoicePayload { number: string; date?: string; valueNet: number; vatValue: number; total: number; currency?: string }
export async function createInvoice(orderId: string, payload: InvoicePayload) {
  const { data } = await axios.post(`/orders/${orderId}/invoices`, payload);
  return data;
}

// Payments
export interface PaymentPayload { date?: string; amount: number; method?: string; note?: string }
export async function createPayment(invoiceId: string, payload: PaymentPayload) {
  const { data } = await axios.post(`/invoices/${invoiceId}/payments`, payload);
  return data;
}
