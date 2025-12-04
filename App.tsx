
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Tags
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Product, ViewMode, InventoryStats, DEFAULT_CATEGORIES } from './types';
import { InventoryList } from './components/InventoryList';
import { StockForm } from './components/StockForm';
import { StatsCard } from './components/StatsCard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { CategoryManager } from './components/CategoryManager';

// Initial Mock Data
const MOCK_DATA: Product[] = [
  { id: '1', name: 'Almond Milk', category: 'Dairy', quantity: 45, price: 240, expiryDate: '2024-06-15' },
  { id: '2', name: 'Cheddar Cheese', category: 'Dairy', quantity: 8, price: 480, expiryDate: '2023-11-20' }, // Expired
  { id: '3', name: 'Whole Wheat Bread', category: 'Bakery', quantity: 15, price: 55, expiryDate: '2024-05-25' }, // Soon
  { id: '4', name: 'Apples (Red)', category: 'Produce', quantity: 100, price: 180, expiryDate: '2024-06-01' },
  { id: '5', name: 'Orange Juice', category: 'Beverages', quantity: 5, price: 320, expiryDate: '2024-07-10' }, // Low Stock
  { id: '6', name: 'Potato Chips', category: 'Snacks', quantity: 30, price: 45, expiryDate: '2024-12-01' },
];

function App() {
  // Products State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('stockSentinel_data');
    return saved ? JSON.parse(saved) : MOCK_DATA;
  });

  // Categories State
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('stockSentinel_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  // Delete State
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('stockSentinel_data', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('stockSentinel_categories', JSON.stringify(categories));
  }, [categories]);

  // Derived Statistics
  const stats: InventoryStats = useMemo(() => {
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + 30);

    return products.reduce((acc, p) => {
      const expDate = new Date(p.expiryDate);
      acc.totalItems += p.quantity;
      acc.totalValue += p.quantity * p.price;
      
      if (p.quantity < 10) acc.lowStockCount++;
      if (expDate < today) acc.expiredCount++;
      else if (expDate < warningDate) acc.expiringSoonCount++;
      
      return acc;
    }, { totalItems: 0, totalValue: 0, lowStockCount: 0, expiredCount: 0, expiringSoonCount: 0 });
  }, [products]);

  // Chart Data
  const categoryData = useMemo(() => {
    const groups: {[key: string]: number} = {};
    products.forEach(p => {
      groups[p.category] = (groups[p.category] || 0) + p.quantity;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [products]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  // Handlers
  const handleAddProduct = (newProduct: Omit<Product, 'id'>) => {
    const product: Product = {
      ...newProduct,
      id: Math.random().toString(36).substr(2, 9)
    };
    setProducts([...products, product]);
  };

  const handleEditProduct = (updatedProduct: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    const updatedList = products.map(p => 
      p.id === editingProduct.id ? { ...updatedProduct, id: p.id } : p
    );
    setProducts(updatedList);
    setEditingProduct(undefined);
  };

  const requestDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      setProducts(currentProducts => currentProducts.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
    }
  };

  // Category Handlers
  const handleAddCategory = (category: string) => {
    setCategories([...categories, category]);
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    // Update category list
    setCategories(categories.map(c => c === oldName ? newName : c));
    
    // Update products with this category
    setProducts(products.map(p => 
      p.category === oldName ? { ...p, category: newName } : p
    ));
  };

  const handleDeleteCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
    // We do NOT remove products, they just become categorized under a name that is no longer in the list (effectively archived)
  };

  const openAddModal = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col z-20 sticky top-0 md:h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <Package size={20} />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-500 leading-tight">
            SMS-The Stock Manager
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              viewMode === 'dashboard' 
                ? 'bg-brand-50 text-brand-700 font-medium' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              viewMode === 'inventory' 
                ? 'bg-brand-50 text-brand-700 font-medium' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Package size={20} />
            Inventory
          </button>
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Tags size={20} />
            Categories
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center shrink-0">
          <h1 className="text-2xl font-bold text-slate-800">
            {viewMode === 'dashboard' ? 'Overview' : 'Stock Management'}
          </h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg shadow-sm shadow-brand-500/20 transition-all active:scale-95 font-medium"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Stock</span>
          </button>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard 
              title="Total Inventory" 
              value={stats.totalItems.toLocaleString()} 
              icon={Package} 
              colorClass="bg-blue-500"
            />
            <StatsCard 
              title="Total Value" 
              value={`₹${stats.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
              icon={DollarSign} 
              colorClass="bg-emerald-500" 
            />
            <StatsCard 
              title="Expiring Soon" 
              value={stats.expiringSoonCount} 
              icon={Calendar} 
              colorClass="bg-orange-500"
              trend={stats.expiringSoonCount > 0 ? "Action required" : "All good"}
            />
            <StatsCard 
              title="Expired Items" 
              value={stats.expiredCount} 
              icon={AlertTriangle} 
              colorClass="bg-red-500"
              trend={stats.expiredCount > 0 ? "Remove immediately" : "Clean stock"}
            />
          </div>

          {/* View: Dashboard */}
          {viewMode === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                    Stock Distribution
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart / Quick Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="text-lg font-bold text-slate-800 mb-6">Composition</h3>
                   <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* View: Inventory */}
          {viewMode === 'inventory' && (
            <div className="h-[calc(100%-2rem)]">
              <InventoryList 
                products={products}
                onEdit={openEditModal}
                onDelete={requestDeleteProduct}
                categories={categories}
              />
            </div>
          )}

        </div>
      </main>

      {/* Stock Form Modal */}
      <StockForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
        initialData={editingProduct}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
      />

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}

export default App;
