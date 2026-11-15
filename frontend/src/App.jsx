import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ProfileProvider } from './contexts/ProfileContext.jsx';
import { AccessibilityProvider } from './contexts/AccessibilityContext.jsx';

// Layout Components
import AccessibilityBar from './components/common/AccessibilityBar.jsx';
import Navbar from './components/common/Navbar.jsx';
import Sidebar from './components/common/Sidebar.jsx';

// Pages
import DashboardPage from './pages/DashboardPage.jsx';
import ElderlyChecklistPage from './pages/ElderlyChecklistPage.jsx';
import MedicationsPage from './pages/MedicationsPage.jsx';
import AdherencePage from './pages/AdherencePage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import HealthcareProfilePage from './pages/HealthcareProfilePage.jsx';
import CareTeamPage from './pages/CareTeamPage.jsx';
import ActivityLogPage from './pages/ActivityLogPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
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
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
