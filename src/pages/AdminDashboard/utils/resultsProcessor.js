import { supabase } from '@/lib/supabaseClient';

export const CORE_SUBJECT_NAMES_LOWERCASE = ["mathematics", "english language", "integrated science", "social studies"];

export async function fetchFilterData() {
    const [examRes, classRes, subjectRes, studentRes] = await Promise.all([
        supabase.from('examinations').select('id, name, examination_date').order('examination_date', { ascending: false }),
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('students').select('id, name, classes (id, name)').order('name')
    ]);

    if (examRes.error) throw examRes.error;
    if (classRes.error) throw classRes.error;
    if (subjectRes.error) throw subjectRes.error;
    if (studentRes.error) throw studentRes.error;
    
    return {
        examinations: examRes.data || [],
        classes: classRes.data || [],
        subjects: subjectRes.data || [],
        allStudents: studentRes.data || [],
    };
}

const calculateRank = (currentScore, allScores) => {
    if (!allScores || allScores.length === 0) return 'N/A';
    
    // Create a map of scores to their ranks
    const sortedScores = [...new Set(allScores)].sort((a, b) => b - a);
    const scoreRanks = {};
    
    sortedScores.forEach((score, index) => {
        scoreRanks[score] = index + 1;
    });
    
    return scoreRanks[currentScore] || 'N/A';
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
    // Fetch all results for the student
    const { data: studentResults, error: studentResultsError } = await supabaseClient
        .from('results')
        .select(`
            marks,
            created_at,
            sessions (
                id,
                examination_id,
                class_id,
                subject_id,
                examinations (id, name, examination_date),
                classes (id, name),
                subjects (id, name)
            )
        `)
        .eq('student_id', studentId);

    if (studentResultsError) throw studentResultsError;
    if (!studentResults || studentResults.length === 0) return null;

    const studentInfo = allStudentsList.find(s => s.id === studentId);
    const studentClassId = studentResults[0]?.sessions?.class_id;

    // Group results by examination_id
    const resultsByExamination = studentResults.reduce((acc, result) => {
        const examId = result.sessions.examination_id;
        if (!acc[examId]) {
            acc[examId] = {
                examinationName: result.sessions.examinations.name,
                examinationDate: result.sessions.examinations.examination_date ? 
                    new Date(result.sessions.examinations.examination_date).toLocaleDateString() : 'N/A',
                className: result.sessions.classes.name,
                subjects: [],
                overallTotalMarks: 0,
                coreSubjectsRawScore: 0,
            };
        }
        
        acc[examId].subjects.push({
            id: result.sessions.subjects.id,
            name: result.sessions.subjects.name,
            marks: result.marks,
            sessionId: result.sessions.id,
        });
        
        acc[examId].overallTotalMarks += result.marks;
        
        if (CORE_SUBJECT_NAMES_LOWERCASE.includes(result.sessions.subjects.name.toLowerCase())) {
            acc[examId].coreSubjectsRawScore += result.marks;
        }
        
        return acc;
    }, {});

    // Calculate ranks for each examination
    for (const examId in resultsByExamination) {
        const examData = resultsByExamination[examId];
        
        // 1. Calculate subject ranks
        for (const subject of examData.subjects) {
            const { data: allSubjectMarks, error: marksError } = await supabaseClient
                .from('results')
                .select('marks')
                .eq('session_id', subject.sessionId);
            
            if (marksError || !allSubjectMarks) {
                console.error(`Error fetching marks for subject ${subject.name}:`, marksError);
                subject.rank = 'N/A';
                continue;
            }
            
            const marks = allSubjectMarks.map(r => r.marks);
            subject.rank = calculateRank(subject.marks, marks);
        }

        // 2. Calculate position for all subjects
        try {
            // Get all results for this exam and class
            const { data: allClassResults, error: classError } = await supabaseClient
                .from('results')
                .select(`
                    student_id,
                    marks,
                    sessions!inner(examination_id, class_id)
                `)
                .eq('sessions.examination_id', examId)
                .eq('sessions.class_id', studentClassId);

            if (classError || !allClassResults) throw classError;

            // Calculate total marks per student
            const studentTotals = {};
            allClassResults.forEach(result => {
                if (!studentTotals[result.student_id]) {
                    studentTotals[result.student_id] = 0;
                }
                studentTotals[result.student_id] += result.marks;
            });

            // Calculate rank
            const allTotalMarks = Object.values(studentTotals);
            examData.positionAllSubjects = calculateRank(examData.overallTotalMarks, allTotalMarks);
        } catch (error) {
            console.error("Error calculating all subjects position:", error);
            examData.positionAllSubjects = 'N/A';
        }

        // 3. Calculate position for core subjects
        try {
            // Get only core subject results for this exam and class
            const { data: coreResults, error: coreError } = await supabaseClient
                .from('results')
                .select(`
                    student_id,
                    marks,
                    sessions!inner(examination_id, class_id),
                    subjects!inner(name)
                `)
                .eq('sessions.examination_id', examId)
                .eq('sessions.class_id', studentClassId)
                .in('subjects.name', CORE_SUBJECT_NAMES_LOWERCASE);

            if (coreError || !coreResults) throw coreError;

            // Calculate core total per student
            const studentCoreTotals = {};
            coreResults.forEach(result => {
                if (!studentCoreTotals[result.student_id]) {
                    studentCoreTotals[result.student_id] = 0;
                }
                studentCoreTotals[result.student_id] += result.marks;
            });

            // Calculate rank
            const allCoreMarks = Object.values(studentCoreTotals);
            examData.positionCoreSubjects = calculateRank(examData.coreSubjectsRawScore, allCoreMarks);
        } catch (error) {
            console.error("Error calculating core subjects position:", error);
            examData.positionCoreSubjects = 'N/A';
        }
    }
    
    return {
        studentName: studentInfo?.name || 'Unknown Student',
        className: studentInfo?.classes?.name || resultsByExamination[Object.keys(resultsByExamination)[0]]?.className || 'N/A',
        examinations: Object.values(resultsByExamination).sort((a, b) => 
            new Date(b.examinationDate) - new Date(a.examinationDate)
        ),
    };
}

export async function fetchGeneralResults(supabaseClient, generationType, filters) {
    let query;
    const baseSelect = `
        id, 
        marks, 
        students (id, name, classes(name)), 
        sessions (
            id,
            examinations (id, name, examination_date), 
            classes (id, name), 
            subjects (id, name),
            users (id, name, email)
        )
    `;

    if (generationType === 'specificClass') {
        const { data: sessionData, error: sessionError } = await supabaseClient
            .from('sessions')
            .select('id')
            .eq('examination_id', filters.examinationId)
            .eq('class_id', filters.classId)
            .eq('subject_id', filters.subjectId);

        if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;
        if (!sessionData || sessionData.length === 0) return [];

        const sessionIds = sessionData.map(s => s.id);
        query = supabaseClient.from('results').select(baseSelect).in('session_id', sessionIds);
    } else {
        query = supabaseClient.from('results').select(baseSelect).order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
                }
