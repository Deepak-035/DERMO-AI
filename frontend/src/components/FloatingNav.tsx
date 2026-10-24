import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu, X, Sun, Moon, ShieldCheck } from 'lucide-react';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem('dermoai-theme', next); } catch {}
  };

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export function FloatingNav() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    if (mobileOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, closeMobile]);

  // Focus trap
  useEffect(() => {
    if (mobileOpen && menuRef.current) {
      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length) focusable[0].focus();
    }
  }, [mobileOpen]);

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      onClick={closeMobile}
      className={`text-sm font-medium transition-colors py-1 border-b-2 ${
        isActive(to)
          ? 'border-accent text-accent'
          : 'border-transparent text-muted hover:text-text hover:border-border'
      }`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-bg border-b border-border" style={{ backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            {/* Typographic wordmark: dermatoscope mark */}
            <span className="relative inline-flex items-center justify-center w-8 h-8">
              <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" className="text-text" />
                <circle cx="20" cy="12" r="3" fill="currentColor" className="text-accent" />
              </svg>
            </span>
            <span className="text-lg tracking-tight">
              <span className="font-display font-bold text-text">Dermo</span>
              <span className="font-mono font-bold text-accent">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <NavLink to="/dashboard">Home</NavLink>
            <NavLink to="/predict">Scan</NavLink>
            <NavLink to="/history">History</NavLink>
            {role === 'admin' && (
              <NavLink to="/admin">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </span>
              </NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* User avatar */}
            <div className="hidden md:flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-accent-tint border border-border flex items-center justify-center font-mono text-xs font-bold text-accent">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="btn-ghost text-xs"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile burger */}
            <button
              type="button"
              className="md:hidden theme-toggle"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay + slide-in panel */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-text/40 z-[60] md:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="fixed top-0 right-0 h-full w-72 bg-bg border-l border-border z-[70] p-6 flex flex-col gap-6 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{
              animation: 'slideInRight 250ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-lg">Menu</span>
              <button onClick={closeMobile} className="theme-toggle" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              <NavLink to="/dashboard">Home</NavLink>
              <NavLink to="/predict">Scan</NavLink>
              <NavLink to="/history">History</NavLink>
              {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            </nav>

            <hr className="hairline" />

            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border object-cover" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-accent-tint border border-border flex items-center justify-center font-mono text-xs font-bold text-accent">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              )}
              <span className="text-sm font-medium truncate">{profile?.full_name || 'User'}</span>
            </div>

            <button
              type="button"
              onClick={() => { handleLogout(); closeMobile(); }}
              className="btn-secondary text-sm mt-auto"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
