import { supabase } from '@/lib/supabaseClient';

export const CORE_SUBJECT_NAMES_LOWERCASE = [
  "mathematics", 
  "english language",
  "integrated science",
  "social studies"
];

// Improved ranking function that handles ties
const calculateRank = (currentScore, allScores) => {
  if (!allScores || allScores.length === 0) return 'N/A';
  
  // Create array of unique scores sorted descending
  const uniqueScores = [...new Set(allScores)].sort((a, b) => b - a);
  
  // Create rank map (handles ties)
  const rankMap = new Map();
  let rank = 1;
  
  uniqueScores.forEach((score, index) => {
    rankMap.set(score, rank);
    rank = index + 2; // Increment rank for next unique score
  });
  
  return rankMap.get(currentScore) || 'N/A';
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
  // 1. Fetch all results for the student
  const { data: studentResults, error: studentResultsError } = await supabaseClient
    .from('results')
    .select(`
      marks,
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

  // 2. Organize results by examination
  const resultsByExamination = studentResults.reduce((acc, result) => {
    const examId = result.sessions.examination_id;
    if (!acc[examId]) {
      acc[examId] = {
        examinationName: result.sessions.examinations.name,
        examinationDate: result.sessions.examinations.examination_date,
        className: result.sessions.classes.name,
        subjects: [],
        overallTotalMarks: 0,
        coreSubjectsRawScore: 0,
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
    });

    acc[examId].overallTotalMarks += result.marks;
    if (isCoreSubject) {
      acc[examId].coreSubjectsRawScore += result.marks;
    }

    return acc;
  }, {});

  // 3. Calculate positions for each examination
  for (const examId in resultsByExamination) {
    const examData = resultsByExamination[examId];
    
    // A. Fetch ALL results for this examination and class
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

    // B. Calculate totals for all students
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

    // C. Calculate positions
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
    examinations: Object.values(resultsByExamination).sort((a, b) => 
      new Date(b.examinationDate) - new Date(a.examinationDate)
    ),
  };
}
