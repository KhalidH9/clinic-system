import React from 'react';
import PatientsList from './components/PatientsList';

/** Shell page – no change needed beyond logging for traceability. */
const ManagePatients = () => {
  return (
    <div className="p-6">
      <PatientsList />
    </div>
  );
};

export default ManagePatients;