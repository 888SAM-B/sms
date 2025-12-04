
import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, XCircle } from 'lucide-react';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onAdd: (category: string) => void;
  onEdit: (oldName: string, newName: string) => void;
  onDelete: (category: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    
    if (categories.includes(trimmed)) {
      setError('Category already exists');
      return;
    }

    onAdd(trimmed);
    setNewCategory('');
    setError('');
  };

  const startEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditValue(cat);
    setError('');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
    setError('');
  };

  const saveEdit = (oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    if (trimmed !== oldName && categories.includes(trimmed)) {
      setError('Category already exists');
      return;
    }

    onEdit(oldName, trimmed);
    setEditingCategory(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            Manage Categories
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 shrink-0">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                setError('');
              }}
              placeholder="New category name..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newCategory.trim()}
              className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={24} />
            </button>
          </form>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-2 flex-1">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group border border-transparent hover:border-slate-200 transition-all">
              {editingCategory === cat ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(cat)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEdit} className="text-slate-400 hover:bg-slate-200 p-1 rounded">
                    <XCircle size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{cat}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-slate-400 py-4">No categories found.</p>
          )}
        </div>
      </div>
    </div>
  );
};
