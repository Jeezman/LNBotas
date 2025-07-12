import { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser {
  id: number;
  username: string;
  apiKey: string | null;
  apiSecret: string | null;
  apiPassphrase: string | null;
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
    console.log('Auth useEffect: Checking for stored user...');
    // Check if user is stored in sessionStorage
    const storedUser = sessionStorage.getItem('auth_user');
    console.log('Auth useEffect: Stored user data:', storedUser);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Auth useEffect: Parsed user:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.log('Auth useEffect: Error parsing stored user, removing from storage');
        sessionStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
    console.log('Auth useEffect: Loading complete');
  }, []);

  const login = async (username: string, password: string): Promise<AuthUser> => {
    console.log('Login function called with:', { username });
    const response = await apiRequest('POST', '/api/login', { username, password });
    const user = await response.json();
    console.log('Login response parsed:', user);
    setUser(user);
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    console.log('User set in auth context and session storage');
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