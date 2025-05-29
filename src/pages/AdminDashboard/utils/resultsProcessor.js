import { supabase } from '@/lib/supabaseClient';

// Core subjects configuration
const CORE_SUBJECTS = {
  ENGLISH: ['english language'],
  MATH: ['mathematics'],
  SCIENCE: ['integrated science'],
  SOCIAL_STUDIES: ['social studies']
};

export const CORE_SUBJECT_CODES = Object.values(CORE_SUBJECTS).flat();

const calculateRankFromArray = (score, scoreArray) => {
  const sorted = [...new Set(scoreArray)].sort((a, b) => b - a);
  const rank = sorted.indexOf(Number(score)) + 1;
  return rank > 0 ? rank : 'N/A';
};

// Rank for individual subject (using session_id context)
const calculateSubjectRank = async (supabaseClient, sessionId, marks) => {
  try {
    const { data: results, error } = await supabaseClient
      .from('results')
      .select('marks')
      .eq('session_id', sessionId);

    if (error || !results?.length) return 'N/A';

    const scores = results.map(r => Number(r.marks)).filter(s => !isNaN(s));
    return calculateRankFromArray(marks, scores);
  } catch (error) {
    console.error('Ranking error:', error);
    return 'N/A';
  }
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
  try {
    const { data: studentResults, error } = await supabaseClient
      .from('results')
      .select(`
        marks,
        sessions(
          id,
          examination_id,
          class_id,
          subject_id,
          examinations(name, examination_date),
          classes(name),
          subjects(name)
        )
      `)
      .eq('student_id', studentId);

    if (error || !studentResults?.length) {
      console.error('No results found for student:', studentId);
      return {
        studentName: 'Unknown Student',
        className: 'N/A',
        examinations: []
      };
    }

    const studentInfo = allStudentsList.find(s => s.id === studentId);
    const studentClassId = studentResults[0].sessions.class_id;

    const examinations = {};
    for (const result of studentResults) {
      const examId = result.sessions.examination_id;
      if (!examinations[examId]) {
        examinations[examId] = {
          examinationName: result.sessions.examinations.name,
          examinationDate: new Date(result.sessions.examinations.examination_date).toISOString().split('T')[0],
          className: result.sessions.classes.name,
          subjects: [],
          totalMarks: 0,
          coreTotal: 0,
          overallPosition: 'N/A',
          corePosition: 'N/A'
        };
      }

      const subject = {
        name: result.sessions.subjects.name,
        marks: Number(result.marks) || 0,
        position: 'N/A',
        sessionId: result.sessions.id
      };

      examinations[examId].subjects.push(subject);
      examinations[examId].totalMarks += subject.marks;

      if (CORE_SUBJECT_CODES.includes(subject.name.toLowerCase())) {
        examinations[examId].coreTotal += subject.marks;
      }
    }

    // Rank processing
    for (const examId in examinations) {
      const exam = examinations[examId];

      for (const subject of exam.subjects) {
        subject.position = await calculateSubjectRank(supabaseClient, subject.sessionId, subject.marks);
      }

      const { data: overallResults } = await supabaseClient
        .rpc('get_student_total_marks_for_examination', {
          p_examination_id: parseInt(examId),
          p_class_id: studentClassId
        });

      if (overallResults?.length) {
        const totalArray = overallResults.map(r => r.total_marks);
        exam.overallPosition = calculateRankFromArray(exam.totalMarks, totalArray);
      }

      const { data: coreResults } = await supabaseClient
        .from('results')
        .select('student_id, marks, sessions!inner(subjects!inner(name))')
        .eq('sessions.examination_id', examId)
        .eq('sessions.class_id', studentClassId);

      if (coreResults?.length) {
        const coreTotals = {};
        coreResults.forEach(r => {
          if (CORE_SUBJECT_CODES.includes(r.sessions.subjects.name.toLowerCase())) {
            coreTotals[r.student_id] = (coreTotals[r.student_id] || 0) + r.marks;
          }
        });

        exam.corePosition = calculateRankFromArray(
          exam.coreTotal,
          Object.values(coreTotals)
        );
      }
    }

    return {
      studentName: studentInfo?.name || 'Unknown Student',
      className: studentInfo?.classes?.name || examinations[Object.keys(examinations)[0]]?.className || 'N/A',
      examinations: Object.values(examinations).map(exam => ({
        name: exam.examinationName,
        date: exam.examinationDate,
        className: exam.className,
        subjects: exam.subjects.map(sub => ({
          name: sub.name,
          marks: sub.marks,
          position: sub.position
        })),
        totalMarks: exam.totalMarks,
        overallPosition: exam.overallPosition,
        coreTotal: exam.coreTotal,
        corePosition: exam.corePosition
      })).sort((a, b) => new Date(b.date) - new Date(a.date))
    };

  } catch (error) {
    console.error('Error processing results:', error);
    return {
      studentName: 'Unknown Student',
      className: 'N/A',
      examinations: []
    };
  }
}

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
      )
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

// ✅ This fixes the Rollup error by making sure fetchFilterData is exported
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
          
