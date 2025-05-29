import { supabase } from '@/lib/supabaseClient';

// Core subjects configuration (exact names as requested)
const CORE_SUBJECTS = {
  ENGLISH: ['english language'],
  MATH: ['mathematics'],
  SCIENCE: ['integrated science'],
  SOCIAL_STUDIES: ['social studies']
};

export const CORE_SUBJECT_CODES = Object.values(CORE_SUBJECTS).flat();

// Ranking function (no ties, matches your image)
const calculateRank = (score, allScores) => {
  if (!allScores?.length) return 'N/A';
  const numericScores = allScores.map(s => +s).filter(s => !isNaN(s));
  const sorted = [...new Set(numericScores)].sort((a, b) => b - a);
  return sorted.indexOf(+score) + 1 || 'N/A';
};

// Fetch general results (required by GenerateResults.jsx)
export async function fetchGeneralResults(supabaseClient, generationType, filters) {
  try {
    const baseSelect = `
      id, marks,
      students(id, name, classes(name)),
      sessions(
        id, examinations(id, name, examination_date),
        classes(id, name),
        subjects(id, name),
        users(id, name, email)
    `;

    let query;
    if (generationType === 'specificClass') {
      const { data: sessionData, error } = await supabaseClient
        .from('sessions')
        .select('id')
        .eq('examination_id', filters.examinationId)
        .eq('class_id', filters.classId)
        .eq('subject_id', filters.subjectId);

      if (error) throw error;
      if (!sessionData?.length) return [];

      query = supabaseClient
        .from('results')
        .select(baseSelect)
        .in('session_id', sessionData.map(s => s.id));
    } else {
      query = supabaseClient
        .from('results')
        .select(baseSelect)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching general results:', err);
    return [];
  }
}

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
  try {
    // Fetch student results
    const { data: studentResults, error } = await supabaseClient
      .from('results')
      .select(`
        marks,
        sessions(
          examination_id, 
          class_id,
          examinations(name, examination_date),
          classes(name),
          subjects(name)
        )
      `)
      .eq('student_id', studentId);

    if (error || !studentResults?.length) return null;

    const studentInfo = allStudentsList.find(s => s.id === studentId);
    const studentClassId = studentResults[0].sessions.class_id;

    // Process exams
    const exams = {};
    for (const result of studentResults) {
      const examId = result.sessions.examination_id;
      if (!exams[examId]) {
        exams[examId] = {
          examinationName: result.sessions.examinations.name,
          examinationDate: result.sessions.examinations.examination_date,
          className: result.sessions.classes.name,
          subjects: [],
          overallTotal: 0,
          coreTotal: 0,
          corePosition: 'N/A',
          overallPosition: 'N/A'
        };
      }

      const subject = {
        name: result.sessions.subjects.name,
        marks: +result.marks || 0,
        position: 'N/A'
      };
      exams[examId].subjects.push(subject);
      exams[examId].overallTotal += subject.marks;

      // Check if core subject (exact match)
      const isCore = CORE_SUBJECT_CODES.some(code => 
        subject.name.toLowerCase() === code.toLowerCase()
      );
      if (isCore) exams[examId].coreTotal += subject.marks;
    }

    // Calculate rankings
    for (const examId in exams) {
      const exam = exams[examId];

      // 1. Subject positions
      for (const subject of exam.subjects) {
        const { data: subjectResults } = await supabaseClient
          .from('results')
          .select('marks')
          .eq('session_id', subject.sessionId);
        subject.position = calculateRank(subject.marks, subjectResults?.map(r => r.marks));
      }

      // 2. Overall position
      const { data: overallResults } = await supabaseClient
        .rpc('get_student_total_marks_for_examination', {
          p_examination_id: examId,
          p_class_id: studentClassId
        });
      exam.overallPosition = calculateRank(exam.overallTotal, overallResults?.map(r => r.total_marks));

      // 3. Core subjects position (exact match to your image)
      const { data: classResults } = await supabaseClient
        .from('results')
        .select('student_id, marks, sessions!inner(subjects!inner(name))')
        .eq('sessions.examination_id', examId)
        .eq('sessions.class_id', studentClassId);

      if (classResults) {
        const coreTotals = {};
        classResults.forEach(r => {
          const isCore = CORE_SUBJECT_CODES.some(code => 
            r.sessions.subjects.name.toLowerCase() === code.toLowerCase()
          );
          if (isCore) {
            coreTotals[r.student_id] = (coreTotals[r.student_id] || 0) + r.marks;
          }
        });
        exam.corePosition = calculateRank(exam.coreTotal, Object.values(coreTotals));
      }
    }

    return {
      studentName: studentInfo?.name || 'Unknown Student',
      className: studentInfo?.classes?.name || exams[Object.keys(exams)[0]]?.className || 'N/A',
      examinations: Object.values(exams).sort((a, b) => 
        new Date(b.examinationDate) - new Date(a.examinationDate))
    };

  } catch (err) {
    console.error('Error processing results:', err);
    return null;
  }
}

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
