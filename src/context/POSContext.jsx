import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, loadCache, saveCache } from '../services/api';
import { localSales } from '../services/localDatabase';

const POSContext = createContext();

export function POSProvider({ children }) {
  // Cart state
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, description, discount_type, discount_value, min_spend, max_discount, discount_amount }
  const [taxRate, setTaxRate] = useState(0); // tax %
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash', 'Card', 'Other'
  const [cashReceived, setCashReceived] = useState('');

  // Settings
  const [settings, setSettings] = useState({
    shop_name: 'Velvet Touch Cosmetics',
    shop_address: '123 Beauty Boulevard, Cinnamon Gardens, Colombo 03',
    shop_phone: '+94 11 234 5678',
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

  // Modal & Completed Receipt state
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Online / Offline & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    try {
      const q = JSON.parse(localStorage.getItem('pos_offline_sales') || '[]');
      return q.length;
    } catch (e) {
      return 0;
    }
  });

  // Toast System (Single active toast at a time)
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts([{ id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Network listener & auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Internet connection restored. Synchronizing...', 'info');
      syncOfflineSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Working in offline mode.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for pending sales on load
    if (navigator.onLine) {
      const q = JSON.parse(localStorage.getItem('pos_offline_sales') || '[]');
      if (q.length > 0) {
        syncOfflineSales();
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load store settings from backend or cache
  useEffect(() => {
    api.getSettings()
      .then(res => {
        if (res) {
          setSettings(res);
          if (res.tax_rate !== undefined) setTaxRate(parseFloat(res.tax_rate || 0));
        }
      })
      .catch(() => console.log('Loaded default settings'));
  }, []);

  const updateStoreSettings = (newSettings) => {
    setSettings(newSettings);
    if (newSettings.tax_rate !== undefined) {
      setTaxRate(parseFloat(newSettings.tax_rate || 0));
    }
  };

  // Cart operations
  const addToCart = (product) => {
    if (product.current_stock <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id);
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        if (item.quantity >= product.current_stock) {
          showToast(`Cannot add more. Maximum available stock reached (${product.current_stock}).`, 'warning');
          return prevCart;
        }

        const updated = [...prevCart];
        const newQty = item.quantity + 1;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          total_price: newQty * item.unit_price
        };
        showToast(`Updated quantity for "${product.name}" (+1)`);
        return updated;
      } else {
        showToast(`Added "${product.name}" to cart`);
        return [
          ...prevCart,
          {
            product_id: product.id,
            name: product.name,
            brand: product.brand,
            sku: product.sku,
            barcode: product.barcode,
            unit_price: parseFloat(product.selling_price),
            buying_price: parseFloat(product.buying_price || 0),
            quantity: 1,
            total_price: parseFloat(product.selling_price),
            available_stock: product.current_stock,
            image_url: product.image_url
          }
        ];
      }
    });
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product_id === productId) {
          if (newQty > item.available_stock) {
            showToast(`Stock limit reached! Max stock: ${item.available_stock}`, 'warning');
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            total_price: newQty * item.unit_price
          };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setAppliedCoupon(null);
    setCashReceived('');
    setPaymentMethod('Cash');
  };

  // Add product by barcode lookup (with offline cache fallback)
  const addByBarcode = async (barcode) => {
    if (!barcode || !barcode.trim()) return false;
    const clean = barcode.trim();
    try {
      const found = await api.getProductByBarcode(clean);
      if (found) {
        addToCart(found);
        return true;
      }
    } catch (err) {
      // Check cached products if any
      const cached = loadCache('products', []);
      const match = cached.find(p =>
        (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === clean.toLowerCase())
      );
      if (match) {
        addToCart(match);
        return true;
      }
      showToast(`No product found for barcode: "${clean}"`, 'error');
      return false;
    }
  };

  // Apply Coupon Code (supports offline validation)
  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      showToast('Please enter a coupon code.', 'warning');
      return { success: false };
    }
    if (cart.length === 0) {
      showToast('Please add products to cart before applying a coupon.', 'warning');
      return { success: false };
    }

    try {
      const res = await api.validateCoupon(code.trim(), subtotal);
      if (res.valid) {
        setAppliedCoupon(res.coupon);
        setDiscountValue(0); // Clear manual discount when coupon is applied
        showToast(`Coupon "${res.coupon.code}" applied! Discount: ${settings.currency} ${res.coupon.discount_amount.toFixed(2)}`, 'success');
        return { success: true, coupon: res.coupon };
      } else {
        showToast(res.message || 'Invalid coupon code', 'error');
        return { success: false, message: res.message };
      }
    } catch (err) {
      showToast(err.message || 'Failed to apply coupon', 'error');
      return { success: false, message: err.message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon discount removed.', 'info');
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  
  let calculatedDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percent') {
      calculatedDiscount = (subtotal * parseFloat(appliedCoupon.discount_value || 0)) / 100;
      if (appliedCoupon.max_discount > 0 && calculatedDiscount > appliedCoupon.max_discount) {
        calculatedDiscount = appliedCoupon.max_discount;
      }
    } else {
      calculatedDiscount = parseFloat(appliedCoupon.discount_value || 0);
    }
  } else if (discountType === 'percent') {
    calculatedDiscount = (subtotal * parseFloat(discountValue || 0)) / 100;
  } else {
    calculatedDiscount = parseFloat(discountValue || 0);
  }
  calculatedDiscount = Math.min(subtotal, Math.max(0, calculatedDiscount));

  const afterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const taxAmount = (afterDiscount * parseFloat(taxRate || 0)) / 100;
  const grandTotal = Math.max(0, afterDiscount + taxAmount);

  const numericCash = parseFloat(cashReceived) || 0;
  const changeAmount = paymentMethod === 'Cash' ? Math.max(0, numericCash - grandTotal) : 0;

  // Save Sale in Offline Mode
  const saveOfflineSale = (salePayload) => {
    try {
      const res = localSales.create(salePayload);
      const savedSale = res.sale;
      setActiveReceipt(savedSale);
      setShowReceiptModal(true);
      showToast(`Sale #${savedSale.invoice_no} saved locally! Stock updated.`, 'success');
      return savedSale;
    } catch (e) {
      console.error('Failed to save offline sale', e);
      showToast('Error saving sale locally.', 'error');
      return null;
    }
  };

  // Synchronize Queued Offline Sales to Server
  const syncOfflineSales = async () => {
    const rawQueue = localStorage.getItem('pos_offline_sales');
    if (!rawQueue) return;

    let queue = [];
    try {
      queue = JSON.parse(rawQueue);
    } catch (e) {
      return;
    }

    if (queue.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;
    const remainingQueue = [];

    for (const sale of queue) {
      try {
        await api.createSale({
          ...sale,
          is_offline: true
        });
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline sale:', sale.invoice_no, err);
        remainingQueue.push(sale);
      }
    }

    localStorage.setItem('pos_offline_sales', JSON.stringify(remainingQueue));
    setPendingSyncCount(remainingQueue.length);
    setIsSyncing(false);

    if (syncedCount > 0) {
      showToast(`Synced ${syncedCount} offline sale(s) to server successfully! 🎉`, 'success');
      // Refresh cached products from backend
      api.getProducts().catch(() => {});
    }
  };

  return (
    <POSContext.Provider value={{
      cart,
      addToCart,
      addByBarcode,
      updateQuantity,
      removeFromCart,
      clearCart,
      selectedCustomer,
      setSelectedCustomer,
      discountType,
      setDiscountType,
      discountValue,
      setDiscountValue,
      appliedCoupon,
      setAppliedCoupon,
      applyCoupon,
      removeCoupon,
      taxRate,
      setTaxRate,
      paymentMethod,
      setPaymentMethod,
      cashReceived,
      setCashReceived,
      subtotal,
      calculatedDiscount,
      taxAmount,
      grandTotal,
      changeAmount,
      settings,
      setSettings: updateStoreSettings,
      activeReceipt,
      setActiveReceipt,
      showReceiptModal,
      setShowReceiptModal,
      showScannerModal,
      setShowScannerModal,
      toasts,
      showToast,
      isOnline,
      isSyncing,
      pendingSyncCount,
      saveOfflineSale,
      syncOfflineSales
    }}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  return useContext(POSContext);
}
