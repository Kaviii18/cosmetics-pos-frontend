import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Upload, Image as ImageIcon } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export default function ProductModal({ isOpen, onClose, onSave, product }) {
  const { showToast } = usePOS();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category_name: 'Makeup',
    description: '',
    sku: '',
    barcode: '',
    buying_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: '5',
    image_url: '',
    expiry_date: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        category_name: product.category_name || 'Makeup',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        buying_price: product.buying_price || '',
        selling_price: product.selling_price || '',
        current_stock: product.current_stock || '',
        minimum_stock: product.minimum_stock || '5',
        image_url: product.image_url || '',
        expiry_date: product.expiry_date ? product.expiry_date.slice(0, 10) : ''
      });
    } else {
      const randSku = 'SKU-' + Math.floor(100 + Math.random() * 900);
      const randBarcode = '8901' + Math.floor(10000000 + Math.random() * 90000000);
      setFormData({
        name: '',
        brand: '',
        category_name: 'Makeup',
        description: '',
        sku: randSku,
        barcode: randBarcode,
        buying_price: '',
        selling_price: '',
        current_stock: '10',
        minimum_stock: '5',
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
        expiry_date: ''
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Device File Upload Handler (Base64)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result }));
        showToast('Image loaded from device!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.selling_price || !formData.sku || !formData.barcode) {
      showToast('Please fill in Product Name, SKU, Barcode, and Selling Price.', 'error');
      return;
    }
    onSave(formData);
  };

  const categories = [
    'Makeup', 'Skincare', 'Haircare', 'Fragrance', 'Lip Products',
    'Face Products', 'Eye Products', 'Accessories', 'Other'
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in border border-rose-100 my-8">
        <div className="bg-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackagePlus className="w-6 h-6" />
            <h2 className="font-extrabold text-lg">{product ? 'Edit Cosmetic Product' : 'Add New Cosmetic Product'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Device Image Upload Preview Box */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-dashed border-stone-300 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
              {formData.image_url ? (
                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-stone-300" />
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <label className="block font-bold text-stone-800">Product Image (Upload from Device)</label>
              <p className="text-[11px] text-stone-400">Select an image file from your computer or camera (PNG, JPG, WEBP)</p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Browse Device Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Maybelline Lipstick"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Brand Name *</label>
              <input
                type="text"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Maybelline, MAC, Clinique"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Category *</label>
              <select
                value={formData.category_name}
                onChange={e => setFormData({ ...formData, category_name: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">SKU Code *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Barcode Number *</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Buying Price (LKR / Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.buying_price}
                onChange={e => setFormData({ ...formData, buying_price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Selling Price (LKR / Rs.) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                placeholder="3250.00"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-rose-600 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Current Stock *</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={e => setFormData({ ...formData, current_stock: e.target.value })}
                placeholder="10"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Minimum Stock Alert Level</label>
              <input
                type="number"
                value={formData.minimum_stock}
                onChange={e => setFormData({ ...formData, minimum_stock: e.target.value })}
                placeholder="5"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description, formula details, shade info..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
            ></textarea>
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
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
