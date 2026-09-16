export type PortalSession = {
  contactId: string;
  email: string;
  contractor: string;
  isAdmin: boolean;
  isPeople: boolean;
};

declare global {
  interface Window { transportPortalSession?: PortalSession | null }
}

// Este contexto se renderiza desde Liquid; nunca contiene claves ni contraseñas.
// Solo controla la interfaz: los permisos de Dataverse protegen los datos.
export function getPortalSession(): PortalSession | null {
  const session = window.transportPortalSession;
  return session?.contactId ? session : null;
}

export function signIn() { window.location.assign('/SignIn?ReturnUrl=%2F'); }
export function signOut() { window.location.assign('/Account/Login/LogOff?returnUrl=%2F'); }
