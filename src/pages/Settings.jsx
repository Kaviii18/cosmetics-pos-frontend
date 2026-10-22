import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon, Store, Printer, DollarSign, Save, Shield,
  Sparkles, Upload, RotateCcw, Ticket, Plus, Trash2, Tag, Percent,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Bluetooth, Smartphone, HelpCircle,
  Database, Download, HardDrive, FileJson
} from 'lucide-react';
import { checkPrinterStatus, sendTestPrint, getBridgeUrl } from '../services/printerService';

export default function Settings() {
  const { settings, setSettings, showToast } = usePOS();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    shop_name: 'Velvet Touch Cosmetics',
    shop_address: '123 Beauty Boulevard, Cinnamon Gardens, Colombo 03',
    shop_phone: '+94 11 234 5678',
    cashier_name: 'Cashier',
    currency: 'Rs.',
    receipt_width: '58mm',
    tax_rate: 0,
    default_discount: 0,
    low_stock_threshold: 5,
    logo_url: '',
    printer_bridge_url: 'http://localhost:9100',
    printer_auto_print: 1,
    printer_model: 'YHD-5808L'
  });
  const [saving, setSaving] = useState(false);

  // Printer Live Diagnostics State
  const [printerStatus, setPrinterStatus] = useState(null);
  const [checkingPrinter, setCheckingPrinter] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    min_spend: '',
    max_discount: ''
  });

  const [dbStats, setDbStats] = useState({ products: 0, sales: 0, customers: 0 });

  const loadDbStats = () => {
    try {
      const p = JSON.parse(localStorage.getItem('pos_local_products') || '[]');
      const s = JSON.parse(localStorage.getItem('pos_local_sales') || '[]');
      const c = JSON.parse(localStorage.getItem('pos_local_customers') || '[]');
      setDbStats({ products: p.length, sales: s.length, customers: c.length });
    } catch (e) {}
  };

  useEffect(() => {
    loadDbStats();
  }, []);

  const handleExportBackup = () => {
    try {
      const data = api.exportDatabase();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cosmetics_pos_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database backup downloaded successfully! 💾', 'success');
    } catch (err) {
      showToast('Backup export failed: ' + err.message, 'error');
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const res = api.importDatabase(parsed);
        showToast(res.message, 'success');
        loadDbStats();
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        showToast('Invalid backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = () => {
    if (window.confirm('Are you sure you want to reset the local database? This will restore the default catalog of 26 cosmetic products and sample data.')) {
      api.resetDatabase();
      showToast('Database reset to default catalog!', 'success');
      loadDbStats();
      setTimeout(() => window.location.reload(), 800);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || 'Velvet Touch Cosmetics',
        shop_address: settings.shop_address || '',
        shop_phone: settings.shop_phone || '',
        cashier_name: settings.cashier_name || 'Cashier',
        currency: settings.currency || 'Rs.',
        receipt_width: settings.receipt_width || '58mm',
        tax_rate: settings.tax_rate || 0,
        default_discount: settings.default_discount || 0,
        low_stock_threshold: settings.low_stock_threshold || 5,
        logo_url: settings.logo_url || '',
        printer_bridge_url: settings.printer_bridge_url || 'http://localhost:9100',
        printer_auto_print: settings.printer_auto_print !== undefined ? settings.printer_auto_print : 1,
        printer_model: settings.printer_model || 'YHD-5808L'
      });
    }
    loadCoupons();
    checkThermalPrinter(settings?.printer_bridge_url);
  }, [settings]);

  const checkThermalPrinter = async (url) => {
    setCheckingPrinter(true);
    const targetUrl = url || formData.printer_bridge_url || 'http://localhost:9100';
    const res = await checkPrinterStatus(targetUrl);
    setPrinterStatus(res);
    setCheckingPrinter(false);
  };

  const handleTestPrint = async () => {
    setTestingPrinter(true);
    try {
      const res = await sendTestPrint({
        ...formData,
        printer_bridge_url: formData.printer_bridge_url
      });
      if (res.success) {
        showToast('Test ticket successfully printed on YHD 5808L!', 'success');
      } else {
        showToast(`Test print failed: ${res.detail || res.message}`, 'error');
      }
      checkThermalPrinter(formData.printer_bridge_url);
    } catch (e) {
      showToast('Error sending test print', 'error');
    } finally {
      setTestingPrinter(false);
    }
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await api.getCoupons();
      setCoupons(Array.isArray(res) ? res : []);
    } catch (err) {
      console.log('Error loading coupons:', err.message);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size should be less than 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showToast('Admin privileges required to save store settings.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.updateSettings(formData);
      setSettings(formData);
      showToast('Store settings updated successfully!');
    } catch (err) {
      showToast(err.message || 'Unable to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Create New Coupon Handler (Admin)
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      showToast('Only admins can create promotional coupons.', 'error');
      return;
    }

    if (!couponForm.code.trim()) {
      showToast('Please enter a coupon code.', 'warning');
      return;
    }
    const val = parseFloat(couponForm.discount_value);
    if (!val || val <= 0) {
      showToast('Please enter a valid discount value greater than 0.', 'warning');
      return;
    }
    if (couponForm.discount_type === 'percent' && val > 100) {
      showToast('Percentage discount cannot exceed 100%.', 'warning');
      return;
    }

    setCreatingCoupon(true);
    try {
      await api.createCoupon({
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim() || `${couponForm.code.trim().toUpperCase()} Promo`,
        discount_type: couponForm.discount_type,
        discount_value: val,
        min_spend: parseFloat(couponForm.min_spend) || 0,
        max_discount: parseFloat(couponForm.max_discount) || 0
      });

      showToast(`Coupon "${couponForm.code.trim().toUpperCase()}" created successfully!`, 'success');
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'percent',
        discount_value: '',
        min_spend: '',
        max_discount: ''
      });
      loadCoupons();
    } catch (err) {
      showToast(err.message || 'Failed to create coupon. Code might already exist.', 'error');
    } finally {
      setCreatingCoupon(false);
    }
  };

  // Delete Coupon Handler
  const handleDeleteCoupon = async (id, code) => {
    if (user?.role !== 'admin') {
      showToast('Only admins can delete coupons.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }

    try {
      await api.deleteCoupon(id);
      showToast(`Coupon "${code}" deleted.`, 'info');
      loadCoupons();
    } catch (err) {
      showToast(err.message || 'Unable to delete coupon.', 'error');
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1200px] mx-auto select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">System Settings & Store Preferences</h1>
        <p className="text-xs text-stone-500 font-medium">Configure store details, thermal printer paper size, VAT tax percentages, stock alert levels, and promotional coupons</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Info Card */}
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-4">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
            <Store className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-extrabold text-stone-900">Store Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Cosmetics Shop Name</label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Telephone Number</label>
              <input
                type="text"
                value={formData.shop_phone}
                onChange={e => setFormData({ ...formData, shop_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Cashier Name (Prints on Thermal Receipt)</label>
              <input
                type="text"
                value={formData.cashier_name}
                onChange={e => setFormData({ ...formData, cashier_name: e.target.value })}
                placeholder="e.g. Cashier"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Full Shop Address (Prints on Thermal Receipt)</label>
              <input
                type="text"
                value={formData.shop_address}
                onChange={e => setFormData({ ...formData, shop_address: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-medium focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Receipt Logo Configuration */}
            <div className="sm:col-span-2 space-y-2 pt-2 border-t border-stone-100">
              <label className="block font-bold text-stone-700">Receipt Logo</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo Preview" className="w-14 h-14 object-contain" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-rose-200">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.logo_url || ''}
                      onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="Paste image URL (https://...) or upload image"
                      className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-medium focus:ring-2 focus:ring-rose-400"
                    />
                    <label className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl cursor-pointer text-xs flex items-center gap-1.5 transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                        className="px-3 py-2.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                        title="Reset to default brand logo"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {formData.logo_url ? 'Custom store logo is active for receipts.' : 'Default Velvet Touch sparkle logo is active. You can upload your own store logo or paste an image link.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* YHD 5808L Bluetooth Thermal Printer & POS Preferences */}
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-stone-900">
                  YHD 5808L Bluetooth Thermal Printer (58mm)
                </h2>
                <p className="text-xs text-stone-400 font-medium">
                  Direct ESC/POS receipt printing via Cleanter Android bridge (No PDF / No Dialog)
                </p>
              </div>
            </div>

            {/* Live Connection Status Pill */}
            <div className="flex items-center gap-2">
              {printerStatus ? (
                <div
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-bold ${
                    printerStatus.connected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : printerStatus.available
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      printerStatus.connected
                        ? 'bg-emerald-500'
                        : printerStatus.available
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <span>
                    {printerStatus.connected
                      ? '5808L Ready'
                      : printerStatus.available
                      ? '5808L Disconnected'
                      : 'Bridge Offline'}
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => checkThermalPrinter(formData.printer_bridge_url)}
                disabled={checkingPrinter}
                className="px-3 py-1.5 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Test printer bridge connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingPrinter ? 'animate-spin' : ''}`} />
                <span>{checkingPrinter ? 'Testing...' : 'Check Status'}</span>
              </button>
            </div>
          </div>

          {/* Diagnostics Message Banner */}
          {printerStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                printerStatus.connected
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : printerStatus.available
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              {printerStatus.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : printerStatus.available ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">{printerStatus.message}</span>
                  <span className="font-mono text-[11px] opacity-75">
                    Port: {formData.printer_bridge_url}
                  </span>
                </div>
                {printerStatus.fix && (
                  <p className="text-xs font-medium leading-relaxed opacity-90">
                    💡 Troubleshooting: {printerStatus.fix}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Printer Configuration Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Receipt Paper Width</label>
              <select
                value={formData.receipt_width}
                onChange={e => setFormData({ ...formData, receipt_width: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-stone-800 focus:ring-2 focus:ring-rose-400"
              >
                <option value="58mm">58mm Thermal Paper (YHD 5808L - 32 Chars)</option>
                <option value="80mm">80mm Thermal Paper (Standard POS)</option>
              </select>
              <p className="text-[10px] text-stone-400 mt-1 font-medium">
                YHD 5808L uses 58mm paper with 48mm printable area (384 dots).
              </p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Cleanter Bridge URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.printer_bridge_url}
                  onChange={e => setFormData({ ...formData, printer_bridge_url: e.target.value })}
                  placeholder="http://localhost:9100"
                  className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-rose-400"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printer_bridge_url: 'http://localhost:9100' })}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-bold text-[11px]"
                  title="Reset to default local bridge port 9100"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-1 font-medium">
                Default: http://localhost:9100 (Cleanter Thermal Printer service)
              </p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Automatic Receipt Printing</label>
              <label className="flex items-center gap-3 p-2.5 bg-stone-50 border border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.printer_auto_print === 1 || formData.printer_auto_print === true}
                  onChange={e => setFormData({ ...formData, printer_auto_print: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-400"
                />
                <span className="font-bold text-stone-800 text-xs">Auto-print after checkout</span>
              </label>
              <p className="text-[10px] text-stone-400 mt-1 font-medium">
                Receipt prints automatically only after MySQL confirms sale saved.
              </p>
            </div>
          </div>

          {/* Test Print Action Bar */}
          <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-extrabold text-stone-900">Diagnostic Hardware Test</p>
              <p className="text-stone-500 text-[11px]">
                Prints a 58mm test ticket on the YHD 5808L to verify margins, 32-column alignment & QR code.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={testingPrinter}
              className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-extrabold shadow-sm shadow-rose-200 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>{testingPrinter ? 'Sending Test Ticket...' : 'Send Test Print Ticket'}</span>
            </button>
          </div>

          {/* Collapsible Android Tablet Setup Instructions */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full p-4 bg-stone-50 hover:bg-stone-100 flex items-center justify-between font-bold text-stone-800 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-rose-500" />
                <span>Android Tablet & YHD 5808L Setup Instructions</span>
              </div>
              <span className="text-stone-400 font-extrabold">{showSetupGuide ? '− Hide' : '+ Show'}</span>
            </button>

            {showSetupGuide && (
              <div className="p-5 bg-white space-y-3 border-t border-stone-100 text-stone-600 text-xs leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p>
                    <strong className="text-stone-800">Power ON & Pair Printer:</strong> Turn on the YHD 5808L. Open Android Tablet Settings &gt; Connected devices &gt; Bluetooth. Pair with <strong>5808L</strong> or <strong>POS-58</strong>. If prompted for a PIN, enter <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800 font-bold">1234</code> or <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800 font-bold">0000</code>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p>
                    <strong className="text-stone-800">Install Cleanter Bridge App:</strong> Download and install <strong>Cleanter: Thermal Printer BT</strong> on your Android tablet. In Cleanter, choose <strong>5808L</strong> as the active Bluetooth printer.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p>
                    <strong className="text-stone-800">Start Bridge Service:</strong> In Cleanter, tap <strong>"Start Service"</strong>. The service will run locally in the background on <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800 font-bold">http://localhost:9100</code>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                  <p>
                    <strong className="text-stone-800">Verify in POS:</strong> In this Settings tab or on the POS header, you should see 🟢 <strong className="text-emerald-700">5808L Ready</strong>. Click <strong>"Send Test Print Ticket"</strong> above to test!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Financial & General Preferences */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="font-extrabold text-xs text-stone-800 uppercase tracking-wider mb-3">
              General Financial & Inventory Defaults
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Default Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">VAT Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={e => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 18"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
                />
                <p className="text-[10px] text-stone-400 font-semibold mt-1">Calculates VAT tax on sales (e.g. 18% or 15%)</p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Default Low Stock Alert Threshold</label>
                <input
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={e => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Store Settings Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-xs shadow-lg shadow-rose-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Store Settings...' : 'Save Store Settings'}</span>
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* PROMOTIONAL COUPONS & VOUCHERS MANAGEMENT (ADMIN) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Promotional Coupons & Vouchers</h2>
              <p className="text-xs text-stone-500">Create and manage promo discount codes and minimum spend rules for the POS</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-xs border border-rose-100">
            {coupons.length} Active Coupons
          </span>
        </div>

        {/* Create New Coupon Form */}
        <form onSubmit={handleCreateCoupon} className="p-5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-rose-500" />
            <span>Add New Promo Coupon</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            {/* Coupon Code */}
            <div className="lg:col-span-1">
              <label className="block font-bold text-stone-700 mb-1">Coupon Code *</label>
              <input
                type="text"
                placeholder="e.g. SUMMER25"
                value={couponForm.code}
                onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl font-extrabold text-xs uppercase tracking-wider text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                required
              />
            </div>

            {/* Description */}
            <div className="lg:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Description / Campaign</label>
              <input
                type="text"
                placeholder="e.g. 25% Off Summer Collection"
                value={couponForm.description}
                onChange={e => setCouponForm({ ...couponForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium text-xs text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-400 focus:outline-none"
              />
            </div>

            {/* Discount Type */}
            <div className="lg:col-span-1">
              <label className="block font-bold text-stone-700 mb-1">Type</label>
              <select
                value={couponForm.discount_type}
                onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-xs text-stone-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
              >
                <option value="percent">Percentage (%)</option>
                <option value="amount">Fixed (Rs.)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div className="lg:col-span-1">
              <label className="block font-bold text-stone-700 mb-1">
                Value ({couponForm.discount_type === 'percent' ? '%' : 'Rs.'}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={couponForm.discount_type === 'percent' ? '25' : '500'}
                value={couponForm.discount_value}
                onChange={e => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl font-extrabold text-xs text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                required
              />
            </div>

            {/* Minimum Spend */}
            <div className="lg:col-span-1">
              <label className="block font-bold text-stone-700 mb-1">Min Spend (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0 (None)"
                value={couponForm.min_spend}
                onChange={e => setCouponForm({ ...couponForm, min_spend: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold text-xs text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-stone-400">
              * Active coupons will appear immediately in the POS checkout selector.
            </p>
            <button
              type="submit"
              disabled={creatingCoupon}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-extrabold text-xs shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{creatingCoupon ? 'Adding...' : 'Add Coupon'}</span>
            </button>
          </div>
        </form>

        {/* Existing Coupons Table */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-extrabold uppercase text-stone-500">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Min Spend</th>
                <th className="p-3.5">Max Cap</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loadingCoupons ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-stone-400 font-bold">
                    Loading promotional coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-stone-400 font-medium">
                    No promotional coupons yet. Create one above to offer discounts to customers!
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-extrabold text-xs tracking-wider inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{coupon.code}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-stone-700 max-w-[240px] truncate">
                      {coupon.description || 'Promotional Discount'}
                    </td>
                    <td className="p-3.5 font-extrabold text-stone-900">
                      {coupon.discount_type === 'percent'
                        ? `${coupon.discount_value}% OFF`
                        : `${settings.currency} ${parseFloat(coupon.discount_value).toFixed(2)} OFF`}
                    </td>
                    <td className="p-3.5 font-semibold text-stone-600">
                      {parseFloat(coupon.min_spend || 0) > 0
                        ? `${settings.currency} ${parseFloat(coupon.min_spend).toLocaleString()}`
                        : 'No min.'}
                    </td>
                    <td className="p-3.5 font-semibold text-stone-600">
                      {parseFloat(coupon.max_discount || 0) > 0
                        ? `${settings.currency} ${parseFloat(coupon.max_discount).toLocaleString()}`
                        : 'No cap'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title={`Delete coupon ${coupon.code}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOCAL OFFLINE DATABASE & BACKUP MANAGEMENT (NO BACKEND NEEDED) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Phone Local Database & Offline Storage</h2>
              <p className="text-xs text-stone-500">Your products, sales, stock, and reports are saved permanently in this browser / phone storage</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            100% Offline Ready
          </span>
        </div>

        {/* Local Storage Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              💄
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Local Products</p>
              <p className="text-lg font-extrabold text-stone-900">{dbStats.products} Items</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
              🧾
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Saved Sales / Orders</p>
              <p className="text-lg font-extrabold text-stone-900">{dbStats.sales} Transactions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              👥
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Customer Profiles</p>
              <p className="text-lg font-extrabold text-stone-900">{dbStats.customers} Customers</p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Export, Import, Reset */}
        <div className="p-5 bg-stone-50/60 rounded-2xl border border-stone-200/80 space-y-4">
          <h3 className="font-extrabold text-xs text-stone-800 uppercase tracking-wider">
            Backup & Database Operations
          </h3>
          <p className="text-xs text-stone-600">
            Export your complete store database (products, sales, customers, stock) to a JSON file to transfer between phones/PCs or keep as a safe backup.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Backup (JSON)</span>
            </button>

            {/* Import JSON */}
            <label className="px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-stone-500" />
              <span>Restore Backup (JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            {/* Reset to sample data */}
            <button
              type="button"
              onClick={handleResetDatabase}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Products</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
