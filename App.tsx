
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Tags,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  ArrowRight,
  Menu // Added Menu icon import
} from 'lucide-react';

import { Product, ViewMode, InventoryStats } from './types';
import { InventoryList } from './components/InventoryList';
import { StockForm } from './components/StockForm';
import { StatsCard } from './components/StatsCard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { CategoryManager } from './components/CategoryManager';
import { SettingsModal } from './components/SettingsModal';
import { storageService } from './services/storage';

// Mock data used ONLY if no local storage and no DB
const MOCK_DATA: Product[] = [
  { id: '1', name: 'Almond Milk', category: 'Dairy', quantity: 45, price: 240, expiryDate: '2024-06-15' },
  { id: '2', name: 'Cheddar Cheese', category: 'Dairy', quantity: 8, price: 480, expiryDate: '2023-11-20' }, 
  { id: '3', name: 'Whole Wheat Bread', category: 'Bakery', quantity: 15, price: 55, expiryDate: '2024-05-25' },
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Mobile Nav State
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Modal State for Delete
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id?: string;
  }>({ isOpen: false });

  // Initial Data Load
  const loadData = async () => {
    setIsLoading(true);
    setIsConnected(storageService.isConnected());
    try {
      const loadedProducts = await storageService.getProducts();
      const loadedCategories = await storageService.getCategories();
      
      if (loadedProducts.length === 0 && !storageService.isConnected() && !localStorage.getItem('sms_products')) {
        setProducts(MOCK_DATA);
      } else {
        setProducts(loadedProducts);
      }
      
      setCategories(loadedCategories);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Derived Lists for Dashboard
  const alertItems = useMemo(() => {
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + 30);

    return products.filter(p => {
      const expDate = new Date(p.expiryDate);
      return p.quantity < 10 || expDate < warningDate;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [products]);

  // Handlers
  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    const product: Product = {
      ...newProduct,
      id: Math.random().toString(36).substr(2, 9) 
    };
    await storageService.saveProduct(product);
    setProducts([...products, product]);
  };

  const handleEditProduct = async (updatedProduct: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    const fullProduct = { ...updatedProduct, id: editingProduct.id };
    
    await storageService.saveProduct(fullProduct);
    
    setProducts(products.map(p => 
      p.id === editingProduct.id ? fullProduct : p
    ));
    setEditingProduct(undefined);
  };

  const requestDeleteProduct = (id: string) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation.id) {
      await storageService.deleteProduct(deleteConfirmation.id);
      setProducts(currentProducts => currentProducts.filter(p => p.id !== deleteConfirmation.id));
    }
    setDeleteConfirmation({ isOpen: false });
  };

  // Category Handlers
  const handleAddCategory = async (category: string) => {
    await storageService.addCategory(category);
    setCategories([...categories, category]);
  };

  const handleEditCategory = async (oldName: string, newName: string) => {
    await storageService.addCategory(newName);
    await storageService.deleteCategory(oldName);
    const affectedProducts = products.filter(p => p.category === oldName);
    for (const p of affectedProducts) {
      const updated = { ...p, category: newName };
      await storageService.saveProduct(updated);
    }
    
    setCategories(categories.map(c => c === oldName ? newName : c));
    setProducts(products.map(p => 
      p.category === oldName ? { ...p, category: newName } : p
    ));
  };

  const handleDeleteCategory = async (category: string) => {
    await storageService.deleteCategory(category);
    setCategories(categories.filter(c => c !== category));
  };

  const openAddModal = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  // Nav helper to close mobile menu on click
  const handleNavClick = (action: () => void) => {
    action();
    setIsMobileNavOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileNavOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-none transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-200">
            <Package size={20} />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-500 leading-tight">
            SMS-The Stock Manager
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <button
            onClick={() => handleNavClick(() => setViewMode('dashboard'))}
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
            onClick={() => handleNavClick(() => setViewMode('inventory'))}
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
            onClick={() => handleNavClick(() => setIsCategoryManagerOpen(true))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Tags size={20} />
            Categories
          </button>
          
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
             <button
              onClick={() => handleNavClick(() => setIsSettingsOpen(true))}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings size={20} />
              Data Settings
            </button>

            <div className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
              isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? 'Cloud Connected' : 'Local Storage'}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Mobile Header (Hamburger) */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg active:bg-slate-200"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg text-slate-800">SMS-The Stock Manager</span>
        </div>

        {/* Desktop Header & Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-8 flex justify-between items-center shrink-0 shadow-sm z-10">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">
              {viewMode === 'dashboard' ? 'Overview' : 'Stock Management'}
            </h1>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-sm shadow-brand-500/20 transition-all active:scale-95 font-medium text-sm sm:text-base whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Stock</span>
              <span className="sm:hidden">Add</span>
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
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Action Needed Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Needs Attention
                    </h3>
                    <button 
                      onClick={() => setViewMode('inventory')}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                      View All Inventory <ArrowRight size={14} />
                    </button>
                  </div>
                  
                  {alertItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package size={24} />
                      </div>
                      <p className="font-medium text-slate-800">Everything looks good!</p>
                      <p className="text-sm">No low stock or expiring items.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                          <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Issue</th>
                            <th className="px-6 py-3 text-right">Qty</th>
                            <th className="px-6 py-3">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {alertItems.slice(0, 5).map(item => {
                            const isExpired = new Date(item.expiryDate) < new Date();
                            const isLowStock = item.quantity < 10;
                            
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-3 font-medium text-slate-800">{item.name}</td>
                                <td className="px-6 py-3">
                                  <div className="flex gap-2 flex-wrap">
                                    {isExpired && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                        Expired
                                      </span>
                                    )}
                                    {!isExpired && new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                        Expiring Soon
                                      </span>
                                    )}
                                    {isLowStock && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                        Low Stock
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-slate-600">{item.quantity}</td>
                                <td className="px-6 py-3 text-slate-600 font-mono">{item.expiryDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {alertItems.length > 5 && (
                        <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
                          + {alertItems.length - 5} more items require attention
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View: Inventory */}
            {viewMode === 'inventory' && (
              <div className="h-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      </div>

      {/* Stock Form Modal */}
      <StockForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
        initialData={editingProduct}
        categories={categories}
      />

      {/* Confirmation Modal (Strictly for Delete now) */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Product?"
        message="Are you sure you want to delete this item from your inventory? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={loadData}
      />
    </div>
  );
}

export default App;
