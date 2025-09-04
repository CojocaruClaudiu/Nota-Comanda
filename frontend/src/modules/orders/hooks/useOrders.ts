import { useContext } from 'react';
import { OrdersContext } from '../OrderContext';
export * from './useOrders'; // re-export types

export interface OrderItem {
  id: string;
  product: string;
  category: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  initiator: string;
  supplier: string;
  project: string;
  orderDate: Date;
  deliveryTerm: string;
  statusPayment: string;
  statusOrder: string;
  priority: string;
  notes?: string;
  items: OrderItem[];
}


export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used within OrdersProvider');
  return context;
}