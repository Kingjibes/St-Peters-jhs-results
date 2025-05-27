import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        supabase
          .from('students')
          .select('id, name, class_id, classes(id, name)')
          .order('name', { ascending: true }),
        supabase
          .from('classes')
          .select('id, name')
          .order('name', { ascending: true })
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
      currentStudents = currentStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
            id,
            created_at,
            examinations (name),
            subjects (name),
            classes (name)
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { foreignTable: 'sessions', ascending: false });

      if (error) throw error;
      setStudentResults(resultsData || []);
      if (!resultsData || resultsData.length === 0) {
        toast({ title: "No Results Found", description: `No results found for ${student.name}.` });
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
      "Examination": res.sessions?.examinations?.name || 'N/A',
      "Subject": res.sessions?.subjects?.name || 'N/A',
      "Class": res.sessions?.classes?.name || 'N/A',
      "Marks": res.marks,
      "Date": res.sessions?.created_at ? new Date(res.sessions.created_at).toLocaleDateString() : 'N/A'
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
        new DocxTableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Examination", bold: true })] })],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
        new DocxTableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Subject", bold: true })] })],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
        new DocxTableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Marks", bold: true })] })],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
      ],
    });

    const dataRows = studentResults.map(res => new DocxTableRow({
      children: [
        new DocxTableCell({
          children: [new Paragraph(res.sessions?.examinations?.name || 'N/A')],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
        new DocxTableCell({
          children: [new Paragraph(res.sessions?.subjects?.name || 'N/A')],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
        new DocxTableCell({
          children: [new Paragraph(String(res.marks))],
          borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
        }),
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
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a .docx Word document." });
      event.target.value = "";
      return;
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const tables = doc.querySelectorAll('table');

      if (!tables.length) {
        throw new Error("No tables found in Word document. Cannot parse results.");
      }

      // Placeholder parsing example - customize as needed
      const rows = tables[0].querySelectorAll('tr');
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 4) continue;

        const studentName = cells[0].textContent.trim();
        const examName = cells[1].textContent.trim();
        const subjectName = cells[2].textContent.trim();
        const marks = parseInt(cells[3].textContent.trim(), 10);

        if (studentName && examName && subjectName && !isNaN(marks)) {
          // Here you'd implement DB lookups and insertions
          console.log({ studentName, examName, subjectName, marks });
          toast({ title: "Parsed Row", description: `${studentName}, ${examName}, ${subjectName}, ${marks}` });
        }
      }

      toast({
        title: "Word Import (Partial)",
        description: "Parsed data. DB insertion logic needs implementation based on your schema."
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Word Import Error", description: `Failed to process Word document: ${error.message}` });
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = "";
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-
        );
};

export default StudentResultsPage;
