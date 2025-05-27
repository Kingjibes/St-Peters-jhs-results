import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Download, Upload, FileText as FileTextIcon, UserCheck, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';

const StudentResultsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [students, setStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: studentsData, error: studentsError }, { data: classesData, error: classesError }] = await Promise.all([
        supabase.from('students').select('id, name, class_id, classes(id, name)'),
        supabase.from('classes').select('id, name').order('name')
      ]);

      if (studentsError) throw studentsError;
      if (classesError) throw classesError;

      setStudents(studentsData || []);
      setFilteredStudents(studentsData || []);
      setAllClasses(classesData || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Error fetching data", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    let currentStudents = students;
    if (selectedClassFilter) {
      currentStudents = currentStudents.filter(student => student.class_id === selectedClassFilter);
    }
    if (searchTerm) {
      currentStudents = currentStudents.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredStudents(currentStudents);
  }, [searchTerm, selectedClassFilter, students]);

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setIsLoadingResults(true);
    setStudentResults([]);
    try {
      const { data: resultsData, error } = await supabase
        .from('results')
        .select(`
          id,
          marks,
          sessions (
            examinations (name),
            subjects (name),
            classes (name),
            created_at 
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { foreignTable: 'sessions', ascending: false });

      if (error) throw error;
      setStudentResults(resultsData || []);
      if (resultsData.length === 0) {
        toast({ title: "No Results Found", description: `No results found for ${student.name}.`});
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error fetching student results", description: error.message });
    } finally {
      setIsLoadingResults(false);
    }
  };
  
  const exportResultsToExcel = () => {
    if (!selectedStudent || studentResults.length === 0) {
      toast({ title: "No Data", description: "No results to export for the selected student." });
      return;
    }
    const dataForExcel = studentResults.map(res => ({
      "Examination": res.sessions.examinations?.name || 'N/A',
      "Subject": res.sessions.subjects?.name || 'N/A',
      "Class": res.sessions.classes?.name || 'N/A',
      "Marks": res.marks,
      "Date": res.sessions.created_at ? new Date(res.sessions.created_at).toLocaleDateString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Results");
    XLSX.utils.sheet_add_aoa(worksheet, [["Student Name:", selectedStudent.name]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(worksheet, [["Class:", selectedStudent.classes?.name || "N/A"]], { origin: "C1" });
    
    XLSX.writeFile(workbook, `${selectedStudent.name.replace(/\s+/g, '_')}_results.xlsx`);
    toast({ title: "Export Successful", description: "Results exported to Excel." });
  };

  const exportResultsToWord = async () => {
    if (!selectedStudent || studentResults.length === 0) {
      toast({ title: "No Data", description: "No results to export for the selected student." });
      return;
    }

    const tableHeader = new DocxTableRow({
      children: [
        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Examination", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Subject", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
        new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Marks", bold: true })] })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
      ],
    });

    const dataRows = studentResults.map(res => new DocxTableRow({
      children: [
        new DocxTableCell({ children: [new Paragraph(res.sessions.examinations?.name || 'N/A')], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
        new DocxTableCell({ children: [new Paragraph(res.sessions.subjects?.name || 'N/A')], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
        new DocxTableCell({ children: [new Paragraph(String(res.marks))], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
      ],
    }));

    const table = new DocxTable({
      rows: [tableHeader, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: `Results for: ${selectedStudent.name}`, bold: true, size: 32 })], heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: `Class: ${selectedStudent.classes?.name || 'N/A'}`, size: 24 })], heading: HeadingLevel.HEADING_2 }),
          new Paragraph(" "), 
          table,
        ],
      }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${selectedStudent.name.replace(/\s+/g, '_')}_results.docx`);
      toast({ title: "Export Successful", description: "Results exported to Word." });
    } catch (err) {
      toast({ variant: "destructive", title: "Word Export Error", description: err.message });
    }
  };
  
  const handleImportWordResults = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a .docx Word document." });
        return;
    }

    setIsLoading(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });
        
        // Basic parsing logic (highly dependent on Word doc structure)
        // This is a placeholder and needs to be very robust for real-world use.
        // It assumes a very specific table structure in the Word doc.
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const tables = doc.querySelectorAll('table');
        
        if (tables.length === 0) {
            throw new Error("No tables found in Word document. Cannot parse results.");
        }

        const resultsToInsert = [];
        // Example: Iterate through first table, assuming columns: Student Name, Exam, Subject, Marks
        // This will need significant refinement based on actual document format.
        const rows = tables[0].querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) { // Skip header row
            const cells = rows[i].querySelectorAll('td');
            if (cells.length < 4) continue; // Expect at least 4 columns

            const studentName = cells[0].textContent.trim();
            const examName = cells[1].textContent.trim();
            const subjectName = cells[2].textContent.trim();
            const marks = parseInt(cells[3].textContent.trim(), 10);

            if (studentName && examName && subjectName && !isNaN(marks)) {
                 // Find student_id, examination_id, subject_id, class_id from DB
                 // Create a session if not exists (complex logic)
                 // For simplicity, this example skips the DB lookups and session creation.
                 // In a real app, you'd do:
                 // const {data: student} = await supabase.from('students').select('id').eq('name', studentName).single()
                 // const {data: exam} = await supabase.from('examinations').select('id').eq('name', examName).single()
                 // etc. then create/find session, then insert result.
                 console.log({studentName, examName, subjectName, marks}); // Log parsed data
                 toast({title:"Parsed Row (Example)", description: `${studentName}, ${examName}, ${subjectName}, ${marks}`});
            }
        }
        // After preparing `resultsToInsert` array with proper IDs:
        // const { error } = await supabase.from('results').insert(resultsToInsert);
        // if (error) throw error;
        
        toast({ title: "Word Import (Partial)", description: "Parsed some data. DB insertion logic is complex and needs specific implementation based on your Word doc structure and DB schema relationships." });

    } catch (error) {
        toast({ variant: "destructive", title: "Word Import Error", description: `Failed to process Word document: ${error.message}` });
    } finally {
        setIsLoading(false);
        if (event.target) event.target.value = ""; // Reset file input
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-screen"
    >
      <header className="pb-4 border-b border-border/50">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600">
          Student Performance Center
        </h1>
        <p className="text-muted-foreground mt-1">
          View, analyze, and manage individual student results.
        </p>
      </header>

      <Card className="shadow-lg border-border/60">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Search className="mr-2 h-5 w-5 text-primary"/>Find Student</CardTitle>
          <CardDescription>Search by name or filter by class to view detailed results.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Search student by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-background/70 backdrop-blur-sm"
            disabled={isLoading}
          />
          <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter} disabled={isLoading}>
            <SelectTrigger className="w-full bg-background/70 backdrop-blur-sm">
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {isLoading && <p className="text-center text-muted-foreground">Loading students...</p>}

      {!isLoading && filteredStudents.length === 0 && (
         <motion.div 
            initial={{ opacity: 0, y:10 }}
            animate={{ opacity: 1, y:0 }}
            className="text-center text-muted-foreground mt-8 p-6 bg-card rounded-lg shadow-md border border-border/50"
        >
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-lg">No students match your current filter criteria.</p>
        </motion.div>
      )}

      {!isLoading && filteredStudents.length > 0 && (
        <Card className="shadow-lg border-border/60 max-h-96 overflow-y-auto">
            <CardHeader>
                <CardTitle className="text-lg">Matching Students ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                {filteredStudents.map(student => (
                    <li key={student.id} 
                        className={`p-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out flex justify-between items-center
                                    ${selectedStudent?.id === student.id ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted/50 bg-muted/20'}`}
                        onClick={() => handleSelectStudent(student)}>
                    <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.classes?.name || 'N/A'}</p>
                    </div>
                    {selectedStudent?.id === student.id && <UserCheck className="h-5 w-5 text-primary"/>}
                    </li>
                ))}
                </ul>
            </CardContent>
        </Card>
      )}

      {selectedStudent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="mt-6 shadow-xl border-border/60">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <CardTitle className="text-2xl text-primary">{selectedStudent.name}'s Results</CardTitle>
                    <CardDescription>Class: {selectedStudent.classes?.name || 'N/A'}</CardDescription>
                </div>
                <div className="flex gap-2 mt-3 sm:mt-0">
                    <Button onClick={exportResultsToExcel} variant="outline" size="sm" disabled={isLoadingResults || studentResults.length === 0}>
                        <Download className="mr-2 h-4 w-4"/> Export Excel
                    </Button>
                    <Button onClick={exportResultsToWord} variant="outline" size="sm" disabled={isLoadingResults || studentResults.length === 0}>
                        <FileTextIcon className="mr-2 h-4 w-4"/> Export Word
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingResults && <p className="text-center text-muted-foreground">Loading results...</p>}
              {!isLoadingResults && studentResults.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No results found for this student.</p>
              )}
              {!isLoadingResults && studentResults.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>A summary of {selectedStudent.name}'s performance across various assessments.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Examination</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentResults.map(result => (
                        <TableRow key={result.id}>
                          <TableCell>{result.sessions.examinations?.name || 'N/A'}</TableCell>
                          <TableCell>{result.sessions.subjects?.name || 'N/A'}</TableCell>
                          <TableCell className="font-semibold">{result.marks}</TableCell>
                          <TableCell>{result.sessions.created_at ? new Date(result.sessions.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      <Card className="mt-6 shadow-lg border-border/60">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Upload className="mr-2 h-5 w-5 text-primary"/>Import Results from Word</CardTitle>
          <CardDescription>
            Upload a .docx file containing student results. Ensure the document follows the expected format for successful parsing.
            (Note: This is a complex feature, current parsing is a basic example.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportWordResults} 
            accept=".docx" 
            className="bg-background/70 backdrop-blur-sm"
            disabled={isLoading}
          />
          {isLoading && <p className="text-sm text-muted-foreground mt-2">Processing document...</p>}
        </CardContent>
      </Card>

    </motion.div>
  );
};

export default StudentResultsPage;
