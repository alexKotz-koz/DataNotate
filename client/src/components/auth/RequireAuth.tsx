import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthUser } from '../../hooks/useAuthUser';

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: Array<'admin' | 'researcher' | 'annotator'>;
  redirectAnnotator?: string;
}

export default function RequireAuth({ children, allowedRoles, redirectAnnotator = '/annotator' }: RequireAuthProps) {
  const location = useLocation();
  const { user, isLoading } = useAuthUser();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'admin') {
    if (user.role === 'annotator') {
      return <Navigate to={redirectAnnotator} replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
