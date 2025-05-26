import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn as LogInIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid conflict
  const { login, user: contextUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password); 
      
      // The login function in AuthContext now returns the full user profile
      // including the role from public.users.
      // Redirection logic relies on this returned user object.
      if (loggedInUser) {
        if (loggedInUser.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (loggedInUser.role === 'teacher') {
          // Verification check is handled within the login function itself
          navigate('/teacher', { replace: true });
        } else {
          // This should ideally not happen if roles are 'admin' or 'teacher'
          toast({ variant: "destructive", title: "Login Error", description: "Unknown user role. Please contact support." });
          await supabase.auth.signOut(); // Log out if role is indeterminate
        }
      }
      // If login fails (e.g., wrong credentials, unverified email for teachers),
      // the login function in AuthContext throws an error and shows a toast.
    } catch (error) {
      // Errors are handled by the login function's toasts.
      // console.error("Login page submit error:", error.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // Effect to redirect if user is already logged in and authenticated
  useEffect(() => {
    if (!authLoading && contextUser) {
      if (contextUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (contextUser.role === 'teacher' && contextUser.verified) {
        navigate('/teacher', { replace: true });
      }
      // If teacher is not verified, they shouldn't reach here with a contextUser
      // as login/auth state change should prevent setting unverified teacher.
    }
  }, [contextUser, authLoading, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-600 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/10 rounded-full inline-block mb-4 border-2 border-primary">
               <LogInIcon className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>Log in to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  autoComplete="current-password"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-7 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={isSubmitting || authLoading}>
                {isSubmitting || authLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
              New teacher?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;