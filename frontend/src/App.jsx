import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyBookings from './pages/MyBookings';
import BookingManagement from './pages/BookingManagement';

// Protected Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to homepage
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-250">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer Protected Routes */}
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />

              {/* Provider Protected Routes */}
              <Route
                path="/provider-bookings"
                element={
                  <ProtectedRoute allowedRoles={['Provider']}>
                    <BookingManagement />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Subtle footer */}
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 dark:text-slate-500">
              <p>&copy; {new Date().getFullYear()} ServiceSync. All rights reserved. Secure Blockchain Auditing Enabled.</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
