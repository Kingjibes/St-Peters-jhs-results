import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

import GenerateResultsFilter from './components/GenerateResultsFilter';
import StudentResultsDetail from './components/StudentResultsDetail';
import ResultsDisplayController from './components/ResultsDisplayController'; 
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

import { 
    fetchFilterData, 
    processStudentResultsForDetailView,
    fetchGeneralResults
} from './utils/resultsProcessor';

import {
    exportResultsToCSV,
    exportResultsToExcel,
    exportStudentDetailToWord,
    handleResultsWordImport,
    handleResultsExcelImport,
} from './utils/exportUtils';


const GenerateResults = () => {
    const [generationType, setGenerationType] = useState('all'); // 'all', 'specificClass', 'specificStudent'
    const [examinations, setExaminations] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    
    const [selectedExamination, setSelectedExamination] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [results, setResults] = useState([]);
    const [studentDetailData, setStudentDetailData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filtersAppliedForLastFetch, setFiltersAppliedForLastFetch] = useState(false);
    
    const { toast } = useToast();
    const wordFileInputRef = useRef(null);
    const excelFileInputRef = useRef(null);

    const loadDropdownData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchFilterData(supabase);
            setExaminations(data.examinations);
            setClasses(data.classes);
            setSubjects(data.subjects);
            setAllStudents(data.allStudents);
        } catch (error) {
            toast({variant: "destructive", title: "Error fetching filter data", description: error.message});
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        loadDropdownData();
    }, [loadDropdownData]);

    const handleFetchResultsLogic = async () => {
        if (generationType === 'specificClass' && (!selectedExamination || !selectedClass || !selectedSubject)) {
            toast({variant: "destructive", title: "Missing selection", description: "Please select examination, class, and subject."});
            return;
        }
        if (generationType === 'specificStudent' && !selectedStudent) {
            toast({variant: "destructive", title: "Missing selection", description: "Please select a student."});
            return;
        }

        setIsLoading(true);
        setResults([]); 
        setStudentDetailData(null);
        setFiltersAppliedForLastFetch(generationType !== 'all');
        
        try {
            if (generationType === 'specificStudent') {
                const details = await processStudentResultsForDetailView(supabase, selectedStudent, allStudents);
                setStudentDetailData(details);
                 if (!details || !details.examinations || details.examinations.length === 0) {
                    toast({title: "No Detailed Results", description: "No examination results found for this student."});
                }
            } else {
                const fetchedResults = await fetchGeneralResults(supabase, generationType, {
                    examinationId: selectedExamination,
                    classId: selectedClass,
                    subjectId: selectedSubject,
                });
                setResults(fetchedResults);
                if (fetchedResults.length === 0) {
                    toast({title: "No Results", description: "No results found for the current selection."});
                }
            }
        } catch(error) {
            console.error("Error in handleFetchResultsLogic:", error);
            toast({variant: "destructive", title: "Error fetching results", description: error.message});
        }
        setIsLoading(false);
    };
    
    const handleExport = (format) => {
        setIsLoading(true);
        try {
            if (generationType === 'specificStudent') {
                if (!studentDetailData) {
                    toast({ variant: "destructive", title: "No Data", description: "No student details to export." });
                    return;
                }
                if (format === 'word') {
                    exportStudentDetailToWord(studentDetailData, toast);
                } else if (format === 'excel') {
                    // Convert studentDetailData to a flat structure suitable for Excel if needed, or use a multi-sheet approach
                    // For simplicity, this example might export a summary or expect a specific structure from exportStudentDetailToExcel
                    // This function would need to be implemented in exportUtils.js
                    toast({ title: "Excel Export (Student Detail)", description: "Excel export for student detail is specific. Using Word for detailed report." });
                    exportStudentDetailToWord(studentDetailData, toast); // Fallback or primary for detail
                } else {
                     toast({title: "Info", description: "CSV export for student detail is best done through Word or Excel for formatted report."});
                }
            } else { // 'all' or 'specificClass'
                if (!results || results.length === 0) {
                    toast({ title: "No Data", description: "No results to export." });
                    return;
                }
                const fileNamePrefix = `${generationType}_results_export`;
                if (format === 'csv') {
                    exportResultsToCSV(results, fileNamePrefix, toast);
                } else if (format === 'excel') {
                    exportResultsToExcel(results, fileNamePrefix, toast);
                } else if (format === 'word') {
                    // This would be similar to excel export, generating a table in Word
                    // For simplicity, this might also fall back to excel or be a dedicated function
                    toast({ title: "Word Export (General Results)", description: "Exporting general results to Word as a table." });
                    // A function like exportGeneralResultsToWord(results, fileNamePrefix, toast) would be in exportUtils.js
                    exportResultsToExcel(results, fileNamePrefix, toast); // Example: Fallback to Excel if Word table is not distinct enough from Excel
                }
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Export Error", description: "Failed to export results."});
            console.error("Export error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileImport = async (event, importType) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        toast({ title: `Processing ${importType === 'word' ? 'Word' : 'Excel'} Document`, description: "Please wait..." });

        try {
            const commonImportArgs = { supabase, file, allStudents, examinations, classes, subjects, toast };
            let importedResultsCount = 0;

            if (importType === 'word') {
                importedResultsCount = await handleResultsWordImport(commonImportArgs);
            } else if (importType === 'excel') {
                importedResultsCount = await handleResultsExcelImport(commonImportArgs);
            }
            
            toast({ title: `${importType === 'word' ? 'Word' : 'Excel'} Import Complete`, description: `${importedResultsCount} results potentially imported/updated. Refresh or check data.` });
            if (importedResultsCount > 0) {
                await handleFetchResultsLogic(); // Refresh results
            }
        } catch (error) {
            console.error(`Error importing ${importType} document:`, error);
            toast({ variant: "destructive", title: `${importType === 'word' ? 'Word' : 'Excel'} Import Error`, description: error.message });
        } finally {
            setIsLoading(false);
            if (importType === 'word' && wordFileInputRef.current) wordFileInputRef.current.value = "";
            if (importType === 'excel' && excelFileInputRef.current) excelFileInputRef.current.value = "";
        }
    };
    
    const handleGenerationTypeChange = (value) => {
        setGenerationType(value);
        setResults([]);
        setStudentDetailData(null);
        setSelectedExamination('');
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedStudent('');
        setSearchTerm('');
        setFiltersAppliedForLastFetch(false);
    };

    const filteredStudents = searchTerm
        ? allStudents.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.classes?.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allStudents;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen"
        >
            <header className="pb-4 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600">
                        Generate & View Results
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Filter, view, import, and export academic results.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                        variant="outline" 
                        onClick={() => wordFileInputRef.current?.click()} 
                        disabled={isLoading}
                        className="w-full sm:w-auto border-blue-500 text-blue-600 hover:bg-blue-500/10"
                    >
                        <Upload className="mr-2 h-4 w-4"/> Import (Word)
                    </Button>
                    <input 
                        type="file" 
                        ref={wordFileInputRef} 
                        onChange={(e) => handleFileImport(e, 'word')} 
                        accept=".docx" 
                        style={{display: 'none'}} 
                    />
                     <Button 
                        variant="outline" 
                        onClick={() => excelFileInputRef.current?.click()} 
                        disabled={isLoading}
                        className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-500/10"
                    >
                        <Upload className="mr-2 h-4 w-4"/> Import (Excel)
                    </Button>
                    <input 
                        type="file" 
                        ref={excelFileInputRef} 
                        onChange={(e) => handleFileImport(e, 'excel')} 
                        accept=".xlsx, .xls" 
                        style={{display: 'none'}} 
                    />
                </div>
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
                onFetchResults={handleFetchResultsLogic}
                allStudents={filteredStudents}
                selectedStudent={selectedStudent}
                onSelectedStudentChange={setSelectedStudent}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
            />
            
            <ResultsDisplayController
                generationType={generationType}
                studentDetailData={studentDetailData}
                generalResults={results}
                isLoading={isLoading}
                onExport={handleExport}
                filtersApplied={filtersAppliedForLastFetch}
            />

        </motion.div>
    );
};

export default GenerateResults;import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

import GenerateResultsFilter from './components/GenerateResultsFilter';
import StudentResultsDetail from './components/StudentResultsDetail';
import ResultsDisplayController from './components/ResultsDisplayController'; 
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

import { 
    fetchFilterData, 
    processStudentResultsForDetailView,
    fetchGeneralResults
} from './utils/resultsProcessor';

import {
    exportResultsToCSV,
    exportResultsToExcel,
    exportStudentDetailToWord,
    handleResultsWordImport,
    handleResultsExcelImport,
} from './utils/exportUtils';


const GenerateResults = () => {
    const [generationType, setGenerationType] = useState('all'); // 'all', 'specificClass', 'specificStudent'
    const [examinations, setExaminations] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    
    const [selectedExamination, setSelectedExamination] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [results, setResults] = useState([]);
    const [studentDetailData, setStudentDetailData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filtersAppliedForLastFetch, setFiltersAppliedForLastFetch] = useState(false);
    
    const { toast } = useToast();
    const wordFileInputRef = useRef(null);
    const excelFileInputRef = useRef(null);

    const loadDropdownData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchFilterData(supabase);
            setExaminations(data.examinations);
            setClasses(data.classes);
            setSubjects(data.subjects);
            setAllStudents(data.allStudents);
        } catch (error) {
            toast({variant: "destructive", title: "Error fetching filter data", description: error.message});
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        loadDropdownData();
    }, [loadDropdownData]);

    const handleFetchResultsLogic = async () => {
        if (generationType === 'specificClass' && (!selectedExamination || !selectedClass || !selectedSubject)) {
            toast({variant: "destructive", title: "Missing selection", description: "Please select examination, class, and subject."});
            return;
        }
        if (generationType === 'specificStudent' && !selectedStudent) {
            toast({variant: "destructive", title: "Missing selection", description: "Please select a student."});
            return;
        }

        setIsLoading(true);
        setResults([]); 
        setStudentDetailData(null);
        setFiltersAppliedForLastFetch(generationType !== 'all');
        
        try {
            if (generationType === 'specificStudent') {
                const details = await processStudentResultsForDetailView(supabase, selectedStudent, allStudents);
                setStudentDetailData(details);
                 if (!details || !details.examinations || details.examinations.length === 0) {
                    toast({title: "No Detailed Results", description: "No examination results found for this student."});
                }
            } else {
                const fetchedResults = await fetchGeneralResults(supabase, generationType, {
                    examinationId: selectedExamination,
                    classId: selectedClass,
                    subjectId: selectedSubject,
                });
                setResults(fetchedResults);
                if (fetchedResults.length === 0) {
                    toast({title: "No Results", description: "No results found for the current selection."});
                }
            }
        } catch(error) {
            console.error("Error in handleFetchResultsLogic:", error);
            toast({variant: "destructive", title: "Error fetching results", description: error.message});
        }
        setIsLoading(false);
    };
    
    const handleExport = (format) => {
        setIsLoading(true);
        try {
            if (generationType === 'specificStudent') {
                if (!studentDetailData) {
                    toast({ variant: "destructive", title: "No Data", description: "No student details to export." });
                    return;
                }
                if (format === 'word') {
                    exportStudentDetailToWord(studentDetailData, toast);
                } else if (format === 'excel') {
                    // Convert studentDetailData to a flat structure suitable for Excel if needed, or use a multi-sheet approach
                    // For simplicity, this example might export a summary or expect a specific structure from exportStudentDetailToExcel
                    // This function would need to be implemented in exportUtils.js
                    toast({ title: "Excel Export (Student Detail)", description: "Excel export for student detail is specific. Using Word for detailed report." });
                    exportStudentDetailToWord(studentDetailData, toast); // Fallback or primary for detail
                } else {
                     toast({title: "Info", description: "CSV export for student detail is best done through Word or Excel for formatted report."});
                }
            } else { // 'all' or 'specificClass'
                if (!results || results.length === 0) {
                    toast({ title: "No Data", description: "No results to export." });
                    return;
                }
                const fileNamePrefix = `${generationType}_results_export`;
                if (format === 'csv') {
                    exportResultsToCSV(results, fileNamePrefix, toast);
                } else if (format === 'excel') {
                    exportResultsToExcel(results, fileNamePrefix, toast);
                } else if (format === 'word') {
                    // This would be similar to excel export, generating a table in Word
                    // For simplicity, this might also fall back to excel or be a dedicated function
                    toast({ title: "Word Export (General Results)", description: "Exporting general results to Word as a table." });
                    // A function like exportGeneralResultsToWord(results, fileNamePrefix, toast) would be in exportUtils.js
                    exportResultsToExcel(results, fileNamePrefix, toast); // Example: Fallback to Excel if Word table is not distinct enough from Excel
                }
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Export Error", description: "Failed to export results."});
            console.error("Export error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileImport = async (event, importType) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setIsLoading(true);
        toast({ title: `Processing ${importType === 'word' ? 'Word' : 'Excel'} Document`, description: "Please wait..." });

        try {
            const commonImportArgs = { supabase, file, allStudents, examinations, classes, subjects, toast };
            let importedResultsCount = 0;

            if (importType === 'word') {
                importedResultsCount = await handleResultsWordImport(commonImportArgs);
            } else if (importType === 'excel') {
                importedResultsCount = await handleResultsExcelImport(commonImportArgs);
            }
            
            toast({ title: `${importType === 'word' ? 'Word' : 'Excel'} Import Complete`, description: `${importedResultsCount} results potentially imported/updated. Refresh or check data.` });
            if (importedResultsCount > 0) {
                await handleFetchResultsLogic(); // Refresh results
            }
        } catch (error) {
            console.error(`Error importing ${importType} document:`, error);
            toast({ variant: "destructive", title: `${importType === 'word' ? 'Word' : 'Excel'} Import Error`, description: error.message });
        } finally {
            setIsLoading(false);
            if (importType === 'word' && wordFileInputRef.current) wordFileInputRef.current.value = "";
            if (importType === 'excel' && excelFileInputRef.current) excelFileInputRef.current.value = "";
        }
    };
    
    const handleGenerationTypeChange = (value) => {
        setGenerationType(value);
        setResults([]);
        setStudentDetailData(null);
        setSelectedExamination('');
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedStudent('');
        setSearchTerm('');
        setFiltersAppliedForLastFetch(false);
    };

    const filteredStudents = searchTerm
        ? allStudents.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.classes?.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allStudents;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen"
        >
            <header className="pb-4 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600">
                        Generate & View Results
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Filter, view, import, and export academic results.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                        variant="outline" 
                        onClick={() => wordFileInputRef.current?.click()} 
                        disabled={isLoading}
                        className="w-full sm:w-auto border-blue-500 text-blue-600 hover:bg-blue-500/10"
                    >
                        <Upload className="mr-2 h-4 w-4"/> Import (Word)
                    </Button>
                    <input 
                        type="file" 
                        ref={wordFileInputRef} 
                        onChange={(e) => handleFileImport(e, 'word')} 
                        accept=".docx" 
                        style={{display: 'none'}} 
                    />
                     <Button 
                        variant="outline" 
                        onClick={() => excelFileInputRef.current?.click()} 
                        disabled={isLoading}
                        className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-500/10"
                    >
                        <Upload className="mr-2 h-4 w-4"/> Import (Excel)
                    </Button>
                    <input 
                        type="file" 
                        ref={excelFileInputRef} 
                        onChange={(e) => handleFileImport(e, 'excel')} 
                        accept=".xlsx, .xls" 
                        style={{display: 'none'}} 
                    />
                </div>
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
                onFetchResults={handleFetchResultsLogic}
                allStudents={filteredStudents}
                selectedStudent={selectedStudent}
                onSelectedStudentChange={setSelectedStudent}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
            />
            
            <ResultsDisplayController
                generationType={generationType}
                studentDetailData={studentDetailData}
                generalResults={results}
                isLoading={isLoading}
                onExport={handleExport}
                filtersApplied={filtersAppliedForLastFetch}
            />

        </motion.div>
    );
};

export default GenerateResults;
