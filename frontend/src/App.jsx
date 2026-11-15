import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ProfileProvider } from './contexts/ProfileContext.jsx';
import { AccessibilityProvider } from './contexts/AccessibilityContext.jsx';

// Layout Components (Synchronous for instant shell rendering)
import AccessibilityBar from './components/common/AccessibilityBar.jsx';
import Navbar from './components/common/Navbar.jsx';
import Sidebar from './components/common/Sidebar.jsx';

// Lazy-Loaded Pages (Code Splitting for Optimal Performance & Low Initial Payload)
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ElderlyChecklistPage = lazy(() => import('./pages/ElderlyChecklistPage.jsx'));
const MedicationsPage = lazy(() => import('./pages/MedicationsPage.jsx'));
const AdherencePage = lazy(() => import('./pages/AdherencePage.jsx'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage.jsx'));
const HealthcareProfilePage = lazy(() => import('./pages/HealthcareProfilePage.jsx'));
const CareTeamPage = lazy(() => import('./pages/CareTeamPage.jsx'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

// Accessible Senior-Friendly Loading Fallback
function PageLoadingFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-12 h-12 border-4 border-blue-200 border-t-primary-600 rounded-full animate-spin mb-4" />
      <p className="text-base font-semibold text-slate-700">Loading CareSync records...</p>
      <span className="sr-only">Please wait, loading patient profile data</span>
    </div>
  );
}

// Protected Route Wrapper
function ProtectedLayout() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <AccessibilityBar />
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0" id="main-content">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/senior-view" element={<ElderlyChecklistPage />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/adherence" element={<AdherencePage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/profile" element={<HealthcareProfilePage />} />
              <Route path="/care-team" element={<CareTeamPage />} />
              <Route path="/activity-log" element={<ActivityLogPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <ProfileProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
