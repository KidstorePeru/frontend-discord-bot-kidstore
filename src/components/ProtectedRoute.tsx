import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './UI';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!customer) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
