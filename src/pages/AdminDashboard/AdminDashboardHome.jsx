import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, BookOpen, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const AdminDashboardHome = () => {
    const [stats, setStats] = useState({ students: 0, subjects: 0, sessions: 0 });
    const { toast } = useToast();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: studentCount, error: studentError } = await supabase.from('students').select('*', { count: 'exact', head: true });
                if (studentError) throw studentError;

                const { count: subjectCount, error: subjectError } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
                if (subjectError) throw subjectError;
                
                const { count: sessionCount, error: sessionError } = await supabase.from('sessions').select('*', { count: 'exact', head: true });
                if (sessionError) throw sessionError;

                setStats({ students: studentCount || 0, subjects: subjectCount || 0, sessions: sessionCount || 0 });
            } catch (error) {
                toast({ variant: "destructive", title: "Error fetching dashboard data", description: error.message });
            }
        };
        fetchStats();
    }, [toast]);
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {title: "Total Students", value: stats.students, icon: Users, trend: "+5% this month"}, 
          {title: "Subjects Offered", value: stats.subjects, icon: BookOpen, trend: "+2 new"}, 
          {title: "Active Sessions", value: stats.sessions, icon: FileText, trend: "View details"}
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
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Quick actions and summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Welcome to the admin panel. Manage students, subjects, and results efficiently.</p>
            <div className="flex gap-4">
                <Button asChild><Link to="/admin/students"><Users className="mr-2 h-4 w-4" /> Manage Students</Link></Button>
                <Button asChild variant="secondary"><Link to="/admin/subjects"><BookOpen className="mr-2 h-4 w-4" /> Manage Subjects</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminDashboardHome;