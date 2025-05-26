import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentTable = ({ students, handleEditStudent, handleDeleteStudent, isLoading }) => {
  if (isLoading && students.length === 0) {
    return <p className="text-center text-muted-foreground mt-8 text-lg">Loading students, please wait...</p>;
  }

  if (students.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y:10 }}
        animate={{ opacity: 1, y:0 }}
        className="text-center text-muted-foreground mt-8 p-6 bg-card rounded-lg shadow-md border border-border/50"
      >
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-lg">No students found.</p>
        <p className="text-sm">Add students manually using the form above or import them via a CSV/Excel file.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="shadow-xl border-border/60 bg-gradient-to-br from-card via-card to-card/90">
        <CardHeader className="border-b border-border/50 py-4">
          <CardTitle className="text-xl font-semibold text-primary">Student List ({students.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-primary/90">#</TableHead>
                  <TableHead className="text-primary/90">Name</TableHead>
                  <TableHead className="text-primary/90">Class</TableHead>
                  <TableHead className="text-right text-primary/90">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id} className="hover:bg-muted/20 transition-colors duration-150">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.classes?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)} disabled={isLoading} className="hover:bg-primary/10">
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} disabled={isLoading} className="hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StudentTable;