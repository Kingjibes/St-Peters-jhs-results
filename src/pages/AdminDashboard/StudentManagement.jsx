import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import StudentForm from './components/StudentForm';
import StudentTable from './components/StudentTable';
import StudentImportExport from './components/StudentImportExport';

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [newStudentName, setNewStudentName] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [editingStudent, setEditingStudent] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, class_id, classes(id, name)')
                .order('name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error fetching students", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('classes').select('id, name').order('name');
            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error fetching classes", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, [fetchStudents, fetchClasses]);

    const resetForm = () => {
        setNewStudentName('');
        setSelectedClass('');
        setEditingStudent(null);
    };

    const handleSubmitStudent = async (e) => {
        e.preventDefault();
        if (!newStudentName.trim() || !selectedClass) {
            toast({ variant: "destructive", title: "Validation Error", description: "Student name and class are required." });
            return;
        }
        setIsLoading(true);
        try {
            let error;
            if (editingStudent) {
                ({ error } = await supabase.from('students').update({ name: newStudentName, class_id: selectedClass }).eq('id', editingStudent.id));
            } else {
                ({ error } = await supabase.from('students').insert([{ name: newStudentName, class_id: selectedClass }]));
            }
            if (error) throw error;
            toast({ title: "Success", description: `Student ${editingStudent ? 'updated' : 'added'} successfully.` });
            resetForm();
            await fetchStudents();
        } catch (error) {
            toast({ variant: "destructive", title: `Error ${editingStudent ? 'updating' : 'adding'} student`, description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditStudent = (student) => {
        setEditingStudent(student);
        setNewStudentName(student.name);
        setSelectedClass(student.class_id);
    };

    const handleCancelEdit = () => {
        resetForm();
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone and may affect existing results.")) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('students').delete().eq('id', studentId);
            if (error) throw error;
            toast({ title: "Success", description: "Student deleted successfully." });
            await fetchStudents();
        } catch (error) {
            toast({ variant: "destructive", title: "Error deleting student", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportData = () => {
        if (students.length === 0) {
            toast({ title: "No Data", description: "No students to export." });
            return;
        }
        const csvData = students.map(student => ({
            "Student Name": student.name,
            "Class Name": student.classes?.name || 'N/A' 
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "students_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Students list exported as CSV."});
    };

    const processImportedData = async (dataToImport) => {
        setIsLoading(true);
        let successfulImports = 0;
        let failedImports = 0;
        const studentsToInsert = [];

        try {
            for (const row of dataToImport) {
                const studentName = row["Student Name"]?.trim() || row["student_name"]?.trim() || row["Name"]?.trim() || row["name"]?.trim();
                const className = row["Class Name"]?.trim() || row["class_name"]?.trim() || row["Class"]?.trim() || row["class"]?.trim();

                if (!studentName || !className) {
                    failedImports++;
                    console.warn("Skipping row due to missing student name or class name:", row);
                    continue;
                }
                
                const classObj = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
                if (!classObj) {
                    toast({variant: "warning", title: "Import Warning", description: `Class "${className}" not found for student "${studentName}". Skipping.`});
                    failedImports++;
                    continue;
                }
                studentsToInsert.push({ name: studentName, class_id: classObj.id });
            }

            if (studentsToInsert.length > 0) {
                const { error } = await supabase.from('students').insert(studentsToInsert);
                if (error) {
                    throw error;
                } else {
                    successfulImports = studentsToInsert.length;
                    await fetchStudents(); 
                }
            }
            toast({title: "Import Complete", description: `${successfulImports} students imported. ${failedImports} failed or skipped.`});
        } catch (error) {
            toast({variant: "destructive", title: "Error importing students", description: error.message});
            failedImports = dataToImport.length - successfulImports; // Estimate failed if batch insert fails
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true); 
        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        reader.onload = async (e) => {
            try {
                let parsedData;
                if (fileExtension === 'csv') {
                    const csvResult = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
                    if (csvResult.errors.length > 0) {
                        throw new Error(`CSV Parsing Error: ${csvResult.errors.map(err => err.message).join(', ')}`);
                    }
                    parsedData = csvResult.data;
                } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (parsedData.length > 0) {
                        const headers = parsedData[0];
                        parsedData = parsedData.slice(1).map(row => {
                            let obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = row[index];
                            });
                            return obj;
                        });
                    } else {
                        parsedData = [];
                    }
                } else {
                    throw new Error("Unsupported file type. Please upload CSV or Excel files.");
                }

                if (!parsedData || parsedData.length === 0) {
                    toast({variant: "destructive", title: "Import Error", description: "File is empty or data could not be parsed."});
                    setIsLoading(false); // Ensure loading is stopped
                    return;
                }
                await processImportedData(parsedData);

            } catch (error) {
                toast({variant: "destructive", title: "Import Error", description: error.message});
                setIsLoading(false); // Ensure loading is stopped on error
            } finally {
                if(event.target) event.target.value = ""; 
            }
        };
        
        reader.onerror = () => {
            toast({variant: "destructive", title: "File Read Error", description: "Could not read the selected file."});
            setIsLoading(false); // Ensure loading is stopped on file read error
            if(event.target) event.target.value = "";
        };

        if (fileExtension === 'csv') {
            reader.readAsText(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            reader.readAsBinaryString(file);
        } else {
            toast({variant: "destructive", title: "Unsupported File Type", description: "Please upload a CSV or Excel (.xls, .xlsx) file."});
            setIsLoading(false); // Ensure loading is stopped for unsupported type
            if(event.target) event.target.value = "";
        }
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
                    Student Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Add, edit, delete, and import student records efficiently.
                </p>
            </header>

            <StudentForm
                newStudentName={newStudentName}
                setNewStudentName={setNewStudentName}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                classes={classes}
                editingStudent={editingStudent}
                handleSubmit={handleSubmitStudent}
                handleCancelEdit={handleCancelEdit}
                isLoading={isLoading}
            />

            <StudentImportExport
                handleImportFile={handleImportFile}
                handleExportData={handleExportData}
                isLoading={isLoading}
                hasStudents={students.length > 0}
            />
            
            <StudentTable
                students={students}
                handleEditStudent={handleEditStudent}
                handleDeleteStudent={handleDeleteStudent}
                isLoading={isLoading}
            />
        </motion.div>
    );
};

export default StudentManagement;