import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useClassData = (toast) => {
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('classes').select('id, name').order('name');
            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error fetching classes", description: error.message });
            setClasses([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    return { classes, fetchClasses, isLoading, setClasses };
};
