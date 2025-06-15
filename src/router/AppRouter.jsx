import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from '../components/ProtectedRoute';
import PublicLayout   from '../layouts/PublicLayout';
import PrivateLayout  from '../layouts/PrivateLayout';

/* ----------- lazy-loaded route chunks ----------- */
const LoginPage      = lazy(() => import('../features/auth/LoginPage'));
const Home           = lazy(() => import('../features/home/Home'));
const Dashboard      = lazy(() => import('../features/dashboard/Dashboard'));
const ManagePatients = lazy(() => import('../features/patients/ManagePatients'));
const Profile        = lazy(() => import('../features/profile/Profile')); // ✅

/**
 * NOTE: <BrowserRouter> now lives in main.jsx.
 * This component only defines <Routes>.
 */
const AppRouter = () => (
  <Routes>
    {/* --------  PUBLIC  -------- */}
    <Route element={<PublicLayout />}>
      <Route path="/login" element={<LoginPage />} />
    </Route>

    {/* --------  PRIVATE  -------- */}
    <Route element={<ProtectedRoute><PrivateLayout /></ProtectedRoute>}>
      <Route index          element={<Home />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="patients"  element={<ManagePatients />} />
      <Route path="profile"   element={<Profile />} />
    </Route>

    {/* Fallback: unmatched routes → home (or 404 component if you add one) */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;