import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import TripLayout from './layouts/TripLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import DashboardPage from './features/trips/pages/DashboardPage';
import ItineraryPage from './features/itinerary/pages/ItineraryPage';
import MapPage from './features/map/pages/MapPage';
import DocumentsPage from './features/documents/pages/DocumentsPage';
import PackingPage from './features/packing/pages/PackingPage';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
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
            {/* Próximas fases: expenses */}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
