import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import SessionSetupForm from '@/pages/TeacherDashboard/components/SessionSetupForm';
import MarksInputTable from '@/pages/TeacherDashboard/components/MarksInputTable';

const CreateSessionAndInputMarks = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [examinations, setExaminations] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    
    const [selectedExamination, setSelectedExamination] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    const [currentSession, setCurrentSession] = useState(null);
    const [marks, setMarks] = useState({});
    const [isLoading, setIsLoading] = useState(false); // General loading for page/components
    const [isSubmitting, setIsSubmitting] = useState(false); // Specific for form submissions
    const [isSessionLocked, setIsSessionLocked] = useState(false);

    const fetchData = useCallback(async (source) => {
        setIsLoading(true);
        try {
            const [examRes, classRes, subjectRes] = await Promise.all([
                supabase.from('examinations').select('id, name').order('name'),
                supabase.from('classes').select('id, name').order('name'),
                supabase.from('subjects').select('id, name').order('name')
            ]);

            if (examRes.error) {toast({variant: "destructive", title: "Error fetching examinations", description: `${examRes.error.message} (Source: ${source})`});}
            setExaminations(examRes.data || []);
            
            if (classRes.error) {toast({variant: "destructive", title: "Error fetching classes", description: `${classRes.error.message} (Source: ${source})`});}
            setClasses(classRes.data || []);

            if (subjectRes.error) {toast({variant: "destructive", title: "Error fetching subjects", description: `${subjectRes.error.message} (Source: ${source})`});}
            setSubjects(subjectRes.data || []);

        } catch (error) {
            console.error("Error fetching dropdown data:", error);
            toast({variant: "destructive", title: "Data Fetch Error", description: "Could not load required data for session setup."});
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchData('initial component load');
    }, [fetchData]);

    useEffect(() => { 
        const fetchStudents = async () => {
            if (!selectedClass) {
                setStudents([]);
                return;
            }
            setIsLoading(true);
            const { data, error } = await supabase.from('students').select('id, name').eq('class_id', selectedClass).order('name');
            if (error) toast({variant: "destructive", title: "Error fetching students", description: error.message});
            else setStudents(data || []);
            setIsLoading(false);
        };
        if (selectedClass) {
            fetchStudents();
        } else {
            setStudents([]); // Clear students if no class is selected
        }
    }, [selectedClass, toast]);

    const handleCreateSession = async () => {
        if (!selectedExamination || !selectedClass || !selectedSubject || !user) {
            toast({variant: "destructive", title: "Missing Info", description: "Please select exam, class, and subject."});
            return;
        }
        setIsSubmitting(true);
        
        const { data: existingSession, error: existingError } = await supabase
            .from('sessions')
            .select('id, status')
            .eq('examination_id', selectedExamination)
            .eq('class_id', selectedClass)
            .eq('subject_id', selectedSubject)
            .eq('teacher_id', user.id)
            .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new session
             toast({variant: "destructive", title: "Error checking session", description: existingError.message});
             setIsSubmitting(false);
             return;
        }
        
        if (existingSession) {
            setCurrentSession(existingSession);
            const locked = existingSession.status === 'submitted' || existingSession.status === 'locked';
            setIsSessionLocked(locked);
            toast({title: "Session Loaded", description: `Existing session loaded. Status: ${existingSession.status}`});
            if (existingSession.id) { // Fetch marks if session exists
                const {data: existingMarksData, error: marksError} = await supabase
                    .from('results')
                    .select('student_id, marks')
                    .eq('session_id', existingSession.id);
                if(marksError) toast({variant: "warning", title: "Could not load prior marks.", description: marksError.message});
                else {
                    const loadedMarks = {};
                    (existingMarksData || []).forEach(m => loadedMarks[m.student_id] = m.marks);
                    setMarks(loadedMarks);
                }
            }
        } else { // Create new session
            const { data: newSession, error } = await supabase
                .from('sessions')
                .insert({
                    teacher_id: user.id,
                    examination_id: selectedExamination,
                    class_id: selectedClass,
                    subject_id: selectedSubject,
                    status: 'open' // New sessions are open
                })
                .select()
                .single();
            if (error) toast({variant: "destructive", title: "Error creating session", description: error.message});
            else {
                setCurrentSession(newSession);
                setIsSessionLocked(false); // New session is not locked
                setMarks({}); // Clear any previous marks from UI state
                toast({title: "Session Created", description: "New session created. You can now input marks."});
            }
        }
        setIsSubmitting(false);
    };

    const handleMarkChange = (studentId, value) => {
        const newMark = parseInt(value, 10);
        if (!isNaN(newMark) && newMark >=0 && newMark <= 100) {
            setMarks(prev => ({ ...prev, [studentId]: newMark }));
        } else if (value === '') { // Allow clearing the input
            setMarks(prev => {
                const updatedMarks = { ...prev };
                delete updatedMarks[studentId]; // Or set to null if backend expects it for empty
                return updatedMarks;
            });
        }
    };

    const handleSubmitMarks = async () => {
        if (!currentSession || isSessionLocked) {
            toast({variant: "warning", title: "Cannot Submit", description: "No active session or session is locked."});
            return;
        }
        setIsSubmitting(true);
        const resultsToInsert = students
            .filter(student => marks[student.id] !== undefined && String(marks[student.id]).trim() !== '' && !isNaN(parseInt(marks[student.id],10)))
            .map(student => ({
                session_id: currentSession.id,
                student_id: student.id,
                marks: parseInt(marks[student.id],10)
            }));

        if (resultsToInsert.length === 0) {
            toast({variant: "info", title: "No Marks to Submit", description: "Please input valid marks for at least one student."});
            setIsSubmitting(false);
            return;
        }
        
        // Upsert marks
        const { error: resultsError } = await supabase.from('results').upsert(resultsToInsert, { onConflict: 'session_id, student_id' });

        if (resultsError) {
            toast({variant: "destructive", title: "Error saving marks", description: resultsError.message});
        } else {
            // Update session status to 'submitted'
            const { error: sessionUpdateError } = await supabase
                .from('sessions')
                .update({ status: 'submitted' })
                .eq('id', currentSession.id);
            
            if (sessionUpdateError) {
                toast({variant: "warning", title: "Marks Saved, Session Status Error", description: `Marks were saved, but failed to update session status: ${sessionUpdateError.message}`});
            } else {
                toast({title: "Marks Submitted", description: "Results submitted successfully. Session is now locked for editing."});
                setIsSessionLocked(true); // Lock UI
                setCurrentSession(prev => ({...prev, status: 'submitted'})); // Update UI state
            }
        }
        setIsSubmitting(false);
    };
    
    const resetSession = () => {
        setCurrentSession(null);
        setIsSessionLocked(false);
        setSelectedExamination('');
        setSelectedClass(''); // This will trigger student list to clear via useEffect
        setSelectedSubject('');
        setMarks({});
        // setStudents([]); // Not needed, selectedClass change handles it
        toast({title: "Session Reset", description: "You can now create a new session or load another."});
    };

    const selectedClassData = classes.find(c => c.id === selectedClass);
    const selectedExaminationData = examinations.find(e => e.id === selectedExamination);
    const selectedSubjectData = subjects.find(s => s.id === selectedSubject);


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-semibold mb-6">Create Session & Input Marks</h1>
            
            <SessionSetupForm
                examinations={examinations}
                classes={classes}
                subjects={subjects}
                selectedExamination={selectedExamination}
                setSelectedExamination={setSelectedExamination}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                handleCreateSession={handleCreateSession}
                resetSession={resetSession}
                currentSession={currentSession}
                isLoading={isLoading || isSubmitting} // Pass combined loading state
            />

            <MarksInputTable
                students={students}
                marks={marks}
                handleMarkChange={handleMarkChange}
                handleSubmitMarks={handleSubmitMarks}
                currentSession={currentSession}
                selectedClassData={selectedClassData}
                selectedExaminationData={selectedExaminationData}
                selectedSubjectData={selectedSubjectData}
                isLoading={isLoading || isSubmitting} // Pass combined loading state
                isSessionLocked={isSessionLocked}
            />
        </motion.div>
    );
};

export default CreateSessionAndInputMarks;