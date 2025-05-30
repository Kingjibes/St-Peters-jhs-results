import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import mammoth from 'mammoth';

export const exportResultsToCSV = (dataToExport, fileNamePrefix, toast) => {
    if (!dataToExport || dataToExport.length === 0) {
        toast({ title: "No Data", description: "No results to export." });
        return;
    }
    const csvData = dataToExport.map(result => ({
        "Student Name": result.students?.name || 'N/A',
        "Marks": result.marks,
        "Examination": result.sessions?.examinations?.name || 'N/A',
        "Exam Date": result.sessions?.examinations?.examination_date ? new Date(result.sessions.examinations.examination_date).toLocaleDateString() : 'N/A',
        "Class": result.sessions?.classes?.name || 'N/A',
        "Subject": result.sessions?.subjects?.name || 'N/A',
        "Teacher Name": result.sessions?.users?.name || result.sessions?.users?.email || 'N/A',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
    const fileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
    toast({ title: "Export Successful", description: `Results exported to ${fileName}`});
};

export const exportResultsToExcel = (dataToExport, fileNamePrefix, toast) => {
    if (!dataToExport || dataToExport.length === 0) {
        toast({ title: "No Data", description: "No results to export." });
        return;
    }
    const excelData = dataToExport.map(result => ({
        "Student Name": result.students?.name || 'N/A',
        "Marks": result.marks,
        "Examination": result.sessions?.examinations?.name || 'N/A',
        "Exam Date": result.sessions?.examinations?.examination_date ? new Date(result.sessions.examinations.examination_date).toLocaleDateString() : 'N/A',
        "Class": result.sessions?.classes?.name || 'N/A',
        "Subject": result.sessions?.subjects?.name || 'N/A',
        "Teacher Name": result.sessions?.users?.name || result.sessions?.users?.email || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    const fileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: "Export Successful", description: `Results exported to ${fileName}`});
};


export const exportStudentDetailToWord = async (studentData, toast) => {
    if (!studentData) {
        toast({ variant: "destructive", title: "No Data", description: "No student details to export." });
        return;
    }
    try {
        const sections = [
            new Paragraph({
                children: [new TextRun({ text: "Student Performance Report", bold: true, size: 32 })],
                heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 300 },
            }),
            new Paragraph({
                children: [new TextRun({ text: `Student Name: ${studentData.studentName}`, bold: true, size: 24 })],
                spacing: { after: 100 },
            }),
            new Paragraph({
                children: [new TextRun({ text: `Class: ${studentData.className}`, size: 22 })],
                spacing: { after: 200 },
            }),
        ];

        studentData.examinations.forEach(exam => {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: exam.examinationName, bold: true, size: 24 })],
                    heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 100 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Date: ${exam.examinationDate || 'N/A'}`, size: 20 })],
                    spacing: { after: 200 },
                })
            );

            const tableRows = [
                new DocxTableRow({
                    children: [
                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Subject", bold: true })] })], width: { size: 3000, type: WidthType.DXA } }),
                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Marks", bold: true })] })], width: { size: 1500, type: WidthType.DXA } }),
                        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Position (Subject)", bold: true })] })], width: { size: 2000, type: WidthType.DXA } }),
                    ], tableHeader: true,
                })
            ];

            exam.subjects.forEach(subject => {
                tableRows.push(new DocxTableRow({
                    children: [
                        new DocxTableCell({ children: [new Paragraph(subject.name)] }),
                        new DocxTableCell({ children: [new Paragraph(subject.marks.toString())] }),
                        new DocxTableCell({ children: [new Paragraph(subject.rank ? subject.rank.toString() : 'N/A')] }),
                    ],
                }));
            });
            sections.push(new DocxTable({ rows: tableRows, width: { size: 9000, type: WidthType.DXA }, columnWidths: [3000, 1500, 2000] }));
            
            sections.push(new Paragraph({
                children: [new TextRun({ text: `Total Marks (${exam.examinationName}): ${exam.overallTotalMarks}`, bold: true, size: 20 })],
                spacing: { before: 200, after: 50 },
            }));
            sections.push(new Paragraph({
                children: [new TextRun({ text: `Position (All Subjects): ${exam.positionAllSubjects || 'N/A'}`, bold: true, size: 20 })],
                spacing: { after: 100 },
            }));

            if (exam.coreSubjectsRawScore > 0) {
                 sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: `Raw Score (4 Core Subjects): ${exam.coreSubjectsRawScore}`, bold: true, size: 20 })],
                        spacing: { after: 50 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: `Position (4 Core Subjects): ${exam.positionCoreSubjects || 'N/A'}`, bold: true, size: 20 })],
                        spacing: { after: 200 },
                    })
                );
            }
        });

        const doc = new Document({ sections: [{ children: sections }] });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${studentData.studentName.replace(/\s+/g, '_')}_Performance_Report.docx`);
        toast({ title: "Export Successful", description: "Student report exported as DOCX." });
    } catch (error) {
        console.error("Error exporting student detail to Word:", error);
        toast({ variant: "destructive", title: "Export Error", description: "Failed to export student report as DOCX." });
    }
};


// Helper to find or create session (simplified example, needs user context for teacher_id)
async function findOrCreateSession(supabase, { examination_id, class_id, subject_id, teacher_id /* admin might not have this readily */ }) {
    // For admin import, teacher_id might be tricky. Using a default/placeholder if not available.
    // A robust solution might involve selecting a teacher during import or using a generic admin user ID.
    const effectiveTeacherId = teacher_id || '00000000-0000-0000-0000-000000000000'; // Placeholder UUID

    let { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .select('id')
        .eq('examination_id', examination_id)
        .eq('class_id', class_id)
        .eq('subject_id', subject_id)
        // .eq('teacher_id', effectiveTeacherId) // teacher_id is crucial for session uniqueness by teacher
        .single();

    if (sessionErr && sessionErr.code !== 'PGRST116') { // PGRST116: no rows found
        throw sessionErr;
    }

    if (!session) {
        // If admin is importing, they might need to create sessions.
        // This assumes admin has rights to create sessions or select an existing one.
        // For simplicity, this example doesn't create a new session if not found for admin.
        // It implies the session should pre-exist from a teacher's action.
        // A more complex UI would allow admin to map to existing sessions or create new ones.
        console.warn(`Session not found for exam ${examination_id}, class ${class_id}, subject ${subject_id}. Cannot import result for this combination without a valid session.`);
        return null; 
    }
    return session.id;
}


export const handleResultsWordImport = async ({ supabase, file, allStudents, examinations, classes, subjects, toast }) => {
    let importedResultsCount = 0;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const tables = doc.querySelectorAll('table');

        toast({title: "Importing...", description: "Please ensure your Word document table has headers: Student Name, Examination Name, Class Name, Subject Name, Marks."});

        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) { // Skip header row
                const cells = rows[i].querySelectorAll('td');
                if (cells.length >= 5) {
                    const studentName = cells[0].textContent.trim();
                    const examName = cells[1].textContent.trim();
                    const className = cells[2].textContent.trim();
                    const subjectName = cells[3].textContent.trim();
                    const marks = parseInt(cells[4].textContent.trim(), 10);

                    if (studentName && examName && className && subjectName && !isNaN(marks)) {
                        const student = allStudents.find(s => s.name.toLowerCase() === studentName.toLowerCase());
                        const examination = examinations.find(e => e.name.toLowerCase() === examName.toLowerCase());
                        const studentClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
                        const subject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());

                        if (student && examination && studentClass && subject) {
                            const session_id = await findOrCreateSession(supabase, {
                                examination_id: examination.id,
                                class_id: studentClass.id,
                                subject_id: subject.id,
                                // teacher_id: null // Admin import, session might pre-exist
                            });

                            if (session_id) {
                                const { error: insertError } = await supabase.from('results').upsert({
                                    session_id: session_id,
                                    student_id: student.id,
                                    marks: marks,
                                }, { onConflict: 'session_id, student_id' }); // Upsert to update if exists
                                if (insertError) console.error("Error upserting result from Word:", insertError);
                                else importedResultsCount++;
                            }
                        } else {
                            console.warn(`Skipping row due to missing DB record: S:${studentName}, E:${examName}, C:${className}, Sub:${subjectName}`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error processing Word document:", error);
        toast({variant: "destructive", title: "Word Processing Error", description: error.message});
        throw error; // Re-throw for the main handler
    }
    return importedResultsCount;
};

export const handleResultsExcelImport = async ({ supabase, file, allStudents, examinations, classes, subjects, toast }) => {
    let importedResultsCount = 0;
    try {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
            reader.onload = resolve;
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        });
        
        const workbook = XLSX.read(reader.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        toast({title: "Importing...", description: "Please ensure your Excel sheet has headers: Student Name, Examination Name, Class Name, Subject Name, Marks."});

        if (jsonData.length > 1) { // More than just header
            const headers = jsonData[0].map(h => h.toString().trim().toLowerCase());
            const studentNameCol = headers.indexOf("student name");
            const examNameCol = headers.indexOf("examination name");
            const classNameCol = headers.indexOf("class name");
            const subjectNameCol = headers.indexOf("subject name");
            const marksCol = headers.indexOf("marks");

            if ([studentNameCol, examNameCol, classNameCol, subjectNameCol, marksCol].includes(-1)) {
                throw new Error("Missing one or more required columns in Excel: Student Name, Examination Name, Class Name, Subject Name, Marks");
            }

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const studentName = row[studentNameCol]?.toString().trim();
                const examName = row[examNameCol]?.toString().trim();
                const className = row[classNameCol]?.toString().trim();
                const subjectName = row[subjectNameCol]?.toString().trim();
                const marks = parseInt(row[marksCol], 10);

                if (studentName && examName && className && subjectName && !isNaN(marks)) {
                    const student = allStudents.find(s => s.name.toLowerCase() === studentName.toLowerCase());
                    const examination = examinations.find(e => e.name.toLowerCase() === examName.toLowerCase());
                    const studentClass = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
                    const subject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());

                    if (student && examination && studentClass && subject) {
                         const session_id = await findOrCreateSession(supabase, {
                            examination_id: examination.id,
                            class_id: studentClass.id,
                            subject_id: subject.id,
                        });
                        if (session_id) {
                            const { error: insertError } = await supabase.from('results').upsert({
                                session_id: session_id,
                                student_id: student.id,
                                marks: marks,
                            }, { onConflict: 'session_id, student_id' });
                            if (insertError) console.error("Error upserting result from Excel:", insertError);
                            else importedResultsCount++;
                        }
                    } else {
                        console.warn(`Skipping row due to missing DB record: S:${studentName}, E:${examName}, C:${className}, Sub:${subjectName}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error processing Excel document:", error);
        toast({variant: "destructive", title: "Excel Processing Error", description: error.message});
        throw error; // Re-throw
    }
    return importedResultsCount;
};
