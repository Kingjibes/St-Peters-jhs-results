import { supabase } from '@/lib/supabaseClient';

// Core subject names with all possible variations
export const CORE_SUBJECT_NAMES_LOWERCASE = [
  "mathematics", "maths",
  "english language", "english",
  "integrated science", "science",
  "social studies"
];

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
  
  const numericScores = allScores
    .map(score => Number(score))
    .filter(score => !isNaN(score));
    
  if (numericScores.length === 0) return 'N/A';
  
  const sortedUniqueScores = [...new Set(numericScores)].sort((a, b) => b - a);
  const rank = sortedUniqueScores.findIndex(score => currentScore >= score) + 1;
  
  return rank || 'N/A';
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
    
    const subjectData = {
      id: result.sessions.subjects.id,
      name: result.sessions.subjects.name,
      marks: result.marks,
      sessionId: result.sessions.id,
    };
    
    acc[examId].subjects.push(subjectData);
    acc[examId].overallTotalMarks += result.marks;
    
    if (CORE_SUBJECT_NAMES_LOWERCASE.some(coreSub => 
      result.sessions.subjects.name.toLowerCase().includes(coreSub.toLowerCase())
    )) {
      acc[examId].coreSubjectsRawScore += result.marks;
    }
    
    return acc;
  }, {});

  // Calculate rankings for each examination
  for (const examId in resultsByExamination) {
    const examData = resultsByExamination[examId];
    
    // Subject-wise ranking
    for (const subject of examData.subjects) {
      const { data: allSubjectSessionResults, error: subjectSessionError } = await supabaseClient
        .from('results')
        .select('marks')
        .eq('session_id', subject.sessionId);
        
      subject.rank = subjectSessionError ? 'N/A' : 
        calculateRank(subject.marks, allSubjectSessionResults.map(r => r.marks));
    }

    // Overall position (all subjects)
    const { data: allStudentsInClassExam, error: classExamError } = await supabaseClient
      .rpc('get_student_total_marks_for_examination', {
        p_examination_id: examId,
        p_class_id: studentClassId
      });
    
    examData.positionAllSubjects = classExamError ? 'N/A' : 
      calculateRank(examData.overallTotalMarks, allStudentsInClassExam.map(s => s.total_marks));

    // Core subjects position
    if (examData.coreSubjectsRawScore > 0) {
      try {
        const { data: allStudentsCoreScores, error: coreError } = await supabaseClient
          .from('results')
          .select(`
            student_id,
            marks,
            sessions!inner(
              examination_id,
              class_id,
              subjects!inner(name)
            )
          `)
          .eq('sessions.examination_id', examId)
          .eq('sessions.class_id', studentClassId)
          .in('sessions.subjects.name', CORE_SUBJECT_NAMES_LOWERCASE);

        if (!coreError && allStudentsCoreScores) {
          const studentCoreTotals = allStudentsCoreScores.reduce((acc, result) => {
            acc[result.student_id] = (acc[result.student_id] || 0) + result.marks;
            return acc;
          }, {});

          examData.positionCoreSubjects = calculateRank(
            examData.coreSubjectsRawScore,
            Object.values(studentCoreTotals)
          );
          examData.coreSubjectsRankingPoolSize = Object.keys(studentCoreTotals).length;
        } else {
          examData.positionCoreSubjects = 'N/A';
        }
      } catch (e) {
        console.error('Core subjects ranking error:', e);
        examData.positionCoreSubjects = 'N/A';
      }
    } else {
      examData.positionCoreSubjects = 'N/A';
    }
  }
  
  return {
    studentName: studentInfo?.name || 'Unknown Student',
    className: studentInfo?.classes?.name || resultsByExamination[Object.keys(resultsByExamination)[0]]?.className || 'N/A',
    examinations: Object.values(resultsByExamination).sort((a,b) => 
      new Date(b.examinationDate) - new Date(a.examinationDate)),
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
