/**
 * Dedicated Thermal Printer Integration Service for YHD 5808L (58mm Bluetooth)
 * Designed for Android Tablet Chrome connecting to YHD 5808L via Cleanter Thermal Bridge
 * (http://localhost:9100) or direct Web Bluetooth BLE fallback.
 * 
 * Specifications:
 * - Printer: YHD 5808L 58mm Thermal Receipt Printer
 * - Printable width: 48mm (384 dots per line)
 * - Characters per line: 32 columns (Font A)
 * - Cleanter API: GET /health, POST /print
 * - Supports Sinhala and Unicode via Canvas-to-Monochrome raster graphics.
 */

// Default configuration constants
export const PRINTER_DEFAULTS = {
  BRIDGE_URL: 'http://localhost:9100',
  PAPER_WIDTH: 58, // mm
  CHARS_PER_LINE: 32, // Font A standard for 58mm (384 dots / 12 dots)
  PRINTABLE_DOTS: 384,
  MODEL: 'YHD-5808L'
};

// Set to prevent duplicate concurrent print jobs for the same invoice
const inFlightPrints = new Set();

/**
 * Get configured Cleanter bridge URL from settings or localStorage fallback
 */
export function getBridgeUrl(settings) {
  if (settings && settings.printer_bridge_url) {
    return settings.printer_bridge_url.replace(/\/+$/, '');
  }
  try {
    const saved = localStorage.getItem('pos_printer_bridge_url');
    if (saved) return saved.replace(/\/+$/, '');
  } catch (e) {
    // ignore
  }
  return PRINTER_DEFAULTS.BRIDGE_URL;
}

/**
 * Check if auto-print is enabled in settings
 */
export function isAutoPrintEnabled(settings) {
  if (settings && settings.printer_auto_print !== undefined) {
    return settings.printer_auto_print === 1 || settings.printer_auto_print === true || settings.printer_auto_print === '1';
  }
  try {
    const saved = localStorage.getItem('pos_printer_auto_print');
    if (saved !== null) return saved === 'true' || saved === '1';
  } catch (e) {
    // ignore
  }
  return true; // Default auto-print enabled
}

/**
 * Check Cleanter Bridge & YHD 5808L Printer Status
 * GET /health
 * 
 * Returns:
 * {
 *   available: boolean,   // True if Cleanter bridge is running
 *   connected: boolean,   // True if YHD 5808L Bluetooth printer is connected
 *   name: string,        // Printer device name (e.g. "5808L")
 *   address: string,     // Bluetooth MAC address
 *   problem: string|null,// Problem code if disconnected
 *   message: string,     // Human-friendly description
 *   fix: string|null     // Suggested troubleshooting fix
 * }
 */
export async function checkPrinterStatus(bridgeUrl) {
  const url = (bridgeUrl || PRINTER_DEFAULTS.BRIDGE_URL).replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        available: true,
        connected: false,
        name: 'YHD 5808L',
        address: '',
        problem: 'BRIDGE_ERROR',
        message: `Bridge responded with status ${response.status}`,
        fix: 'Restart the Cleanter app on your Android tablet.'
      };
    }

    const data = await response.json();
    const printer = data.printer || {};
    const isConnected = Boolean(printer.connected);

    let message = 'YHD 5808L Connected & Ready';
    let fix = null;

    if (!isConnected) {
      if (printer.problem === 'BLUETOOTH_OFF') {
        message = 'Tablet Bluetooth is Turned Off';
        fix = 'Turn on Bluetooth in your Android tablet settings.';
      } else if (printer.problem === 'PRINTER_UNREACHABLE' || printer.problem === 'DEVICE_NOT_FOUND') {
        message = 'YHD 5808L Printer Not Found';
        fix = 'Turn on the printer, ensure the blue Bluetooth LED is flashing, and keep it near the tablet.';
      } else if (printer.problem === 'PAPER_EMPTY') {
        message = 'Printer Paper Roll is Empty';
        fix = 'Open the 58mm printer cover and insert a new thermal paper roll.';
      } else {
        message = 'YHD 5808L Bluetooth Disconnected';
        fix = 'Ensure YHD 5808L is paired in Android Settings (PIN 1234 or 0000) and selected in Cleanter.';
      }
    }

    return {
      available: true,
      connected: isConnected,
      name: printer.name || 'YHD 5808L',
      address: printer.address || '',
      problem: printer.problem || null,
      message,
      fix
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let message = 'Cleanter Print Bridge Not Reachable';
    let fix = 'Make sure the Cleanter app is installed on your Android tablet, tap "Start Service", and verify it is running on port 9100.';

    if (window.location.protocol === 'https:' && url.startsWith('http://localhost')) {
      fix = 'Since POS is running on HTTPS, Android Chrome may block HTTP loopback. Configure HTTPS proxy or access the POS over HTTP in your local network.';
    }

    return {
      available: false,
      connected: false,
      name: 'YHD 5808L',
      address: '',
      problem: 'BRIDGE_UNREACHABLE',
      message,
      fix
    };
  }
}

/**
 * Detects if string contains Sinhala characters (Unicode block U+0D80 to U+0DFF)
 */
export function containsSinhala(str) {
  if (!str) return false;
  return /[\u0D80-\u0DFF]/.test(str);
}

/**
 * Renders Sinhala or complex Unicode text into a 384px wide monochrome PNG data URL.
 * Used because hardware ESC/POS character sets do not support Sinhala unicode characters natively.
 */
export function renderTextToMonochromeCanvas(text, options = {}) {
  const {
    fontSize = 22,
    fontWeight = 'bold',
    fontFamily = "'Noto Sans Sinhala', 'Iskoola Pota', 'Segoe UI', sans-serif",
    align = 'center',
    width = PRINTER_DEFAULTS.PRINTABLE_DOTS // 384 dots for 58mm
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  
  // Approximate height based on line count
  const lines = text.split('\n');
  const lineHeight = Math.round(fontSize * 1.35);
  canvas.height = lines.length * lineHeight + 8;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid pure white background (thermal paper)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Solid pure black text (thermal burn)
  ctx.fillStyle = '#000000';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';

  lines.forEach((line, idx) => {
    const y = idx * lineHeight + lineHeight / 2 + 4;
    let x = 4;
    if (align === 'center') {
      ctx.textAlign = 'center';
      x = width / 2;
    } else if (align === 'right') {
      ctx.textAlign = 'right';
      x = width - 4;
    } else {
      ctx.textAlign = 'left';
    }
    ctx.fillText(line, x, y);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Pads left and right text strings to strictly fit 32 character columns.
 * Guaranteed never to overflow 32 columns.
 */
export function padRow32(leftStr, rightStr, totalWidth = 32) {
  const left = String(leftStr || '');
  const right = String(rightStr || '');
  
  if (left.length + right.length + 1 > totalWidth) {
    const maxLeftLen = totalWidth - right.length - 1;
    if (maxLeftLen > 3) {
      const truncatedLeft = left.slice(0, maxLeftLen);
      const spaces = ' '.repeat(Math.max(1, totalWidth - truncatedLeft.length - right.length));
      return truncatedLeft + spaces + right;
    } else {
      return (left + ' ' + right).slice(0, totalWidth);
    }
  }

  const spacesCount = totalWidth - left.length - right.length;
  return left + ' '.repeat(spacesCount) + right;
}

/**
 * Formats a clean date/time string for thermal receipt
 */
function formatReceiptDate(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleString();
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Formats currency amount
 */
function formatCurrency(amount, currency = 'Rs.') {
  const num = parseFloat(amount || 0);
  return `${currency} ${num.toFixed(2)}`;
}

/**
 * Builds standard Cleanter content blocks for 58mm thermal paper (32 columns)
 * Compliant with verified Cleanter API block types:
 * - text: { type: "text", text: string, align?: "left"|"center"|"right", bold?: boolean, size?: "normal"|"double-width"|"double-height"|"large" }
 * - row: { type: "row", left: string, right: string, bold?: boolean }
 * - divider: { type: "divider", char?: string }
 * - image: { type: "image", base64: string, align?: "center", dither?: boolean }
 * - qr: { type: "qr", data: string, size?: number, align?: "center" }
 * - feed: { type: "feed", lines?: number }
 */
export function buildCleanterPayload(sale, settings = {}) {
  const currency = settings.currency || 'Rs.';
  const shopName = settings.shop_name || 'VELVET TOUCH COSMETICS';
  const shopAddress = settings.shop_address || '';
  const shopPhone = settings.shop_phone || '';
  const cashierName = sale.cashier_name || settings.cashier_name || 'Cashier';
  const customerName = sale.customer_name || 'Walk-in Customer';
  const invoiceNo = sale.invoice_no || `INV-${Date.now()}`;
  const dateStr = formatReceiptDate(sale.created_at);
  const items = sale.items || [];

  const content = [];

  // 1. SHOP HEADER
  // If shop name contains Sinhala characters, render as high-res raster graphic
  if (containsSinhala(shopName)) {
    const sinhalaHeaderPng = renderTextToMonochromeCanvas(shopName, { fontSize: 24, bold: 'bold', align: 'center' });
    if (sinhalaHeaderPng) {
      content.push({
        type: 'image',
        base64: sinhalaHeaderPng,
        align: 'center',
        dither: true
      });
    }
  } else {
    content.push({
      type: 'text',
      text: shopName.toUpperCase(),
      align: 'center',
      bold: true,
      size: 'normal'
    });
  }

  // Address and Phone
  if (shopAddress) {
    if (containsSinhala(shopAddress)) {
      const addrPng = renderTextToMonochromeCanvas(shopAddress, { fontSize: 18, bold: 'normal', align: 'center' });
      if (addrPng) {
        content.push({ type: 'image', base64: addrPng, align: 'center' });
      }
    } else {
      content.push({
        type: 'text',
        text: shopAddress,
        align: 'center',
        size: 'normal'
      });
    }
  }

  if (shopPhone) {
    content.push({
      type: 'text',
      text: `Tel: ${shopPhone}`,
      align: 'center',
      size: 'normal'
    });
  }

  // Offline Sale Notice
  if (sale.is_offline) {
    content.push({
      type: 'text',
      text: '* OFFLINE TRANSACTION RECORD *',
      align: 'center',
      bold: true
    });
  }

  // 2. INVOICE METADATA
  content.push({ type: 'divider', char: '-' });
  content.push({ type: 'row', left: 'Invoice:', right: invoiceNo });
  content.push({ type: 'row', left: 'Date:', right: dateStr });
  content.push({ type: 'row', left: 'Cashier:', right: cashierName });
  content.push({ type: 'row', left: 'Customer:', right: customerName });

  // 3. PURCHASED ITEMS TABLE
  content.push({ type: 'divider', char: '-' });
  content.push({ type: 'row', left: 'ITEM', right: 'QTY   TOTAL', bold: true });
  content.push({ type: 'divider', char: '-' });

  items.forEach((item) => {
    const rawName = item.product_name || item.name || 'Cosmetic Item';
    const qty = item.quantity || 1;
    const unitPrice = parseFloat(item.unit_price || 0);
    const totalPrice = parseFloat(item.total_price || (unitPrice * qty));

    // Handle Sinhala in item name
    if (containsSinhala(rawName)) {
      const itemPng = renderTextToMonochromeCanvas(rawName, { fontSize: 18, align: 'left' });
      if (itemPng) {
        content.push({ type: 'image', base64: itemPng, align: 'left' });
      }
    } else {
      // 58mm Font A: 32 chars. Truncate if exceptionally long
      const displayName = rawName.length > 32 ? rawName.slice(0, 31) + '…' : rawName;
      content.push({
        type: 'text',
        text: displayName,
        bold: false
      });
    }

    // Line 2: "  2 x Rs. 1,500.00"   "Rs. 3,000.00"
    const leftText = `  ${qty} x ${unitPrice.toFixed(2)}`;
    const rightText = formatCurrency(totalPrice, currency);
    content.push({
      type: 'row',
      left: leftText,
      right: rightText
    });
  });

  // 4. FINANCIAL SUMMARY
  content.push({ type: 'divider', char: '-' });
  
  // Subtotal
  content.push({
    type: 'row',
    left: 'Subtotal:',
    right: formatCurrency(sale.subtotal, currency)
  });

  // Discount / Coupon
  const discountVal = parseFloat(sale.discount || 0);
  if (discountVal > 0) {
    const discountLabel = sale.coupon_code ? `Discount (${sale.coupon_code}):` : 'Discount:';
    content.push({
      type: 'row',
      left: discountLabel,
      right: `- ${formatCurrency(discountVal, currency)}`
    });
  }

  // VAT Tax
  const taxVal = parseFloat(sale.tax || 0);
  if (taxVal > 0) {
    content.push({
      type: 'row',
      left: 'VAT Amount:',
      right: `+ ${formatCurrency(taxVal, currency)}`
    });
  }

  // Grand Total
  content.push({ type: 'divider', char: '=' });
  content.push({
    type: 'row',
    left: 'TOTAL DUE:',
    right: formatCurrency(sale.grand_total, currency),
    bold: true
  });
  content.push({ type: 'divider', char: '=' });

  // Payment Breakdown
  const method = sale.payment_method || 'Cash';
  const cashPaid = parseFloat(sale.cash_received || sale.grand_total);
  content.push({
    type: 'row',
    left: `Payment (${method}):`,
    right: formatCurrency(cashPaid, currency)
  });

  if (method === 'Cash') {
    const changeVal = parseFloat(sale.change_amount || 0);
    content.push({
      type: 'row',
      left: 'Change Due:',
      right: formatCurrency(changeVal, currency),
      bold: true
    });
  }

  // 5. QR CODE & VERIFICATION
  content.push({ type: 'divider', char: '-' });
  content.push({
    type: 'qr',
    data: invoiceNo,
    size: 4,
    align: 'center'
  });
  content.push({
    type: 'text',
    text: invoiceNo,
    align: 'center',
    bold: true
  });

  // 6. THANK YOU FOOTER
  content.push({
    type: 'text',
    text: 'Thank you for shopping with us! ✨',
    align: 'center',
    bold: true
  });
  content.push({
    type: 'text',
    text: 'Please retain receipt for exchange within 7 days.',
    align: 'center'
  });

  // 7. FEED LINES (Crucial on 5808L so the tear edge doesn't cut through the text)
  content.push({
    type: 'feed',
    lines: 3
  });

  return {
    paperWidth: 58,
    cut: true,
    reference: String(invoiceNo),
    content
  };
}

/**
 * Print Thermal Receipt via Cleanter Bridge
 * Automatic checkout printing or manual reprint.
 * 
 * Guarantees:
 * 1. Never creates duplicate sales.
 * 2. Idempotency lock prevents double printing on rapid taps.
 * 3. Never claims printing succeeded unless bridge confirms status 'printed'.
 * 
 * Returns:
 * {
 *   success: boolean,
 *   jobId?: string,
 *   message: string,
 *   error?: string,
 *   detail?: string,
 *   fix?: string
 * }
 */
export async function printThermalReceipt(sale, settings = {}) {
  if (!sale) {
    return {
      success: false,
      error: 'NO_SALE_DATA',
      message: 'No sale data provided for printing.'
    };
  }

  const invoiceNo = sale.invoice_no || `INV-${Date.now()}`;

  // Prevent duplicate concurrent print requests for the same invoice
  if (inFlightPrints.has(invoiceNo)) {
    return {
      success: false,
      error: 'PRINT_IN_PROGRESS',
      message: `Print job for invoice "${invoiceNo}" is already in progress.`
    };
  }

  inFlightPrints.add(invoiceNo);

  const bridgeUrl = getBridgeUrl(settings);
  const payload = buildCleanterPayload(sale, settings);

  const controller = new AbortController();
  // 5 second timeout for thermal print request
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${bridgeUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (response.ok && (data.status === 'printed' || data.success === true)) {
      return {
        success: true,
        jobId: data.jobId || `job_${Date.now()}`,
        message: `Receipt printed on YHD 5808L (Invoice #${invoiceNo})`
      };
    }

    // Bridge reported a printing error (e.g. 503 printer offline or 400 bad request)
    const errCode = data.error || 'PRINT_FAILED';
    const detail = data.detail || `Bridge returned status ${response.status}`;
    const fix = data.fix || 'Check that the YHD 5808L is powered ON, Bluetooth is paired, and paper is loaded.';

    return {
      success: false,
      error: errCode,
      detail,
      fix,
      message: `Receipt printing failed: ${detail}`
    };
  } catch (err) {
    clearTimeout(timeoutId);

    let fixMsg = 'Launch the Cleanter app on your Android tablet and tap "Start Service". Ensure YHD 5808L is connected.';
    if (err.name === 'AbortError') {
      fixMsg = 'Print request timed out. The Bluetooth printer may be off or out of range.';
    }

    return {
      success: false,
      error: 'BRIDGE_UNREACHABLE',
      detail: err.message,
      fix: fixMsg,
      message: 'Cleanter print bridge is not running on Android tablet (http://localhost:9100).'
    };
  } finally {
    // Release idempotency lock after 1.5 seconds delay
    setTimeout(() => {
      inFlightPrints.delete(invoiceNo);
    }, 1500);
  }
}

/**
 * Send a Diagnostic Test Print Ticket to YHD 5808L
 * Tests paper margins, 32-column text alignment, font sizes, QR code, and tear feed.
 */
export async function sendTestPrint(settings = {}) {
  const bridgeUrl = getBridgeUrl(settings);
  const now = new Date();
  const testRef = `TEST-${Date.now()}`;

  const testPayload = {
    paperWidth: 58,
    cut: true,
    reference: testRef,
    content: [
      {
        type: 'text',
        text: '*** YHD 5808L TEST PRINT ***',
        align: 'center',
        bold: true
      },
      {
        type: 'text',
        text: '58mm Bluetooth Thermal Printer',
        align: 'center',
        size: 'normal'
      },
      { type: 'divider', char: '=' },
      { type: 'row', left: 'Model:', right: 'YHD 5808L' },
      { type: 'row', left: 'Paper Width:', right: '58mm (48mm Print)' },
      { type: 'row', left: 'Resolution:', right: '203 DPI (384 Dots)' },
      { type: 'row', left: 'Columns:', right: '32 Chars (Font A)' },
      { type: 'row', left: 'Date/Time:', right: now.toLocaleTimeString() },
      { type: 'divider', char: '-' },
      {
        type: 'text',
        text: 'Alignment Verification:',
        bold: true
      },
      { type: 'text', text: '<-- Left Aligned', align: 'left' },
      { type: 'text', text: '-- Center Aligned --', align: 'center' },
      { type: 'text', text: 'Right Aligned -->', align: 'right' },
      { type: 'divider', char: '-' },
      {
        type: 'text',
        text: '32-Column Boundary Ruler:',
        bold: true
      },
      {
        type: 'text',
        text: '12345678901234567890123456789012'
      },
      { type: 'divider', char: '-' },
      {
        type: 'text',
        text: 'Unicode / Sinhala Graphic Test:',
        bold: true
      }
    ]
  };

  // Add Sinhala raster graphic test
  const sinhalaTestPng = renderTextToMonochromeCanvas('ස්තූතියි! (Sinhala OK)', { fontSize: 20, align: 'center' });
  if (sinhalaTestPng) {
    testPayload.content.push({
      type: 'image',
      base64: sinhalaTestPng,
      align: 'center'
    });
  }

  // QR Code test
  testPayload.content.push({
    type: 'qr',
    data: 'YHD-5808L-READY',
    size: 4,
    align: 'center'
  });
  testPayload.content.push({
    type: 'text',
    text: 'STATUS: OK - READY TO PRINT',
    align: 'center',
    bold: true
  });
  testPayload.content.push({
    type: 'feed',
    lines: 3
  });

  try {
    const response = await fetch(`${bridgeUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && (data.status === 'printed' || data.success === true)) {
      return {
        success: true,
        message: 'Test ticket printed successfully on YHD 5808L!'
      };
    }

    return {
      success: false,
      error: data.error || 'TEST_PRINT_FAILED',
      detail: data.detail || `Bridge returned status ${response.status}`,
      fix: data.fix || 'Ensure YHD 5808L is connected and paper is loaded.'
    };
  } catch (err) {
    return {
      success: false,
      error: 'BRIDGE_UNREACHABLE',
      detail: err.message,
      fix: 'Make sure Cleanter Android app is running on http://localhost:9100.'
    };
  }
}

/**
 * Optional Web Bluetooth direct fallback (if browser supports Web Bluetooth and printer is BLE)
 */
export async function printDirectWebBluetooth(sale, settings = {}) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Cleanter Android bridge.');
  }

  // Standard Serial Port / Printer Service UUIDs
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { namePrefix: '58' },
      { namePrefix: 'POS' },
      { namePrefix: 'MPT' },
      { namePrefix: 'YHD' }
    ],
    optionalServices: [
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
    ]
  });

  const server = await device.gatt.connect();
  let characteristic = null;

  for (const serviceUuid of ['0000ffe0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      if (chars.length > 0) {
        characteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse) || chars[0];
        if (characteristic) break;
      }
    } catch (e) {
      // try next
    }
  }

  if (!characteristic) {
    throw new Error('Could not find writeable Bluetooth characteristic on printer.');
  }

  // Build basic ESC/POS bytes
  const encoder = new TextEncoder();
  const init = new Uint8Array([0x1B, 0x40]); // ESC @
  const feed = new Uint8Array([0x1B, 0x64, 0x03]); // ESC d 3
  
  await characteristic.writeValue(init);
  const textBytes = encoder.encode(
    `\n${settings.shop_name || 'COSMETICS STORE'}\n` +
    `INV: ${sale.invoice_no}\n` +
    `TOTAL: ${sale.grand_total}\n` +
    `THANK YOU!\n\n\n`
  );
  await characteristic.writeValue(textBytes);
  await characteristic.writeValue(feed);

  return { success: true, message: 'Printed via Web Bluetooth BLE' };
}
