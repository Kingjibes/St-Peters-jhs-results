import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailWarning, LogIn } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';


const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const emailToVerify = location.state?.email;

  useEffect(() => {
    if (!emailToVerify) {
      toast({ variant: "destructive", title: "Invalid Access", description: "No email provided for verification." });
      navigate('/register');
    }
  }, [emailToVerify, navigate, toast]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md text-center shadow-2xl">
          <CardHeader>
             <div className="mx-auto p-3 bg-primary/10 rounded-full inline-block mb-4 border-2 border-primary">
               <MailWarning className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              {emailToVerify ? 
                `A verification link has been sent to ${emailToVerify}.`
                : "A verification link has been sent to your email address."}
              <br/>
              Please click the link in the email to complete your registration and activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Once verified, you will be able to log in.
            </p>
            <Button asChild className="w-full font-semibold group">
              <Link to="/login">
                <LogIn className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                Back to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;