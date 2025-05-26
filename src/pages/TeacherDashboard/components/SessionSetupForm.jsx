import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const SessionSetupForm = ({
  examinations,
  classes,
  subjects,
  selectedExamination,
  setSelectedExamination,
  selectedClass,
  setSelectedClass,
  selectedSubject,
  setSelectedSubject,
  handleCreateSession,
  resetSession,
  currentSession,
  isLoading,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Session Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <Select
            value={selectedExamination}
            onValueChange={setSelectedExamination}
            disabled={!!currentSession || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Examination" />
            </SelectTrigger>
            <SelectContent>
              {examinations.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedClass}
            onValueChange={setSelectedClass}
            disabled={!!currentSession || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedSubject}
            onValueChange={setSelectedSubject}
            disabled={!!currentSession || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleCreateSession}
          disabled={
            isLoading ||
            !!currentSession ||
            !selectedExamination ||
            !selectedClass ||
            !selectedSubject
          }
        >
          {isLoading ? "Loading..." : currentSession ? "Session Active" : "Create/Load Session"}
        </Button>
        {currentSession && (
          <Button
            variant="outline"
            onClick={resetSession}
            disabled={isLoading}
          >
            Reset Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionSetupForm;