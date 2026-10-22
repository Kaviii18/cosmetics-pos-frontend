import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePOS } from '../context/POSContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, Mail, User, ShieldCheck, ShoppingBag, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const { register, loading } = useAuth();
  const { showToast } = usePOS();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('cashier'); // 'cashier' or 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    const res = await register(name, email, password, role);
    if (res.success) {
      showToast(`Welcome ${res.user.name}! Your account was created successfully.`, 'success');
      navigate(res.user.role === 'admin' ? '/' : '/pos');
    } else {
      setErrorMsg(res.message || 'Registration failed. Please try again.');
      showToast(res.message || 'Registration failed.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-rose-100 via-pink-50 to-stone-100 flex items-center justify-center p-4 selection:bg-rose-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-rose-100 space-y-6 animate-fade-in relative overflow-hidden my-6">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-300/30 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-200">
            <Sparkles className="w-8 h-8 animate-pulse-subtle" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Create Staff Account</h1>
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest">Velvet Touch Cosmetics POS</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-shake">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dilini Jayasuriya"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="dilini@velvettouch.lk"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Staff Role Selector */}
          <div>
            <label className="block font-bold text-stone-700 mb-1.5">Assign System Role *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('cashier')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'cashier'
                    ? 'border-rose-500 bg-rose-50/70 shadow-sm shadow-rose-100 ring-2 ring-rose-400/30'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    role === 'cashier' ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  {role === 'cashier' && <CheckCircle2 className="w-4 h-4 text-rose-500" />}
                </div>
                <div>
                  <p className="font-extrabold text-stone-900 text-xs">Cashier</p>
                  <p className="text-[10px] text-stone-500 leading-tight mt-0.5">POS, checkout & receipts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  role === 'admin'
                    ? 'border-rose-500 bg-rose-50/70 shadow-sm shadow-rose-100 ring-2 ring-rose-400/30'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    role === 'admin' ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {role === 'admin' && <CheckCircle2 className="w-4 h-4 text-rose-500" />}
                </div>
                <div>
                  <p className="font-extrabold text-stone-900 text-xs">Store Admin</p>
                  <p className="text-[10px] text-stone-500 leading-tight mt-0.5">Inventory, coupons & settings</p>
                </div>
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Password (Min. 6 chars) *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
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

          {/* Confirm Password */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Confirm Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl font-semibold text-stone-800 focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Register & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="pt-4 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-600">
            Already have an account?{' '}
            <Link to="/login" className="font-extrabold text-rose-600 hover:text-rose-700 hover:underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
