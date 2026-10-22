import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import {
  Receipt, Search, Calendar, Eye, Printer, QrCode, Filter, RefreshCw
} from 'lucide-react';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import { printThermalReceipt } from '../services/printerService';

export default function SalesHistory() {
  const { settings, showToast } = usePOS();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState(null);

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('All');

  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleQuickThermalPrint = async (sale) => {
    setPrintingId(sale.id);
    try {
      const res = await printThermalReceipt(sale, settings);
      if (res.success) {
        showToast(`Invoice #${sale.invoice_no} reprinted on YHD 5808L!`, 'success');
      } else {
        showToast(`Print failed: ${res.detail || res.message}`, 'error');
      }
    } catch (err) {
      showToast('Error communicating with thermal printer', 'error');
    } finally {
      setPrintingId(null);
    }
  };

  const fetchSalesHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getSales({ search, startDate, endDate, paymentMethod });
      setSales(data || []);
    } catch (err) {
      console.error('Error fetching sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, [search, startDate, endDate, paymentMethod]);

  const handleOpenDetail = async (sale) => {
    try {
      const full = await api.getSaleByInvoice(sale.invoice_no);
      setSelectedSale(full);
      setShowDetailModal(true);
    } catch (err) {
      setSelectedSale(sale);
      setShowDetailModal(true);
    }
  };

  const currency = settings.currency || 'Rs.';

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Sales Transactions & Receipts</h1>
          <p className="text-xs text-stone-500 font-medium">Search previous bills, reprint receipts, and inspect invoice breakdown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-soft grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice number, customer or cashier..."
            className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400"
          />
          <span className="text-stone-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Payment Method */}
        <select
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <option value="All">All Payment Methods</option>
          <option value="Cash">Cash Payments</option>
          <option value="Card">Card Payments</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-500">Loading Sales History...</p>
          </div>
        ) : sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Cashier</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Subtotal</th>
                  <th className="p-4 text-right">Discount</th>
                  <th className="p-4 text-right">Grand Total</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-rose-600">{sale.invoice_no}</td>
                    <td className="p-4 text-stone-500">{new Date(sale.created_at).toLocaleString()}</td>
                    <td className="p-4 font-bold text-stone-800">{sale.customer_name}</td>
                    <td className="p-4 text-stone-600">{sale.cashier_name}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="p-4 text-right text-stone-600">
                      {currency} {parseFloat(sale.subtotal).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-rose-600 font-semibold">
                      {parseFloat(sale.discount || 0) > 0 ? `- ${currency} ${parseFloat(sale.discount).toFixed(2)}` : 'Rs. 0.00'}
                    </td>
                    <td className="p-4 text-right font-extrabold text-stone-900 text-sm">
                      {currency} {parseFloat(sale.grand_total).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleQuickThermalPrint(sale)}
                          disabled={printingId === sale.id}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200 transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
                          title="Reprint directly to YHD 5808L thermal printer"
                        >
                          {printingId === sale.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden xl:inline">Print</span>
                        </button>
                        <button
                          onClick={() => handleOpenDetail(sale)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          title="View sale invoice details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-stone-400 font-bold">
            No sales records match the filter criteria.
          </div>
        )}
      </div>

      {/* Invoice Detail & Reprint Modal */}
      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedSale(null); }}
        sale={selectedSale}
      />
    </div>
  );
}
