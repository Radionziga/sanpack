'use client';

import { useEffect } from 'react';

export function useUnsavedNavigationGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const guardLinks = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.href === window.location.href) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', guardLinks, true);
    return () => document.removeEventListener('click', guardLinks, true);
  }, [active, message]);
}
