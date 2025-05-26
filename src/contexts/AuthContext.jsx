import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const ADMIN_EMAIL = "richvybs92@gmail.com";

  const fetchUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) return null;
    setLoading(true);
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role, verified')
        .eq('id', sessionUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile from public.users:", profileError.message);
        const roleBasedOnEmail = sessionUser.email === ADMIN_EMAIL ? 'admin' : 'teacher';
        const nameFromMetadata = sessionUser.user_metadata?.name || sessionUser.email;
        
        return { 
          id: sessionUser.id, 
          email: sessionUser.email, 
          name: nameFromMetadata, 
          role: roleBasedOnEmail, 
          verified: sessionUser.email_confirmed_at ? true : false 
        };
      }
      
      return { 
        ...userProfile, 
      };

    } catch (e) {
      console.error("Exception in fetchUserProfile:", e.message);
      const roleBasedOnEmail = sessionUser.email === ADMIN_EMAIL ? 'admin' : 'teacher';
      return { 
        id: sessionUser.id, 
        email: sessionUser.email, 
        name: sessionUser.user_metadata?.name || sessionUser.email, 
        role: roleBasedOnEmail, 
        verified: sessionUser.email_confirmed_at ? true : false 
      };
    } finally {
      setLoading(false);
    }
  }, [ADMIN_EMAIL]);


  useEffect(() => {
    const getSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const fullUserProfile = await fetchUserProfile(session.user);
        setUser(fullUserProfile);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        if (session && session.user) {
          const fullUserProfile = await fetchUserProfile(session.user);
          setUser(fullUserProfile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
      setLoading(false);
      throw error;
    }

    if (data.user) {
      const userProfile = await fetchUserProfile(data.user); 
      if (userProfile) {
        if (userProfile.role === 'teacher' && !userProfile.verified) {
          await supabase.auth.signOut(); 
          setUser(null);
          toast({ variant: "destructive", title: "Verification Required", description: "Please verify your email before logging in." });
          setLoading(false);
          throw new Error("Email not verified");
        }
        setUser(userProfile); 
        toast({ title: "Login Successful", description: `Welcome back, ${userProfile.name || userProfile.email}!` });
        setLoading(false);
        return userProfile; 
      } else {
         toast({ variant: "destructive", title: "Login Error", description: "User profile could not be loaded after login. Please try again or contact support." });
         await supabase.auth.signOut();
         setUser(null);
         setLoading(false);
         throw new Error("User profile not found after login");
      }
    }
    setLoading(false);
    return null; 
  };

  const register = async (name, email, password) => {
    setLoading(true);
    if (email === ADMIN_EMAIL) {
      toast({ variant: "destructive", title: "Registration Failed", description: "Admin registration is not allowed through this form." });
      setLoading(false);
      throw new Error("Admin registration not allowed");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name: name,
          role: 'teacher', 
        },
        emailRedirectTo: `${window.location.origin}/registration-success` 
      },
    });

    if (error) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message });
      setLoading(false);
      throw error;
    }

    if (data.user) {
      toast({ title: "Registration Initiated", description: "Please check your email to verify your account." });
    }
    
    setLoading(false);
    return data.user; 
  };
  
  const logout = async () => {
    setLoading(true);
    // Check if there's an active session user before attempting to sign out
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser();

    if (currentAuthUser) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast({ variant: "destructive", title: "Logout Failed", description: error.message });
        } else {
            setUser(null);
            toast({ title: "Logged Out", description: "You have been successfully logged out." });
        }
    } else {
        // If no active session, just clear local user state and inform
        setUser(null);
        // Optionally, you might not want to show a toast here if it's considered a "silent" cleanup
        // toast({ title: "Logged Out", description: "No active session found, local state cleared." });
    }
    setLoading(false);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    ADMIN_EMAIL,
    fetchUserProfile 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
