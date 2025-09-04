import React, { createContext, useState, type ReactNode } from 'react';
import { type Order } from './hooks/useOrders';

interface OrdersContextValue {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (id: string) => void;
}

export const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (orderData: Omit<Order, 'id'>) => {
    setOrders(prev => [
      { id: Date.now().toString(), ...orderData },
      ...prev,
    ]);
  };

  const updateOrder = (updated: Order) => {
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder }}>
      {children}
    </OrdersContext.Provider>
  );
};

