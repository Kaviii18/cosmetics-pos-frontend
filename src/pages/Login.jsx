import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePOS } from '../context/POSContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, Mail, UserCheck, KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const { showToast } = usePOS();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@velvettouch.lk');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    const res = await login(email.trim(), password);
    if (res.success) {
      showToast('Welcome to Velvet Touch POS!', 'success');
      navigate(res.user?.role === 'admin' ? '/' : '/pos');
    } else {
      setErrorMsg(res.message || 'Invalid email or password.');
      showToast(res.message || 'Invalid email or password.', 'error');
    }
  };

  const handleQuickLogin = async (role) => {
    setErrorMsg('');
    if (role === 'admin') {
      setEmail('admin@velvettouch.lk');
      setPassword('admin123');
      const res = await login('admin@velvettouch.lk', 'admin123');
      if (res.success) {
        showToast('Logged in as ADMIN', 'success');
        navigate('/');
      }
    } else {
      setEmail('cashier@velvettouch.lk');
      setPassword('cashier123');
      const res = await login('cashier@velvettouch.lk', 'cashier123');
      if (res.success) {
        showToast('Logged in as CASHIER', 'success');
        navigate('/pos');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-rose-100 via-pink-50 to-stone-100 flex items-center justify-center p-4 selection:bg-rose-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-rose-100 space-y-6 animate-fade-in relative overflow-hidden my-6">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-300/30 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
            <Sparkles className="w-8 h-8 animate-pulse-subtle" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Velvet Touch</h1>
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest">Cosmetics Shop POS System</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-shake">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@velvettouch.lk"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to POS</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Register */}
        <div className="text-center pt-2">
          <p className="text-xs text-stone-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-rose-600 hover:text-rose-700 hover:underline">
              Register new staff
            </Link>
          </p>
        </div>

        {/* Quick Demo Logins */}
        <div className="pt-4 border-t border-stone-100 text-center space-y-2.5">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Quick Demo Login</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-2.5 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Admin Role</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('cashier')}
              className="py-2.5 px-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 font-extrabold text-xs hover:bg-stone-800 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Cashier Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
