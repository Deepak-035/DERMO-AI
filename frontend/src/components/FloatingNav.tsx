import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

export function FloatingNav() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleBadge = () => {
    if (role === 'admin') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
        <UserIcon className="w-3 h-3" /> User
      </span>
    );
  };

  return (
    <motion.nav
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      className="fixed top-5 left-4 right-4 z-50 max-w-5xl mx-auto backdrop-blur-3xl border border-white/10 shadow-2xl shadow-cyan-500/20 bg-slate-950/80 rounded-full px-5 py-2.5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
            <span className="text-white font-bold text-base">D</span>
          </div>
          <span className="text-white font-bold text-lg tracking-wider group-hover:text-cyan-300 transition-colors">
            DermoAI
          </span>
        </Link>
        {getRoleBadge()}
      </div>

      <div className="flex items-center gap-5 text-sm font-medium text-slate-300">
        <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">
          Home
        </Link>
        <Link to="/predict" className="hover:text-cyan-400 transition-colors">
          Predict
        </Link>
        <Link to="/history" className="hover:text-cyan-400 transition-colors">
          History
        </Link>

        {/* Admin portal link */}
        {role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors font-semibold"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

        {/* User name / avatar & Sign Out */}
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-7 h-7 rounded-full border border-cyan-400/40 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
