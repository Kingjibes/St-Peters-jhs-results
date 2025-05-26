import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RegistrationSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = location.state?.email; // This might not be available if redirected from Supabase directly

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000); 

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <Card className="w-full max-w-lg text-center shadow-2xl">
          <CardHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 150 }}
              className="mx-auto p-4 bg-green-500/20 rounded-full inline-block mb-6 border-4 border-green-500"
            >
              <CheckCircle className="h-16 w-16 text-green-500" />
            </motion.div>
            <CardTitle className="text-3xl">Email Verified!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              {userEmail ? `Your email ${userEmail} has been successfully verified.` : 'Your email has been successfully verified.'}
              <br />
              You can now log in to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              You will be redirected to the login page in 5 seconds.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Button asChild className="w-1/2 font-semibold group">
                <Link to="/login">
                  <LogIn className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  Go to Login
                </Link>
              </Button>
            </motion.div>
             <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-6 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-green-400 to-emerald-600 h-2.5 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegistrationSuccessPage;