
export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  expiryDate: string; // ISO date string YYYY-MM-DD
  notes?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number; // Within 30 days
}

export type ViewMode = 'dashboard' | 'inventory';

export enum SortField {
  NAME = 'name',
  QUANTITY = 'quantity',
  EXPIRY = 'expiryDate',
  PRICE = 'price'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export const DEFAULT_CATEGORIES = [
  'Dairy',
  'Bakery',
  'Produce',
  'Beverages',
  'Snacks',
  'Canned Goods',
  'Household',
  'Personal Care'
];
