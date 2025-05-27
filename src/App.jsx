import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GraduationCap } from 'lucide-react';

// Lazy imports with correct paths
const AdminDashboardLayout = lazy(() => import('@/layouts/AdminDashboardLayout'));
const StudentResultsPage = lazy(() => import('@/pages/AdminDashboard/StudentResultsPage'));
const AdminDashboardHome = lazy(() => import('@/pages/AdminDashboard/Home'));

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardHome />} />
              <Route path="student-results" element={<StudentResultsPage />} />
            </Route>

            {/* Add your other routes here */}
          </Routes>
          <Toaster />
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <GraduationCap className="w-16 h-16 text-primary animate-spin" />
  </div>
);

export default App;
