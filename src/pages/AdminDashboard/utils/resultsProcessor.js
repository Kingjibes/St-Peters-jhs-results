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

// Improved ranking function that handles ties
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

// Fetch filter data with current date
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
    currentDate: getCurrentDate()
  };
}

// Process student results with current date and position calculations
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

  // Organize results by examination
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
        generatedDate: getCurrentDate()
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

  // Calculate positions for each examination
  for (const examId in resultsByExamination) {
    const examData = resultsByExamination[examId];
    
    // Get all results for this examination and class
    const { data: allClassResults, error: classResultsError } = await supabaseClient
      .from('results')
      .select(`
        student_id,
        marks,
        sessions!inner(
          examination_id,
          class_id,
          subject_id,
          subjects!inner(name)
        )
      `)
      .eq('sessions.examination_id', examId)
      .eq('sessions.class_id', studentClassId);

    if (classResultsError) {
      console.error("Error fetching class results:", classResultsError);
      examData.positionAllSubjects = 'N/A';
      examData.positionCoreSubjects = 'N/A';
      continue;
    }

    // Calculate totals for all students
    const studentTotals = {};
    const studentCoreTotals = {};

    allClassResults.forEach(result => {
      const studentId = result.student_id;
      const isCore = CORE_SUBJECT_NAMES_LOWERCASE.includes(
        result.sessions.subjects.name.toLowerCase()
      );

      // All subjects total
      studentTotals[studentId] = (studentTotals[studentId] || 0) + result.marks;
      
      // Core subjects total
      if (isCore) {
        studentCoreTotals[studentId] = (studentCoreTotals[studentId] || 0) + result.marks;
      }
    });

    // Calculate positions
    examData.positionAllSubjects = calculateRank(
      examData.overallTotalMarks,
      Object.values(studentTotals)
    );

    examData.positionCoreSubjects = calculateRank(
      examData.coreSubjectsRawScore,
      Object.values(studentCoreTotals)
    );
  }

  return {
    studentName: studentInfo?.name || 'Unknown Student',
    className: studentInfo?.classes?.name || 'N/A',
    currentDate: getCurrentDate(),
    examinations: Object.values(resultsByExamination).sort((a, b) => 
      new Date(b.examinationDate) - new Date(a.examinationDate)
    ),
  };
}

// Fetch general results
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

// Create new examination with current date
export async function createNewExamination(examName) {
  const { data, error } = await supabase
    .from('examinations')
    .insert([{ 
      name: examName,
      examination_date: getCurrentDate()
    }])
    .select();

  if (error) throw error;
  return data;
        }
