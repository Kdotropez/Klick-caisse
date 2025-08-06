export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  tax: number;
  finalTotal: number;
  paymentMethod: 'cash' | 'card' | 'check';
  timestamp: Date;
  cashier: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
} 