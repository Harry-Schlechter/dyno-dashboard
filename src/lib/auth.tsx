import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { IS_DEMO } from './demoMode';

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

const DEMO_USER: AuthUser = {
  id: 'demo',
  email: 'demo@dyno',
  role: 'owner',
  allowed_spaces: [],
};

async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role, allowed_spaces')
      .eq('id', userId)
      .maybeSingle();
    if (!data) {
      // No profile row — fall back to an owner-y default so the user isn't locked out.
      return { id: userId, email, role: 'owner', allowed_spaces: [] };
    }
    return {
      id: data.id,
      email: data.email || email,
      role: data.role,
      allowed_spaces: data.allowed_spaces || [],
    };
  } catch {
    return { id: userId, email, role: 'owner', allowed_spaces: [] };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(IS_DEMO ? DEMO_USER : null);
  const [loading, setLoading] = useState(!IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;
    let cancelled = false;

    const applySession = async (session: any) => {
      if (cancelled) return;
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      const profile = await loadProfile(session.user.id, session.user.email || '');
      if (cancelled) return;
      setUser(profile);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }: any) => applySession(data?.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      applySession(session);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

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

// Re-exported for convenience — the real definition lives in demoMode.ts.
export { isDemo } from './demoMode';
