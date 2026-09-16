import { useSyncExternalStore } from 'react';

export function getAppUrl() {
  return new URL(window.location.hash.slice(1) || '/', window.location.origin);
}

function navigate(href: string, replace = false, options?: { scroll?: boolean }) {
  if (!href.startsWith('/') || href.startsWith('//')) throw new Error('Ruta interna inválida.');
  const url = `${window.location.pathname}${window.location.search}#${href}`;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event('hashchange'));
  if (options?.scroll !== false) window.scrollTo(0, 0);
}

export function subscribeRoute(listener: () => void) {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => { window.removeEventListener('hashchange', listener); window.removeEventListener('popstate', listener); };
}

export function usePathname() {
  return useSyncExternalStore(subscribeRoute, () => getAppUrl().pathname, () => '/');
}

export function useRouter() {
  return {
    push: (href: string, options?: { scroll?: boolean }) => navigate(href, false, options),
    replace: (href: string, options?: { scroll?: boolean }) => navigate(href, true, options),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => window.dispatchEvent(new Event('hashchange')),
    prefetch: async (_href: string) => {},
  };
}
