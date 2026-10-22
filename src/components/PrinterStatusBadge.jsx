import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { checkPrinterStatus, sendTestPrint, getBridgeUrl } from '../services/printerService';
import { Printer, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrinterStatusBadge({ compact = false }) {
  const { settings, showToast } = usePOS();
  const navigate = useNavigate();

  const [status, setStatus] = useState({
    available: false,
    connected: false,
    name: 'YHD 5808L',
    problem: null,
    message: 'Checking printer...',
    fix: null
  });
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const fetchStatus = async () => {
    setChecking(true);
    const bridgeUrl = getBridgeUrl(settings);
    const res = await checkPrinterStatus(bridgeUrl);
    setStatus(res);
    setChecking(false);
  };

  useEffect(() => {
    fetchStatus();
    // Re-check printer health every 25 seconds
    const interval = setInterval(fetchStatus, 25000);
    return () => clearInterval(interval);
  }, [settings?.printer_bridge_url]);

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      const res = await sendTestPrint(settings);
      if (res.success) {
        showToast('Test ticket sent to YHD 5808L!', 'success');
      } else {
        showToast(res.message || 'Test print failed', 'error');
      }
      // Refresh status after test print
      fetchStatus();
    } catch (err) {
      showToast('Error sending test print', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Determine badge color and icon
  let badgeBg = 'bg-stone-100 border-stone-200 text-stone-600';
  let dotColor = 'bg-stone-400';
  let labelText = 'Printer Checking';

  if (!status.available) {
    badgeBg = 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
    dotColor = 'bg-rose-500';
    labelText = 'Bridge Offline';
  } else if (!status.connected) {
    badgeBg = 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100';
    dotColor = 'bg-amber-500 animate-pulse';
    labelText = '5808L Disconnected';
  } else {
    badgeBg = 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100';
    dotColor = 'bg-emerald-500';
    labelText = '5808L Ready';
  }

  return (
    <div className="relative inline-block text-xs">
      {/* Clickable Status Button */}
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all shadow-sm font-bold cursor-pointer ${badgeBg}`}
        title={`Thermal Printer Status: ${status.message}. Click for diagnostic options.`}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <Printer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{labelText}</span>
      </button>

      {/* Status Popover / Diagnostics Dropdown */}
      {showPopover && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-stone-200 p-5 z-50 animate-fade-in text-stone-800">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-rose-500" />
              <h3 className="font-extrabold text-sm text-stone-900">YHD 5808L Thermal Printer</h3>
            </div>
            <button
              onClick={() => setShowPopover(false)}
              className="text-stone-400 hover:text-stone-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-semibold">Connection:</span>
              <span className="font-extrabold flex items-center gap-1.5">
                {status.connected ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : status.available ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Bluetooth Offline
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Bridge Offline
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-semibold">Device:</span>
              <span className="font-bold text-stone-700">YHD 5808L (58mm)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-semibold">Print Bridge:</span>
              <span className="font-mono text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg">
                {getBridgeUrl(settings)}
              </span>
            </div>

            {/* Diagnostic Message */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 mt-2">
              <p className="font-bold text-stone-700 text-[11px] leading-tight mb-1">
                {status.message}
              </p>
              {status.fix && (
                <p className="text-[10px] text-rose-600 font-semibold leading-relaxed">
                  💡 Tip: {status.fix}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={checking}
              className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleTestPrint}
              disabled={testing || !status.available}
              className={`flex-1 py-2 px-3 rounded-xl text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                status.available
                  ? 'bg-rose-500 hover:bg-rose-600 cursor-pointer shadow-rose-200'
                  : 'bg-stone-300 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3 h-3" />
              <span>{testing ? 'Printing...' : 'Test Print'}</span>
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              onClick={() => { setShowPopover(false); navigate('/settings'); }}
              className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              <SettingsIcon className="w-3 h-3" />
              <span>Configure Printer Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
