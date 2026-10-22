import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users,
  Receipt, BarChart3, Settings, LogOut, Sparkles, UserCheck, X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS / New Sale', path: '/pos', icon: ShoppingCart, highlight: true },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Inventory', path: '/inventory', icon: Boxes },
    { name: 'Sales', path: '/sales', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`w-64 bg-white border-r border-rose-100 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 shadow-sm select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-rose-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-md shadow-rose-200">
                <Sparkles className="w-6 h-6 animate-pulse-subtle" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-stone-900 leading-tight">
                  Velvet Touch
                </h1>
                <p className="text-xs font-semibold text-rose-500 tracking-wider uppercase">
                  Cosmetics POS
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-210px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-200 translate-x-1'
                        : item.highlight
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 hover:translate-x-1'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 hover:translate-x-1'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-rose-100 bg-gradient-to-b from-transparent to-rose-50/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-sm">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold text-stone-800 truncate">
                {user?.name || 'Cashier'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${user?.role === 'admin' ? 'bg-emerald-500' : 'bg-pink-500'}`}></span>
                <span className="text-[11px] font-semibold text-stone-500 capitalize">
                  {user?.role || 'cashier'} Mode
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
