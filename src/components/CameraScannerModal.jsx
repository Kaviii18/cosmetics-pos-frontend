import React, { useEffect, useRef, useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, Search, Camera, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CameraScannerModal() {
  const { showScannerModal, setShowScannerModal, showToast, addByBarcode } = usePOS();
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showScannerModal) return;

    let isMounted = true;
    const scannerId = "qr-reader-container";

    setTimeout(() => {
      const element = document.getElementById(scannerId);
      if (element) {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;

        html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (isMounted) {
              handleDecodedCode(decodedText);
            }
          },
          (errorMessage) => {
            // silent scan errors
          }
        ).catch(err => {
          console.warn("Camera start failed:", err);
          setErrorMsg("Camera access unavailable. Please use manual barcode entry below.");
        });
      }
    }, 300);

    return () => {
      isMounted = false;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(e => console.log('Camera stop error:', e));
      }
    };
  }, [showScannerModal]);

  if (!showScannerModal) return null;

  const handleDecodedCode = async (code) => {
    const trimmed = code.trim();
    setShowScannerModal(false);

    if (trimmed.startsWith('INV-')) {
      showToast(`Scanned Invoice: ${trimmed}`, 'success');
      navigate(`/scan/${trimmed}`);
    } else {
      showToast(`Scanned Barcode: ${trimmed}`, 'info');
      if (addByBarcode) {
        const added = await addByBarcode(trimmed);
        if (added) {
          showToast(`Product added to cart from barcode!`, 'success');
        }
      }
      navigate(`/pos?barcode=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecodedCode(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in border border-rose-100">
        {/* Header */}
        <div className="bg-rose-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6" />
            <div>
              <h2 className="font-extrabold text-base">QR / Barcode Camera Scanner</h2>
              <p className="text-xs text-rose-100">Align invoice QR code or barcode inside frame</p>
            </div>
          </div>
          <button
            onClick={() => setShowScannerModal(false)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera View */}
        <div className="p-6 bg-stone-900 flex flex-col items-center justify-center min-h-[260px] relative">
          <div id="qr-reader-container" className="w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-rose-400"></div>
          {errorMsg && (
            <div className="p-4 bg-rose-950/80 text-rose-200 border border-rose-800 rounded-2xl text-xs flex items-center gap-2 mt-3">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Manual Barcode / Invoice Input */}
        <div className="p-5 bg-stone-50 border-t border-stone-200">
          <p className="text-xs font-bold text-stone-600 mb-2">Or enter Invoice No / Barcode manually:</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. INV-202610-0001 or 890150000001"
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Scan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
