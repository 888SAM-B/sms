import React, { useState, useEffect } from 'react';
import { X, Database, Save, LogOut } from 'lucide-react';
import { storageService } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(localStorage.getItem('sms_db_url') || '');
      setKey(localStorage.getItem('sms_db_key') || '');
      setIsConnected(storageService.isConnected());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (url && key) {
      storageService.saveCredentials(url, key);
      storageService.syncLocalToCloud(); // Attempt to push local data to new DB
      onSave();
      onClose();
    }
  };

  const handleDisconnect = () => {
    storageService.disconnect();
    setUrl('');
    setKey('');
    setIsConnected(false);
    onSave(); // Trigger reload in parent
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Database className="text-brand-600" size={20} />
            <h2 className="text-xl font-bold text-slate-800">Data Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Connect to Supabase (Cloud)</p>
            <p>Enter your project credentials to store data permanently in the cloud. If left empty, data is stored only on this device.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key (Anon/Public)</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJxh..."
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
            />
          </div>

          <div className="pt-4 flex gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 bg-red-50 font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Disconnect
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> {isConnected ? 'Update' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};