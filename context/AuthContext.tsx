'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  role: UserRole | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        if (!firebaseUser) setUser(null);
      }),
    []
  );

  const login = async (email = '', password = '') => {
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();

      if (!response.ok) {
        await signOut(auth);
        throw new Error(result.error || 'Учетная запись не имеет доступа.');
      }

      const adminUser: UserProfile = {
        ...result.admin,
        createdAt: credential.user.metadata.creationTime || new Date().toISOString(),
      };
      setUser(adminUser);
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : 'Не удалось войти.';
      setError(message);
      throw loginError;
    }
  };

  const logout = async () => {
    await Promise.allSettled([
      signOut(auth),
      fetch('/api/auth/logout', { method: 'POST' }),
    ]);
    setUser(null);
  };

  const isAdmin = !!user;
  const role = user?.role || null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, role, error }}>
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
