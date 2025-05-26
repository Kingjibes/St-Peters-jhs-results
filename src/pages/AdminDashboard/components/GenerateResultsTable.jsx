import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const GenerateResultsTable = ({
  results,
  isLoading,
  onDownloadAllDisplayed,
  onDownloadSpecificStudentResult,
  generationType,
  filtersApplied // boolean indicating if specific filters were applied for "no results" message
}) => {
  if (isLoading && results.length === 0) {
    return <p className="text-center text-muted-foreground mt-8 text-lg">Loading results, please wait...</p>;
  }

  if (results.length === 0) {
    let message = "No results available yet. Teachers may need to submit marks first.";
    if (generationType === 'specific' && filtersApplied) {
        message = "No results found for this specific selection. Try different criteria or select 'For All Results'.";
    }
    return (
        <motion.div 
            initial={{ opacity: 0, y:10 }}
            animate={{ opacity: 1, y:0 }}
            className="text-center text-muted-foreground mt-8 p-6 bg-card rounded-lg shadow-md border border-border/50"
        >
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-lg">{message}</p>
        </motion.div>
    );
  }

  return (
    <Card className="shadow-xl border-border/60 bg-gradient-to-br from-card via-card to-card/90">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4">
        <CardTitle className="text-xl font-semibold text-primary">Results ({results.length})</CardTitle>
        <Button onClick={onDownloadAllDisplayed} variant="outline" size="sm" disabled={isLoading || results.length === 0} className="border-primary text-primary hover:bg-primary/10">
          <Download className="mr-2 h-4 w-4"/> Download Displayed Results
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-primary/90">Student</TableHead>
                <TableHead className="text-primary/90">Marks</TableHead>
                <TableHead className="text-primary/90">Exam</TableHead>
                <TableHead className="text-primary/90">Class</TableHead>
                <TableHead className="text-primary/90">Subject</TableHead>
                <TableHead className="text-primary/90">Teacher</TableHead>
                <TableHead className="text-primary/90">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(result => (
                <TableRow key={result.id} className="hover:bg-muted/20 transition-colors duration-150">
                  <TableCell>{result.students?.name || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{result.marks}</TableCell>
                  <TableCell>{result.sessions?.examinations?.name || 'N/A'}</TableCell>
                  <TableCell>{result.sessions?.classes?.name || 'N/A'}</TableCell>
                  <TableCell>{result.sessions?.subjects?.name || 'N/A'}</TableCell>
                  <TableCell>{result.sessions?.users?.name || result.sessions?.users?.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Button onClick={() => onDownloadSpecificStudentResult(result)} variant="link" size="sm" disabled={isLoading} className="text-primary hover:text-primary/80 p-0 h-auto">
                      <Download className="mr-1 h-3 w-3"/> Individual
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerateResultsTable;