import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshSession, setAccessToken } from './api';

export type Role = 'citizen' | 'officer' | 'commander' | 'investigator' | 'admin';
export interface User { id: string; email: string; fullName: string; role: Role; mfaEnabled: boolean; badgeNumber?: string | null }

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string, totp?: string) => Promise<User>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);
export const isStaff = (u: User | null) => !!u && u.role !== 'citizen';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (await refreshSession()) {
        try { setUser((await api('GET', '/api/auth/me')).user); } catch { /* signed out */ }
      }
      setReady(true);
    })();
  }, []);

  const value: AuthCtx = {
    user, ready, setUser,
    async login(email, password, totp) {
      const r = await api('POST', '/api/auth/login', { body: { email, password, totp } });
      setAccessToken(r.accessToken); setUser(r.user); return r.user;
    },
    async register(data) {
      const r = await api('POST', '/api/auth/register', { body: data });
      setAccessToken(r.accessToken); setUser(r.user); return r.user;
    },
    async logout() {
      await api('POST', '/api/auth/logout').catch(() => {});
      setAccessToken(null); setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
