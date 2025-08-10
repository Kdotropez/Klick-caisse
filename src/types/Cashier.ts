export interface Cashier {
  id: string;
  name: string;
  firstName: string;
  pin: string; // Code PIN à 4 chiffres
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  totalSales: number; // Total des ventes du caissier
  totalTransactions: number; // Nombre total de transactions
}

export interface CashierSession {
  cashierId: string;
  cashierName: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

export interface CashierStats {
  cashierId: string;
  cashierName: string;
  dailySales: number;
  dailyTransactions: number;
  monthlySales: number;
  monthlyTransactions: number;
  totalSales: number;
  totalTransactions: number;
}
