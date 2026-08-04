import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function FloatingNav() {
  return (
    <motion.nav
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="fixed top-6 left-6 right-6 z-50 max-w-4xl backdrop-blur-3xl border border-white/10 shadow-2xl shadow-cyan-500/30 bg-black/40 rounded-full px-6 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">D</span>
        </div>
        <span className="text-white font-bold text-xl tracking-wider">DermoAI</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Home</Link>
        <Link to="/predict" className="hover:text-cyan-400 transition-colors">Predict</Link>
        <Link to="/history" className="hover:text-cyan-400 transition-colors">History</Link>
        <a href="#" className="hover:text-cyan-400 transition-colors">About Project</a>
      </div>
    </motion.nav>
  );
}
