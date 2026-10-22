import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { parseProductFile, buildTemplateWorkbook, wasFileImported, rememberImportedFile } from '../services/productImport';
import { usePOS } from '../context/POSContext';
import { useAuth } from '../context/AuthContext';
import {
  Package, Plus, Search, Filter, Edit, Trash2, Tag, AlertTriangle,
  RefreshCw, CheckCircle2, ArrowUpDown, Upload, Download, FileSpreadsheet, X
} from 'lucide-react';
import ProductModal from '../components/ProductModal';

export default function Products() {
  const { settings, showToast } = usePOS();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');

  // Modal & Delete confirmation
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importFingerprint, setImportFingerprint] = useState('');
  const [importError, setImportError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [allowReimport, setAllowReimport] = useState(false);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [importMode, setImportMode] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [pData, cData] = await Promise.all([
        api.getProducts({ search, category, sort }),
        api.getCategories()
      ]);
      setProducts(pData || []);
      setCategories(cData || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category, sort]);

  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        showToast('Product updated successfully!');
      } else {
        await api.createProduct(formData);
        showToast('New cosmetic product created successfully!');
      }
      setShowModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Unable to save product.', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteId) return;
    try {
      await api.deleteProduct(deleteId);
      showToast('Product deleted from store catalog.');
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Unable to delete product.', 'error');
    }
  };

  const currency = settings.currency || 'Rs.';

  const downloadExcelTemplate = () => {
    XLSX.writeFile(buildTemplateWorkbook(), 'Cosmetics_Products_Template.xlsx');
  };

  const resetImport = () => {
    setImportFile(null); setImportPreview(null); setImportFingerprint('');
    setImportError(''); setImportSummary(null); setAllowReimport(false); setShowInvalidOnly(false);
  };

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file after fixing it
    if (!file) return;
    resetImport();
    setImportFile(file);
    setParsing(true);
    try {
      const existing = await api.getProducts();
      const result = await parseProductFile(file, existing || []);
      setImportPreview(result);
      setImportFingerprint(result.fingerprint);
    } catch (err) {
      setImportPreview(null);
      setImportError(err.message || 'Could not read this file.');
    } finally {
      setParsing(false);
    }
  };

  const alreadyImported = importFingerprint && wasFileImported(importFingerprint);

  const runExcelImport = async () => {
    if (!importPreview) return;
    const toSave = importPreview.rows
      .filter(r => r.status === 'valid' || (r.status === 'duplicate' && importMode === 'update'))
      .map(r => r.data);
    if (!toSave.length) {
      showToast('There are no valid products to import.', 'warning');
      return;
    }
    setImporting(true);
    setImportError('');
    try {
      // let the spinner paint before the synchronous storage write
      await new Promise(r => setTimeout(r, 30));
      const res = await api.bulkImportProducts(toSave, importMode);
      const skippedDup = importPreview.rows.filter(r => r.status === 'duplicate').length;
      const summary = {
        imported: res.imported,
        updated: res.updated,
        skipped: (importMode === 'skip' ? skippedDup : 0) + res.skipped,
        failed: importPreview.invalidCount + res.failed.length,
        errors: [
          ...importPreview.rows.filter(r => r.status === 'invalid').map(r => ({ row: r.rowNumber, reason: r.errors.join(' ') })),
          ...res.failed.map(f => ({ row: f.index + 2, reason: f.reason }))
        ]
      };
      setImportSummary(summary);
      if (res.imported || res.updated) rememberImportedFile(importFingerprint, importFile?.name);
      await fetchProducts();
      if (res.imported || res.updated) {
        showToast(`Import complete: ${res.imported} added, ${res.updated} updated, ${summary.skipped} skipped, ${summary.failed} failed.`, 'success');
        setImportPreview(null); // prevent clicking import twice on the same preview
      } else {
        showToast('No products were imported.', 'warning');
      }
    } catch (err) {
      setImportError(err.message || 'Excel import failed.');
      showToast(err.message || 'Excel import failed.', 'error');
    } finally {
      setImporting(false); // always re-enable the button
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Products Catalog</h1>
          <p className="text-xs text-stone-500 font-medium">Manage cosmetics products, prices, SKUs, barcodes, and stock limits</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <button onClick={downloadExcelTemplate} className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-extrabold text-xs flex items-center gap-2">
          <Download className="w-4 h-4" /> Excel Template
        </button>
        <button onClick={() => { resetImport(); setShowImportModal(true); }} className="px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-2xl font-extrabold text-xs flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Import Excel
        </button>
        <button
          onClick={() => { setEditingProduct(null); setShowModal(true); }}
          className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-rose-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Product</span>
        </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name, brand, SKU or barcode..."
            className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_low">Stock: Low to High</option>
          </select>
        </div>
      </div>

      {/* Products Table / Grid */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-500">Loading Product Catalog...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Brand / Category</th>
                  <th className="p-4">SKU / Barcode</th>
                  <th className="p-4 text-right">Buying Price</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4 text-center">Current Stock</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {products.map(prod => {
                  const isOutOfStock = prod.current_stock <= 0;
                  const isLowStock = prod.current_stock > 0 && prod.current_stock <= prod.minimum_stock;

                  return (
                    <tr key={prod.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80'}
                            alt={prod.name}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                          />
                          <div>
                            <h3 className="font-bold text-stone-900">{prod.name}</h3>
                            <p className="text-[10px] text-stone-400 line-clamp-1">{prod.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-extrabold text-stone-800">{prod.brand}</p>
                        <span className="inline-block px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold mt-0.5">
                          {prod.category_name}
                        </span>
                      </td>

                      <td className="p-4 font-mono">
                        <p className="font-bold text-stone-800">{prod.sku}</p>
                        <p className="text-[10px] text-stone-400">{prod.barcode}</p>
                      </td>

                      <td className="p-4 text-right text-stone-600 font-semibold">
                        {currency} {parseFloat(prod.buying_price || 0).toFixed(2)}
                      </td>

                      <td className="p-4 text-right font-extrabold text-rose-600 text-sm">
                        {currency} {parseFloat(prod.selling_price).toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-extrabold text-stone-900 text-sm">{prod.current_stock}</span>
                        <span className="text-[10px] text-stone-400 block">Min: {prod.minimum_stock}</span>
                      </td>

                      <td className="p-4 text-center">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingProduct(prod); setShowModal(true); }}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-600 transition-all"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {user?.role === 'admin' && (
                            <button
                              onClick={() => setDeleteId(prod.id)}
                              className="p-2 rounded-xl bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-600 transition-all"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-stone-400 font-bold">
            No cosmetics products match your search query.
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      {/* Excel / CSV Import Dialog */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-stone-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Import Products from Excel / CSV</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 text-stone-500 hover:text-stone-900" aria-label="Close import"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-stone-500">Supports .xlsx, .xls and .csv (first sheet). Required columns: <b>Product Name</b>, <b>Selling Price</b> and a <b>Barcode</b> or <b>SKU</b>. Optional: Category, Brand, Cost Price, Stock, Low Stock Level, Discount, Discount Type, Description, Expiry Date, Image URL. <button onClick={downloadExcelTemplate} className="underline font-bold text-emerald-700">Download template</button></p>
            <input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={handleExcelFile} disabled={importing} className="block w-full text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-rose-500 file:px-4 file:py-3 file:font-bold file:text-white border border-stone-200 rounded-2xl p-2" />
            {importFile && <p className="text-xs text-stone-600">Selected: <b>{importFile.name}</b></p>}
            {parsing && <div className="p-3 rounded-2xl bg-stone-50 text-stone-600 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Reading file and checking rows...</div>}
            {importError && <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{importError}</div>}

            {importPreview && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <div className="p-3 rounded-xl bg-stone-50 text-stone-700">Total rows: {importPreview.rows.length}</div>
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">Valid (new): {importPreview.validCount}</div>
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-700">Existing duplicates: {importPreview.duplicateCount}</div>
                  <div className="p-3 rounded-xl bg-red-50 text-red-700">Invalid: {importPreview.invalidCount}</div>
                </div>
                {importPreview.unknownHeaders.length > 0 && <p className="text-xs text-amber-700">Ignored unrecognised columns: {importPreview.unknownHeaders.join(', ')}</p>}
                {alreadyImported && (
                  <label className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                    <input type="checkbox" checked={allowReimport} onChange={e => setAllowReimport(e.target.checked)} className="mt-0.5" />
                    <span>This exact file was already imported on this device. Tick to import it again anyway.</span>
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setImportMode('skip')} className={`p-3 rounded-xl border text-xs text-left ${importMode === 'skip' ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-stone-200 text-stone-500'}`}><b>Skip duplicates</b><p className="mt-1">Keep existing products unchanged.</p></button>
                  <button onClick={() => setImportMode('update')} className={`p-3 rounded-xl border text-xs text-left ${importMode === 'update' ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-stone-200 text-stone-500'}`}><b>Update duplicates</b><p className="mt-1">Overwrite price/stock of matching SKU/barcode.</p></button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <b className="text-stone-700">Preview</b>
                  <label className="flex items-center gap-2 text-stone-600"><input type="checkbox" checked={showInvalidOnly} onChange={e => setShowInvalidOnly(e.target.checked)} /> Show only problem rows</label>
                </div>
                <div className="overflow-auto max-h-72 border border-stone-200 rounded-2xl">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 text-stone-500 sticky top-0"><tr>
                      {['Row', 'Status', 'Name', 'Barcode', 'Category', 'Price', 'Stock'].map(h => <th key={h} className="text-left px-3 py-2 font-bold">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {importPreview.rows.filter(r => !showInvalidOnly || r.status !== 'valid').slice(0, 200).map(r => (
                        <tr key={r.rowNumber} className="border-t border-stone-100 align-top">
                          <td className="px-3 py-2 text-stone-400">{r.rowNumber}</td>
                          <td className="px-3 py-2">
                            {r.status === 'valid' && <span className="text-emerald-700 font-bold">New</span>}
                            {r.status === 'duplicate' && <span className="text-amber-700 font-bold">{importMode === 'update' ? 'Will update' : 'Will skip'}</span>}
                            {r.status === 'invalid' && <span className="text-red-700 font-bold">Error</span>}
                            {r.errors.length > 0 && <div className="text-red-600">{r.errors.join(' ')}</div>}
                          </td>
                          <td className="px-3 py-2 font-semibold text-stone-800">{r.data.name || '-'}</td>
                          <td className="px-3 py-2 font-mono text-stone-600">{r.data.barcode || '-'}</td>
                          <td className="px-3 py-2 text-stone-600">{r.data.category_name}</td>
                          <td className="px-3 py-2 text-stone-800">{currency} {Number(r.data.selling_price).toLocaleString()}</td>
                          <td className="px-3 py-2 text-stone-800">{r.data.current_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importPreview.rows.length > 200 && <p className="text-[11px] text-stone-400">Showing first 200 rows of {importPreview.rows.length}. All valid rows will be imported.</p>}
              </>
            )}

            {importSummary && (
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4 text-xs space-y-2">
                <b>Import result</b>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">Imported: {importSummary.imported}</div>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-700">Updated: {importSummary.updated}</div>
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-700">Skipped: {importSummary.skipped}</div>
                  <div className="p-2 bg-red-50 rounded-lg text-red-700">Failed: {importSummary.failed}</div>
                </div>
                {importSummary.errors.length > 0 && <div className="max-h-28 overflow-y-auto text-red-600">{importSummary.errors.map((err, i) => <p key={i}>Row {err.row}: {err.reason}</p>)}</div>}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs">Close</button>
              <button
                disabled={!importPreview || importing || parsing || (alreadyImported && !allowReimport) || (importPreview && importPreview.validCount === 0 && !(importMode === 'update' && importPreview.duplicateCount > 0))}
                onClick={runExcelImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2">
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Saving products...' : importPreview ? `Confirm & Import ${importPreview.validCount + (importMode === 'update' ? importPreview.duplicateCount : 0)} Product(s)` : 'Import Products'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900">Delete Product?</h3>
              <p className="text-xs text-stone-500 mt-1">This action cannot be undone. Are you sure you want to remove this product?</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
