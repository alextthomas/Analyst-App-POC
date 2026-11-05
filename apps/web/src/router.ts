import { useEffect, useState } from 'react';

/** Minimal hash-based route state: '#/overview?tenant=web-portal'. */
export interface Route {
  path: string;
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs ?? '') };
}

export function navigate(path: string, query?: Record<string, string>): void {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  window.location.hash = `${path}${qs}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = (): void => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
