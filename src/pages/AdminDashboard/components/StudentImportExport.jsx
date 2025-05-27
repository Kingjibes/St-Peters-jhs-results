import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentImportExport = ({ handleImportFile, handleExportData, isLoading, hasStudents }) => {
  const fileInputRef = useRef(null);

  return (
    <motion.div 
      className="flex flex-col sm:flex-row justify-end gap-3 my-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isLoading}
        className="border-primary text-primary hover:bg-primary/10 w-full sm:w-auto"
      >
        <Upload className="mr-2 h-4 w-4"/> Import Students
      </Button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFile} 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
        style={{display: 'none'}} 
      />
      <Button 
        variant="outline" 
        onClick={handleExportData} 
        disabled={isLoading || !hasStudents}
        className="border-green-500 text-green-600 hover:bg-green-500/10 w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4"/> Export Students (CSV)
      </Button>
    </motion.div>
  );
};

export default StudentImportExport;
