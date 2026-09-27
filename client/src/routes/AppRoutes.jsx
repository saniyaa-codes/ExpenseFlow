import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Layouts
import RootLayout from '../layouts/RootLayout';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';

// Public Pages
import Home from '../pages/Home/Home';

// Authentication Pages
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword';
import ResetPassword from '../pages/ResetPassword/ResetPassword';

// Application Pages (Authenticated)
import Dashboard from '../pages/Dashboard/Dashboard';
import Transactions from '../pages/Transactions/Transactions';
import Income from '../pages/Income/Income';
import Expenses from '../pages/Expenses/Expenses';
import Budgets from '../pages/Budgets/Budgets';
import SavingsGoals from '../pages/SavingsGoals/SavingsGoals';
import Analytics from '../pages/Analytics/Analytics';
import HealthPage from '../pages/Health/HealthPage';
import Reports from '../pages/Reports/Reports';
import Notifications from '../pages/Notifications/Notifications';
import Settings from '../pages/Settings/Settings';

// Helper component for public auth routes (redirects if already logged in)
function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages with Top Navbar & Footer */}
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* Authentication Pages (Redirect to dashboard if already logged in) */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <Login />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicAuthRoute>
              <Register />
            </PublicAuthRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Authenticated Dashboard Pages (Strict ProtectedRoute) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/income" element={<Income />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/savings-goals" element={<SavingsGoals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
