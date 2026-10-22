import React, { useState } from 'react';
import { X, Boxes, Plus, Minus } from 'lucide-react';

export default function StockAdjustModal({ isOpen, onClose, onSave, product }) {
  const [adjustType, setAdjustType] = useState('Restock'); // 'Restock' or 'Adjustment'
  const [quantity, setQuantity] = useState(10);
  const [note, setNote] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qtyChange = adjustType === 'Restock' ? Math.abs(parseInt(quantity)) : parseInt(quantity);
    onSave({
      product_id: product.id,
      type: adjustType,
      quantity_changed: qtyChange,
      note: note || (adjustType === 'Restock' ? 'Stock Restock Shipment' : 'Manual Audit Adjustment')
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-rose-100">
        <div className="bg-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Boxes className="w-6 h-6" />
            <div>
              <h2 className="font-extrabold text-base">Adjust Stock Level</h2>
              <p className="text-xs text-rose-100">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex justify-between items-center">
            <div>
              <p className="text-[11px] text-stone-500 font-bold">Current Stock:</p>
              <p className="text-base font-extrabold text-stone-800">{product.current_stock} units</p>
            </div>
            <div>
              <p className="text-[11px] text-stone-500 font-bold">Minimum Alert:</p>
              <p className="text-base font-bold text-rose-600">{product.minimum_stock} units</p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1.5">Adjustment Action</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustType('Restock')}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  adjustType === 'Restock'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Restock (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType('Adjustment')}
                className={`p-3 rounded-2xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  adjustType === 'Adjustment'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Adjust / Audit (+/-)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Quantity {adjustType === 'Restock' ? 'to Add' : 'Change (+/-)'} *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g. 10 or -2"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-base focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Note / Reason</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. New stock shipment from distributor"
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
              Update Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
