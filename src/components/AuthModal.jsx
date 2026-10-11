import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  LogIn,
  KeyRound,
} from 'lucide-react';
import { signInAdmin } from '../services/firebase';

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signInAdmin(email.trim(), password);
      onSuccess(user);
      onClose();
    } catch (err) {
      console.error('Sign in failed:', err);
      let msg = err.message || 'Authentication failed. Please check credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Verify the administrator credentials in Firebase Console.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No user registered with this email in Firebase Authentication.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAdmin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await signInAdmin('supervisor@smartcane.org', 'demo-password');
      onSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Supervisor Login
              </h3>
              <p className="text-xs text-slate-400">
                Authenticate as Administrator to acknowledge emergency alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="admin@smartcane.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
          </button>
        </form>

        {/* Quick demo bypass button */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 mb-2.5">
            Testing in demo mode or haven't created a Firebase user yet?
          </p>
          <button
            type="button"
            onClick={handleQuickDemoAdmin}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Quick Demo Supervisor Sign-In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
