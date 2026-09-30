import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { PageLoader } from './UI';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customer, loading, token, sessionUnavailable } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!customer) {
    // Hay sesión guardada pero no se pudo comprobar por algo TEMPORAL (red
    // caída, 503): no es una sesión inválida, así que no se manda a /login
    // (se perdía la ruta y parecía que la sesión se había cerrado). Se queda
    // en esta misma URL con un estado recuperable.
    if (token && sessionUnavailable) return <SessionUnavailable />;
    // Sin sesión: a /login, recordando a dónde quería ir para volver después.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  return <>{children}</>;
}

function SessionUnavailable() {
  const { refresh } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try { await refresh(); } finally { setRetrying(false); }
  }

  return (
    <div className="page-loader" role="alert" aria-live="assertive">
      <WifiOff size={36} aria-hidden="true" />
      <p>
        {es
          ? 'No pudimos verificar tu sesión. Puede ser un problema de conexión; tu sesión sigue abierta.'
          : "We couldn't verify your session. It may be a connection problem; you're still signed in."}
      </p>
      <button type="button" className="btn btn-primary" onClick={retry} disabled={retrying} aria-busy={retrying}>
        <RefreshCw size={16} className={retrying ? 'spin' : undefined} aria-hidden="true" />
        {retrying ? (es ? 'Verificando…' : 'Checking…') : (es ? 'Reintentar' : 'Try again')}
      </button>
    </div>
  );
}
