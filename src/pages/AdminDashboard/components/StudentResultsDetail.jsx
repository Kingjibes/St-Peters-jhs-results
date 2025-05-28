import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart2, Users, Star, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentResultsDetail = ({ studentData, isLoading, onExport }) => {
  if (isLoading) {
    return <p className="text-center text-muted-foreground mt-8 text-lg">Loading student details...</p>;
  }

  if (!studentData || !studentData.examinations || studentData.examinations.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y:10 }}
        animate={{ opacity: 1, y:0 }}
        className="text-center text-muted-foreground mt-8 p-6 bg-card rounded-lg shadow-md border border-border/50"
      >
        <FileText className="mx-auto h-12 w-12 text-primary mb-4" />
        <p className="text-lg">No detailed results found for this student.</p>
        <p className="text-sm">Ensure the student has participated in examinations and marks have been submitted.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-2xl border-border/70 bg-gradient-to-tr from-card via-card/95 to-card/85 backdrop-blur-md">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-pink-500">
                {studentData.studentName}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Class: {studentData.className}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => onExport('word')} variant="outline" size="sm" className="border-blue-500 text-blue-600 hover:bg-blue-500/10 w-full sm:w-auto">
                    <FileText className="mr-2 h-4 w-4" /> Export Word
                </Button>
                <Button onClick={() => onExport('excel')} variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-500/10 w-full sm:w-auto">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          {studentData.examinations.map((exam, examIndex) => (
            <motion.div 
              key={examIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: examIndex * 0.1, duration: 0.4 }}
            >
              <Card className="bg-background/50 shadow-lg border-border/50">
                <CardHeader className="border-b border-border/40">
                  <CardTitle className="text-xl text-primary/90">{exam.examinationName}</CardTitle>
                  <CardDescription>Date: {exam.examinationDate || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-secondary-foreground/80">Subject</TableHead>
                          <TableHead className="text-center text-secondary-foreground/80">Marks</TableHead>
                          <TableHead className="text-center text-secondary-foreground/80">Position (Subject)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exam.subjects.map((subject, subjectIndex) => (
                          <TableRow key={subjectIndex} className="hover:bg-muted/10">
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell className="text-center">{subject.marks}</TableCell>
                            <TableCell className="text-center">{subject.rank || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted/20 rounded-md">
                      <p className="font-semibold text-secondary-foreground/90 flex items-center">
                        <BarChart2 className="h-4 w-4 mr-2 text-primary" />
                        Total Marks ({exam.examinationName}): <span className="ml-1 font-bold text-primary">{exam.overallTotalMarks}</span>
                      </p>
                    </div>
                     <div className="p-3 bg-muted/20 rounded-md">
                       <p className="font-semibold text-secondary-foreground/90 flex items-center">
                         <Users className="h-4 w-4 mr-2 text-indigo-500" />
                         Position (All Subjects): <span className="ml-1 font-bold text-indigo-600">{exam.positionAllSubjects || 'N/A'}</span>
                       </p>
                     </div>
                    {exam.coreSubjectsRawScore > 0 && (
                      <>
                        <div className="p-3 bg-muted/20 rounded-md">
                          <p className="font-semibold text-secondary-foreground/90 flex items-center">
                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                            Raw Score (4 Core Subjects): <span className="ml-1 font-bold text-yellow-600">{exam.coreSubjectsRawScore}</span>
                          </p>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-md">
                           <p className="font-semibold text-secondary-foreground/90 flex items-center">
                            <Users className="h-4 w-4 mr-2 text-orange-500" />
                            Position (4 Core Subjects): <span className="ml-1 font-bold text-orange-600">{exam.positionCoreSubjects || 'N/A'}</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </CardContent>
        <CardFooter className="border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground">
                This report provides a summary of the student's performance. Positions are relative to other students in the same class for each specific examination and subject (or core subjects aggregate).
            </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default StudentResultsDetail;
