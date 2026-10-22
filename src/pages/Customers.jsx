import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { usePOS } from '../context/POSContext';
import {
  Users, UserPlus, Search, Phone, Mail, ShoppingBag, Edit, Trash2,
  RefreshCw, Calendar
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';

export default function Customers() {
  const { settings, showToast } = usePOS();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(search);
      setCustomers(data || []);
    } catch (err) {
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSaveCustomer = async (formData) => {
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData);
        showToast('Customer updated successfully!');
      } else {
        await api.createCustomer(formData);
        showToast('New customer added!');
      }
      setShowModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Unable to save customer.', 'error');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.deleteCustomer(id);
      showToast('Customer deleted.');
      fetchCustomers();
    } catch (err) {
      showToast('Unable to delete customer.', 'error');
    }
  };

  const handleViewHistory = async (cust) => {
    setSelectedCustomerHistory(cust);
    try {
      const sales = await api.getCustomerPurchases(cust.id);
      setCustomerSales(sales || []);
    } catch (err) {
      console.error(err);
    }
  };

  const currency = settings.currency || 'Rs.';

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Customer Directory</h1>
          <p className="text-xs text-stone-500 font-medium">Manage customer profiles, contact numbers, and track lifetime purchase totals</p>
        </div>

        <button
          onClick={() => { setEditingCustomer(null); setShowModal(true); }}
          className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-rose-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4 stroke-[3]" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-soft">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers by name, phone number or email..."
            className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-500">Loading Customers...</p>
          </div>
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-[10px] font-extrabold uppercase text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-right">Lifetime Purchases</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {customers.map(cust => (
                  <tr key={cust.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-extrabold flex items-center justify-center text-sm border border-rose-200">
                          {cust.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-stone-900">{cust.name}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-stone-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{cust.phone}</span>
                      </div>
                    </td>

                    <td className="p-4 text-stone-600">
                      {cust.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{cust.email}</span>
                        </div>
                      ) : (
                        <span className="text-stone-300 italic">No email</span>
                      )}
                    </td>

                    <td className="p-4 text-right font-extrabold text-rose-600 text-sm">
                      {currency} {parseFloat(cust.total_purchases || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewHistory(cust)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-700 hover:text-rose-600 font-bold text-xs transition-all"
                        >
                          History
                        </button>
                        <button
                          onClick={() => { setEditingCustomer(cust); setShowModal(true); }}
                          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id)}
                          className="p-2 rounded-xl bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-stone-400 font-bold">
            No customers found matching search criteria.
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingCustomer(null); }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
      />

      {/* Purchase History Modal */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-rose-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-stone-900">Purchase History: {selectedCustomerHistory.name}</h3>
                <p className="text-xs text-stone-500">{selectedCustomerHistory.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomerHistory(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {customerSales.length > 0 ? (
                customerSales.map(sale => (
                  <div key={sale.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold font-mono text-rose-600">{sale.invoice_no}</p>
                      <p className="text-[10px] text-stone-400">{new Date(sale.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-stone-900">{currency} {parseFloat(sale.grand_total).toFixed(2)}</p>
                      <span className="text-[10px] font-bold text-stone-500">{sale.payment_method}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-stone-400 text-xs font-bold">
                  No previous transactions found for this customer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
