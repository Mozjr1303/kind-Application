import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { UserRole } from './types';
import { Login } from './pages/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminLogs } from './pages/AdminLogs';
import { AdminAlerts } from './pages/AdminAlerts';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { ProviderSettings } from './pages/ProviderSettings';
import { ClientDashboard } from './pages/ClientDashboard';
import { ProviderProfile } from './pages/ProviderProfile';
import Home from './pages/Home';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import { ProviderUpdates } from './pages/ProviderUpdates';

// Simple context-like wrapper for navigating after login
const AppRoutes = () => {
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('userRole') as UserRole) || null;
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('userName') || '';
  });
  const navigate = useNavigate();

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole);
    localStorage.setItem('userRole', selectedRole);
    setUserName(localStorage.getItem('userName') || '');
    switch (selectedRole) {
      case UserRole.ADMIN:
        navigate('/admin');
        break;
      case UserRole.PROVIDER:
        navigate('/provider');
        break;
      case UserRole.CLIENT:
        navigate('/client');
        break;
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUserName('');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth-callback" element={<OAuthCallback onLogin={handleLogin} />} />

      <Route
        path="/admin/*"
        element={
          role === UserRole.ADMIN ? (
            <DashboardLayout role={UserRole.ADMIN} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="alerts" element={<AdminAlerts />} />
              </Routes>
            </DashboardLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/provider/*"
        element={
          role === UserRole.PROVIDER ? (
            <DashboardLayout role={UserRole.PROVIDER} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<ProviderDashboard providerName={userName} />} />
                <Route path="profile" element={<ProviderSettings />} />
                <Route path="updates" element={<ProviderUpdates />} />
              </Routes>
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/client/*"
        element={
          role === UserRole.CLIENT ? (
            <DashboardLayout role={UserRole.CLIENT} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<ClientDashboard />} />
                <Route path="provider/:id" element={<ProviderProfile />} />
                <Route path="bookings" element={<div className="p-4">My Bookings Placeholder</div>} />
                <Route path="messages" element={<div className="p-4">Messages Placeholder</div>} />
              </Routes>
            </DashboardLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
