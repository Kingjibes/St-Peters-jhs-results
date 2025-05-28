import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel as SelectLabelComponent } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

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
  onFetchResults,
  allStudents,
  selectedStudent,
  onSelectedStudentChange,
  searchTerm,
  onSearchTermChange
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
            <SelectItem value="specificClass">For Specific Class/Exam/Subject</SelectItem>
            <SelectItem value="specificStudent">For Specific Student</SelectItem>
          </SelectContent>
        </Select>

        {generationType === 'specificClass' && (
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

        {generationType === 'specificStudent' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-4 border-t border-border/30"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search student by name or class..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10 bg-background/70 backdrop-blur-sm"
                disabled={isLoading}
              />
            </div>
            <Select value={selectedStudent} onValueChange={onSelectedStudentChange} disabled={isLoading || allStudents.length === 0}>
              <SelectTrigger className="w-full bg-background/70 backdrop-blur-sm">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabelComponent>
                    {allStudents.length > 0 ? `Students (${allStudents.length})` : "No students match search or available"}
                  </SelectLabelComponent>
                  {allStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.classes?.name || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </motion.div>
        )}

        <Button onClick={onFetchResults} disabled={isLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
          {isLoading ? "Fetching..." : "Fetch Results"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GenerateResultsFilter;
