import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qylszpbthcpjiwvuygvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bHN6cGJ0aGNwaml3dnV5Z3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTgyNTQsImV4cCI6MjA2MzU5NDI1NH0.RvC-OMlXrjbD_-KOq-S1cNqffLVnUrJy64YeBxLKFFM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);