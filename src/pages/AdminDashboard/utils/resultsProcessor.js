const CORE_SUBJECTS = ['english language', 'mathematics', 'integrated science', 'social studies'];

function calculateRanking(targetValue, allValues) {
  const sorted = [...new Set(allValues)].sort((a, b) => b - a);
  const rank = sorted.indexOf(targetValue) + 1;
  return rank || 'N/A';
}

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

    if (error || !studentResults?.length) throw error;

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
          corePosition: 'N/A',
        };
      }

      const subjectName = result.sessions.subjects.name.toLowerCase();
      const marks = Number(result.marks) || 0;

      examinations[examId].subjects.push({
        name: result.sessions.subjects.name,
        marks,
        position: 'N/A',
        sessionId: result.sessions.id,
      });

      examinations[examId].totalMarks += marks;

      if (CORE_SUBJECTS.includes(subjectName)) {
        examinations[examId].coreTotal += marks;
      }
    }

    // Now compute rankings for each exam
    for (const examId in examinations) {
      const exam = examinations[examId];

      // Get all results for this class and exam
      const { data: allResults } = await supabaseClient
        .from('results')
        .select('student_id, marks, sessions!inner(subjects(name), examination_id, class_id)')
        .eq('sessions.examination_id', examId)
        .eq('sessions.class_id', studentClassId);

      if (!allResults?.length) continue;

      // Total marks per student
      const studentTotals = {};
      const studentCoreTotals = {};

      for (const res of allResults) {
        const sid = res.student_id;
        const subjectName = res.sessions.subjects.name.toLowerCase();
        const mark = Number(res.marks) || 0;

        studentTotals[sid] = (studentTotals[sid] || 0) + mark;

        if (CORE_SUBJECTS.includes(subjectName)) {
          studentCoreTotals[sid] = (studentCoreTotals[sid] || 0) + mark;
        }
      }

      const totalScores = Object.values(studentTotals);
      const coreScores = Object.values(studentCoreTotals);

      exam.overallPosition = calculateRanking(exam.totalMarks, totalScores);
      exam.corePosition = calculateRanking(exam.coreTotal, coreScores);

      // Subject-wise ranking (optional, already calculated above)
      for (const subject of exam.subjects) {
        const { data: subjectResults } = await supabaseClient
          .from('results')
          .select('marks')
          .eq('session_id', subject.sessionId);

        const subjectMarks = subjectResults?.map(r => Number(r.marks) || 0) || [];
        subject.position = calculateRanking(subject.marks, subjectMarks);
      }
    }

    return {
      studentName: studentInfo?.name || 'Unknown Student',
      className: studentInfo?.classes?.name || Object.values(examinations)[0]?.className || 'N/A',
      examinations: Object.values(examinations).sort((a, b) => new Date(b.examinationDate) - new Date(a.examinationDate)),
    };
  } catch (error) {
    console.error('Error processing results:', error);
    return {
      studentName: 'Unknown Student',
      className: 'N/A',
      examinations: [],
    };
  }
}
