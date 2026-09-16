import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { usePathname, useRouter } from './compat/navigation';
import { getPortalSession, signIn, signOut } from './portal/session';
import { PortalDashboard } from './app/components/PortalDashboard';
import './app/globals.css';

const modules = import.meta.glob<{ default: ComponentType }>('./app/**/page.tsx');
export const routes = Object.fromEntries(Object.entries(modules)
  .filter(([path]) => path !== './app/page.tsx')
  .map(([path, loader]) => [path.replace('./app', '').replace('/page.tsx', ''), lazy(loader)]));

class PageBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <main role="alert">No se pudo abrir este módulo. <a href="#/">Volver al inicio</a></main> : this.props.children; }
}

function App() {
  const path = usePathname();
  const router = useRouter();
  const session = getPortalSession();
  const [error, setError] = useState('');
  useEffect(() => {
    const handler = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener('transport:portal-error', handler);
    return () => window.removeEventListener('transport:portal-error', handler);
  }, []);
  useEffect(() => setError(''), [path]);
  if (!session) return <main className="grid min-h-screen place-items-center p-8"><section className="max-w-lg rounded-xl bg-white p-8 shadow-xl"><h1 className="text-2xl font-bold">Transport Barranquilla</h1><p className="my-5">La aplicación usa la sesión de Power Pages. Entra con tu cuenta autorizada de Microsoft.</p><button className="rounded bg-blue-700 px-5 py-3 text-white" onClick={signIn}>Iniciar sesión</button><p className="mt-4 text-sm text-slate-500">En local no se simula una sesión ni se guardan datos. El contexto Liquid se configura al publicar.</p></section></main>;
  const Page = routes[path];
  const allowed = (!path.startsWith('/admin') || session.isAdmin) && (path !== '/personas' || session.isAdmin || session.isPeople);
  return <>
    {error && <aside role="alert" className="sticky top-0 z-50 bg-amber-100 p-4 text-amber-950">{error}<button className="ml-4 underline" onClick={() => setError('')}>Cerrar</button></aside>}
    {!allowed ? <main className="p-8">No tienes permiso para este módulo. <button onClick={() => router.push('/')}>Volver</button></main>
      : path === '/' ? <PortalDashboard onLogout={signOut} contractor={session.contractor} isAdmin={session.isAdmin} isPeople={session.isPeople} />
      : Page ? <PageBoundary key={path}><Suspense fallback={<main className="p-8">Cargando módulo…</main>}><Page /></Suspense></PageBoundary>
      : <main className="p-8">Módulo no encontrado. <a href="#/">Volver al inicio</a></main>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
