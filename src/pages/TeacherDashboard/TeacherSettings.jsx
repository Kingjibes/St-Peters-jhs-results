import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const TeacherSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || user.user_metadata?.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const updates = {
      data: { name: name }, 
    };

    const { error: userUpdateError } = await supabase.auth.updateUser(updates);

    if (userUpdateError) {
      toast({ variant: "destructive", title: "Profile Update Failed", description: userUpdateError.message });
    } else {
      const { error: publicUserError } = await supabase
        .from('users')
        .update({ name: name })
        .eq('id', user.id);

      if (publicUserError) {
         toast({ variant: "warning", title: "Profile Partially Updated", description: "Auth profile updated, but public profile encountered an issue: " + publicUserError.message });
      } else {
         toast({ title: "Profile Updated", description: "Your profile information has been updated." });
      }
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "New passwords do not match." });
      return;
    }
     if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password Too Short", description: "Password must be at least 6 characters." });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ variant: "destructive", title: "Password Change Failed", description: error.message });
    } else {
      toast({ title: "Password Changed", description: "Your password has been updated successfully." });
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="text-3xl font-semibold mb-6">Teacher Settings</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here.</p>
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Updating..." : "Update Profile"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your login password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Changing..." : "Change Password"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default TeacherSettings;