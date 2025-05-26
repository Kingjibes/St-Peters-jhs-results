import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';
import GenerateResultsFilter from './components/GenerateResultsFilter';
import GenerateResultsTable from './components/GenerateResultsTable';

const GenerateResults = () => {
    const [generationType, setGenerationType] = useState('all');
    const [examinations, setExaminations] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    const [selectedExamination, setSelectedExamination] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filtersAppliedForLastFetch, setFiltersAppliedForLastFetch] = useState(false);
    const { toast } = useToast();

    const fetchDropdownData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [examRes, classRes, subjectRes] = await Promise.all([
                supabase.from('examinations').select('id, name').order('name'),
                supabase.from('classes').select('id, name').order('name'),
                supabase.from('subjects').select('id, name').order('name')
            ]);

            if(examRes.error) throw examRes.error;
            setExaminations(examRes.data || []);
            if(classRes.error) throw classRes.error;
            setClasses(classRes.data || []);
            if(subjectRes.error) throw subjectRes.error;
            setSubjects(subjectRes.data || []);

        } catch (error) {
            toast({variant: "destructive", title: "Error fetching filter data", description: error.message});
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    const handleFetchResults = async () => {
        if (generationType === 'specific' && (!selectedExamination || !selectedClass || !selectedSubject)) {
            toast({variant: "destructive", title: "Missing selection", description: "Please select examination, class, and subject for specific results."});
            return;
        }
        setIsLoading(true);
        setResults([]); 
        setFiltersAppliedForLastFetch(generationType === 'specific' && (!!selectedExamination || !!selectedClass || !!selectedSubject));
        try {
            let queryResults;

            if (generationType === 'specific') {
                const { data: sessionData, error: sessionError } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('examination_id', selectedExamination)
                    .eq('class_id', selectedClass)
                    .eq('subject_id', selectedSubject);

                if (sessionError && sessionError.code !== 'PGRST116') { 
                    throw sessionError;
                }
                
                if (!sessionData || sessionData.length === 0) {
                    toast({title: "No Session Found", description: "No active session matches your specific criteria."});
                    setResults([]);
                    setIsLoading(false);
                    return;
                }
                
                const sessionIds = sessionData.map(s => s.id);

                const { data: specificResults, error: specificResultsError } = await supabase
                    .from('results')
                    .select(`
                        id, 
                        marks, 
                        students (id, name), 
                        sessions (
                            id,
                            examinations (id, name), 
                            classes (id, name), 
                            subjects (id, name),
                            users (id, name, email)
                        )
                    `)
                    .in('session_id', sessionIds);
                
                if (specificResultsError) throw specificResultsError;
                queryResults = specificResults;

            } else { 
                 const { data: allResultsData, error: allResultsError } = await supabase
                    .from('results')
                    .select(`
                        id, 
                        marks, 
                        students (id, name), 
                        sessions (
                            id,
                            examinations (id, name), 
                            classes (id, name), 
                            subjects (id, name),
                            users (id, name, email) 
                        )
                    `)
                    .order('created_at', { ascending: false });
                if(allResultsError) throw allResultsError;
                queryResults = allResultsData;
            }
            
            setResults(queryResults || []);
            if ((queryResults || []).length === 0) {
                toast({title: "No Results", description: "No results found for the current selection."});
            }

        } catch(error) {
            console.error("Error fetching results:", error);
            toast({variant: "destructive", title: "Error fetching results", description: error.message});
        }
        setIsLoading(false);
    };
    
    const exportToCSV = (dataToExport, fileNamePrefix) => {
        if (!dataToExport || dataToExport.length === 0) {
            toast({ title: "No Data", description: "No results to export." });
            return;
        }
    
        const csvData = dataToExport.map(result => ({
            "Student Name": result.students?.name || 'N/A',
            "Marks": result.marks,
            "Examination": result.sessions?.examinations?.name || 'N/A',
            "Class": result.sessions?.classes?.name || 'N/A',
            "Subject": result.sessions?.subjects?.name || 'N/A',
            "Teacher Name": result.sessions?.users?.name || result.sessions?.users?.email || 'N/A',
            "Session ID": result.sessions?.id || 'N/A',
            "Result ID": result.id
        }));
    
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const fileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: `Results exported to ${fileName}`});
    };

    const handleDownloadAllDisplayed = () => exportToCSV(results, "displayed_results_export");
    
    const handleDownloadSpecificStudentResult = (studentResult) => {
        if (!studentResult) {
            toast({variant: "destructive", title: "Error", description: "No student result data to download."});
            return;
        }
        exportToCSV([studentResult], `student_result_${studentResult.students?.name?.replace(/\s+/g, '_') || 'export'}`);
    };

    const handleGenerationTypeChange = (value) => {
        setGenerationType(value);
        setResults([]);
        setSelectedExamination('');
        setSelectedClass('');
        setSelectedSubject('');
        setFiltersAppliedForLastFetch(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen"
        >
            <header className="pb-4 border-b border-border/50">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600">
                    Generate & View Results
                </h1>
                <p className="text-muted-foreground mt-1">
                    Filter and export academic results across various criteria.
                </p>
            </header>

            <GenerateResultsFilter
                generationType={generationType}
                onGenerationTypeChange={handleGenerationTypeChange}
                examinations={examinations}
                selectedExamination={selectedExamination}
                onSelectedExaminationChange={setSelectedExamination}
                classes={classes}
                selectedClass={selectedClass}
                onSelectedClassChange={setSelectedClass}
                subjects={subjects}
                selectedSubject={selectedSubject}
                onSelectedSubjectChange={setSelectedSubject}
                isLoading={isLoading}
                onFetchResults={handleFetchResults}
            />
            
            <GenerateResultsTable
                results={results}
                isLoading={isLoading}
                onDownloadAllDisplayed={handleDownloadAllDisplayed}
                onDownloadSpecificStudentResult={handleDownloadSpecificStudentResult}
                generationType={generationType}
                filtersApplied={filtersAppliedForLastFetch}
            />
        </motion.div>
    );
};

export default GenerateResults;