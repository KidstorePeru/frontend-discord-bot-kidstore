import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './UI';

// Inverso de ProtectedRoute: si ya hay una sesión iniciada, no tiene sentido
// mostrar /login o /register — se redirige directo al dashboard.
export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (customer) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
