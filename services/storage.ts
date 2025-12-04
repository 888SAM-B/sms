import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, DEFAULT_CATEGORIES } from '../types';

// Keys for LocalStorage
const LS_KEYS = {
  PRODUCTS: 'sms_products',
  CATEGORIES: 'sms_categories',
  DB_URL: 'sms_db_url',
  DB_KEY: 'sms_db_key'
};

let supabase: SupabaseClient | null = null;

// Initialize Supabase if credentials exist
const initSupabase = () => {
  const url = localStorage.getItem(LS_KEYS.DB_URL);
  const key = localStorage.getItem(LS_KEYS.DB_KEY);
  
  if (url && key) {
    try {
      supabase = createClient(url, key);
      return true;
    } catch (e) {
      console.error("Failed to init Supabase", e);
      return false;
    }
  }
  return false;
};

// Initial check
initSupabase();

export const storageService = {
  // --- Configuration ---
  saveCredentials: (url: string, key: string) => {
    localStorage.setItem(LS_KEYS.DB_URL, url);
    localStorage.setItem(LS_KEYS.DB_KEY, key);
    initSupabase();
  },

  disconnect: () => {
    localStorage.removeItem(LS_KEYS.DB_URL);
    localStorage.removeItem(LS_KEYS.DB_KEY);
    supabase = null;
  },

  isConnected: () => !!supabase,

  // --- Products Operations ---
  getProducts: async (): Promise<Product[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) return data as Product[];
      console.error("DB Error fetching products:", error);
    }
    
    // Fallback to LocalStorage
    const local = localStorage.getItem(LS_KEYS.PRODUCTS);
    return local ? JSON.parse(local) : [];
  },

  saveProduct: async (product: Product): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('products').upsert(product);
      if (error) console.error("DB Error saving product:", error);
    }
    
    // Always sync to LocalStorage as backup/cache
    const current = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || '[]');
    const index = current.findIndex((p: Product) => p.id === product.id);
    if (index >= 0) {
      current[index] = product;
    } else {
      current.push(product);
    }
    localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(current));
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error("DB Error deleting product:", error);
    }

    const current = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || '[]');
    const filtered = current.filter((p: Product) => p.id !== id);
    localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(filtered));
  },

  // --- Categories Operations ---
  getCategories: async (): Promise<string[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('name');
      if (!error && data) return data.map((r: any) => r.name);
      console.error("DB Error fetching categories:", error);
    }

    const local = localStorage.getItem(LS_KEYS.CATEGORIES);
    return local ? JSON.parse(local) : DEFAULT_CATEGORIES;
  },

  addCategory: async (category: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('categories').insert({ name: category });
      if (error) console.error("DB Error adding category:", error);
    }

    const current = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES));
    if (!current.includes(category)) {
      current.push(category);
      localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(current));
    }
  },

  deleteCategory: async (category: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('name', category);
      if (error) console.error("DB Error deleting category:", error);
    }

    const current = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES));
    const filtered = current.filter((c: string) => c !== category);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(filtered));
  },
  
  // Helper to sync local data to cloud (Initial migration)
  syncLocalToCloud: async () => {
    if (!supabase) return;
    
    const localProds = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || '[]');
    if (localProds.length > 0) {
      await supabase.from('products').upsert(localProds);
    }

    const localCats = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    if (localCats.length > 0) {
      // Categories table expects { name: string } objects
      const catObjects = localCats.map((c: string) => ({ name: c }));
      await supabase.from('categories').upsert(catObjects, { onConflict: 'name' });
    }
  }
};