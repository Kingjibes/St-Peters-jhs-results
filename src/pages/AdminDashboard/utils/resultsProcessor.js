import { supabase } from '@/lib/supabaseClient';

// Core subjects configuration exactly matching your report
const CORE_SUBJECTS_CONFIG = {
  ENGLISH: {
    codes: ['eng', 'english','english language'],
    name: 'English',
    weight: 1
  },
  MATH: {
    codes: ['math', 'mathematics'],
    name: 'Math',
    weight: 1
  },
  SCIENCE: {
    codes: ['sci', 'science','integrated science'],
    name: 'Science',
    weight: 1
  },
  SOCIAL_STUDIES: {
    codes: ['soc', 'social studies'],
    name: 'Social Studies',
    weight: 1
  }
};

// Get all possible core subject codes
export const CORE_SUBJECT_CODES = Object.values(CORE_SUBJECTS_CONFIG)
  .flatMap(subject => subject.codes);

// Ranking function that matches your report's unique ranking system
const calculateExamRank = (studentScore, allScores) => {
  if (!allScores || allScores.length === 0) return 'N/A';
  
  // Convert to numbers and sort descending
  const numericScores = [...new Set(allScores.map(s => Number(s)).filter(s => !isNaN(s))];
  const sortedScores = numericScores.sort((a, b) => b - a);
  
  // Find the student's position (no ties)
  return sortedScores.indexOf(studentScore) + 1 || 'N/A';
};

export async function processStudentResultsForDetailView(supabaseClient, studentId, allStudentsList) {
  const { data: studentResults, error: resultsError } = await supabaseClient
    .from('results')
    .select(`
      marks,
      sessions(
        examination_id,
        class_id,
        subject_id,
        examinations(name, examination_date),
        classes(name),
        subjects(name)
      )
    `)
    .eq('student_id', studentId);

  if (resultsError) throw resultsError;
  if (!studentResults?.length) return null;

  const studentInfo = allStudentsList.find(s => s.id === studentId);
  const studentClassId = studentResults[0].sessions.class_id;

  // Process results by examination
  const resultsByExamination = studentResults.reduce((acc, result) => {
    const examId = result.sessions.examination_id;
    if (!acc[examId]) {
      acc[examId] = {
        examinationName: result.sessions.examinations.name,
        examinationDate: result.sessions.examinations.examination_date,
        className: result.sessions.classes.name,
        subjects: [],
        overallTotal: 0,
        coreSubjects: {
          english: { marks: 0, position: 'N/A' },
          math: { marks: 0, position: 'N/A' },
          science: { marks: 0, position: 'N/A' },
          socialStudies: { marks: 0, position: 'N/A' },
          rawTotal: 0,
          position: 'N/A'
        }
      };
    }

    const subjectName = result.sessions.subjects.name.toLowerCase();
    const marks = Number(result.marks) || 0;

    // Add to subjects list
    acc[examId].subjects.push({
      name: result.sessions.subjects.name,
      marks,
      position: 'N/A' // Will be calculated later
    });

    // Add to overall total
    acc[examId].overallTotal += marks;

    // Check and add to core subjects
    for (const [subjectKey, config] of Object.entries(CORE_SUBJECTS_CONFIG)) {
      if (config.codes.some(code => subjectName.includes(code))) {
        acc[examId].coreSubjects[subjectKey.toLowerCase()].marks = marks;
        acc[examId].coreSubjects.rawTotal += marks;
        break;
      }
    }

    return acc;
  }, {});

  // Calculate rankings for each examination
  for (const examId in resultsByExamination) {
    const examData = resultsByExamination[examId];

    // 1. Calculate subject positions
    for (const subject of examData.subjects) {
      const { data: subjectResults, error } = await supabaseClient
        .from('results')
        .select('marks')
        .eq('session_id', subject.sessionId);

      subject.position = error ? 'N/A' : calculateExamRank(subject.marks, subjectResults.map(r => r.marks));
    }

    // 2. Calculate overall position
    const { data: overallResults, error: overallError } = await supabaseClient
      .rpc('get_student_total_marks_for_examination', {
        p_examination_id: examId,
        p_class_id: studentClassId
      });

    examData.overallPosition = overallError ? 'N/A' : 
      calculateExamRank(examData.overallTotal, overallResults.map(r => r.total_marks));

    // 3. Calculate core subjects position (EXACT IMPLEMENTATION FROM YOUR IMAGE)
    const { data: classResults, error: classError } = await supabaseClient
      .from('results')
      .select(`
        student_id,
        marks,
        sessions!inner(
          examination_id,
          subjects!inner(name)
      `)
      .eq('sessions.examination_id', examId)
      .eq('sessions.class_id', studentClassId);

    if (!classError && classResults) {
      // Calculate core totals for all students
      const studentCoreTotals = {};
      classResults.forEach(result => {
        const subjectName = result.sessions.subjects.name.toLowerCase();
        if (CORE_SUBJECT_CODES.some(code => subjectName.includes(code))) {
          studentCoreTotals[result.student_id] = 
            (studentCoreTotals[result.student_id] || 0) + result.marks;
        }
      });

      // Calculate rank for this student
      examData.coreSubjects.position = calculateExamRank(
        examData.coreSubjects.rawTotal,
        Object.values(studentCoreTotals)
      );
    } else {
      examData.coreSubjects.position = 'N/A';
    }
  }

  return {
    studentName: studentInfo?.name || 'Unknown Student',
    className: studentInfo?.classes?.name || 'N/A',
    examinations: Object.values(resultsByExamination).sort((a, b) => 
      new Date(b.examinationDate) - new Date(a.examinationDate))
  };
}
