import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export type Role = 'owner' | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  allowed_spaces: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const IS_DEMO = process.env.REACT_APP_DEMO === '1';

const DEMO_USER: AuthUser = {
  id: 'demo',
  email: 'demo@dyno',
  role: 'owner',
  allowed_spaces: [],
};

async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, allowed_spaces')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email || email,
    role: data.role,
    allowed_spaces: data.allowed_spaces || [],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(IS_DEMO ? DEMO_USER : null);
  const [loading, setLoading] = useState(!IS_DEMO);

  const refresh = useCallback(async () => {
    if (IS_DEMO) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await loadProfile(session.user.id, session.user.email || '');
    setUser(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (!session) {
        setUser(null);
        return;
      }
      const profile = await loadProfile(session.user.id, session.user.email || '');
      setUser(profile);
    });
    return () => { subscription.unsubscribe(); };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    if (IS_DEMO) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const isDemo = () => IS_DEMO;
