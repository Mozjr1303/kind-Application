import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isAuthUser, UserRole } from './types';
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
import { AuthUser } from './types';

const AppRoutes = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) return null;
    try {
      const user: unknown = JSON.parse(storedUser);
      return isAuthUser(user) ? user : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const handleLogin = useCallback((user: AuthUser) => {
    setAuthUser(user);
    switch (user.role) {
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
  }, [navigate]);

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userStatus');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/register" element={<Register onLogin={handleLogin} />} />
      <Route path="/oauth-callback" element={<OAuthCallback onLogin={handleLogin} />} />

      <Route
        path="/admin/*"
        element={
          authUser?.role === UserRole.ADMIN ? (
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
          authUser?.role === UserRole.PROVIDER ? (
            <DashboardLayout role={UserRole.PROVIDER} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<ProviderDashboard providerName={authUser.name} />} />
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
          authUser?.role === UserRole.CLIENT ? (
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
