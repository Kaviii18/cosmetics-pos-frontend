import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import {
  BarChart3, Calendar, Download, Printer, FileSpreadsheet, FileText,
  TrendingUp, ShoppingBag, DollarSign, Award, RefreshCw, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { settings, showToast } = usePOS();
  const [range, setRange] = useState('month'); // 'today', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics({ range, startDate, endDate });
      setData(res);
    } catch (err) {
      console.error('Analytics Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const handleCustomGenerate = (e) => {
    e.preventDefault();
    setRange('custom');
    fetchAnalytics();
  };

  const currency = settings.currency || 'Rs.';

  // Export PDF
  const handleExportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(settings.shop_name, 14, 20);
    doc.setFontSize(12);
    doc.text(`Monthly Business Report (${range.toUpperCase()})`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    // Summary Table
    const summaryData = [
      ['Total Sales Revenue', `${currency} ${data.summary.total_revenue.toFixed(2)}`],
      ['Total Completed Orders', data.summary.total_orders.toString()],
      ['Average Order Value (AOV)', `${currency} ${data.summary.avg_order_value.toFixed(2)}`],
      ['Total Discounts Given', `${currency} ${data.summary.total_discounts.toFixed(2)}`]
    ];

    doc.autoTable({
      startY: 40,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94] }
    });

    // Top Products Table
    if (data.top_products && data.top_products.length > 0) {
      const prodRows = data.top_products.map(p => [
        p.product_name,
        p.total_qty.toString(),
        `${currency} ${parseFloat(p.total_sales).toFixed(2)}`
      ]);

      doc.text('Best Selling Cosmetics Products', 14, doc.lastAutoTable.finalY + 12);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 16,
        head: [['Product Name', 'Qty Sold', 'Total Revenue']],
        body: prodRows,
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] }
      });
    }

    doc.save(`Cosmetics_Store_Report_${range}_${Date.now()}.pdf`);
    showToast('Report PDF downloaded successfully!');
  };

  // Export Excel/CSV
  const handleExportExcel = () => {
    if (!data) return;
    const summarySheetData = [
      { Metric: 'Total Revenue', Value: `${currency} ${data.summary.total_revenue.toFixed(2)}` },
      { Metric: 'Total Orders', Value: data.summary.total_orders },
      { Metric: 'Average Order Value', Value: `${currency} ${data.summary.avg_order_value.toFixed(2)}` },
      { Metric: 'Total Discounts', Value: `${currency} ${data.summary.total_discounts.toFixed(2)}` }
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    if (data.top_products && data.top_products.length > 0) {
      const wsProducts = XLSX.utils.json_to_sheet(data.top_products);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Products');
    }

    XLSX.writeFile(wb, `Cosmetics_Store_Report_${range}_${Date.now()}.xlsx`);
    showToast('Report Excel file downloaded successfully!');
  };

  const COLORS = ['#f43f5e', '#fb7185', '#fbcfe8', '#e7e5e4'];

  const pieData = data ? [
    { name: 'In Stock', value: data.inventory_summary.in_stock },
    { name: 'Low Stock', value: data.inventory_summary.low_stock },
    { name: 'Out of Stock', value: data.inventory_summary.out_of_stock }
  ] : [];

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Store Reports & Business Intelligence</h1>
          <p className="text-xs text-stone-500 font-medium">Monthly revenue, top product sellers, and exportable financial reports</p>
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border border-rose-200 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-2xl border border-stone-200 text-xs font-bold">
          {['today', 'week', 'month'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl capitalize transition-all ${
                range === r
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month (October 2026)'}
            </button>
          ))}
        </div>

        {/* Custom Range Form */}
        <form onSubmit={handleCustomGenerate} className="flex items-center gap-2 text-xs w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400"
          />
          <span className="text-stone-400 font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl"
          >
            Generate
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-500">Generating Store Report...</p>
        </div>
      ) : data ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft">
              <p className="text-xs font-bold text-stone-400">Total Sales Revenue</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-2">
                {currency} {data.summary.total_revenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-stone-400 font-semibold mt-1">Period gross revenue</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft">
              <p className="text-xs font-bold text-stone-400">Total Orders</p>
              <p className="text-2xl font-extrabold text-stone-900 mt-2">{data.summary.total_orders}</p>
              <p className="text-[11px] text-stone-400 font-semibold mt-1">Total completed receipts</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft">
              <p className="text-xs font-bold text-stone-400">Average Order Value (AOV)</p>
              <p className="text-2xl font-extrabold text-stone-900 mt-2">
                {currency} {data.summary.avg_order_value.toFixed(2)}
              </p>
              <p className="text-[11px] text-stone-400 font-semibold mt-1">Average spent per basket</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft">
              <p className="text-xs font-bold text-stone-400">Total Discounts Granted</p>
              <p className="text-2xl font-extrabold text-stone-800 mt-2">
                {currency} {data.summary.total_discounts.toFixed(2)}
              </p>
              <p className="text-[11px] text-stone-400 font-semibold mt-1">Promotional savings</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Best-Selling Products Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-4">
              <h2 className="text-base font-extrabold text-stone-900">Best-Selling Products (by Units Sold)</h2>
              <div className="h-[320px]">
                {data.top_products && data.top_products.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_products} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} />
                      <YAxis dataKey="product_name" type="category" width={140} tick={{ fontSize: 11, fill: '#1c1917' }} />
                      <Tooltip formatter={(val) => [val, 'Units Sold']} />
                      <Bar dataKey="total_qty" fill="#f43f5e" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-stone-400">
                    No sales recorded for this timeframe.
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Status Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-4">
              <h2 className="text-base font-extrabold text-stone-900">Inventory Health Breakdown</h2>
              <div className="h-[220px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 text-emerald-800">
                  <span>In Stock Products:</span>
                  <span className="font-extrabold">{data.inventory_summary.in_stock}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-amber-50 text-amber-800">
                  <span>Low Stock Items:</span>
                  <span className="font-extrabold">{data.inventory_summary.low_stock}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-rose-50 text-rose-800">
                  <span>Out of Stock Items:</span>
                  <span className="font-extrabold">{data.inventory_summary.out_of_stock}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
