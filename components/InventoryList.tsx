
import React, { useState } from 'react';
import { Product, SortField, SortOrder } from '../types';
import { Edit2, Trash2, AlertTriangle, AlertCircle, Search, Filter } from 'lucide-react';

interface InventoryListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  categories: string[];
}

export const InventoryList: React.FC<InventoryListProps> = ({ products, onEdit, onDelete, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>(SortField.EXPIRY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.ASC);

  const today = new Date();
  const warningDate = new Date();
  warningDate.setDate(today.getDate() + 30); // 30 days warning

  const getStatusColor = (expiry: string, qty: number) => {
    const expDate = new Date(expiry);
    if (expDate < today) return 'bg-red-50 text-red-700 border-red-200';
    if (expDate < warningDate) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (qty < 10) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const getStatusText = (expiry: string, qty: number) => {
    const expDate = new Date(expiry);
    if (expDate < today) return 'Expired';
    if (expDate < warningDate) return 'Expiring Soon';
    if (qty < 10) return 'Low Stock';
    return 'Good';
  };

  // Filter and Sort Logic
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === SortField.NAME) {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === SortOrder.ASC) {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC);
    } else {
      setSortField(field);
      setSortOrder(SortOrder.ASC);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-slate-400 w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th onClick={() => handleHeaderClick(SortField.NAME)} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">Product Name</th>
              <th className="px-6 py-4">Category</th>
              <th onClick={() => handleHeaderClick(SortField.QUANTITY)} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">Qty</th>
              <th onClick={() => handleHeaderClick(SortField.PRICE)} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors text-right">Price</th>
              <th onClick={() => handleHeaderClick(SortField.EXPIRY)} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">Expiry Date</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  No products found. Add some stock to get started.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const statusStyle = getStatusColor(product.expiryDate, product.quantity);
                const statusLabel = getStatusText(product.expiryDate, product.quantity);
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono">{product.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono">₹{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{product.expiryDate}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}>
                        {statusLabel === 'Expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {statusLabel === 'Expiring Soon' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(product)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex justify-between">
        <span>Showing {filteredProducts.length} products</span>
        <span>Sorted by {sortField} ({sortOrder})</span>
      </div>
    </div>
  );
};
