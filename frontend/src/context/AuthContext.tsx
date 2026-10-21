import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail?: string, userMeta?: any): Promise<UserProfile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email || userEmail,
          role: data.role === 'admin' ? 'admin' : 'user',
          full_name: data.full_name || userMeta?.full_name || userMeta?.name,
          avatar_url: data.avatar_url || userMeta?.avatar_url || userMeta?.picture,
        };
        setProfile(userProfile);
        return userProfile;
      }
    } catch (err) {
      console.warn('Could not fetch profile from Supabase table:', err);
    }

    // Default fallback if profiles table query fails
    const fallbackProfile: UserProfile = {
      id: userId,
      email: userEmail,
      role: 'user',
      full_name: userMeta?.full_name || userMeta?.name || userEmail?.split('@')[0] || 'User',
      avatar_url: userMeta?.avatar_url || userMeta?.picture || '',
    };
    setProfile(fallbackProfile);
    return fallbackProfile;
  };

  useEffect(() => {
    // 1. Initial session verification
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setLoading(false);
        return { success: false, error: error?.message || 'Invalid email or password.' };
      }

      setSession(data.session);
      setUser(data.user);

      // Fetch user profile and exact role
      const fetchedProfile = await fetchProfile(data.user.id, data.user.email, data.user.user_metadata);

      // Record discrete sign-in event via backend (does not count refreshes)
      if (data.session?.access_token) {
        const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const apiUrl = rawBaseUrl.replace(/\/+$/, '');
        fetch(`${apiUrl}/auth/record-sign-in`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }).catch((err) => console.warn('Could not record sign-in telemetry:', err));
      }

      setLoading(false);
      return { success: true, role: fetchedProfile.role };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || 'Login failed. Please check network connection.' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      setLoading(false);
      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Account created! Please check your email inbox to confirm your registration before logging in.',
        };
      }

      return {
        success: true,
        message: 'Account created successfully! You can now log in.',
      };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || 'Signup failed. Please try again.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email, user.user_metadata);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role || 'user',
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
