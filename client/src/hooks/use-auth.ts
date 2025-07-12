import { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser {
  id: number;
  username: string;
  apiKey: string | null;
  balance: string | null;
  balanceUSD: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Check if user is stored in sessionStorage
    const storedUser = sessionStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        sessionStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const user = await apiRequest('POST', '/api/login', { username, password });
    setUser(user);
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    return user;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('auth_user');
    navigate('/');
  };

  return {
    user,
    isLoading,
    login,
    logout,
    setUser,
  };
}