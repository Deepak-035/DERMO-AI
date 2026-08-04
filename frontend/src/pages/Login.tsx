import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  const handleDemoLogin = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-end pr-16 md:pr-24 lg:pr-32 relative overflow-hidden">
      {/* Background Video */}
      <video
        className="object-cover w-full h-full fixed top-0 left-0"
        style={{ zIndex: 0 }}
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay */}
      <div className="fixed top-0 left-0 w-full h-full bg-black/60" style={{ zIndex: 1 }} />

      {/* Glassmorphism Login Card */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-full max-w-md p-8 rounded-xl relative"
        style={{
          zIndex: 2,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
        }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/50">
            <span className="text-white font-bold text-3xl">D</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">DermoAI</h1>
          <p className="text-cyan-400/80 text-sm">AI-Powered Dermatological Analysis</p>
        </div>

        {/* Login / Sign Up Toggle */}
        <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-white/10">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Animated Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. John Doe"
                  className="bg-white/5 border-white/10 text-white focus:border-cyan-500 focus:ring-cyan-500/50 transition-all"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinic.com"
                className="bg-white/5 border-white/10 text-white focus:border-cyan-500 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white focus:border-cyan-500 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>

            <div className="pt-4 flex flex-col gap-4">
              <SecondaryButton type="submit" className="w-full">
                {isLogin ? 'Sign In' : 'Create Account'}
              </SecondaryButton>

              <button
                type="button"
                onClick={handleDemoLogin}
                className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Login as Demo User
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
