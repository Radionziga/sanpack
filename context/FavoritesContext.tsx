'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FavoritesContextType {
  favoriteIds: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const LOCAL_STORAGE_FAV_KEY = 'sanpack_favorites_v1';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_FAV_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_FAV_KEY, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds]);

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const clearFavorites = () => {
    setFavoriteIds([]);
  };

  const isFavorite = (productId: string) => favoriteIds.includes(productId);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        toggleFavorite,
        isFavorite,
        clearFavorites,
        count: favoriteIds.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
