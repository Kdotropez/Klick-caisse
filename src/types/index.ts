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
  cashierId?: string; // ID du caissier qui a effectué la transaction
  cashierName?: string; // Nom du caissier (pour compatibilité)
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

// Export des types de caissiers
export * from './Cashier'; 