import seedData from './seedData.json';

// LocalStorage Keys
export const STORAGE_KEYS = {
  INITIALIZED: 'pos_local_initialized_v2',
  PRODUCTS: 'pos_local_products',
  CATEGORIES: 'pos_local_categories',
  CUSTOMERS: 'pos_local_customers',
  SALES: 'pos_local_sales',
  INVENTORY_TX: 'pos_local_inventory_tx',
  SETTINGS: 'pos_local_settings',
  COUPONS: 'pos_local_coupons',
  USERS: 'pos_local_users'
};

// Safe LocalStorage Helpers
function getStoredJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function setStoredJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
    return false;
  }
}

/**
 * Initialize Database with Seed Data if empty or first run
 */
export function initLocalDatabase(forceReset = false) {
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!forceReset && isInit === 'true') {
    // Already initialized
    return;
  }

  console.log('Initializing Offline Local Database for Velvet Touch Cosmetics POS...');

  // 1. Categories
  const categories = Array.isArray(seedData.categories) ? seedData.categories : [
    { id: 1, name: 'Skincare', icon: 'Sparkles' },
    { id: 2, name: 'Makeup', icon: 'Smile' },
    { id: 3, name: 'Haircare', icon: 'Scissors' },
    { id: 4, name: 'Fragrance', icon: 'Heart' },
    { id: 5, name: 'Lip Products', icon: 'Smile' },
    { id: 6, name: 'Face Products', icon: 'Eye' },
    { id: 7, name: 'Eye Products', icon: 'Eye' },
    { id: 8, name: 'Bath & Body', icon: 'Droplets' },
    { id: 9, name: 'Nail Care', icon: 'Paintbrush' }
  ];
  setStoredJson(STORAGE_KEYS.CATEGORIES, categories);

  // 2. Products with verified stock & status
  const products = (seedData.products || []).map(p => {
    const currentStock = parseInt(p.current_stock || 0);
    const minStock = parseInt(p.minimum_stock || 5);
    let status = p.status || 'in_stock';
    if (currentStock === 0) status = 'out_of_stock';
    else if (currentStock <= minStock) status = 'low_stock';

    return {
      ...p,
      buying_price: parseFloat(p.buying_price || 0),
      selling_price: parseFloat(p.selling_price || 0),
      current_stock: currentStock,
      minimum_stock: minStock,
      status
    };
  });
  setStoredJson(STORAGE_KEYS.PRODUCTS, products);

  // 3. Customers
  const customers = Array.isArray(seedData.customers) ? seedData.customers : [];
  setStoredJson(STORAGE_KEYS.CUSTOMERS, customers);

  // 4. Sales with items attached
  const saleItems = Array.isArray(seedData.sale_items) ? seedData.sale_items : [];
  const sales = (seedData.sales || []).map(s => {
    const items = saleItems.filter(item => item.sale_id === s.id);
    return {
      ...s,
      subtotal: parseFloat(s.subtotal || 0),
      discount: parseFloat(s.discount || 0),
      tax: parseFloat(s.tax || 0),
      grand_total: parseFloat(s.grand_total || 0),
      cash_received: parseFloat(s.cash_received || s.grand_total || 0),
      change_amount: parseFloat(s.change_amount || 0),
      items: items.map(it => ({
        ...it,
        name: it.product_name,
        product_name: it.product_name,
        unit_price: parseFloat(it.unit_price || 0),
        buying_price: parseFloat(it.buying_price || 0),
        total_price: parseFloat(it.total_price || 0),
        quantity: parseInt(it.quantity || 1)
      }))
    };
  });
  setStoredJson(STORAGE_KEYS.SALES, sales);

  // 5. Inventory Transactions
  const inventoryTx = Array.isArray(seedData.inventory_transactions) ? seedData.inventory_transactions : [];
  setStoredJson(STORAGE_KEYS.INVENTORY_TX, inventoryTx);

  // 6. Settings
  const baseSetting = (Array.isArray(seedData.settings) && seedData.settings[0]) || {};
  const settings = {
    shop_name: baseSetting.shop_name || 'Velvet Touch Cosmetics',
    shop_address: baseSetting.shop_address || '123 Beauty Boulevard, Cinnamon Gardens, Colombo 03',
    shop_phone: baseSetting.shop_phone || '+94 11 234 5678',
    cashier_name: 'Cashier',
    currency: baseSetting.currency || 'Rs.',
    receipt_width: baseSetting.receipt_width || '58mm',
    tax_rate: parseFloat(baseSetting.tax_rate || 0),
    default_discount: parseFloat(baseSetting.default_discount || 0),
    low_stock_threshold: parseInt(baseSetting.low_stock_threshold || 5),
    logo_url: baseSetting.logo_url || '',
    printer_bridge_url: 'http://localhost:9100',
    printer_auto_print: 1,
    printer_model: 'YHD-5808L'
  };
  setStoredJson(STORAGE_KEYS.SETTINGS, settings);

  // 7. Coupons
  const coupons = Array.isArray(seedData.coupons) ? seedData.coupons : [
    { id: 1, code: 'BEAUTY10', description: '10% off on all cosmetics', discount_type: 'percent', discount_value: 10, min_spend: 2000, max_discount: 1000, is_active: 1 },
    { id: 2, code: 'GLOW500', description: 'Rs. 500 off orders over Rs. 5000', discount_type: 'fixed', discount_value: 500, min_spend: 5000, max_discount: 500, is_active: 1 },
    { id: 3, code: 'WELCOME15', description: '15% off for new shoppers', discount_type: 'percent', discount_value: 15, min_spend: 3000, max_discount: 1500, is_active: 1 }
  ];
  setStoredJson(STORAGE_KEYS.COUPONS, coupons);

  // 8. Users
  const users = [
    { id: 1, name: 'Admin', email: 'admin@velvettouch.lk', role: 'admin' },
    { id: 2, name: 'Sanduni Perera', email: 'cashier@velvettouch.lk', role: 'cashier' }
  ];
  setStoredJson(STORAGE_KEYS.USERS, users);

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  console.log('Offline Local Database successfully initialized with 26 products!');
}

// Auto-run on module import
initLocalDatabase();

/* =========================================================================
   PRODUCTS CRUD
   ========================================================================= */

export const localProducts = {
  getAll: (params = {}) => {
    initLocalDatabase();
    let products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);

    // Filter by search query
    if (params.search) {
      const q = params.search.trim().toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (params.category && params.category !== 'All') {
      products = products.filter(p => p.category_name === params.category);
    }

    // Filter by brand
    if (params.brand) {
      products = products.filter(p => p.brand === params.brand);
    }

    // Filter by status
    if (params.status) {
      products = products.filter(p => p.status === params.status);
    }

    // Sorting
    const sort = params.sort || 'newest';
    if (sort === 'price_asc') {
      products.sort((a, b) => (parseFloat(a.selling_price) || 0) - (parseFloat(b.selling_price) || 0));
    } else if (sort === 'price_desc') {
      products.sort((a, b) => (parseFloat(b.selling_price) || 0) - (parseFloat(a.selling_price) || 0));
    } else if (sort === 'stock_low') {
      products.sort((a, b) => (parseInt(a.current_stock) || 0) - (parseInt(b.current_stock) || 0));
    } else {
      products.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return products;
  },

  getByBarcode: (barcode) => {
    if (!barcode) throw new Error('Barcode is required');
    const clean = String(barcode).trim().toLowerCase();
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const match = products.find(p =>
      (p.barcode && p.barcode.toLowerCase() === clean) ||
      (p.sku && p.sku.toLowerCase() === clean) ||
      String(p.id) === clean
    );
    if (!match) throw new Error(`Product not found for code: "${barcode}"`);
    return match;
  },

  create: (data) => {
    initLocalDatabase();
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);

    if (!data.name || !data.sku || !data.barcode || data.selling_price === undefined) {
      throw new Error('Product Name, SKU, Barcode, and Selling Price are required.');
    }

    // Check duplicate SKU or Barcode
    const cleanSku = data.sku.trim().toLowerCase();
    const cleanBarcode = data.barcode.trim().toLowerCase();
    const dup = products.find(p =>
      (p.sku && p.sku.toLowerCase() === cleanSku) ||
      (p.barcode && p.barcode.toLowerCase() === cleanBarcode)
    );
    if (dup) {
      throw new Error('A product with this SKU or Barcode already exists in your local catalog.');
    }

    const currentStock = parseInt(data.current_stock || 0);
    const minStock = parseInt(data.minimum_stock || 5);
    let status = 'in_stock';
    if (currentStock === 0) status = 'out_of_stock';
    else if (currentStock <= minStock) status = 'low_stock';

    const maxId = products.reduce((max, p) => Math.max(max, parseInt(p.id || 0)), 0);
    const newProduct = {
      id: maxId + 1,
      name: data.name.trim(),
      brand: data.brand ? data.brand.trim() : 'Generic',
      category_id: data.category_id || null,
      category_name: data.category_name || 'Makeup',
      description: data.description || '',
      sku: data.sku.trim(),
      barcode: data.barcode.trim(),
      buying_price: parseFloat(data.buying_price || 0),
      selling_price: parseFloat(data.selling_price || 0),
      current_stock: currentStock,
      minimum_stock: minStock,
      image_url: data.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
      expiry_date: data.expiry_date || null,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    products.unshift(newProduct);
    setStoredJson(STORAGE_KEYS.PRODUCTS, products);

    // Record initial inventory transaction if stock > 0
    if (currentStock > 0) {
      localInventory.logTransaction({
        product_id: newProduct.id,
        product_name: newProduct.name,
        type: 'Initial Stock',
        quantity_changed: currentStock,
        previous_stock: 0,
        new_stock: currentStock,
        note: 'New product creation',
        user_name: 'Admin'
      });
    }

    return { message: 'Product created successfully', product: newProduct };
  },

  update: (id, data) => {
    initLocalDatabase();
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Product not found in local catalog.');

    const prev = products[idx];
    const currentStock = data.current_stock !== undefined ? parseInt(data.current_stock) : prev.current_stock;
    const minStock = data.minimum_stock !== undefined ? parseInt(data.minimum_stock) : prev.minimum_stock;

    let status = 'in_stock';
    if (currentStock === 0) status = 'out_of_stock';
    else if (currentStock <= minStock) status = 'low_stock';

    const updated = {
      ...prev,
      ...data,
      buying_price: data.buying_price !== undefined ? parseFloat(data.buying_price) : prev.buying_price,
      selling_price: data.selling_price !== undefined ? parseFloat(data.selling_price) : prev.selling_price,
      current_stock: currentStock,
      minimum_stock: minStock,
      status,
      updated_at: new Date().toISOString()
    };

    products[idx] = updated;
    setStoredJson(STORAGE_KEYS.PRODUCTS, products);
    return { message: 'Product updated successfully', product: updated };
  },

  /**
   * Bulk import (used by Excel/CSV import). Same product shape and status rules as create().
   * rows: validated product objects. mode: 'skip' | 'update' for existing SKU/barcode matches.
   * Writes once, verifies by reading back, and restores the previous data if the write fails.
   * Returns { imported, updated, skipped, failed: [{index, name, reason}] } - counts are only
   * non-zero after the data is confirmed persisted.
   */
  bulkImport: (rows, mode = 'skip') => {
    initLocalDatabase();
    const before = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const summary = { imported: 0, updated: 0, skipped: 0, failed: [] };
    const bySku = new Map();
    const byBarcode = new Map();
    products.forEach(p => {
      if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p);
      if (p.barcode) byBarcode.set(String(p.barcode).trim().toLowerCase(), p);
    });
    let nextId = products.reduce((max, p) => Math.max(max, parseInt(p.id || 0)), 0) + 1;
    const now = new Date().toISOString();
    const txs = [];
    const added = [];
    const pendingCounts = { imported: 0, updated: 0 };

    const computeStatus = (stock, min) => (stock === 0 ? 'out_of_stock' : stock <= min ? 'low_stock' : 'in_stock');

    rows.forEach((row, index) => {
      try {
        const name = String(row.name || '').trim();
        const sku = String(row.sku || '').trim();
        const barcode = String(row.barcode || '').trim();
        const price = Number(row.selling_price);
        if (!name || !sku || !barcode || !Number.isFinite(price) || price < 0) {
          throw new Error('Name, SKU/Barcode and a valid selling price are required.');
        }
        const stock = Math.max(0, parseInt(row.current_stock || 0));
        const min = Math.max(0, parseInt(row.minimum_stock ?? 5));
        const existing = bySku.get(sku.toLowerCase()) || byBarcode.get(barcode.toLowerCase());

        if (existing) {
          if (mode !== 'update') { summary.skipped++; return; }
          const prevStock = parseInt(existing.current_stock || 0);
          Object.assign(existing, {
            name, brand: row.brand || existing.brand, category_name: row.category_name || existing.category_name,
            description: row.description || existing.description || '',
            buying_price: parseFloat(row.buying_price || 0), selling_price: price,
            current_stock: stock, minimum_stock: min,
            discount: row.discount || 0, discount_type: row.discount_type || '',
            expiry_date: row.expiry_date || existing.expiry_date || null,
            image_url: row.image_url || existing.image_url,
            status: computeStatus(stock, min), updated_at: now
          });
          if (stock !== prevStock) {
            txs.push({ product_id: existing.id, product_name: name, type: 'Import Update', quantity_changed: stock - prevStock,
              previous_stock: prevStock, new_stock: stock, note: 'Excel/CSV import update', user_name: 'Admin' });
          }
          pendingCounts.updated++;
          return;
        }

        const product = {
          id: nextId++,
          name,
          brand: row.brand || 'Generic',
          category_id: null,
          category_name: row.category_name || 'Makeup',
          description: row.description || '',
          sku, barcode,
          buying_price: parseFloat(row.buying_price || 0),
          selling_price: price,
          current_stock: stock,
          minimum_stock: min,
          discount: row.discount || 0,
          discount_type: row.discount_type || '',
          image_url: row.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
          expiry_date: row.expiry_date || null,
          status: computeStatus(stock, min),
          created_at: now,
          updated_at: now
        };
        added.push(product);
        bySku.set(sku.toLowerCase(), product);
        byBarcode.set(barcode.toLowerCase(), product);
        if (stock > 0) {
          txs.push({ product_id: product.id, product_name: name, type: 'Initial Stock', quantity_changed: stock,
            previous_stock: 0, new_stock: stock, note: 'Excel/CSV import', user_name: 'Admin' });
        }
        pendingCounts.imported++;
      } catch (err) {
        summary.failed.push({ index, name: row && row.name, reason: err.message });
      }
    });

    if (pendingCounts.imported === 0 && pendingCounts.updated === 0) return summary;

    const next = [...added.reverse(), ...products];
    const saved = setStoredJson(STORAGE_KEYS.PRODUCTS, next);
    // Verify persistence by reading back
    let verified = false;
    if (saved) {
      const check = getStoredJson(STORAGE_KEYS.PRODUCTS, null);
      verified = Array.isArray(check) && check.length === next.length;
    }
    if (!verified) {
      try { if (before === null) localStorage.removeItem(STORAGE_KEYS.PRODUCTS); else localStorage.setItem(STORAGE_KEYS.PRODUCTS, before); } catch { /* ignore */ }
      throw new Error('Could not save products - browser storage is full or unavailable. Nothing was imported. Free up space (Settings > backup, then clear old data) and try again.');
    }

    // Inventory history in one write (best-effort; products are already safely saved)
    if (txs.length) {
      try {
        const history = getStoredJson(STORAGE_KEYS.INVENTORY_TX, []);
        const stamped = txs.map((t, i) => ({ id: Date.now() + i + Math.random(), created_at: now, ...t }));
        const merged = [...stamped.reverse(), ...history];
        if (merged.length > 300) merged.length = 300;
        setStoredJson(STORAGE_KEYS.INVENTORY_TX, merged);
      } catch { /* non-critical */ }
    }

    // Add any new categories so filters show them
    try {
      const cats = getStoredJson(STORAGE_KEYS.CATEGORIES, []);
      const known = new Set(cats.map(c => String(c.name).toLowerCase()));
      let maxCat = cats.reduce((m, c) => Math.max(m, parseInt(c.id || 0)), 0);
      let changed = false;
      next.forEach(p => {
        const n = p.category_name && String(p.category_name).trim();
        if (n && !known.has(n.toLowerCase())) { cats.push({ id: ++maxCat, name: n, icon: 'Tag' }); known.add(n.toLowerCase()); changed = true; }
      });
      if (changed) setStoredJson(STORAGE_KEYS.CATEGORIES, cats);
    } catch { /* non-critical */ }

    summary.imported = pendingCounts.imported;
    summary.updated = pendingCounts.updated;
    return summary;
  },

  delete: (id) => {
    initLocalDatabase();
    let products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    products = products.filter(p => String(p.id) !== String(id));
    setStoredJson(STORAGE_KEYS.PRODUCTS, products);
    return { message: 'Product deleted successfully.' };
  }
};

/* =========================================================================
   SALES & POS OPERATIONS (WITH AUTOMATIC LOCAL STOCK DECREMENT)
   ========================================================================= */

export const localSales = {
  create: (salePayload) => {
    initLocalDatabase();
    const items = salePayload.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cannot complete sale with an empty cart.');
    }

    const grandTotal = parseFloat(salePayload.grand_total || 0);
    if (grandTotal < 0) {
      throw new Error('Invalid total amount.');
    }

    // Generate Invoice Number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNo = salePayload.invoice_no || `INV-${dateStr}-${randomSuffix}`;

    // Load products & update stock
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const cashierName = salePayload.cashier_name || 'Cashier';

    // 1. Decrement Stock for each item & generate inventory transactions
    for (const item of items) {
      const prodIdx = products.findIndex(p => String(p.id) === String(item.product_id));
      if (prodIdx > -1) {
        const prod = products[prodIdx];
        const prevStock = parseInt(prod.current_stock || 0);
        const qty = parseInt(item.quantity || 1);
        const newStock = Math.max(0, prevStock - qty);

        let newStatus = 'in_stock';
        if (newStock === 0) newStatus = 'out_of_stock';
        else if (newStock <= prod.minimum_stock) newStatus = 'low_stock';

        products[prodIdx] = {
          ...prod,
          current_stock: newStock,
          status: newStatus,
          updated_at: now.toISOString()
        };

        // Log transaction
        localInventory.logTransaction({
          product_id: prod.id,
          product_name: prod.name,
          type: 'Sale',
          quantity_changed: -qty,
          previous_stock: prevStock,
          new_stock: newStock,
          note: `Sale Invoice ${invoiceNo}`,
          user_name: cashierName
        });
      }
    }
    // Save updated products with new stocks immediately!
    setStoredJson(STORAGE_KEYS.PRODUCTS, products);

    // 2. Update Customer total purchases if customer attached
    if (salePayload.customer_id) {
      const customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);
      const custIdx = customers.findIndex(c => String(c.id) === String(salePayload.customer_id));
      if (custIdx > -1) {
        const prevPurchases = parseFloat(customers[custIdx].total_purchases || 0);
        customers[custIdx].total_purchases = prevPurchases + grandTotal;
        setStoredJson(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // 3. Format Sale Items
    const formattedItems = items.map((it, idx) => ({
      id: Date.now() + idx,
      sale_id: invoiceNo,
      product_id: it.product_id,
      product_name: it.name || it.product_name,
      name: it.name || it.product_name,
      sku: it.sku || 'N/A',
      unit_price: parseFloat(it.unit_price || it.selling_price || 0),
      buying_price: parseFloat(it.buying_price || 0),
      quantity: parseInt(it.quantity || 1),
      total_price: parseFloat(it.total_price || (parseFloat(it.unit_price || 0) * parseInt(it.quantity || 1)))
    }));

    // 4. Save Sale Record
    const savedSale = {
      id: Date.now(),
      invoice_no: invoiceNo,
      customer_id: salePayload.customer_id || null,
      customer_name: salePayload.customer_name || 'Walk-in Customer',
      user_id: 1,
      cashier_name: cashierName,
      subtotal: parseFloat(salePayload.subtotal || 0),
      discount: parseFloat(salePayload.discount || 0),
      coupon_code: salePayload.coupon_code || '',
      tax: parseFloat(salePayload.tax || 0),
      grand_total: grandTotal,
      payment_method: salePayload.payment_method || 'Cash',
      cash_received: parseFloat(salePayload.cash_received !== undefined ? salePayload.cash_received : grandTotal),
      change_amount: parseFloat(salePayload.change_amount || 0),
      status: 'Completed',
      created_at: salePayload.created_at || now.toISOString(),
      items: formattedItems
    };

    const sales = getStoredJson(STORAGE_KEYS.SALES, []);
    sales.unshift(savedSale);
    setStoredJson(STORAGE_KEYS.SALES, sales);

    return {
      message: 'Sale completed successfully',
      sale: savedSale
    };
  },

  getAll: (params = {}) => {
    initLocalDatabase();
    let sales = getStoredJson(STORAGE_KEYS.SALES, []);

    // Search
    if (params.search) {
      const q = params.search.trim().toLowerCase();
      sales = sales.filter(s =>
        (s.invoice_no && s.invoice_no.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.cashier_name && s.cashier_name.toLowerCase().includes(q))
      );
    }

    // Date Range Filters
    if (params.startDate) {
      const start = params.startDate + 'T00:00:00';
      sales = sales.filter(s => s.created_at >= start || s.created_at >= params.startDate);
    }
    if (params.endDate) {
      const end = params.endDate + 'T23:59:59';
      sales = sales.filter(s => s.created_at <= end);
    }

    // Payment Method
    if (params.paymentMethod && params.paymentMethod !== 'All') {
      sales = sales.filter(s => s.payment_method === params.paymentMethod);
    }

    sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sales;
  },

  getByInvoice: (invoiceNo) => {
    initLocalDatabase();
    const clean = String(invoiceNo).trim().toLowerCase();
    const sales = getStoredJson(STORAGE_KEYS.SALES, []);
    const match = sales.find(s =>
      (s.invoice_no && s.invoice_no.toLowerCase() === clean) ||
      String(s.id) === clean
    );
    if (!match) throw new Error('Invoice not found in local sales.');
    return match;
  }
};

/* =========================================================================
   INVENTORY & STOCK CONTROL
   ========================================================================= */

export const localInventory = {
  getAll: (params = {}) => {
    initLocalDatabase();
    let products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);

    if (params.search) {
      const q = params.search.trim().toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (params.status && params.status !== 'All') {
      products = products.filter(p => p.status === params.status);
    }

    products.sort((a, b) => (parseInt(a.current_stock) || 0) - (parseInt(b.current_stock) || 0));
    return products;
  },

  adjustStock: (payload) => {
    initLocalDatabase();
    const { product_id, type, quantity_changed, note, user_name } = payload;
    if (!product_id || !type || quantity_changed === undefined) {
      throw new Error('Product, Adjustment Type, and Quantity are required.');
    }

    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const idx = products.findIndex(p => String(p.id) === String(product_id));
    if (idx === -1) throw new Error('Product not found.');

    const prod = products[idx];
    const prevStock = parseInt(prod.current_stock || 0);
    const change = parseInt(quantity_changed);
    const newStock = Math.max(0, prevStock + change);

    let newStatus = 'in_stock';
    if (newStock === 0) newStatus = 'out_of_stock';
    else if (newStock <= prod.minimum_stock) newStatus = 'low_stock';

    products[idx] = {
      ...prod,
      current_stock: newStock,
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    setStoredJson(STORAGE_KEYS.PRODUCTS, products);

    localInventory.logTransaction({
      product_id: prod.id,
      product_name: prod.name,
      type,
      quantity_changed: change,
      previous_stock: prevStock,
      new_stock: newStock,
      note: note || '',
      user_name: user_name || 'Admin'
    });

    return {
      message: 'Stock adjusted successfully',
      new_stock: newStock,
      status: newStatus
    };
  },

  logTransaction: (tx) => {
    const history = getStoredJson(STORAGE_KEYS.INVENTORY_TX, []);
    const record = {
      id: Date.now() + Math.random(),
      created_at: new Date().toISOString(),
      ...tx
    };
    history.unshift(record);
    if (history.length > 300) history.length = 300; // Limit history to recent 300 records
    setStoredJson(STORAGE_KEYS.INVENTORY_TX, history);
  },

  getHistory: () => {
    initLocalDatabase();
    const history = getStoredJson(STORAGE_KEYS.INVENTORY_TX, []);
    history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return history;
  }
};

/* =========================================================================
   DASHBOARD & REPORTS CALCULATED DIRECTLY FROM LOCAL DATA
   ========================================================================= */

export const localReports = {
  getDashboard: () => {
    initLocalDatabase();
    const todayStr = new Date().toISOString().slice(0, 10);
    const sales = getStoredJson(STORAGE_KEYS.SALES, []);
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);

    // Filter today's sales
    const todaySales = sales.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr);
    const todayTotalRevenue = todaySales.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0), 0);

    // Low stock counts & alerts
    const lowStockProducts = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');
    const lowStockAlerts = [...lowStockProducts]
      .sort((a, b) => (parseInt(a.current_stock) || 0) - (parseInt(b.current_stock) || 0))
      .slice(0, 10);

    // Recent 10 sales
    const recentSales = [...sales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Last 14 days chart
    const dateMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { date: key, total_amount: 0, order_count: 0 };
    }

    sales.forEach(s => {
      if (s.created_at) {
        const dStr = s.created_at.slice(0, 10);
        if (dateMap[dStr]) {
          dateMap[dStr].total_amount += parseFloat(s.grand_total || 0);
          dateMap[dStr].order_count += 1;
        }
      }
    });

    const salesChart = Object.values(dateMap);

    return {
      today_sales: todayTotalRevenue,
      today_orders: todaySales.length,
      total_products: products.length,
      low_stock_count: lowStockProducts.length,
      total_customers: customers.length,
      recent_sales: recentSales,
      low_stock_alerts: lowStockAlerts,
      sales_chart: salesChart
    };
  },

  getAnalytics: (params = {}) => {
    initLocalDatabase();
    const { range = 'month', startDate, endDate } = params;
    const sales = getStoredJson(STORAGE_KEYS.SALES, []);
    const products = getStoredJson(STORAGE_KEYS.PRODUCTS, []);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMonth = now.toISOString().slice(0, 7);

    // Filter sales by range
    let filteredSales = [];
    if (range === 'today') {
      filteredSales = sales.filter(s => s.created_at && s.created_at.slice(0, 10) === todayStr);
    } else if (range === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      filteredSales = sales.filter(s => s.created_at && s.created_at >= sevenDaysAgo);
    } else if (range === 'month') {
      filteredSales = sales.filter(s => s.created_at && s.created_at.startsWith(currentMonth));
    } else if (range === 'custom' && startDate && endDate) {
      const start = startDate + 'T00:00:00';
      const end = endDate + 'T23:59:59';
      filteredSales = sales.filter(s => s.created_at && s.created_at >= start && s.created_at <= end);
    } else {
      filteredSales = [...sales];
    }

    // Summary calculations
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0), 0);
    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscounts = filteredSales.reduce((sum, s) => sum + (parseFloat(s.discount) || 0), 0);

    // Top selling products aggregated from sale items
    const productStats = {};
    filteredSales.forEach(s => {
      (s.items || []).forEach(item => {
        const name = item.product_name || item.name || 'Unknown Product';
        if (!productStats[name]) {
          productStats[name] = { product_name: name, total_qty: 0, total_sales: 0 };
        }
        productStats[name].total_qty += parseInt(item.quantity || 1);
        productStats[name].total_sales += parseFloat(item.total_price || (item.unit_price * item.quantity) || 0);
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 8);

    // Inventory status summary
    const inStock = products.filter(p => p.status === 'in_stock').length;
    const lowStock = products.filter(p => p.status === 'low_stock').length;
    const outOfStock = products.filter(p => p.status === 'out_of_stock').length;

    return {
      range,
      summary: {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        avg_order_value: avgOrderValue,
        total_discounts: totalDiscounts
      },
      top_products: topProducts,
      inventory_summary: {
        in_stock: inStock,
        low_stock: lowStock,
        out_of_stock: outOfStock
      }
    };
  }
};

/* =========================================================================
   CUSTOMERS, CATEGORIES, SETTINGS, COUPONS & AUTH
   ========================================================================= */

export const localCustomers = {
  getAll: (search = '') => {
    initLocalDatabase();
    let customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);
    if (search) {
      const q = search.trim().toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return customers;
  },

  getPurchases: (customerId) => {
    initLocalDatabase();
    const sales = getStoredJson(STORAGE_KEYS.SALES, []);
    return sales.filter(s => String(s.customer_id) === String(customerId));
  },

  create: (data) => {
    initLocalDatabase();
    const customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);
    const maxId = customers.reduce((max, c) => Math.max(max, parseInt(c.id || 0)), 0);
    const newCust = {
      id: maxId + 1,
      name: data.name.trim(),
      phone: data.phone ? data.phone.trim() : '',
      email: data.email ? data.email.trim() : '',
      total_purchases: 0,
      created_at: new Date().toISOString()
    };
    customers.unshift(newCust);
    setStoredJson(STORAGE_KEYS.CUSTOMERS, customers);
    return { message: 'Customer created successfully', customer: newCust };
  },

  update: (id, data) => {
    initLocalDatabase();
    const customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);
    const idx = customers.findIndex(c => String(c.id) === String(id));
    if (idx === -1) throw new Error('Customer not found');
    customers[idx] = { ...customers[idx], ...data };
    setStoredJson(STORAGE_KEYS.CUSTOMERS, customers);
    return { message: 'Customer updated successfully', customer: customers[idx] };
  },

  delete: (id) => {
    initLocalDatabase();
    let customers = getStoredJson(STORAGE_KEYS.CUSTOMERS, []);
    customers = customers.filter(c => String(c.id) !== String(id));
    setStoredJson(STORAGE_KEYS.CUSTOMERS, customers);
    return { message: 'Customer deleted successfully' };
  }
};

export const localCategories = {
  getAll: () => {
    initLocalDatabase();
    return getStoredJson(STORAGE_KEYS.CATEGORIES, []);
  },
  create: (data) => {
    initLocalDatabase();
    const cats = getStoredJson(STORAGE_KEYS.CATEGORIES, []);
    const maxId = cats.reduce((max, c) => Math.max(max, parseInt(c.id || 0)), 0);
    const newCat = {
      id: maxId + 1,
      name: data.name.trim(),
      icon: data.icon || 'Sparkles',
      created_at: new Date().toISOString()
    };
    cats.push(newCat);
    setStoredJson(STORAGE_KEYS.CATEGORIES, cats);
    return newCat;
  }
};

export const localSettings = {
  get: () => {
    initLocalDatabase();
    return getStoredJson(STORAGE_KEYS.SETTINGS, {
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
  },

  update: (newSettings) => {
    initLocalDatabase();
    const current = localSettings.get();
    const merged = { ...current, ...newSettings };
    setStoredJson(STORAGE_KEYS.SETTINGS, merged);
    return merged;
  }
};

export const localCoupons = {
  getAll: () => {
    initLocalDatabase();
    return getStoredJson(STORAGE_KEYS.COUPONS, []);
  },

  validate: (code, subtotal) => {
    initLocalDatabase();
    const coupons = getStoredJson(STORAGE_KEYS.COUPONS, []);
    const cleanCode = (code || '').trim().toUpperCase();
    const match = coupons.find(c => (c.code || '').toUpperCase() === cleanCode && (c.is_active === 1 || c.is_active === true));
    if (!match) {
      throw new Error('Invalid or expired coupon code');
    }
    const numSubtotal = parseFloat(subtotal || 0);
    const minSpend = parseFloat(match.min_spend || 0);
    if (minSpend > 0 && numSubtotal < minSpend) {
      throw new Error(`Minimum spend of Rs. ${minSpend.toFixed(2)} required for coupon "${match.code}".`);
    }

    let discountAmount = 0;
    if (match.discount_type === 'percent') {
      discountAmount = (numSubtotal * parseFloat(match.discount_value)) / 100;
      if (match.max_discount && discountAmount > parseFloat(match.max_discount)) {
        discountAmount = parseFloat(match.max_discount);
      }
    } else {
      discountAmount = parseFloat(match.discount_value);
    }
    discountAmount = Math.min(numSubtotal, discountAmount);

    return {
      valid: true,
      coupon: {
        code: match.code,
        description: match.description,
        discount_type: match.discount_type,
        discount_value: match.discount_value,
        min_spend: match.min_spend,
        max_discount: match.max_discount,
        discount_amount: discountAmount
      }
    };
  },

  create: (data) => {
    initLocalDatabase();
    const coupons = getStoredJson(STORAGE_KEYS.COUPONS, []);
    const maxId = coupons.reduce((max, c) => Math.max(max, parseInt(c.id || 0)), 0);
    const newCoupon = {
      id: maxId + 1,
      code: data.code.trim().toUpperCase(),
      description: data.description || '',
      discount_type: data.discount_type || 'percent',
      discount_value: parseFloat(data.discount_value || 0),
      min_spend: parseFloat(data.min_spend || 0),
      max_discount: parseFloat(data.max_discount || 0),
      is_active: 1,
      created_at: new Date().toISOString()
    };
    coupons.push(newCoupon);
    setStoredJson(STORAGE_KEYS.COUPONS, coupons);
    return newCoupon;
  },

  delete: (id) => {
    initLocalDatabase();
    let coupons = getStoredJson(STORAGE_KEYS.COUPONS, []);
    coupons = coupons.filter(c => String(c.id) !== String(id));
    setStoredJson(STORAGE_KEYS.COUPONS, coupons);
    return { message: 'Coupon deleted successfully' };
  }
};

export const localAuth = {
  login: (credentials) => {
    initLocalDatabase();
    const { email, password } = credentials;
    // Verify admin
    if (email === 'admin@velvettouch.lk' && password === 'admin123') {
      const user = { id: 1, name: 'Admin', email: 'admin@velvettouch.lk', role: 'admin' };
      return { success: true, token: 'local_token_admin', user };
    }
    // Verify cashier
    if (email === 'cashier@velvettouch.lk' && password === 'cashier123') {
      const user = { id: 2, name: 'Sanduni Perera', email: 'cashier@velvettouch.lk', role: 'cashier' };
      return { success: true, token: 'local_token_cashier', user };
    }

    // Check stored users
    const users = getStoredJson(STORAGE_KEYS.USERS, []);
    const match = users.find(u => u.email && u.email.toLowerCase() === (email || '').toLowerCase());
    if (match) {
      return { success: true, token: `local_token_${match.id}`, user: match };
    }

    // Default offline convenience: if any email entered, allow entry as admin or cashier
    if (email) {
      const role = email.toLowerCase().includes('cashier') ? 'cashier' : 'admin';
      const user = { id: Date.now(), name: email.split('@')[0], email, role };
      return { success: true, token: 'local_token_user', user };
    }

    throw new Error('Invalid email or password.');
  },

  register: (data) => {
    initLocalDatabase();
    const users = getStoredJson(STORAGE_KEYS.USERS, []);
    const newUser = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      role: data.role || 'cashier'
    };
    users.push(newUser);
    setStoredJson(STORAGE_KEYS.USERS, users);
    return { success: true, token: `local_token_${newUser.id}`, user: newUser };
  },

  getMe: () => {
    const raw = localStorage.getItem('pos_user');
    return raw ? JSON.parse(raw) : { id: 1, name: 'Admin', email: 'admin@velvettouch.lk', role: 'admin' };
  }
};

/* =========================================================================
   BACKUP, EXPORT & RESTORE TOOLS (PERFECT FOR PHONE & PC OFFLINE USAGE)
   ========================================================================= */

export const localBackup = {
  exportDatabase: () => {
    initLocalDatabase();
    return {
      exported_at: new Date().toISOString(),
      shop: 'Velvet Touch Cosmetics',
      products: getStoredJson(STORAGE_KEYS.PRODUCTS, []),
      sales: getStoredJson(STORAGE_KEYS.SALES, []),
      customers: getStoredJson(STORAGE_KEYS.CUSTOMERS, []),
      categories: getStoredJson(STORAGE_KEYS.CATEGORIES, []),
      inventory_transactions: getStoredJson(STORAGE_KEYS.INVENTORY_TX, []),
      settings: getStoredJson(STORAGE_KEYS.SETTINGS, {}),
      coupons: getStoredJson(STORAGE_KEYS.COUPONS, [])
    };
  },

  importDatabase: (backupData) => {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file format.');
    }

    if (Array.isArray(backupData.products)) {
      setStoredJson(STORAGE_KEYS.PRODUCTS, backupData.products);
    }
    if (Array.isArray(backupData.sales)) {
      setStoredJson(STORAGE_KEYS.SALES, backupData.sales);
    }
    if (Array.isArray(backupData.customers)) {
      setStoredJson(STORAGE_KEYS.CUSTOMERS, backupData.customers);
    }
    if (Array.isArray(backupData.categories)) {
      setStoredJson(STORAGE_KEYS.CATEGORIES, backupData.categories);
    }
    if (Array.isArray(backupData.inventory_transactions)) {
      setStoredJson(STORAGE_KEYS.INVENTORY_TX, backupData.inventory_transactions);
    }
    if (backupData.settings && typeof backupData.settings === 'object') {
      setStoredJson(STORAGE_KEYS.SETTINGS, backupData.settings);
    }
    if (Array.isArray(backupData.coupons)) {
      setStoredJson(STORAGE_KEYS.COUPONS, backupData.coupons);
    }

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    return { success: true, message: 'Database successfully restored!' };
  },

  resetDatabase: () => {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    initLocalDatabase(true);
    return { success: true, message: 'Database reset to initial sample data!' };
  }
};
