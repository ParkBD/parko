import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'DRIVER' | 'OWNER' | 'SECURITY' | 'ADMIN';
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/api/v1/auth/login', { email, password });
        const { user, accessToken, refreshToken } = res as any;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      register: async (data) => {
        const res = await api.post('/api/v1/auth/register', data);
        const { user, accessToken, refreshToken } = res as any;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await api.post('/api/v1/auth/logout');
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken });
      },
    }),
    {
      name: 'parko-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
