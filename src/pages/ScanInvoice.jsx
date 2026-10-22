import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowLeft, RefreshCw, ShoppingBag } from 'lucide-react';

export default function ScanInvoice() {
  const { invoiceNo } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (invoiceNo) {
      api.getSaleByInvoice(invoiceNo)
        .then(data => setSale(data))
        .catch(err => setError(err.message || 'Invoice not found'))
        .finally(() => setLoading(false));
    }
  }, [invoiceNo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-xs font-bold text-stone-500">Retrieving Verified Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-stone-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-xl">✕</div>
          <h2 className="text-lg font-extrabold text-stone-900">Invoice Not Found</h2>
          <p className="text-xs text-stone-500">The requested invoice ID "{invoiceNo}" could not be verified.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-rose-500 text-white rounded-2xl font-bold text-xs shadow-md">
            Return to POS Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const items = sale.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-stone-50 p-4 sm:p-8 flex items-center justify-center selection:bg-rose-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-100 animate-fade-in my-8">
        {/* Verification Banner */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-6 text-white text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mx-auto text-white backdrop-blur-md">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="inline-block px-3 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold tracking-widest uppercase">
            Official Store Receipt
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">Velvet Touch Cosmetics</h1>
          <p className="text-xs text-rose-100 font-mono">Verified Invoice: {sale.invoice_no}</p>
        </div>

        {/* Bill Summary */}
        <div className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Invoice Number</p>
              <p className="font-extrabold text-rose-600 font-mono">{sale.invoice_no}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Date & Time</p>
              <p className="font-bold text-stone-800">{new Date(sale.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Cashier</p>
              <p className="font-bold text-stone-800">{sale.cashier_name || 'Store Staff'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">Payment Method</p>
              <p className="font-bold text-stone-800">{sale.payment_method || 'Cash'}</p>
            </div>
          </div>

          {/* Purchased Products Table */}
          <div>
            <h3 className="font-extrabold text-stone-900 text-xs mb-2">Purchased Products</h3>
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-stone-800">{item.product_name}</td>
                      <td className="p-3 text-center font-bold">{item.quantity}</td>
                      <td className="p-3 text-right">Rs. {parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="p-3 text-right font-extrabold text-rose-600">Rs. {parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Total */}
          <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1 text-right">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-bold">Rs. {parseFloat(sale.subtotal).toFixed(2)}</span>
            </div>
            {parseFloat(sale.discount || 0) > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Discount:</span>
                <span>- Rs. {parseFloat(sale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-900 text-base font-extrabold pt-2 border-t border-rose-200">
              <span>TOTAL PAID:</span>
              <span className="text-rose-600">Rs. {parseFloat(sale.grand_total).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs font-extrabold text-stone-800">Thank you for shopping with Velvet Touch Cosmetics! ✨</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Please retain this digital record for warranty or exchange.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
