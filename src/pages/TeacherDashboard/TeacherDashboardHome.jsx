import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit3, FileText, Settings, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const TeacherDashboardHome = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ activeSessions: 0, submittedResults: 0, pendingTasks: 0 });
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;
        const fetchStats = async () => {
            try {
                const { count: activeCount, error: activeError } = await supabase
                    .from('sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('teacher_id', user.id)
                    .eq('status', 'open');
                if (activeError) throw activeError;

                const { count: submittedCount, error: submittedError } = await supabase
                    .from('sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('teacher_id', user.id)
                    .eq('status', 'submitted');
                if (submittedError) throw submittedError;
                
                setStats({ 
                    activeSessions: activeCount || 0, 
                    submittedResults: submittedCount || 0, 
                    pendingTasks: activeCount || 0 
                });

            } catch (error) {
                toast({ variant: "destructive", title: "Error fetching dashboard data", description: error.message });
            }
        };
        fetchStats();
    }, [user, toast]);


  return (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
    <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Teacher Dashboard</h1>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        {title: "Active Sessions", value: stats.activeSessions, icon: Edit3, trend: "Ready for input"}, 
        {title: "Submitted Results", value: stats.submittedResults, icon: FileText, trend: "Awaiting admin review"}, 
        {title: "Pending Tasks", value: stats.pendingTasks, icon: Settings, trend: "Sessions to complete"}
      ].map(item => (
        <Card key={item.title} className="hover:shadow-primary/20 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            <item.icon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
             <p className="text-xs text-muted-foreground">{item.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
     <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Start a new session or view your past submissions.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
            <Button asChild><Link to="/teacher/create-session"><PlusCircle className="mr-2 h-4 w-4" /> Create New Session</Link></Button>
            <Button asChild variant="secondary"><Link to="/teacher/results"><FileText className="mr-2 h-4 w-4" /> View My Results</Link></Button>
        </CardContent>
      </Card>
    </div>
  </motion.div>
  );
};

export default TeacherDashboardHome;