import React from 'react';
import StudentResultsDetail from './StudentResultsDetail';
import GenerateResultsTable from './GenerateResultsTable';

const ResultsDisplayController = ({
  generationType,
  studentDetailData,
  generalResults,
  isLoading,
  onExport, // This will be called with 'csv', 'excel', or 'word'
  filtersApplied
}) => {
  if (generationType === 'specificStudent') {
    return (
      <StudentResultsDetail 
        studentData={studentDetailData} 
        isLoading={isLoading}
        onExport={onExport} // Pass down the unified export handler
      />
    );
  } else { // 'all' or 'specificClass'
    return (
      <GenerateResultsTable
        results={generalResults}
        isLoading={isLoading}
        onExport={onExport} // Pass down the unified export handler
        generationType={generationType}
        filtersApplied={filtersApplied}
      />
    );
  }
};

export default ResultsDisplayController;
