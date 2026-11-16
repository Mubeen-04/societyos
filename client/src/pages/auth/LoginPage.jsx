import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      const data = await login(cleanEmail, cleanPassword);
      // Route based on role
      if (data.user.role === 'SECURITY') {
        navigate('/security/terminal');
      } else if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else if (['CHAIRMAN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'].includes(data.user.role)) {
        navigate('/committee/dashboard');
      } else if (data.user.role === 'VENDOR') {
        navigate('/vendor/workload');
      } else {
        navigate('/resident/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-teal-500/20 mb-4">
            S
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">SocietyOS</h1>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-1">Sign in to your society</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your registered email and password</p>

          {error && (
            <div className="p-3 mb-5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@societyos.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 mt-2 gap-2 text-sm"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
