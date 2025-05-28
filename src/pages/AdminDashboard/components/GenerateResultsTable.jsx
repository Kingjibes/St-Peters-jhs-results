import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, AlertTriangle, FileText, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

const GenerateResultsTable = ({
  results,
  isLoading,
  onExport, // Changed from onDownloadAllDisplayed
  generationType,
  filtersApplied // boolean indicating if specific filters were applied for "no results" message
}) => {
  if (isLoading && results.length === 0) {
    return <p className="text-center text-muted-foreground mt-8 text-lg">Loading results, please wait...</p>;
  }

  if (results.length === 0) {
    let message = "No results available yet. Teachers may need to submit marks first.";
    if (generationType === 'specificClass' && filtersApplied) { // Adjusted condition
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 py-4 gap-2">
        <CardTitle className="text-xl font-semibold text-primary">Results ({results.length})</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => onExport('csv')} variant="outline" size="sm" disabled={isLoading || results.length === 0} className="border-sky-500 text-sky-600 hover:bg-sky-500/10 w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4"/> Export CSV
            </Button>
            <Button onClick={() => onExport('excel')} variant="outline" size="sm" disabled={isLoading || results.length === 0} className="border-green-500 text-green-600 hover:bg-green-500/10 w-full sm:w-auto">
              <FileSpreadsheet className="mr-2 h-4 w-4"/> Export Excel
            </Button>
            <Button onClick={() => onExport('word')} variant="outline" size="sm" disabled={isLoading || results.length === 0} className="border-blue-500 text-blue-600 hover:bg-blue-500/10 w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4"/> Export Word
            </Button>
        </div>
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
                {/* Removed individual download per row to simplify, master download buttons above */}
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
