import React, { useState, useEffect } from 'react';
import { CreditCard, Wifi, CheckCircle2, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export default function CardPaymentModal({ isOpen, onClose, onApproved, amount }) {
  const { settings } = usePOS();
  const [processing, setProcessing] = useState(false);
  const [approvalCode, setApprovalCode] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProcessing(false);
      setSuccess(false);
      const randRef = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
      setApprovalCode(randRef);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateTap = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        onApproved(approvalCode);
      }, 1000);
    }, 1500);
  };

  const currency = settings.currency || 'Rs.';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-rose-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base">Card Reader Payment</h2>
              <p className="text-xs text-rose-100">Tap or Insert Card to Pay</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Payment Screen Body */}
        <div className="p-6 text-center space-y-5">
          {/* Amount Display */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <p className="text-xs font-bold text-stone-500 uppercase">Amount Due</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              {currency} {parseFloat(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Interactive Card Reader Animation Area */}
          <div className="p-6 bg-gradient-to-b from-stone-900 to-stone-800 rounded-3xl text-white space-y-4 shadow-inner relative overflow-hidden">
            <div className="flex justify-between items-center text-stone-400 text-xs">
              <span className="font-mono">POS TERMINAL #01</span>
              <Wifi className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>

            {success ? (
              <div className="py-4 space-y-2 animate-fade-in">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                <p className="text-base font-extrabold text-white">Card Payment Approved!</p>
                <p className="text-xs text-stone-300 font-mono">Approval Code: {approvalCode}</p>
              </div>
            ) : processing ? (
              <div className="py-6 space-y-3">
                <RefreshCw className="w-12 h-12 text-rose-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-stone-200">Processing Card Transaction...</p>
                <p className="text-[11px] text-stone-400">Communicating with Bank Reader</p>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <div className="w-20 h-14 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-xl mx-auto flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 cursor-pointer" onClick={handleSimulateTap}>
                  <div className="w-6 h-6 border-2 border-amber-600/60 rounded-full"></div>
                </div>
                <p className="text-xs font-bold text-stone-200">Tap Card or Insert Chip Reader</p>
                <p className="text-[10px] text-stone-400">Supports Visa, Mastercard, AMEX & Contactless NFC</p>
              </div>
            )}
          </div>

          {/* Reference Input */}
          <div className="text-left text-xs space-y-1">
            <label className="block font-bold text-stone-700">Card Approval Reference Code</label>
            <input
              type="text"
              value={approvalCode}
              onChange={e => setApprovalCode(e.target.value)}
              placeholder="e.g. TXN-984210"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulateTap}
              disabled={processing || success}
              className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span>{processing ? 'Processing...' : 'Tap / Pay Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
