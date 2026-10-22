import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export default function CustomerModal({ isOpen, onClose, onSave, customer }) {
  const { showToast } = usePOS();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || ''
      });
    } else {
      setFormData({ name: '', phone: '+94', email: '' });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Customer Name and Phone Number are required.', 'error');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-rose-100">
        <div className="bg-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6" />
            <h2 className="font-extrabold text-base">{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Customer Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Nimmi Perera"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Mobile Phone Number *</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+94 77 123 4567"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="nimmi@gmail.com"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold shadow-md shadow-rose-200"
            >
              {customer ? 'Save Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
