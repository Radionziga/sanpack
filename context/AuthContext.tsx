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
    return 'Локальный сервер недоступен. Перезагрузите страницу и повторите вход.';
  }
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email или пароль не подходят. Проверьте данные или восстановите пароль.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток входа. Подождите несколько минут или восстановите пароль.';
    case 'auth/user-disabled':
      return 'Учётная запись отключена. Обратитесь к владельцу проекта.';
    case 'auth/network-request-failed':
      return 'Нет связи с Firebase. Проверьте интернет-соединение и повторите попытку.';
    case 'auth/operation-not-allowed':
      return 'Вход по email и паролю не включён в Firebase Authentication.';
    case 'auth/invalid-email':
      return 'Проверьте формат email.';
    case 'auth/missing-project-id':
      return 'Firebase был загружен без проекта. Перезагрузите страницу и повторите вход.';
    default:
      return error instanceof Error ? error.message : 'Не удалось войти.';
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
        await signOut(auth);
        throw new Error(result.error || 'Учетная запись не имеет доступа.');
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
    if (!normalizedEmail) throw new Error('Сначала укажите email администратора.');
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
