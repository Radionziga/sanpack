'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  login: (email?: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  role: UserRole | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Не удалось подключиться. Проверьте интернет и попробуйте снова.';
  }
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток входа. Подождите несколько минут и попробуйте снова.';
    case 'auth/user-disabled':
      return 'Доступ к этой учётной записи отключён. Обратитесь к владельцу магазина.';
    case 'auth/network-request-failed':
      return 'Не удалось подключиться. Проверьте интернет и попробуйте снова.';
    case 'auth/operation-not-allowed':
      return 'Вход временно недоступен. Попробуйте позже.';
    case 'auth/invalid-email':
      return 'Введите email в формате name@example.com.';
    case 'auth/missing-project-id':
      return 'Вход временно недоступен. Обновите страницу и попробуйте снова.';
    default:
      return 'Не удалось войти. Обновите страницу и попробуйте снова.';
  }
}

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
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();

      if (!response.ok) {
        await signOut(auth).catch(() => undefined);
        throw new Error(result.error || 'Для этой учётной записи не открыт доступ к панели.');
      }

      const adminUser: UserProfile = {
        ...result.admin,
        createdAt: credential.user.metadata.creationTime || new Date().toISOString(),
      };
      setUser(adminUser);
    } catch (loginError) {
      const message = authErrorMessage(loginError);
      setError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Сначала укажите email.');
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (resetError) {
      throw new Error(authErrorMessage(resetError));
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
    <AuthContext.Provider value={{ user, login, resetPassword, logout, isAdmin, role, error }}>
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
