import { supabase } from '@/lib/supabaseClient';

// Core subjects configuration (exact match to your report)
const CORE_SUBJECTS = {
  ENGLISH: ['english language'],
  MATH: ['mathematics'],
  SCIENCE: ['integrated science'],
  SOCIAL_STUDIES: ['social studies']
};

export const CORE_SUBJECT_CODES = Object.values(CORE_SUBJECTS).flat();

// Enhanced ranking function
const calculateRank = async (supabaseClient, sessionId, studentScore) => {
  try {
    const { data: results } = await supabaseClient
      .from('results')
      .select('marks')
      .eq('session_id', sessionId);
    
    if (!results?.length) return 'N/A';
    
    const scores = results.map(r => +r.marks).filter(s => !isNaN(s));
    const sorted = [...new Set(scores)].sort((a, b) => b - a);
    const rank = sorted.indexOf(+studentScore) + 1;
    return rank > 0 ? rank : 'N/A';
  } catch (error) {
    console.error('Ranking error:', error);
    return 'N/A';
  }
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
  try {
    // Fetch all student results with related data
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
      return null;
    }

    const studentInfo = allStudentsList.find(s => s.id === studentId);
    const studentClassId = studentResults[0].sessions.class_id;

    // Process each examination
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
        marks: +result.marks || 0,
        position: 'N/A',
        sessionId: result.sessions.id
      };

      examinations[examId].subjects.push(subject);
      examinations[examId].totalMarks += subject.marks;

      // Check if core subject
      if (CORE_SUBJECT_CODES.some(code => 
        subject.name.toLowerCase() === code.toLowerCase()
      )) {
        examinations[examId].coreTotal += subject.marks;
      }
    }

    // Calculate rankings for each examination
    for (const examId in examinations) {
      const exam = examinations[examId];

      // Calculate subject positions
      for (const subject of exam.subjects) {
        subject.position = await calculateRank(supabaseClient, subject.sessionId, subject.marks);
      }

      // Calculate overall position
      const { data: overallResults } = await supabaseClient
        .rpc('get_student_total_marks_for_examination', {
          p_examination_id: examId,
          p_class_id: studentClassId
        });
      
      if (overallResults?.length) {
        exam.overallPosition = await calculateRank(
          supabaseClient,
          null,
          exam.totalMarks,
          overallResults.map(r => r.total_marks)
        );
      }

      // Calculate core subjects position
      const { data: coreResults } = await supabaseClient
        .from('results')
        .select('student_id, marks, sessions!inner(subjects!inner(name))')
        .eq('sessions.examination_id', examId)
        .eq('sessions.class_id', studentClassId);

      if (coreResults?.length) {
        const coreTotals = {};
        coreResults.forEach(r => {
          if (CORE_SUBJECT_CODES.some(code => 
            r.sessions.subjects.name.toLowerCase() === code.toLowerCase()
          )) {
            coreTotals[r.student_id] = (coreTotals[r.student_id] || 0) + r.marks;
          }
        });
        
        exam.corePosition = await calculateRank(
          supabaseClient,
          null,
          exam.coreTotal,
          Object.values(coreTotals)
        );
      }
    }

    // Format the final output to match your report exactly
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
    return null;
  }
}
