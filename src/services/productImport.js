import * as XLSX from 'xlsx';

/**
 * Excel / CSV product import helpers (pure functions, no UI, no storage).
 * Field names match the app's product model in localDatabase.js:
 * name, brand, category_name, description, sku, barcode, buying_price,
 * selling_price, current_stock, minimum_stock, expiry_date, image_url,
 * plus optional discount / discount_type.
 */

export const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv'];
export const MAX_IMPORT_ROWS = 5000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// canonical field -> accepted header names (already normalised: lowercase, a-z0-9 only)
const HEADER_ALIASES = {
  name: ['name', 'productname', 'product', 'itemname', 'item', 'title'],
  barcode: ['barcode', 'barcodenumber', 'bar_code', 'ean', 'upc'],
  sku: ['sku', 'productcode', 'itemcode', 'code'],
  category_name: ['categoryname', 'category', 'productcategory', 'categoryname'],
  brand: ['brand', 'manufacturer'],
  selling_price: ['sellingprice', 'saleprice', 'price', 'retailprice', 'unitprice', 'sellprice'],
  buying_price: ['costprice', 'buyingprice', 'purchaseprice', 'cost', 'buyprice'],
  current_stock: ['currentstock', 'stock', 'quantity', 'qty', 'stockquantity', 'onhand'],
  minimum_stock: ['minimumstock', 'minstock', 'lowstocklevel', 'lowstock', 'reorderlevel', 'lowstockthreshold'],
  discount: ['discount', 'discountvalue', 'discountamount'],
  discount_type: ['discounttype'],
  description: ['description', 'details', 'desc'],
  expiry_date: ['expirydate', 'expiry', 'expirationdate', 'expdate'],
  image_url: ['imageurl', 'image', 'productimage', 'imagelink', 'photo']
};

export const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ALIAS_LOOKUP = (() => {
  const map = {};
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach(a => { const n = normalizeHeader(a); if (!(n in map)) map[n] = field; });
  });
  return map;
})();

export const TEMPLATE_HEADERS = [
  'Product Name', 'Barcode', 'SKU', 'Category', 'Brand', 'Selling Price', 'Cost Price',
  'Stock', 'Low Stock Level', 'Discount', 'Discount Type', 'Description', 'Expiry Date', 'Image URL'
];

export function getFileExtension(name = '') {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : '';
}

/** Parse "2,450", "Rs. 2450.50", " 12 " -> number. Returns null for blank, NaN for garbage. */
export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let s = String(value).trim();
  if (s === '') return null;
  s = s.replace(/^(rs\.?|lkr|usd|\$|€|£)\s*/i, '').replace(/,/g, '').replace(/\s+/g, '');
  if (s === '' || !/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

const cleanText = (v) => (v === null || v === undefined ? '' : String(v).trim().replace(/\s+/g, ' '));
// barcodes: keep exact digits, strip whitespace; avoid "8.90123E+12" style when stored as number
const cleanCode = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.trunc(v) === v ? v.toFixed(0) : v) : '';
  return String(v).trim().replace(/\s+/g, '');
};

function formatDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? s : d.toISOString().slice(0, 10);
}

/**
 * Read an ArrayBuffer containing xlsx/xls/csv and return raw rows from the first worksheet.
 * Throws Error with a user-friendly message on failure.
 */
export function readSpreadsheet(arrayBuffer, fileName = '') {
  let workbook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  } catch (err) {
    throw new Error('This file could not be read. Please save it as .xlsx or .csv and try again.');
  }
  const sheetName = workbook.SheetNames && workbook.SheetNames[0];
  if (!sheetName) throw new Error('The file has no worksheet.');
  const sheet = workbook.Sheets[sheetName];
  // raw:true keeps numbers as numbers and dates as Date objects; blank cells => ''
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: false });
  const nonEmpty = matrix.filter(r => r.some(c => cleanText(c) !== ''));
  if (nonEmpty.length === 0) throw new Error('The file is empty. Add a header row and at least one product row.');
  return { sheetName, matrix: nonEmpty };
}

/**
 * Map the header row to canonical fields.
 * Returns { fieldIndex: {field: columnIndex}, unknownHeaders: [], missingRequired: [] }
 */
export function mapHeaders(headerRow) {
  const fieldIndex = {};
  const unknownHeaders = [];
  headerRow.forEach((h, i) => {
    const raw = cleanText(h);
    if (!raw) return;
    const field = ALIAS_LOOKUP[normalizeHeader(raw)];
    if (field && !(field in fieldIndex)) fieldIndex[field] = i;
    else if (!field) unknownHeaders.push(raw);
  });
  const missingRequired = [];
  if (!('name' in fieldIndex)) missingRequired.push('Product Name');
  if (!('selling_price' in fieldIndex)) missingRequired.push('Selling Price');
  return { fieldIndex, unknownHeaders, missingRequired };
}

/**
 * Turn the matrix into validated product rows.
 * existingProducts: current catalog (for duplicate detection).
 * Returns { rows, validCount, invalidCount, duplicateCount, unknownHeaders }
 * Each row: { rowNumber, data, errors[], warnings[], status: 'valid'|'invalid'|'duplicate', duplicateOf }
 */
export function buildPreview(matrix, existingProducts = []) {
  const [headerRow, ...body] = matrix;
  const { fieldIndex, unknownHeaders, missingRequired } = mapHeaders(headerRow);
  if (missingRequired.length) {
    const found = headerRow.map(cleanText).filter(Boolean).join(', ');
    const err = new Error(
      `Missing required column(s): ${missingRequired.join(', ')}. Columns found in your file: ${found || 'none'}. ` +
      `Accepted names include "Product Name" / "Name" and "Selling Price" / "Price". Download the template to see the correct headers.`
    );
    err.code = 'MISSING_COLUMNS';
    throw err;
  }
  if (body.length === 0) throw new Error('The file has headers but no product rows.');
  if (body.length > MAX_IMPORT_ROWS) throw new Error(`The file has ${body.length} rows. The maximum per import is ${MAX_IMPORT_ROWS}.`);

  const get = (r, f) => (f in fieldIndex ? r[fieldIndex[f]] : '');
  const bySku = new Map();
  const byBarcode = new Map();
  existingProducts.forEach(p => {
    if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p);
    if (p.barcode) byBarcode.set(String(p.barcode).trim().toLowerCase(), p);
  });
  const seenInFile = new Map(); // key -> first row number
  const usedKeys = new Set([...bySku.keys(), ...byBarcode.keys()]);

  const rows = body.map((r, i) => {
    const rowNumber = i + 2; // header is row 1 (blank rows are removed, so this is approximate for sheets with gaps)
    const errors = [];
    const warnings = [];

    const name = cleanText(get(r, 'name'));
    let barcode = cleanCode(get(r, 'barcode'));
    let sku = cleanCode(get(r, 'sku'));
    const category_name = cleanText(get(r, 'category_name')) || 'Uncategorized';
    const brand = cleanText(get(r, 'brand')) || 'Generic';
    const description = cleanText(get(r, 'description'));
    const image_url = cleanText(get(r, 'image_url'));

    if (!name) errors.push('Product name is required.');

    const sellRaw = parseNumber(get(r, 'selling_price'));
    if (sellRaw === null) errors.push('Selling price is required.');
    else if (Number.isNaN(sellRaw)) errors.push(`Selling price "${cleanText(get(r, 'selling_price'))}" is not a number.`);
    else if (sellRaw < 0) errors.push('Selling price cannot be negative.');

    const costRaw = parseNumber(get(r, 'buying_price'));
    if (Number.isNaN(costRaw)) errors.push(`Cost price "${cleanText(get(r, 'buying_price'))}" is not a number.`);
    else if (costRaw !== null && costRaw < 0) errors.push('Cost price cannot be negative.');

    const stockRaw = parseNumber(get(r, 'current_stock'));
    if (Number.isNaN(stockRaw)) errors.push(`Stock "${cleanText(get(r, 'current_stock'))}" is not a number.`);
    else if (stockRaw !== null && (stockRaw < 0 || !Number.isInteger(stockRaw))) errors.push('Stock must be a whole number of 0 or more.');

    const minRaw = parseNumber(get(r, 'minimum_stock'));
    if (Number.isNaN(minRaw)) errors.push(`Low stock level "${cleanText(get(r, 'minimum_stock'))}" is not a number.`);
    else if (minRaw !== null && (minRaw < 0 || !Number.isInteger(minRaw))) errors.push('Low stock level must be a whole number of 0 or more.');

    const discRaw = parseNumber(get(r, 'discount'));
    if (Number.isNaN(discRaw)) errors.push(`Discount "${cleanText(get(r, 'discount'))}" is not a number.`);
    else if (discRaw !== null && discRaw < 0) errors.push('Discount cannot be negative.');
    let discount_type = cleanText(get(r, 'discount_type')).toLowerCase();
    if (discount_type && !['percent', 'percentage', '%', 'fixed', 'amount', 'flat'].includes(discount_type)) {
      warnings.push(`Unknown discount type "${discount_type}" ignored.`);
      discount_type = '';
    }
    if (discount_type === 'percentage' || discount_type === '%') discount_type = 'percent';
    if (['amount', 'flat'].includes(discount_type)) discount_type = 'fixed';
    if (discRaw !== null && !Number.isNaN(discRaw) && discount_type === 'percent' && discRaw > 100) errors.push('Percent discount cannot exceed 100.');

    // Identifier rules: the app requires BOTH sku and barcode. If only one is given, reuse it for the other.
    if (!barcode && !sku && name) {
      errors.push('Barcode or SKU is required to identify the product.');
    } else {
      if (!sku) { sku = barcode; warnings.push('SKU missing - barcode used as SKU.'); }
      if (!barcode) { barcode = sku; warnings.push('Barcode missing - SKU used as barcode.'); }
    }

    const data = {
      name, brand, category_name, description, sku, barcode,
      buying_price: costRaw !== null && !Number.isNaN(costRaw) ? costRaw : 0,
      selling_price: sellRaw !== null && !Number.isNaN(sellRaw) ? sellRaw : 0,
      current_stock: stockRaw !== null && !Number.isNaN(stockRaw) ? stockRaw : 0,
      minimum_stock: minRaw !== null && !Number.isNaN(minRaw) ? minRaw : 5,
      discount: discRaw !== null && !Number.isNaN(discRaw) ? discRaw : 0,
      discount_type: discount_type || (discRaw ? 'percent' : ''),
      expiry_date: formatDate(get(r, 'expiry_date')),
      image_url
    };

    let status = errors.length ? 'invalid' : 'valid';
    let duplicateOf = null;

    if (!errors.length) {
      const keys = [...new Set([sku.toLowerCase(), barcode.toLowerCase()])];
      // duplicate inside the same file
      const firstRow = keys.map(k => seenInFile.get(k)).find(Boolean);
      if (firstRow) {
        status = 'invalid';
        errors.push(`Duplicate of row ${firstRow} in this file (same barcode/SKU).`);
      } else {
        keys.forEach(k => seenInFile.set(k, rowNumber));
        const existing = bySku.get(sku.toLowerCase()) || byBarcode.get(barcode.toLowerCase());
        if (existing) {
          status = 'duplicate';
          duplicateOf = existing;
        }
      }
    }
    return { rowNumber, data, errors, warnings, status, duplicateOf };
  });

  return {
    rows,
    validCount: rows.filter(r => r.status === 'valid').length,
    duplicateCount: rows.filter(r => r.status === 'duplicate').length,
    invalidCount: rows.filter(r => r.status === 'invalid').length,
    unknownHeaders
  };
}

/** Full pipeline from a File object. */
export async function parseProductFile(file, existingProducts = []) {
  if (!file) throw new Error('No file selected.');
  const ext = getFileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type ".${ext || 'unknown'}". Please choose an .xlsx, .xls or .csv file.`);
  }
  if (file.size === 0) throw new Error('The selected file is empty (0 bytes).');
  if (file.size > MAX_FILE_BYTES) throw new Error('The file is larger than 10 MB. Please split it into smaller files.');
  const buffer = await file.arrayBuffer();
  const { matrix } = readSpreadsheet(buffer, file.name);
  const preview = buildPreview(matrix, existingProducts);
  return { ...preview, fingerprint: await fingerprintBuffer(buffer, file) };
}

async function fingerprintBuffer(buffer, file) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${file.name}:${file.size}:${file.lastModified}`; // insecure context fallback
  }
}

export function buildTemplateWorkbook() {
  const examples = [
    ['Velvet Matte Lipstick - Ruby Red', '8901234567891', 'LIP-RUBY-01', 'Lip Products', "L'Oreal", 2450, 1200, 25, 5, 10, 'percent', 'Long-lasting matte lipstick', '2027-12-31', ''],
    ['Hydrating Face Serum 30ml', '8901234567892', 'SKN-SERUM-30', 'Skincare', 'Cetaphil', 3900, 2100, 40, 8, 0, '', 'Vitamin C hydrating serum', '', '']
  ];
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...examples]);
  ws['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(14, h.length + 2) }));
  // Force barcode/SKU columns to text so Excel does not convert to scientific notation
  for (let r = 1; r <= examples.length; r++) {
    [1, 2].forEach(c => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].t = 's';
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return wb;
}

// ---- Same-file double-import guard (persisted in localStorage) ----
const IMPORTED_FILES_KEY = 'pos_imported_file_fingerprints';
export function wasFileImported(fingerprint) {
  try { return (JSON.parse(localStorage.getItem(IMPORTED_FILES_KEY) || '[]')).some(f => f.fp === fingerprint); } catch { return false; }
}
export function rememberImportedFile(fingerprint, fileName) {
  try {
    const list = JSON.parse(localStorage.getItem(IMPORTED_FILES_KEY) || '[]');
    list.unshift({ fp: fingerprint, name: fileName, at: new Date().toISOString() });
    localStorage.setItem(IMPORTED_FILES_KEY, JSON.stringify(list.slice(0, 50)));
  } catch { /* non-critical */ }
}
