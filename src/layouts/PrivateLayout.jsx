import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Layout for authenticated routes.
 * Wrapped in ErrorBoundary + Suspense so one crashed child
 * never brings down the entire dashboard shell.
 */
const PrivateLayout = () => (
  <div className="flex min-h-screen">
    <Sidebar />

    <main className="flex-1 bg-gray-50 p-6">
      <ErrorBoundary>
        <Suspense fallback={<div>Loading…</div>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </main>
  </div>
);

export default PrivateLayout;