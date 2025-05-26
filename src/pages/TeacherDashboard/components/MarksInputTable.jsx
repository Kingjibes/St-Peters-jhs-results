import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';

const MarksInputTable = ({
  students,
  marks,
  handleMarkChange,
  handleSubmitMarks,
  currentSession,
  selectedClassData,
  selectedExaminationData,
  selectedSubjectData,
  isLoading,
  isSessionLocked,
}) => {
  if (!currentSession) {
    return !isLoading && <p className="text-muted-foreground">Please set up a session to begin inputting marks.</p>;
  }

  if (students.length === 0 && !isLoading) {
    return <p>No students found for the selected class. Ensure students are added to this class in Admin Panel.</p>;
  }
  
  if (students.length === 0 && isLoading) {
    return <p>Loading students...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Marks for {selectedClassData?.name || ''}</CardTitle>
        <CardDescription>
          Examination: {selectedExaminationData?.name}, Subject: {selectedSubjectData?.name}.
          Session Status: <span className={`font-bold ${isSessionLocked ? 'text-red-500' : 'text-green-500'}`}>{currentSession.status}</span>
        </CardDescription>
        {isSessionLocked && <p className="text-red-500 font-semibold">This session is locked and cannot be edited.</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {students.map((student, index) => (
            <div key={student.id} className="flex items-center gap-4 p-2 border-b">
              <span className="w-8 text-right">{index + 1}.</span>
              <Label htmlFor={`mark-${student.id}`} className="flex-1">{student.name}</Label>
              <Input
                id={`mark-${student.id}`}
                type="number"
                min="0"
                max="100"
                className="w-24"
                value={marks[student.id] === undefined ? '' : marks[student.id]}
                onChange={(e) => handleMarkChange(student.id, e.target.value)}
                disabled={isLoading || isSessionLocked}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSubmitMarks} className="mt-6 w-full" disabled={isLoading || isSessionLocked || Object.keys(marks).length === 0}>
          <Send className="mr-2 h-4 w-4" /> {isSessionLocked ? "Session Submitted" : "Submit All Marks"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MarksInputTable;