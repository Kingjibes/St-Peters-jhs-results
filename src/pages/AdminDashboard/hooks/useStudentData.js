import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useStudentData = (toast) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, class_id, classes(id, name)')
                .order('name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error fetching students", description: error.message });
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    return { students, fetchStudents, isLoading, setStudents };
};
