import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePOS } from '../context/POSContext';
import { Search, Bell, Clock, QrCode, Sparkles, Keyboard, Database, Menu, Download, HardDrive } from 'lucide-react';
import PrinterStatusBadge from './PrinterStatusBadge';

export default function Topbar({ onSearchChange, searchValue, onToggleMobileMenu }) {
  const { user } = useAuth();
  const { setShowScannerModal, settings, showToast } = usePOS();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Listen for PWA installation prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      showToast('To install on mobile, tap browser menu (⋮ or Share) and select "Add to Home screen"', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Velvet POS installed to home screen! 🎉', 'success');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-rose-100 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Hamburger Menu + Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search products, barcode, invoice..."
            className="w-full pl-11 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange && onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Camera QR Scanner Launch Button */}
        <button
          onClick={() => setShowScannerModal(true)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white transition-all text-xs font-semibold whitespace-nowrap shadow-sm cursor-pointer"
          title="Scan Receipt QR Code or Product Barcode with Camera"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden md:inline">Camera Scan</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* PWA Install Button (Mobile & Desktop) */}
        {isInstallable && (
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shadow-sm transition-all animate-bounce cursor-pointer"
            title="Install POS as an app on your phone or computer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Local Database Offline Ready Indicator */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
          title="All data is saved locally on this phone/computer and retained across refresh/close"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden xs:inline">Local Storage</span>
          <span className="text-[10px] text-emerald-600 font-extrabold uppercase">(Offline)</span>
        </div>

        {/* Thermal Printer Live Status Badge */}
        <div className="hidden md:block">
          <PrinterStatusBadge />
        </div>

        {/* Date & Time Widget */}
        <div className="hidden lg:flex items-center gap-3 bg-rose-50/60 px-3 py-1.5 rounded-2xl border border-rose-100">
          <Clock className="w-3.5 h-3.5 text-rose-500" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-stone-600 leading-tight">{dateStr}</p>
            <p className="text-xs font-extrabold text-rose-600 font-mono leading-tight">{timeStr}</p>
          </div>
        </div>

        {/* Store Name Badge */}
        <div className="hidden sm:flex items-center gap-2 border-l border-stone-200 pl-3">
          <div className="text-right">
            <p className="text-xs font-bold text-stone-900 leading-tight">{settings.shop_name}</p>
            <p className="text-[10px] font-semibold text-rose-500 leading-tight">{settings.currency || 'Rs.'} Store</p>
          </div>
        </div>
      </div>
    </header>
  );
}
