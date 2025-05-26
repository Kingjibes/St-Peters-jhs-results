import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel as SelectLabelComponent } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentForm = ({
  newStudentName,
  setNewStudentName,
  selectedClass,
  setSelectedClass,
  classes,
  editingStudent,
  handleSubmit,
  handleCancelEdit,
  isLoading
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="mb-6 shadow-lg border-border/60 bg-gradient-to-br from-card via-card to-card/90">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-xl font-semibold text-primary">{editingStudent ? "Edit Student Details" : "Add New Student"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="studentName" className="text-muted-foreground">Student Name</Label>
              <Input
                id="studentName"
                placeholder="Enter student's full name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                required
                className="bg-background/70 backdrop-blur-sm"
              />
            </div>
            <div>
              <Label htmlFor="studentClass" className="text-muted-foreground">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} name="studentClass" required>
                <SelectTrigger className="w-full bg-background/70 backdrop-blur-sm">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabelComponent>Available Classes</SelectLabelComponent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                <PlusCircle className="mr-2 h-5 w-5" /> {editingStudent ? "Update Student" : "Add Student"}
              </Button>
              {editingStudent && (
                <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading} className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10">
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StudentForm;