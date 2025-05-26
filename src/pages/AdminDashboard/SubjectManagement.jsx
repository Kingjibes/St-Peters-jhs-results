import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [editingSubject, setEditingSubject] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const fetchSubjects = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('subjects').select('id, name').order('name', { ascending: true });
        if (error) {
            toast({ variant: "destructive", title: "Error fetching subjects", description: error.message });
        } else {
            setSubjects(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newSubjectName.trim()) {
            toast({ variant: "destructive", title: "Validation Error", description: "Subject name cannot be empty." });
            return;
        }
        setIsLoading(true);
        let error;
        if (editingSubject) {
            ({ error } = await supabase.from('subjects').update({ name: newSubjectName }).eq('id', editingSubject.id));
        } else {
            ({ error } = await supabase.from('subjects').insert([{ name: newSubjectName }]));
        }

        if (error) {
            toast({ variant: "destructive", title: `Error ${editingSubject ? 'updating' : 'adding'} subject`, description: error.message });
        } else {
            toast({ title: "Success", description: `Subject ${editingSubject ? 'updated' : 'added'} successfully.` });
            setNewSubjectName('');
            setEditingSubject(null);
            fetchSubjects();
        }
        setIsLoading(false);
    };
    
    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setNewSubjectName(subject.name);
    };

    const handleDelete = async (subjectId) => {
        if (!window.confirm("Are you sure you want to delete this subject? This might affect existing results or sessions.")) return;
        setIsLoading(true);
        const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
        if (error) {
            toast({ variant: "destructive", title: "Error deleting subject", description: error.message });
        } else {
            toast({ title: "Success", description: "Subject deleted successfully." });
            fetchSubjects();
        }
        setIsLoading(false);
    };


    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-semibold mb-6">Subject Management</h1>
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{editingSubject ? "Edit Subject" : "Add New Subject"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-grow">
                           <Label htmlFor="subjectName" className="sr-only">Subject Name</Label>
                            <Input 
                                id="subjectName"
                                placeholder="Subject Name (e.g., Mathematics)" 
                                value={newSubjectName} 
                                onChange={(e) => setNewSubjectName(e.target.value)} 
                                required 
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {editingSubject ? "Update Subject" : "Add Subject"}
                        </Button>
                        {editingSubject && (
                            <Button variant="outline" onClick={() => { setEditingSubject(null); setNewSubjectName(''); }} disabled={isLoading}>
                                Cancel
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Subject List</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoading && subjects.length === 0 ? <p>Loading subjects...</p> :
                subjects.length === 0 ? <p>No subjects found. Add some!</p> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects.map((subject) => (
                                <TableRow key={subject.id}>
                                    <TableCell>{subject.name}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)} disabled={isLoading}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)} disabled={isLoading}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default SubjectManagement;