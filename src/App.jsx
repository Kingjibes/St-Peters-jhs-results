import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster'; // Fixed import path
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const StudentResultsPage = lazy(() => import('@/pages/AdminDashboard/StudentResultsPage'));

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/student-results" 
              element={
                <ProtectedRoute role="admin">
                  <StudentResultsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/student-results" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* Toaster component must be placed here */}
          <Toaster />
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
