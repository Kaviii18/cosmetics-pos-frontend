import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Check, Sparkles, RefreshCw, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { printThermalReceipt } from '../services/printerService';

export default function ReceiptModal() {
  const { activeReceipt, showReceiptModal, setShowReceiptModal, settings, clearCart, showToast } = usePOS();
  const [receiptWidth, setReceiptWidth] = useState(settings.receipt_width || '58mm');
  const [printingThermal, setPrintingThermal] = useState(false);
  const [printStatus, setPrintStatus] = useState(null); // { type: 'success'|'error', message: string, fix?: string }
  const [showDropdown, setShowDropdown] = useState(false);
  const receiptContainerRef = useRef(null);

  useEffect(() => {
    if (settings.receipt_width) {
      setReceiptWidth(settings.receipt_width);
    }
  }, [settings.receipt_width]);

  // Reset status when a new receipt is opened
  useEffect(() => {
    if (showReceiptModal) {
      setPrintStatus(null);
    }
  }, [showReceiptModal, activeReceipt?.invoice_no]);

  const handleClose = () => {
    setShowReceiptModal(false);
    clearCart();
  };

  // Direct ESC/POS thermal printing to YHD 5808L via Cleanter Bridge (NO PDF, NO PRINT DIALOG)
  const handleDirectThermalPrint = async () => {
    if (!activeReceipt || printingThermal) return;
    setPrintingThermal(true);
    setPrintStatus(null);

    try {
      const res = await printThermalReceipt(activeReceipt, settings);
      if (res.success) {
        setPrintStatus({
          type: 'success',
          message: `Printed successfully to YHD 5808L (Job #${res.jobId || 'OK'})`
        });
        showToast('Receipt printed on YHD 5808L!', 'success');
      } else {
        setPrintStatus({
          type: 'error',
          message: res.message || 'Thermal printing failed',
          fix: res.fix || 'Check Bluetooth pairing and ensure Cleanter service is active on tablet.'
        });
        showToast(`Print failed: ${res.detail || res.message}`, 'error');
      }
    } catch (err) {
      setPrintStatus({
        type: 'error',
        message: err.message || 'Error communicating with printer bridge',
        fix: 'Make sure Cleanter Android app is open at http://localhost:9100.'
      });
      showToast('Thermal print error', 'error');
    } finally {
      setPrintingThermal(false);
    }
  };

  // Fallback: Browser Print Dialog (Only if user explicitly requests browser printing)
  const handleBrowserPrint = () => {
    const receiptEl = receiptContainerRef.current;
    if (!receiptEl) {
      window.print();
      return;
    }

    const oldIframe = document.getElementById('thermal-receipt-print-frame');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const is58 = receiptWidth === '58mm';
    const paperWidth = is58 ? '58mm' : '80mm';
    const printableWidth = is58 ? '48mm' : '74mm';
    const baseFontSize = is58 ? '10px' : '12px';

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt_${activeReceipt.invoice_no}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
              font-size: ${baseFontSize};
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              width: ${printableWidth};
              padding: 6px 4px;
              margin: 0 auto;
            }
            * { box-sizing: border-box; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .uppercase { text-transform: uppercase; }
            .border-b-dashed { border-bottom: 1px dashed #333333; }
            .border-t-solid { border-top: 1px solid #333333; }
            .py-1 { padding-top: 3px; padding-bottom: 3px; }
            .flex-between { display: flex; justify-content: space-between; align-items: center; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; padding: 3px 0; border-bottom: 1px solid #333; }
            td { padding: 3px 0; vertical-align: top; }
            .qr-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${receiptEl.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };

  // Keyboard shortcut listener for F8 (Direct Thermal Print) and ESC (Close)
  useEffect(() => {
    if (!showReceiptModal) return;

    const handleKey = (e) => {
      if (e.key === 'F8') {
        e.preventDefault();
        handleDirectThermalPrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showReceiptModal, receiptWidth, activeReceipt, printingThermal]);

  if (!showReceiptModal || !activeReceipt) return null;

  const items = activeReceipt.items || [];

  const receiptBody = (
    <div
      ref={receiptContainerRef}
      id="printable-receipt-content"
      className={`bg-white font-mono text-stone-900 ${
        receiptWidth === '58mm' ? 'w-[245px] text-[11px]' : 'w-[310px] text-xs'
      }`}
    >
      {/* Shop Header */}
      <div className="text-center pb-3 border-b-dashed border-stone-300">
        <div className="flex justify-center mb-2">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.shop_name || 'Logo'}
              className="store-logo-img h-12 w-auto max-w-[140px] object-contain mx-auto"
            />
          ) : (
            <div className="receipt-logo-badge w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-md border border-rose-200">
              <Sparkles className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
          )}
        </div>
        <h1 className="font-extrabold text-sm uppercase tracking-wide">{settings.shop_name}</h1>
        {settings.shop_address && (
          <p className="text-[10px] mt-0.5 leading-tight text-stone-600">{settings.shop_address}</p>
        )}
        {settings.shop_phone && (
          <p className="text-[10px] font-bold mt-0.5 text-stone-800">Tel: {settings.shop_phone}</p>
        )}
        {activeReceipt.is_offline && (
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mt-1">
            * OFFLINE TRANSACTION RECORD *
          </p>
        )}
      </div>

      {/* Invoice Meta */}
      <div className="py-2.5 border-b-dashed border-stone-300 text-[11px] space-y-0.5">
        <div className="flex-between flex justify-between">
          <span className="text-stone-600">Invoice:</span>
          <span className="font-bold">{activeReceipt.invoice_no}</span>
        </div>
        <div className="flex-between flex justify-between">
          <span className="text-stone-600">Date:</span>
          <span>{new Date(activeReceipt.created_at || Date.now()).toLocaleString()}</span>
        </div>
        <div className="flex-between flex justify-between">
          <span className="text-stone-600">Cashier:</span>
          <span>{activeReceipt.cashier_name || settings.cashier_name || 'Cashier'}</span>
        </div>
        <div className="flex-between flex justify-between">
          <span className="text-stone-600">Customer:</span>
          <span>{activeReceipt.customer_name || 'Walk-in'}</span>
        </div>
      </div>

      {/* Line Items */}
      <div className="py-2.5 border-b-dashed border-stone-300">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500">
              <th className="pb-1 text-left">Item</th>
              <th className="pb-1 text-center">Qty</th>
              <th className="pb-1 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 pr-1 truncate max-w-[120px] text-left font-medium">
                  {item.product_name || item.name}
                </td>
                <td className="py-1 text-center font-bold">{item.quantity}</td>
                <td className="py-1 text-right font-medium">
                  {(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="py-2.5 border-b-dashed border-stone-300 space-y-1 text-right text-[11px]">
        <div className="flex-between flex justify-between">
          <span className="text-stone-600">Subtotal:</span>
          <span>{settings.currency} {parseFloat(activeReceipt.subtotal || 0).toFixed(2)}</span>
        </div>
        {parseFloat(activeReceipt.discount || 0) > 0 && (
          <div className="flex-between flex justify-between text-rose-600 font-medium">
            <span>Discount{activeReceipt.coupon_code ? ` (${activeReceipt.coupon_code})` : ''}:</span>
            <span>- {settings.currency} {parseFloat(activeReceipt.discount).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(activeReceipt.tax || 0) > 0 && (
          <div className="flex-between flex justify-between">
            <span className="text-stone-600">VAT Amount:</span>
            <span>+ {settings.currency} {parseFloat(activeReceipt.tax).toFixed(2)}</span>
          </div>
        )}
        <div className="flex-between flex justify-between font-extrabold text-sm pt-1 border-t border-stone-400">
          <span>TOTAL DUE:</span>
          <span>{settings.currency} {parseFloat(activeReceipt.grand_total).toFixed(2)}</span>
        </div>
        <div className="flex-between flex justify-between pt-1">
          <span className="text-stone-600">Payment ({activeReceipt.payment_method || 'Cash'}):</span>
          <span>{settings.currency} {parseFloat(activeReceipt.cash_received || activeReceipt.grand_total).toFixed(2)}</span>
        </div>
        {activeReceipt.payment_method === 'Cash' && (
          <div className="flex-between flex justify-between font-bold">
            <span className="text-stone-700">Change Due:</span>
            <span>{settings.currency} {parseFloat(activeReceipt.change_amount || 0).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* QR Code Section */}
      <div className="qr-container pt-3 pb-2 text-center flex flex-col items-center">
        <div className="qr-code-box p-1.5 bg-white rounded border border-stone-300 inline-block">
          <QRCodeSVG value={activeReceipt.invoice_no} size={85} level="M" />
        </div>
        <p className="text-[10px] font-bold mt-1.5 uppercase tracking-wider">{activeReceipt.invoice_no}</p>
        <p className="text-[10px] text-stone-500">Scan to verify invoice details</p>
        <p className="text-[11px] font-bold text-stone-900 mt-2">Thank you for shopping with us! ✨</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-rose-100 my-8">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white flex items-center justify-between no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h2 className="font-extrabold text-base leading-tight">Sale Completed!</h2>
                <p className="text-xs text-rose-100 font-medium font-mono">{activeReceipt.invoice_no}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Thermal Status Banner (if print feedback exists) */}
          {printStatus && (
            <div
              className={`p-3.5 mx-4 mt-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                printStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {printStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold leading-tight">{printStatus.message}</p>
                {printStatus.fix && (
                  <p className="text-[11px] text-rose-700 font-semibold mt-1">
                    💡 Tip: {printStatus.fix}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Thermal Printer Width Selector */}
          <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between no-print text-xs">
            <div className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-bold text-stone-600">YHD 5808L Format:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReceiptWidth('58mm')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  receiptWidth === '58mm'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                58mm (YHD 5808L)
              </button>
              <button
                onClick={() => setReceiptWidth('80mm')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  receiptWidth === '80mm'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                80mm
              </button>
            </div>
          </div>

          {/* Receipt Preview Container */}
          <div className="p-5 bg-stone-100 flex justify-center overflow-x-auto no-print max-h-96">
            <div className="p-4 bg-white shadow-md border border-stone-200 rounded-xl">
              {receiptBody}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-4 bg-white border-t border-stone-100 flex flex-col sm:flex-row items-center gap-3 no-print">
            <button
              onClick={handleClose}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-2xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-all cursor-pointer"
            >
              Close / New Sale
            </button>

            {/* Primary Action: Direct Thermal Print */}
            <div className="relative w-full sm:w-auto flex-1 flex">
              <button
                onClick={handleDirectThermalPrint}
                disabled={printingThermal}
                className="w-full py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
                title="Send raw ESC/POS commands directly to YHD 5808L Bluetooth Printer (F8)"
              >
                {printingThermal ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span>{printingThermal ? 'Printing...' : 'Reprint to YHD 5808L (F8)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="ml-1 px-2.5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
                title="More print options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Print options dropdown */}
              {showDropdown && (
                <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 text-xs">
                  <button
                    onClick={() => { setShowDropdown(false); handleDirectThermalPrint(); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 font-bold text-stone-800 flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-500" />
                    <span>Direct Bluetooth Thermal</span>
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); handleBrowserPrint(); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-100 font-semibold text-stone-600 flex items-center gap-2"
                  >
                    <span>Browser Print Dialog</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
