import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const PreloaderPage = lazy(() => import('@/pages/PreloaderPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const RegistrationSuccessPage = lazy(() => import('@/pages/RegistrationSuccessPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const TeacherDashboardPage = lazy(() => import('@/pages/TeacherDashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <GraduationCap className="w-16 h-16 text-white" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/login" replace />; // Or a specific unauthorized page
  }
  
  return children;
};

function AppContent() {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (showPreloader) {
    return <PreloaderPage />;
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <GraduationCap className="w-16 h-16 text-white" />
        </motion.div>
      </div>
    }>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute role="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/*" 
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboardPage />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
      <Toaster />
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
