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
    const sortedScores = [...allScores].sort((a, b) => b - a);
    return sortedScores.indexOf(currentScore) + 1;
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
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

    const resultsByExamination = studentResults.reduce((acc, result) => {
        const examId = result.sessions.examination_id;
        const subjectName = result.sessions.subjects.name.toLowerCase();
        if (!acc[examId]) {
            acc[examId] = {
                examinationName: result.sessions.examinations.name,
                examinationDate: result.sessions.examinations.examination_date
                    ? new Date(result.sessions.examinations.examination_date).toLocaleDateString()
                    : 'N/A',
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

        if (CORE_SUBJECT_NAMES_LOWERCASE.includes(subjectName)) {
            acc[examId].coreSubjectsRawScore += result.marks;
        }

        return acc;
    }, {});

    for (const examId in resultsByExamination) {
        const examData = resultsByExamination[examId];

        // Subject-wise rank
        for (const subject of examData.subjects) {
            try {
                const { data: allSubjectSessionResults, error } = await supabaseClient
                    .from('results')
                    .select('marks')
                    .eq('session_id', subject.sessionId);

                if (error || !allSubjectSessionResults) {
                    console.error(`Error fetching session results for subject ${subject.name}:`, error);
                    subject.rank = 'N/A';
                    continue;
                }

                const allMarks = allSubjectSessionResults.map(r => r.marks);
                subject.rank = calculateRank(subject.marks, allMarks);
            } catch (err) {
                console.error(`Error processing rank for subject ${subject.name}:`, err);
                subject.rank = 'N/A';
            }
        }

        // Position for all subjects
        if (examId && studentClassId) {
            try {
                const { data: allStudentsInClassExam, error } = await supabaseClient
                    .rpc('get_student_total_marks_for_examination', {
                        p_examination_id: examId,
                        p_class_id: studentClassId
                    });

                if (error || !allStudentsInClassExam || allStudentsInClassExam.length === 0) {
                    console.error("No data or error in allSubjects position:", error);
                    examData.positionAllSubjects = 'N/A';
                } else {
                    const allTotalMarks = allStudentsInClassExam.map(s => s.total_marks);
                    examData.positionAllSubjects = calculateRank(examData.overallTotalMarks, allTotalMarks);
                }
            } catch (err) {
                console.error("Unexpected error in positionAllSubjects:", err);
                examData.positionAllSubjects = 'N/A';
            }
        }

        // Position for 4 core subjects
        if (examData.coreSubjectsRawScore > 0 && examId && studentClassId) {
            try {
                const { data: allStudentsCoreScoresExam, error } = await supabaseClient
                    .rpc('get_student_core_subject_total_for_examination', {
                        p_examination_id: examId,
                        p_class_id: studentClassId,
                        p_core_subject_names: CORE_SUBJECT_NAMES_LOWERCASE
                    });

                if (error || !allStudentsCoreScoresExam || allStudentsCoreScoresExam.length === 0) {
                    console.error("No core subject data or error:", error);
                    examData.positionCoreSubjects = 'N/A';
                } else {
                    const allCoreScores = allStudentsCoreScoresExam.map(s => s.total_core_marks);
                    examData.positionCoreSubjects = calculateRank(examData.coreSubjectsRawScore, allCoreScores);
                }
            } catch (err) {
                console.error("Unexpected error in positionCoreSubjects:", err);
                examData.positionCoreSubjects = 'N/A';
            }
        } else {
            examData.positionCoreSubjects = 'N/A';
        }
    }

    return {
        studentName: studentInfo?.name || 'Unknown Student',
        className: studentInfo?.classes?.name || resultsByExamination[Object.keys(resultsByExamination)[0]]?.className || 'N/A',
        examinations: Object.values(resultsByExamination).sort((a, b) => new Date(b.examinationDate) - new Date(a.examinationDate)),
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
