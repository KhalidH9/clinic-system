import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';

/**
 * Guard wrapper: wraps private layouts/pages.
 * Usage: <ProtectedRoute><PrivateLayout/></ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Checking credentials…
      </div>
    );
  }

  if (!user) {
    logger.info('Unauthenticated – redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;