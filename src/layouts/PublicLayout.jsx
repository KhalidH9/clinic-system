import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Layout for public / unauthenticated pages such as Login, Forgot-Password, etc.
 */
const PublicLayout = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <ErrorBoundary>
      <Suspense fallback={<div>Loading…</div>}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default PublicLayout;