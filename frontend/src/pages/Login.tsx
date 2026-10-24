import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, CheckCircle2, Mail, Lock, User as UserIcon } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, role, signIn, signUp } = useAuth();

  // Tab State: 'login' | 'signup' | 'forgot'
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (user && profile) {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    // Role-based redirection after verified identity
    if (result.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password || !fullName) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, fullName);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Registration failed.');
      return;
    }

    setSuccess(result.message || 'Account created successfully! You can now log in.');
    setTab('login');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password reset link sent to your email.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to send password reset link.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left side — editorial text */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-border relative">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-text" />
            <circle cx="20" cy="12" r="3" fill="currentColor" className="text-accent" />
          </svg>
          <span className="text-base tracking-tight">
            <span className="font-display font-bold text-text">Dermo</span>
            <span className="font-mono font-bold text-accent">AI</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="max-w-lg">
          <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[0.95] tracking-display text-text mb-6">
            A second look at your skin.
          </h1>
          <p className="text-body text-muted max-w-md mb-8">
            Upload a clear photo of a mole, rash or lesion. DermoAI scores it for features dermatologists look for, and gives you a report to bring to your appointment.
          </p>
          <p className="font-mono text-xs text-muted border-l-2 border-accent pl-4">
            A screening aid. Not a diagnosis.<br />
            Always confirm with a dermatologist.
          </p>
        </div>

        {/* Bottom lavender accent block */}
        <div className="bg-accent-tint border border-border p-6 max-w-sm">
          <p className="section-label mb-2">How it works</p>
          <ol className="space-y-2 text-sm text-muted">
            <li className="flex gap-3 items-start">
              <span className="font-mono font-bold text-accent text-lg leading-none">01</span>
              <span>Upload a clear, well-lit photo of the area</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="font-mono font-bold text-accent text-lg leading-none">02</span>
              <span>Our model scores it against 7 known conditions</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="font-mono font-bold text-accent text-lg leading-none">03</span>
              <span>Download a PDF report to share with your doctor</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-text" />
              <circle cx="20" cy="12" r="3" fill="currentColor" className="text-accent" />
            </svg>
            <span className="text-lg tracking-tight">
              <span className="font-display font-bold text-text">Dermo</span>
              <span className="font-mono font-bold text-accent">AI</span>
            </span>
          </div>

          {/* Page heading */}
          <h2 className="font-display text-h2 font-bold tracking-display text-text mb-2">
            {tab === 'login' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="text-sm text-muted mb-8">
            {tab === 'login'
              ? 'Welcome back. Enter your credentials below.'
              : tab === 'signup'
              ? 'Get started with DermoAI in seconds.'
              : 'We\'ll send a recovery link to your email.'}
          </p>

          {/* Auth Mode Tabs (Only Login and Sign Up) */}
          {tab !== 'forgot' && (
            <div className="flex border-b border-border mb-6">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); }}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'login'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-text'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(null); }}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'signup'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-text'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Notifications */}
          {error && (
            <div className="alert alert-error mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-4 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="section-label block mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="section-label">Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(null); setSuccess(null); }}
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="section-label block mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="section-label block mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="section-label block mb-2">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account…</span>
                  </>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {tab === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <p className="text-sm text-muted">
                Enter the email address registered with your account and we will send you a password recovery link.
              </p>

              <div>
                <label className="section-label block mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Recovery Link</span>}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(null); setSuccess(null); }}
                  className="text-sm text-muted hover:text-accent transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Footer disclaimer */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted font-mono">
              Your data is protected by row-level security. DermoAI does not share your images.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
