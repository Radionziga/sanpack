'use client';

import { useEffect } from 'react';

export function useUnsavedNavigationGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const guardLinks = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.href === window.location.href) return;
      const target = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      // In-page section navigation is not a route transition and must not close
      // or reset an editor draft.
      if (target.origin === current.origin
        && target.pathname === current.pathname
        && target.search === current.search
        && target.hash) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', guardLinks, true);
    return () => document.removeEventListener('click', guardLinks, true);
  }, [active, message]);
}
