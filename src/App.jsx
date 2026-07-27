import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import TripLayout from './layouts/TripLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages to reduce initial bundle size over mobile networks
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'));
const DashboardPage = lazy(() => import('./features/trips/pages/DashboardPage'));
const ItineraryPage = lazy(() => import('./features/itinerary/pages/ItineraryPage'));
const MapPage = lazy(() => import('./features/map/pages/MapPage'));
const DocumentsPage = lazy(() => import('./features/documents/pages/DocumentsPage'));
const PackingPage = lazy(() => import('./features/packing/pages/PackingPage'));
const ExpensesPage = lazy(() => import('./features/finances/pages/ExpensesPage'));
const UtilitiesPage = lazy(() => import('./features/utilities/pages/UtilitiesPage'));

// A simple fallback loading spinner for when a route is being downloaded
const PageLoader = () => (
  <div className="flex justify-center items-center h-screen w-full bg-slate-950">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
  </div>
);

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas Públicas */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Rutas Privadas Base */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
            </Route>
            
            {/* Rutas dentro de un Viaje Específico */}
            <Route path="/trip/:tripId" element={<TripLayout />}>
              <Route index element={<Navigate to="itinerary" replace />} />
              <Route path="itinerary" element={<ItineraryPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="packing" element={<PackingPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="utilities" element={<UtilitiesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
