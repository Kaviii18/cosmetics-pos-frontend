import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, Barcode, ShoppingCart, Plus, Minus, Trash2, UserPlus,
  CreditCard, Banknote, HelpCircle, CheckCircle, Sparkles, AlertCircle, RefreshCw, X,
  Ticket, Camera, Tag, Zap, Wifi, WifiOff
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import CardPaymentModal from '../components/CardPaymentModal';
import { printThermalReceipt, isAutoPrintEnabled } from '../services/printerService';

export default function POS() {
  const {
    cart, addToCart, addByBarcode, updateQuantity, removeFromCart, clearCart,
    selectedCustomer, setSelectedCustomer, discountType, setDiscountType,
    discountValue, setDiscountValue, appliedCoupon, setAppliedCoupon,
    applyCoupon, removeCoupon, taxRate, paymentMethod, setPaymentMethod,
    cashReceived, setCashReceived, subtotal, calculatedDiscount, taxAmount,
    grandTotal, changeAmount, settings, setActiveReceipt, setShowReceiptModal,
    showScannerModal, setShowScannerModal, showToast,
    isOnline, isSyncing, pendingSyncCount, saveOfflineSale, syncOfflineSales
  } = usePOS();

  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponSelector, setShowCouponSelector] = useState(false);
  const [showQuickScanModal, setShowQuickScanModal] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const searchInputRef = useRef(null);

  // Load products, categories, customers
  const fetchData = async () => {
    setLoadingProducts(true);
    try {
      const [pData, cData, custData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCustomers()
      ]);
      setProducts(pData || []);
      setCategories(cData || []);
      setCustomers(custData || []);
    } catch (err) {
      console.error('POS Load Error:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchData();
    api.getCoupons()
      .then(res => setAvailableCoupons(res || []))
      .catch(err => console.log('Coupons load:', err.message));
  }, []);

  // Detect Barcode parameter from URL (e.g. redirected from camera scanner)
  useEffect(() => {
    const barcodeParam = searchParams.get('barcode');
    if (barcodeParam) {
      addByBarcode(barcodeParam);
      searchParams.delete('barcode');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Global Hardware USB / Bluetooth Barcode Scanner listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareScan = (e) => {
      const targetTag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 120) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3 && !isInput) {
          e.preventDefault();
          const scannedCode = barcodeBuffer.trim();
          barcodeBuffer = '';
          addByBarcode(scannedCode);
        }
      } else if (e.key.length === 1 && !isInput) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleHardwareScan);
    return () => window.removeEventListener('keydown', handleHardwareScan);
  }, [products]);

  // Keyboard Shortcuts (F1, F2, F4, F8, ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        clearCart();
        showToast('Cart cleared for New Sale');
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleCompleteSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, grandTotal, cashReceived, paymentMethod, selectedCustomer, discountValue, appliedCoupon]);

  // Apply coupon handler
  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) {
      showToast('Please enter a coupon code.', 'warning');
      return;
    }
    setApplyingCoupon(true);
    const res = await applyCoupon(couponInput.trim());
    if (res.success) {
      setCouponInput('');
    }
    setApplyingCoupon(false);
  };

  // Fast Barcode Auto-detection on search input submit
  // Fast Barcode Auto-detection on search input submit or Scan/Add button click
  const handleBarcodeSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // If search query is empty, clicking "Scan / Add" launches the barcode scanner modal
    if (!searchQuery.trim()) {
      setShowScannerModal(true);
      return;
    }

    const rawQuery = searchQuery.trim();
    const query = rawQuery.toLowerCase();

    // 1. Check exact barcode or SKU match
    let match = products.find(p =>
      (p.barcode && p.barcode.toLowerCase() === query) ||
      (p.sku && p.sku.toLowerCase() === query)
    );

    // 2. If not found by barcode/SKU, search by product name or brand
    if (!match) {
      match = products.find(p =>
        p.name.toLowerCase().includes(query) ||
        (p.brand && p.brand.toLowerCase().includes(query))
      );
    }

    // 3. If still not matched directly, check currently filtered products
    if (!match && filteredProducts.length > 0) {
      match = filteredProducts[0];
    }

    if (match) {
      addToCart(match);
      setSearchQuery('');
    } else {
      // 4. Try backend / offline barcode lookup
      const added = await addByBarcode(rawQuery);
      if (added) {
        setSearchQuery('');
      } else {
        showToast(`No product found matching code or name: "${rawQuery}"`, 'error');
      }
    }
  };

  // Complete Sale Initiator
  const handleCompleteSale = () => {
    if (submitting) return; // Prevent duplicate checkout triggers

    if (cart.length === 0) {
      showToast('Please add products to the cart before completing sale.', 'error');
      return;
    }

    if (paymentMethod === 'Cash') {
      const cashNum = parseFloat(cashReceived) || 0;
      if (cashNum < grandTotal) {
        showToast(`Insufficient cash received! Grand total is ${settings.currency} ${grandTotal.toFixed(2)}`, 'error');
        return;
      }
      executeSaleSubmission();
    } else if (paymentMethod === 'Card') {
      // Open Tap / Scan Card Reader Modal
      setShowCardModal(true);
    } else {
      executeSaleSubmission();
    }
  };

  // Execute Sale Submission directly to Local Database (Offline-first)
  const executeSaleSubmission = async (cardReference = '') => {
    if (submitting) return; // Prevent duplicate API requests
    setSubmitting(true);

    const salePayload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      cashier_name: settings.cashier_name || (user && user.name) || 'Cashier',
      items: cart,
      subtotal,
      discount: calculatedDiscount,
      coupon_code: appliedCoupon ? appliedCoupon.code : '',
      tax: taxAmount,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'Cash' ? (parseFloat(cashReceived) || grandTotal) : grandTotal,
      change_amount: changeAmount
    };

    try {
      // Save sale directly in Local Database & decrement stock automatically
      const res = await api.createSale(salePayload);
      const savedSale = res.sale;

      // Reload products catalog immediately to reflect decreased stock
      await fetchData();

      // Trigger Receipt Popup with the saved sale
      setActiveReceipt(savedSale);
      setShowReceiptModal(true);

      // Automatic Printing if enabled
      if (isAutoPrintEnabled(settings)) {
        showToast('Sale saved locally! Sending receipt to printer...', 'info');
        const printResult = await printThermalReceipt(savedSale, settings);
        if (printResult.success) {
          showToast(`Receipt #${savedSale.invoice_no} printed!`, 'success');
        } else {
          showToast(`Sale saved locally (#${savedSale.invoice_no}), but printer bridge is not running.`, 'info');
        }
      } else {
        showToast(`Sale #${savedSale.invoice_no} saved locally & stock updated! 🎉`, 'success');
      }
    } catch (err) {
      console.error('Sale creation error:', err);
      showToast(err.message || 'Unable to save sale locally.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardApproved = (approvalCode) => {
    setShowCardModal(false);
    executeSaleSubmission(approvalCode);
  };

  // Quick Cash Preset Button Handlers
  const handleCashPreset = (amount) => {
    if (amount === 'exact') {
      setCashReceived(grandTotal.toFixed(2));
    } else {
      const current = parseFloat(cashReceived) || 0;
      setCashReceived((current + amount).toString());
    }
  };

  // Filter products by category and search term
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);
    return matchesCategory && matchesSearch;
  });

  const categoryList = [
    'All', 'Makeup', 'Skincare', 'Haircare', 'Fragrance',
    'Lip Products', 'Face Products', 'Eye Products', 'Accessories', 'Other'
  ];

  return (
    <div className="p-4 sm:p-6 min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] overflow-y-auto lg:overflow-hidden max-w-[1920px] mx-auto select-none pb-8 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: PRODUCT SELECTION GRID */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-3xl border border-rose-100 shadow-soft overflow-hidden">
          {/* Header Controls */}
          <div className="p-5 border-b border-rose-100 bg-gradient-to-r from-rose-50/50 to-pink-50/20 space-y-4">
            {/* Offline Sync Status Banner */}
            {(!isOnline || pendingSyncCount > 0) && (
              <div className={`px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold border transition-all ${
                !isOnline 
                  ? 'bg-amber-500/10 border-amber-300 text-amber-900' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
                  ) : (
                    <Wifi className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>
                    {!isOnline
                      ? `Offline Mode Active — Sales & Receipts saved locally (${pendingSyncCount} queued)`
                      : `${pendingSyncCount} offline transaction(s) ready to sync`}
                  </span>
                </div>
                {pendingSyncCount > 0 && isOnline && (
                  <button
                    type="button"
                    onClick={syncOfflineSales}
                    disabled={isSyncing}
                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Search Bar + Barcode Scanner Listener */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search product name, brand, SKU or scan barcode (F1)..."
                  className="w-full pl-11 pr-10 py-3 bg-white border border-rose-200 rounded-2xl text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                title="Scan Barcode with Camera"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickScanModal(true)}
                className="px-3.5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                title="Quick Barcode Scanner Helper"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">Barcodes</span>
              </button>
              <button
                type="submit"
                onClick={handleBarcodeSubmit}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-rose-200 transition-all shrink-0 cursor-pointer"
                title="Scan barcode with camera or add typed code/product to cart"
              >
                <Barcode className="w-4 h-4" />
                <span>Scan / Add</span>
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categoryList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-200 scale-105'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="p-5 flex-1 overflow-y-auto bg-stone-50/50">
            {loadingProducts ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(prod => {
                  const isOutOfStock = prod.current_stock <= 0;
                  const isLowStock = prod.current_stock > 0 && prod.current_stock <= prod.minimum_stock;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                        isOutOfStock
                          ? 'opacity-50 border-stone-200 cursor-not-allowed'
                          : 'border-stone-100 hover:border-rose-300 hover:shadow-soft-lg cursor-pointer transform hover:-translate-y-1'
                      }`}
                    >
                      {/* Low/Out Badge */}
                      {isOutOfStock ? (
                        <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-700 uppercase">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-700 uppercase">
                          Low: {prod.current_stock}
                        </span>
                      ) : null}

                      {/* Image */}
                      <div className="w-full h-32 rounded-xl bg-stone-100 overflow-hidden mb-3 flex items-center justify-center relative">
                        <img
                          src={prod.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80'}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Meta */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 truncate">
                          {prod.brand}
                        </p>
                        <h3 className="text-xs font-bold text-stone-900 leading-snug line-clamp-2 min-h-[32px]">
                          {prod.name}
                        </h3>
                      </div>

                      {/* Price & Add */}
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400">Price</p>
                          <p className="text-sm font-extrabold text-stone-900">
                            {settings.currency} {parseFloat(prod.selling_price).toLocaleString()}
                          </p>
                        </div>

                        <button
                          disabled={isOutOfStock}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            isOutOfStock
                              ? 'bg-stone-200 text-stone-400'
                              : 'bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white shadow-sm'
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Search className="w-12 h-12 text-stone-300 mb-3" />
                <h3 className="text-sm font-bold text-stone-700">No cosmetics products found</h3>
                <p className="text-xs text-stone-400 mt-1">Try clearing search filter or select another category.</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SHOPPING CART & BILLING */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-rose-100 shadow-soft overflow-y-auto min-h-0">
          {/* Cart Header */}
          <div className="p-4 px-5 border-b border-rose-100 bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base leading-tight">Current Cart</h2>
                <p className="text-[11px] text-rose-100 font-medium">{cart.length} item(s) selected</p>
              </div>
            </div>

            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-100 hover:text-white hover:underline flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/10 transition-all"
              title="Clear Cart (F2)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          </div>



          {/* Cart Itemized List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[90px] bg-stone-50/30">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div
                  key={item.product_id}
                  className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-3 text-xs hover:border-rose-200 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="w-11 h-11 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-stone-900 truncate leading-snug">{item.name}</h4>
                      <p className="text-[11px] font-semibold text-rose-500 mt-0.5">
                        {settings.currency} {item.unit_price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-white text-stone-700 font-bold flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-extrabold text-stone-800 text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-white text-stone-700 font-bold flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right flex-shrink-0 min-w-[75px]">
                    <p className="font-extrabold text-stone-900 text-sm">
                      {settings.currency} {item.total_price.toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-[10px] text-stone-400 hover:text-red-600 font-semibold transition-colors mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400 min-h-[180px]">
                <ShoppingCart className="w-12 h-12 text-stone-200 mb-2" />
                <p className="text-xs font-bold text-stone-500">Your shopping cart is empty</p>
                <p className="text-[11px] mt-1 text-stone-400">Click products on the left or scan barcode to add items.</p>
              </div>
            )}
          </div>

          {/* Cart Summary & Checkout Controls */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-b from-stone-50 to-white border-t border-stone-200 space-y-2 flex-shrink-0 pb-6">
            {/* Coupon Code Section */}
            <div className="bg-rose-50/60 p-2.5 rounded-2xl border border-rose-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-stone-800 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-rose-500" />
                  <span>Coupon Code:</span>
                </span>
                {availableCoupons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCouponSelector(!showCouponSelector)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{showCouponSelector ? 'Hide Coupons' : 'Available Coupons'}</span>
                  </button>
                )}
              </div>

              {appliedCoupon ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-emerald-800 text-xs truncate">
                        {appliedCoupon.code} <span className="font-semibold text-[10px] text-emerald-700">({appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}% OFF` : `-${settings.currency} ${appliedCoupon.discount_value}`})</span>
                      </p>
                      <p className="text-[10px] text-emerald-600 truncate">{appliedCoupon.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[10px] font-extrabold text-stone-400 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-white transition-all shrink-0 border border-transparent hover:border-red-200 cursor-pointer"
                  >
                    Remove ✕
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. WELCOME10, GLOW20)..."
                      className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl font-bold text-xs uppercase tracking-wider text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-rose-400 focus:outline-none shadow-2xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={applyingCoupon || !couponInput.trim()}
                    className={`px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                      applyingCoupon || !couponInput.trim()
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                    }`}
                  >
                    {applyingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}

              {/* Available Coupons Dropdown / Pills */}
              {showCouponSelector && !appliedCoupon && availableCoupons.length > 0 && (
                <div className="pt-2 border-t border-rose-100 space-y-1 animate-fade-in max-h-28 overflow-y-auto">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tap a coupon to apply:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCoupons.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCouponInput(c.code);
                          applyCoupon(c.code);
                          setShowCouponSelector(false);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-rose-500 hover:text-white border border-rose-200 rounded-xl text-[10px] font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        title={c.description}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{c.code}</span>
                        <span className="opacity-80">({c.discount_type === 'percent' ? `${c.discount_value}%` : `${settings.currency}${c.discount_value}`})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Manual Custom Discount (when no coupon is active) */}
            {!appliedCoupon && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-stone-600">Manual Discount:</span>
                <div className="flex items-center gap-2 flex-1 max-w-[190px]">
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-right font-bold text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-stone-300 rounded-xl font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="amount">{settings.currency}</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs border-t border-b border-stone-200 py-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-bold">{settings.currency} {subtotal.toFixed(2)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>
                    Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}:
                  </span>
                  <span>- {settings.currency} {calculatedDiscount.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-stone-600 font-medium">
                  <span>VAT ({taxRate}%):</span>
                  <span className="font-bold text-stone-800">+ {settings.currency} {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-900 pt-1 text-sm font-extrabold border-t border-stone-300">
                <span>GRAND TOTAL:</span>
                <span className="text-lg text-rose-600">{settings.currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['Cash', 'Card', 'Other'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {method === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                    {method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                    {method === 'Other' && <HelpCircle className="w-3.5 h-3.5" />}
                    <span>{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Received & Change Calculation */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-1 bg-white p-2 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-stone-700">Cash Received:</span>
                  <div className="relative flex-1 max-w-[140px]">
                    <input
                      type="number"
                      step="0.01"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder={grandTotal.toFixed(2)}
                      className="w-full px-3 py-1 bg-stone-50 border border-stone-300 rounded-xl text-right font-extrabold text-xs text-stone-900 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Cash Presets */}
                <div className="flex items-center justify-end gap-1 text-[10px]">
                  <button onClick={() => handleCashPreset('exact')} className="px-2 py-0.5 bg-stone-100 rounded font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer">Exact</button>
                  <button onClick={() => handleCashPreset(500)} className="px-2 py-0.5 bg-stone-100 rounded font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer">+500</button>
                  <button onClick={() => handleCashPreset(1000)} className="px-2 py-0.5 bg-stone-100 rounded font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer">+1k</button>
                  <button onClick={() => handleCashPreset(5000)} className="px-2 py-0.5 bg-stone-100 rounded font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer">+5k</button>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-stone-100">
                  <span className="text-stone-600">Calculated Change:</span>
                  <span className="text-sm text-emerald-600 font-extrabold">
                    {settings.currency} {changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <div className="pt-1 pb-3">
              <button
                onClick={handleCompleteSale}
                disabled={submitting || cart.length === 0}
                className={`w-full py-3.5 rounded-2xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all transform cursor-pointer ${
                  submitting || cart.length === 0
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 hover:-translate-y-0.5'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>{paymentMethod === 'Card' ? 'TAP / SCAN CARD TO PAY (F4)' : 'COMPLETE SALE (F4)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSave={async (custData) => {
          try {
            const res = await api.createCustomer(custData);
            setSelectedCustomer(res.customer);
            setShowCustomerModal(false);
            showToast(`Added customer "${res.customer.name}"`);
            fetchData();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }}
      />

      {/* Card Reader Payment Modal */}
      <CardPaymentModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        onApproved={handleCardApproved}
        amount={grandTotal}
      />

      {/* Quick Barcode Scanner Helper Modal */}
      {showQuickScanModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in border border-rose-100 flex flex-col max-h-[85vh]">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 px-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Barcode className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm">Product Barcodes List</h3>
                  <p className="text-[11px] text-rose-100">Click any barcode to simulate instant scanner input</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickScanModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-stone-100 flex-1 text-xs">
              {products.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-stone-50 px-2 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-stone-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>Barcode: <strong className="text-stone-700">{p.barcode}</strong></span>
                      <span>•</span>
                      <span>SKU: {p.sku}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      addByBarcode(p.barcode);
                      setShowQuickScanModal(false);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Scan Now</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 bg-stone-50 border-t border-stone-200 text-center text-[11px] text-stone-500 font-medium">
              You can also scan any product barcode using your camera or a USB barcode scanner gun at any time.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
