import {
  localProducts,
  localSales,
  localInventory,
  localReports,
  localCustomers,
  localCategories,
  localSettings,
  localCoupons,
  localAuth,
  localBackup
} from './localDatabase';

// Helper caching functions for backward compatibility
export function saveCache(key, data) {
  try {
    localStorage.setItem(`pos_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to cache ${key}:`, e);
  }
}

export function loadCache(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`pos_cache_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Universal Local-First API Client
 * Operates 100% offline directly in browser storage (LocalStorage)
 * without requiring any backend server.
 */
export const api = {
  // Auth
  login: async (credentials) => {
    return localAuth.login(credentials);
  },
  register: async (data) => {
    return localAuth.register(data);
  },
  getMe: async () => {
    return localAuth.getMe();
  },

  // Products
  getProducts: async (params = {}) => {
    return localProducts.getAll(params);
  },
  getProductByBarcode: async (barcode) => {
    return localProducts.getByBarcode(barcode);
  },
  createProduct: async (data) => {
    return localProducts.create(data);
  },
  updateProduct: async (id, data) => {
    return localProducts.update(id, data);
  },
  deleteProduct: async (id) => {
    return localProducts.delete(id);
  },
  bulkImportProducts: async (rows, mode = 'skip') => {
    return localProducts.bulkImport(rows, mode);
  },

  // Categories
  getCategories: async () => {
    return localCategories.getAll();
  },
  createCategory: async (data) => {
    return localCategories.create(data);
  },

  // Customers
  getCustomers: async (search = '') => {
    return localCustomers.getAll(search);
  },
  getCustomerPurchases: async (id) => {
    return localCustomers.getPurchases(id);
  },
  createCustomer: async (data) => {
    return localCustomers.create(data);
  },
  updateCustomer: async (id, data) => {
    return localCustomers.update(id, data);
  },
  deleteCustomer: async (id) => {
    return localCustomers.delete(id);
  },

  // Inventory & Stock
  getInventory: async (params = {}) => {
    return localInventory.getAll(params);
  },
  adjustStock: async (data) => {
    return localInventory.adjustStock(data);
  },
  getInventoryHistory: async () => {
    return localInventory.getHistory();
  },

  // Sales & Orders (Automatic local stock update + local invoice generation)
  createSale: async (saleData) => {
    return localSales.create(saleData);
  },
  getSales: async (params = {}) => {
    return localSales.getAll(params);
  },
  getSaleByInvoice: async (invoiceNo) => {
    return localSales.getByInvoice(invoiceNo);
  },

  // Reports & Dashboard
  getDashboard: async () => {
    return localReports.getDashboard();
  },
  getAnalytics: async (params = {}) => {
    return localReports.getAnalytics(params);
  },

  // Settings
  getSettings: async () => {
    return localSettings.get();
  },
  updateSettings: async (data) => {
    return localSettings.update(data);
  },

  // Coupons
  getCoupons: async () => {
    return localCoupons.getAll();
  },
  validateCoupon: async (code, subtotal) => {
    return localCoupons.validate(code, subtotal);
  },
  createCoupon: async (data) => {
    return localCoupons.create(data);
  },
  deleteCoupon: async (id) => {
    return localCoupons.delete(id);
  },

  // Database Backup, Export & Reset
  exportDatabase: () => {
    return localBackup.exportDatabase();
  },
  importDatabase: (backupData) => {
    return localBackup.importDatabase(backupData);
  },
  resetDatabase: () => {
    return localBackup.resetDatabase();
  }
};
