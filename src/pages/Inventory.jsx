import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import {
  Boxes, Search, Filter, Plus, Minus, History, AlertTriangle,
  RefreshCw, CheckCircle2
} from 'lucide-react';
import StockAdjustModal from '../components/StockAdjustModal';

export default function Inventory() {
  const { settings, showToast } = usePOS();
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'history'

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [invData, histData] = await Promise.all([
        api.getInventory({ search, status: statusFilter === 'All' ? '' : statusFilter }),
        api.getInventoryHistory()
      ]);
      setInventory(invData || []);
      setHistory(histData || []);
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [search, statusFilter]);

  const handleAdjustStock = async (payload) => {
    try {
      const res = await api.adjustStock(payload);
      showToast(`Stock updated! New stock: ${res.new_stock}`, 'success');
      setShowAdjustModal(false);
      setSelectedProduct(null);
      fetchInventoryData();
    } catch (err) {
      showToast(err.message || 'Stock adjustment failed.', 'error');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Inventory & Stock Control</h1>
          <p className="text-xs text-stone-500 font-medium">Real-time stock level monitoring, minimum thresholds, and stock audit history</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-stone-200 shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'stock'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Audit History Log
          </button>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search stock by product name, SKU or barcode..."
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {['All', 'in_stock', 'low_stock', 'out_of_stock'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {st === 'All' ? 'All Statuses' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-500">Loading Inventory...</p>
              </div>
            ) : inventory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
                    <tr>
                      <th className="p-4">Product Name</th>
                      <th className="p-4">SKU / Barcode</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-center">Current Stock</th>
                      <th className="p-4 text-center">Minimum Stock</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {inventory.map(prod => {
                      const isOutOfStock = prod.current_stock <= 0;
                      const isLowStock = prod.current_stock > 0 && prod.current_stock <= prod.minimum_stock;

                      return (
                        <tr key={prod.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="p-4 font-bold text-stone-900">{prod.name}</td>
                          <td className="p-4 font-mono">
                            <span className="font-bold text-stone-800">{prod.sku}</span>
                            <span className="text-[10px] text-stone-400 block">{prod.barcode}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full text-[10px] font-bold">
                              {prod.category_name}
                            </span>
                          </td>
                          <td className="p-4 text-center font-extrabold text-base text-stone-900">
                            {prod.current_stock}
                          </td>
                          <td className="p-4 text-center font-bold text-stone-500">
                            {prod.minimum_stock}
                          </td>
                          <td className="p-4 text-center">
                            {isOutOfStock ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => { setSelectedProduct(prod); setShowAdjustModal(true); }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white transition-all font-bold text-xs"
                            >
                              Adjust Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-stone-400 font-bold">
                No inventory records match filters.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Inventory History Audit Log */
        <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
          <div className="p-5 border-b border-stone-100">
            <h2 className="text-base font-extrabold text-stone-900">Inventory Transaction Log</h2>
            <p className="text-xs text-stone-500">Full history of sales stock decrements, restocks, and manual adjustments</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Qty Change</th>
                  <th className="p-4 text-center">Stock Before → After</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Note / Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {history.length > 0 ? (
                  history.map((log) => (
                    <tr key={log.id} className="hover:bg-rose-50/20">
                      <td className="p-4 text-stone-500">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-4 font-bold text-stone-900">{log.product_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'Sale' ? 'bg-stone-100 text-stone-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-extrabold">
                        <span className={log.quantity_changed < 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                        </span>
                      </td>
                      <td className="p-4 text-center text-stone-600">
                        {log.previous_stock} → <span className="font-bold text-stone-900">{log.new_stock}</span>
                      </td>
                      <td className="p-4 font-semibold text-stone-700">{log.user_name}</td>
                      <td className="p-4 text-stone-500 italic">{log.note || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-stone-400 font-bold">
                      No inventory transaction history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={showAdjustModal}
        onClose={() => { setShowAdjustModal(false); setSelectedProduct(null); }}
        onSave={handleAdjustStock}
        product={selectedProduct}
      />
    </div>
  );
}
