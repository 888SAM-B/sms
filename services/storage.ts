import { Product, DEFAULT_CATEGORIES } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const storageService = {
  // --- Configuration ---
  isConnected: async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  // --- Products Operations ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return await response.json();
    } catch (error) {
      console.error("Fetch products error:", error);
      return [];
    }
  },

  saveProduct: async (product: Product): Promise<void> => {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!response.ok) throw new Error('Failed to save product');
  },

  deleteProduct: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete product');
  },

  // --- Categories Operations ---
  getCategories: async (): Promise<string[]> => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (!response.ok) {
        return DEFAULT_CATEGORIES;
      }
      const data = await response.json();
      const categories = data.map((r: any) => r.name);
      return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    } catch (error) {
      console.error("Fetch categories error:", error);
      return DEFAULT_CATEGORIES;
    }
  },

  addCategory: async (category: string): Promise<void> => {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: category }),
    });
    if (!response.ok) throw new Error('Failed to add category');
  },

  deleteCategory: async (category: string): Promise<void> => {
    const response = await fetch(`${API_URL}/categories/${category}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete category');
  },

  // Initialize default categories in database
  initializeDefaultCategories: async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/categories/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: DEFAULT_CATEGORIES }),
      });
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  }
};