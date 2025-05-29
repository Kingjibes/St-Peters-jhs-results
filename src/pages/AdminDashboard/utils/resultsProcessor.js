// src/pages/AdminDashboard/utils/resultsProcessor.js
import { supabase } from '@/lib/supabaseClient';

export const CORE_SUBJECT_NAMES_LOWERCASE = [
  "mathematics", 
  "english language",
  "integrated science", 
  "social studies"
];

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Improved ranking function
const calculateRank = (currentScore, allScores) => {
  if (!allScores || allScores.length === 0) return 'N/A';
  
  const uniqueScores = [...new Set(allScores)].sort((a, b) => b - a);
  const rankMap = new Map();
  let rank = 1;
  
  uniqueScores.forEach((score, index) => {
    rankMap.set(score, rank);
    rank = index + 2;
  });
  
  return rankMap.get(currentScore) || 'N/A';
};

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
    currentDate: getCurrentDate() // Add current date to returned data
  };
}

export async function createNewExamination(examName) {
  const { data, error } = await supabase
    .from('examinations')
    .insert([
      { 
        name: examName,
        examination_date: getCurrentDate() // Use current date for new exams
      }
    ])
    .select();

  if (error) throw error;
  return data;
}

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
  if (!studentResults?.length) return null;

  const studentInfo = allStudentsList.find(s => s.id === studentId);
  const studentClassId = studentResults[0]?.sessions?.class_id;

  // Organize results by examination with current date for new records
  const resultsByExamination = studentResults.reduce((acc, result) => {
    const examId = result.sessions.examination_id;
    if (!acc[examId]) {
      acc[examId] = {
        examinationName: result.sessions.examinations.name,
        examinationDate: result.sessions.examinations.examination_date || getCurrentDate(),
        className: result.sessions.classes.name,
        subjects: [],
        overallTotalMarks: 0,
        coreSubjectsRawScore: 0,
        generatedDate: getCurrentDate() // Add current generation date
      };
    }

    const isCoreSubject = CORE_SUBJECT_NAMES_LOWERCASE.includes(
      result.sessions.subjects.name.toLowerCase()
    );

    acc[examId].subjects.push({
      id: result.sessions.subjects.id,
      name: result.sessions.subjects.name,
      marks: result.marks,
      isCore: isCoreSubject,
      sessionId: result.sessions.id,
      recordedDate: result.created_at || getCurrentDate()
    });

    acc[examId].overallTotalMarks += result.marks;
    if (isCoreSubject) {
      acc[examId].coreSubjectsRawScore += result.marks;
    }

    return acc;
  }, {});

  // Rest of the position calculation remains the same...
  // [Previous position calculation code here]

  return {
    studentName: studentInfo?.name || 'Unknown Student',
    className: studentInfo?.classes?.name || 'N/A',
    currentDate: getCurrentDate(), // Include current date in response
    examinations: Object.values(resultsByExamination).sort((a, b) => 
      new Date(b.examinationDate) - new Date(a.examinationDate)
    ),
  };
}
