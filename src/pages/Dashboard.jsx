import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, Users,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Sparkles, ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { settings } = usePOS();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('revenue'); // 'revenue' or 'orders'

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-xs font-bold text-stone-500">Loading Cosmetics Dashboard...</p>
        </div>
      </div>
    );
  }

  const currency = settings.currency || 'Rs.';

  const cards = [
    {
      title: "Today's Sales",
      value: `${currency} ${(data?.today_sales || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
      subtitle: "Gross daily revenue",
      icon: TrendingUp,
      color: "from-rose-500 to-pink-500",
      textColor: "text-rose-600",
      bgColor: "bg-rose-50"
    },
    {
      title: "Today's Orders",
      value: data?.today_orders || 0,
      subtitle: "Completed POS transactions",
      icon: ShoppingBag,
      color: "from-pink-500 to-rose-400",
      textColor: "text-pink-600",
      bgColor: "bg-pink-50"
    },
    {
      title: "Total Products",
      value: data?.total_products || 0,
      subtitle: "Active store catalog items",
      icon: Package,
      color: "from-stone-700 to-stone-900",
      textColor: "text-stone-800",
      bgColor: "bg-stone-100"
    },
    {
      title: "Low Stock Alert",
      value: data?.low_stock_count || 0,
      subtitle: "Items below minimum stock",
      icon: AlertTriangle,
      color: "from-amber-500 to-orange-500",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
      alert: (data?.low_stock_count || 0) > 0
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1800px] mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 rounded-3xl p-8 text-white shadow-xl shadow-rose-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Premium Store Dashboard</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Welcome to {settings.shop_name}
          </h1>
          <p className="text-xs lg:text-sm text-rose-100 font-medium max-w-xl">
            Real-time sales performance, active inventory alerts, and quick POS transaction overview.
          </p>
        </div>

        <button
          onClick={() => navigate('/pos')}
          className="z-10 px-6 py-3.5 bg-white text-rose-600 hover:bg-rose-50 rounded-2xl font-extrabold text-sm shadow-lg shadow-black/10 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Launch POS / New Sale</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-white rounded-3xl p-6 border border-stone-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between ${
                card.alert ? 'ring-2 ring-amber-400/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-stone-500">{card.title}</span>
                <div className={`w-10 h-10 rounded-2xl ${card.bgColor} ${card.textColor} flex items-center justify-center shadow-inner`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <p className="text-2xl font-extrabold text-stone-900 tracking-tight">{card.value}</p>
                <p className="text-[11px] font-semibold text-stone-400 mt-1">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Sales Chart + Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Sales Overview</h2>
              <p className="text-xs text-stone-500 font-medium">Daily & Weekly sales performance (LKR)</p>
            </div>

            <div className="flex items-center gap-2 bg-stone-50 p-1 rounded-2xl border border-stone-200 text-xs">
              <button
                onClick={() => setChartView('revenue')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  chartView === 'revenue'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Revenue (LKR)
              </button>
              <button
                onClick={() => setChartView('orders')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  chartView === 'orders'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Orders Count
              </button>
            </div>
          </div>

          <div className="h-[320px] w-full pt-4">
            {data?.sales_chart && data.sales_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'revenue' ? (
                  <AreaChart data={data.sales_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #fecdd3', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                      formatter={(val) => [`${currency} ${parseFloat(val).toLocaleString()}`, 'Sales']}
                    />
                    <Area type="monotone" dataKey="total_amount" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                ) : (
                  <BarChart data={data.sales_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #fecdd3', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                      formatter={(val) => [val, 'Orders']}
                    />
                    <Bar dataKey="order_count" fill="#fb7185" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-stone-400">
                No recent sales data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert Panel */}
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">Low Stock Alert</h2>
                <p className="text-[11px] text-stone-400 font-semibold">Requires restock attention</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-rose-500 hover:text-rose-600"
            >
              View All
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] pr-1">
            {data?.low_stock_alerts && data.low_stock_alerts.length > 0 ? (
              data.low_stock_alerts.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 hover:bg-amber-50/50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-stone-400 font-medium">SKU: {item.sku}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700">
                      Stock: {item.current_stock} / Min: {item.minimum_stock}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-2xl border border-emerald-100">
                ✨ All cosmetics products are well stocked!
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/inventory')}
            className="w-full py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all text-center"
          >
            Manage Inventory & Stock
          </button>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Recent Completed Sales</h2>
            <p className="text-xs text-stone-500 font-medium">Latest shop assistant transactions</p>
          </div>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
          >
            <span>Full Sales History</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto border border-stone-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
              <tr>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Cashier</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {data?.recent_sales && data.recent_sales.length > 0 ? (
                data.recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-rose-50/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-rose-600">{sale.invoice_no}</td>
                    <td className="p-4 font-semibold text-stone-800">{sale.customer_name}</td>
                    <td className="p-4 text-stone-600">{sale.cashier_name}</td>
                    <td className="p-4 text-stone-500">{new Date(sale.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-stone-900">
                      {currency} {parseFloat(sale.grand_total).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-stone-400 font-bold">
                    No sales recorded yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
