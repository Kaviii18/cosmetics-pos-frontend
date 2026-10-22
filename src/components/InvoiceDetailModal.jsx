import React, { useState } from 'react';
import { X, Printer, QrCode, Receipt, Calendar, User, CreditCard, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePOS } from '../context/POSContext';
import { printThermalReceipt } from '../services/printerService';

export default function InvoiceDetailModal({ isOpen, onClose, sale }) {
  const { setActiveReceipt, setShowReceiptModal, settings, showToast } = usePOS();
  const [printing, setPrinting] = useState(false);

  if (!isOpen || !sale) return null;

  const handleDirectPrint = async () => {
    setPrinting(true);
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
      setPrinting(false);
    }
  };

  const handleOpenReceiptModal = () => {
    setActiveReceipt(sale);
    onClose();
    setShowReceiptModal(true);
  };

  const items = sale.items || [];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-fade-in border border-rose-100 my-8">
        {/* Header */}
        <div className="bg-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <div>
              <h2 className="font-extrabold text-base">Invoice Details</h2>
              <p className="text-xs text-rose-100 font-mono">{sale.invoice_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Customer</p>
              <p className="font-bold text-stone-800 truncate">{sale.customer_name || 'Walk-in'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Cashier</p>
              <p className="font-bold text-stone-800 truncate">{sale.cashier_name || settings.cashier_name || 'Cashier'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Payment</p>
              <p className="font-bold text-rose-600">{sale.payment_method || 'Cash'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Date</p>
              <p className="font-bold text-stone-800">{new Date(sale.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div>
            <h3 className="font-bold text-stone-800 text-xs mb-2">Purchased Items ({items.length})</h3>
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30">
                      <td className="p-3 font-semibold text-stone-800">{item.product_name}</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right">{settings.currency} {parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">{settings.currency} {parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breakdown & QR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
            <div className="space-y-1 w-full sm:w-auto text-left">
              <p className="text-stone-600 flex justify-between gap-6"><span>Subtotal:</span> <span className="font-bold">{settings.currency} {parseFloat(sale.subtotal).toFixed(2)}</span></p>
              {parseFloat(sale.discount || 0) > 0 && (
                <p className="text-stone-600 flex justify-between gap-6"><span>Discount:</span> <span className="font-bold text-rose-600">- {settings.currency} {parseFloat(sale.discount).toFixed(2)}</span></p>
              )}
              {parseFloat(sale.tax || 0) > 0 && (
                <p className="text-stone-600 flex justify-between gap-6"><span>VAT Amount:</span> <span className="font-bold text-stone-800">+ {settings.currency} {parseFloat(sale.tax).toFixed(2)}</span></p>
              )}
              <p className="text-stone-900 font-extrabold text-sm pt-2 border-t border-rose-200 flex justify-between gap-6">
                <span>Grand Total:</span>
                <span className="text-rose-600">{settings.currency} {parseFloat(sale.grand_total).toFixed(2)}</span>
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-2 bg-white rounded-xl border border-rose-200 shadow-sm">
                <QRCodeSVG value={sale.invoice_no} size={85} />
              </div>
              <span className="text-[10px] font-bold text-stone-600 mt-1 font-mono">{sale.invoice_no}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-stone-100">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleOpenReceiptModal}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-extrabold hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Preview Receipt</span>
            </button>
            <button
              onClick={handleDirectPrint}
              disabled={printing}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold shadow-md shadow-rose-200 flex items-center gap-2 cursor-pointer disabled:opacity-75"
              title="Print directly to YHD 5808L thermal receipt printer (No duplicate sale)"
            >
              {printing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{printing ? 'Printing...' : 'Direct Print (YHD 5808L)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
