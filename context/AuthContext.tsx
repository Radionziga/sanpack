'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  login: (email?: string, password?: string) => Promise<void>;
  loginAsDemoAdmin: (role?: UserRole) => void;
  logout: () => void;
  isAdmin: boolean;
  role: UserRole | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_AUTH_KEY = 'sanpack_admin_user_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [error, setError] = useState<string | null>(null);

  const login = async (email?: string) => {
    setError(null);
    const adminUser: UserProfile = {
      uid: 'admin-salahova',
      email: email || 'salahovamilana009@gmail.com',
      name: 'Милана Салахова (Admin)',
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    };
    setUser(adminUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(adminUser));
    }
  };

  const loginAsDemoAdmin = (role: UserRole = 'super_admin') => {
    const demoUser: UserProfile = {
      uid: 'demo-admin-1',
      email: 'salahovamilana009@gmail.com',
      name: 'Администратор SANPACK',
      role,
      createdAt: new Date().toISOString(),
    };
    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(demoUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
    }
  };

  const isAdmin = !!user;
  const role = user?.role || null;

  return (
    <AuthContext.Provider value={{ user, login, loginAsDemoAdmin, logout, isAdmin, role, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
