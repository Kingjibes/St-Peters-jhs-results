import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';

const ViewTeacherResults = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [results, setResults] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [currentSessionDetails, setCurrentSessionDetails] = useState(null);


    const fetchSessions = useCallback(async () => {
        if (!user) return;
        setIsLoadingSessions(true);
        const { data, error } = await supabase
            .from('sessions')
            .select(`
                id, 
                status, 
                created_at,
                examinations (id, name), 
                classes (id, name), 
                subjects (id, name)
            `)
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            toast({variant: "destructive", title: "Error fetching sessions", description: error.message});
            setSessions([]);
        } else {
            setSessions(data || []);
        }
        setIsLoadingSessions(false);
    }, [user, toast]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const fetchResultsForSession = useCallback(async () => {
        if (!selectedSessionId) {
            setResults([]);
            setCurrentSessionDetails(null);
            return;
        }
        setIsLoadingResults(true);
        const sessionDetail = sessions.find(s => s.id === selectedSessionId);
        setCurrentSessionDetails(sessionDetail);

        const { data, error } = await supabase
            .from('results')
            .select(`
                id, 
                marks, 
                students!inner (id, name) 
            `)
            .eq('session_id', selectedSessionId)
            .order('name', { foreignTable: 'students', ascending: true });
        
        if (error) {
            toast({variant: "destructive", title: "Error fetching results", description: error.message});
            setResults([]);
        } else {
            setResults(data || []);
             if (data && data.length === 0) {
                toast({ title: "No Results Found", description: "No results have been submitted for this session yet." });
            }
        }
        setIsLoadingResults(false);
    }, [selectedSessionId, toast, sessions]);

    useEffect(() => {
        fetchResultsForSession();
    }, [fetchResultsForSession]);
    
    const exportResultsToCSV = () => {
        if (!results.length || !currentSessionDetails) {
            toast({ title: "No Data", description: "No results to export." });
            return;
        }

        const examName = currentSessionDetails.examinations?.name || "N/A";
        const className = currentSessionDetails.classes?.name || "N/A";
        const subjectName = currentSessionDetails.subjects?.name || "N/A";

        const csvData = results.map(result => ({
            "Student Name": result.students?.name.replace(/,/g, '') || "N/A Student",
            "Marks": result.marks
        }));
        
        const csvString = Papa.unparse(csvData, {
            header: true,
            quotes: true, 
        });
        
        const csvContent = "data:text/csv;charset=utf-8," + csvString;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const fileName = `Results_${examName}_${className}_${subjectName}.csv`.replace(/\s+/g, '_');
        link.setAttribute("download", fileName);
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
        toast({title: "Export Successful", description: `Results exported to ${fileName}`});
    };


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-semibold mb-6">View My Submitted Results</h1>
            
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Select Session</CardTitle>
                    <CardDescription>Choose a session to view the submitted marks.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingSessions && sessions.length === 0 ? <p>Loading sessions...</p> :
                    sessions.length === 0 ? <p>No sessions found. Please create a session and submit marks first.</p> : (
                        <Select value={selectedSessionId} onValueChange={setSelectedSessionId} disabled={isLoadingSessions}>
                            <SelectTrigger className="w-full md:w-3/4 lg:w-1/2">
                                <SelectValue placeholder="Select a session to view results" />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.examinations?.name || 'N/A Exam'} - {s.classes?.name || 'N/A Class'} - {s.subjects?.name || 'N/A Subject'} (Status: {s.status}, Date: {new Date(s.created_at).toLocaleDateString()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedSessionId && currentSessionDetails && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Results for: {currentSessionDetails.examinations?.name}</CardTitle>
                                <CardDescription>
                                    Class: {currentSessionDetails.classes?.name} | Subject: {currentSessionDetails.subjects?.name} | Status: <span className={`font-semibold ${currentSessionDetails.status === 'submitted' || currentSessionDetails.status === 'locked' ? 'text-green-600' : 'text-yellow-600'}`}>{currentSessionDetails.status}</span>
                                </CardDescription>
                            </div>
                            {results.length > 0 && (
                                <Button onClick={exportResultsToCSV} variant="outline" size="sm" disabled={isLoadingResults}>
                                    <Download className="mr-2 h-4 w-4" /> Export CSV
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingResults ? <p className="text-center py-4">Loading results...</p> :
                        results.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60%]">Student Name</TableHead>
                                            <TableHead className="text-right">Marks (/100)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map(result => (
                                            <TableRow key={result.id}>
                                                <TableCell className="font-medium">{result.students?.name || 'N/A Student'}</TableCell>
                                                <TableCell className="text-right">{result.marks}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-center py-4 text-muted-foreground">No results found for this session, or marks have not been submitted yet.</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </motion.div>
    );
};

export default ViewTeacherResults;