import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GenerateResultsFilter = ({
  generationType,
  onGenerationTypeChange,
  examinations,
  selectedExamination,
  onSelectedExaminationChange,
  classes,
  selectedClass,
  onSelectedClassChange,
  subjects,
  selectedSubject,
  onSelectedSubjectChange,
  isLoading,
  onFetchResults
}) => {
  return (
    <Card className="mb-6 shadow-lg border-border/60 bg-gradient-to-br from-card via-card to-card/90">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="text-xl font-semibold text-primary">Filter Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Select value={generationType} onValueChange={onGenerationTypeChange}>
          <SelectTrigger className="w-full md:w-1/2 bg-background/70 backdrop-blur-sm">
            <SelectValue placeholder="Select Result Generation Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">For All Results</SelectItem>
            <SelectItem value="specific">For Specific Class/Exam/Subject</SelectItem>
          </SelectContent>
        </Select>

        {generationType === 'specific' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/30"
          >
            <Select value={selectedExamination} onValueChange={onSelectedExaminationChange} disabled={isLoading}>
              <SelectTrigger className="bg-background/70 backdrop-blur-sm"><SelectValue placeholder="Select Examination" /></SelectTrigger>
              <SelectContent>{examinations.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={onSelectedClassChange} disabled={isLoading}>
              <SelectTrigger className="bg-background/70 backdrop-blur-sm"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={onSelectedSubjectChange} disabled={isLoading}>
              <SelectTrigger className="bg-background/70 backdrop-blur-sm"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </motion.div>
        )}
        <Button onClick={onFetchResults} disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
          {isLoading ? "Fetching Results..." : "Fetch Results"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GenerateResultsFilter;
