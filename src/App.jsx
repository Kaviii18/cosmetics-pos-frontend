import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { POSProvider } from './context/POSContext';
import { LayoutDashboard, ShoppingCart, Package, Receipt, BarChart3, Settings as SettingsIcon } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import ReceiptModal from './components/ReceiptModal';
import CameraScannerModal from './components/CameraScannerModal';

import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ScanInvoice from './pages/ScanInvoice';

// Protected Route Guard (Requires logged-in user)
function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen bg-rose-50/50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-rose-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Public Route Guard (Redirects to dashboard if already logged in)
function PublicOnlyRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen bg-rose-50/50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-rose-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/' : '/pos'} replace />;
  }
  return children;
}

// Main Layout Shell
function MainLayout() {
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf8f6] flex flex-col lg:flex-row">
      {/* Sidebar (Desktop fixed, Mobile slide-out drawer) */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 ml-0 flex flex-col min-w-0 pb-20 lg:pb-0">
        <Topbar
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized for Mobile Phone Ergonomics) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-rose-100 flex items-center justify-around z-30 shadow-lg px-2 select-none">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-rose-600 bg-rose-50' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/pos"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-2xl text-[10px] font-extrabold shadow-sm transition-all ${
              isActive
                ? 'bg-rose-500 text-white -translate-y-2 shadow-rose-300'
                : 'text-rose-600 bg-rose-50 -translate-y-1'
            }`
          }
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS</span>
        </NavLink>

        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-rose-600 bg-rose-50' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-rose-600 bg-rose-50' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <Receipt className="w-4 h-4" />
          <span>Sales</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-rose-600 bg-rose-50' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-all ${
              isActive ? 'text-rose-600 bg-rose-50' : 'text-stone-500 hover:text-stone-800'
            }`
          }
        >
          <SettingsIcon className="w-4 h-4" />
          <span>More</span>
        </NavLink>
      </nav>

      {/* Global Overlays */}
      <Toast />
      <ReceiptModal />
      <CameraScannerModal />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <POSProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route path="/scan/:invoiceNo" element={<ScanInvoice />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </POSProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
