// // src/features/home/components/AppointmentModal.jsx
// import React, { useState, useMemo, useCallback } from 'react';
// import { DayPicker } from 'react-day-picker';
// import { format } from 'date-fns';
// import { toast } from 'react-hot-toast';
// import { useMutation, useQueryClient } from '@tanstack/react-query';

// import { usePatient }         from '../hooks/usePatient';
// import { useAvailableTimes }  from '../hooks/useAvailableTimes';
// import { useDoctorProfile }   from '../../auth/hooks/useDoctorProfile';
// import { createAppointment }  from '../../../services/appointments'; // NEW service layer
// import { logger }             from '../../../lib/logger';

// import 'react-day-picker/dist/style.css';

// const START_HOUR = 8;
// const END_HOUR   = 22;
// const INTERVAL   = 20; // minutes

// const AppointmentModal = ({ onClose }) => {
//   /* -------------------------------- state -------------------------------- */
//   const [nid, setNid]               = useState('');
//   const [searchTriggered, setSearchTriggered] = useState(false);

//   const [selectedDate, setSelectedDate] = useState(null);
//   const [selectedTime, setSelectedTime] = useState('');
//   const [followUp, setFollowUp]     = useState('');
//   const [errors, setErrors]         = useState({});

//   /* ------------------------- dependent queries --------------------------- */
//   const { data: doctor }   = useDoctorProfile();
//   const { data: patient }  = usePatient(nid, searchTriggered);
//   const { error: patientErr } = usePatient(nid, searchTriggered);
//   const { data: bookedTimes = [] } = useAvailableTimes(
//     selectedDate,
//     !!selectedDate
//   );

//   /* --------------------------- query client ------------------------------ */
//   const qc = useQueryClient();

//   /* ---------------------------- mutations ------------------------------- */
//   const { mutateAsync: insertAppt, isPending } = useMutation({
//     mutationFn: createAppointment,
//     onError: (err) => toast.error(err.message || 'Failed to create appointment'),
//     onSuccess: async (_data, vars) => {
//       toast.success('Appointment created successfully!');
//       await qc.invalidateQueries({
//         queryKey: ['appointments', vars.date], // targeted refetch
//       });
//       onClose();
//     },
//   });

//   /* ------------------------------ helpers ------------------------------- */
//   const calculateAge = useCallback((dob) => {
//     if (!dob) return '';
//     const d = new Date(dob);
//     const diff = Date.now() - d.getTime();
//     return Math.floor(diff / 31_556_900_000); // ms → years
//   }, []);

//   const handleSearchPatient = () => {
//     if (nid.length !== 10) {
//       toast.error('Please enter a valid 10-digit NID.');
//       return;
//     }
//     setSearchTriggered(true);
//   };

//   const generateTimeSlots = useMemo(() => {
//     if (!selectedDate) return [];
//     const slots = [];
//     for (let h = START_HOUR; h <= END_HOUR; h += 1) {
//       for (let m = 0; m < 60; m += INTERVAL) {
//         const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
//         if (!bookedTimes.includes(str)) slots.push(str);
//       }
//     }
//     return slots;
//   }, [selectedDate, bookedTimes]);

//   /* ------------------------------ submit ------------------------------- */
//   const handleSubmit = async () => {
//     const v = {};
//     if (!nid) v.nid = 'NID is required.';
//     if (!patient) v.patient = 'Patient must be found first.';
//     if (!selectedDate) v.selectedDate = 'Please select appointment date.';
//     if (!selectedTime) v.selectedTime = 'Please select appointment time.';
//     if (!followUp.trim()) v.followUp = 'Follow-up assessment is required.';
//     if (!doctor) v.doctor = 'Doctor profile not loaded.';

//     setErrors(v);
//     if (Object.keys(v).length) return;

//     const payload = {
//       doctor_id:  doctor.id,
//       patient_id: patient.id,
//       patient_name: patient.name,
//       date:  format(selectedDate, 'yyyy-MM-dd'),
//       time:  selectedTime,
//       status: 'scheduled',
//       notes:  followUp,
//       organization_name: doctor.organization_name || 'Clinic',
//     };

//     logger.info('Creating appointment', payload);
//     await insertAppt(payload);
//   };

//   /* ------------------------------ render ------------------------------- */
//   return (
//     <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
//       <div className="bg-white rounded-lg p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
//         {/* Close button */}
//         <button
//           onClick={onClose}
//           className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
//         >
//           ✕
//         </button>

//         <h2 className="text-2xl font-bold mb-6">New Appointment</h2>

//         {/* NID search */}
//         <div className="flex flex-col gap-2 mb-4">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               placeholder="Patient NID (10 digits)"
//               value={nid}
//               onChange={(e) => {
//                 const num = e.target.value.replace(/\D/g, '').slice(0, 10);
//                 setNid(num);
//                 setSearchTriggered(false);
//               }}
//               className={`p-2 rounded flex-1 ${
//                 errors.nid ? 'border-2 border-red-500' : 'border border-gray-300'
//               }`}
//             />
//             <button
//               onClick={handleSearchPatient}
//               disabled={nid.length !== 10}
//               className={`px-4 rounded ${
//                 nid.length !== 10
//                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                   : 'bg-indigo-500 text-white hover:bg-indigo-600'
//               }`}
//             >
//               Search
//             </button>
//           </div>
//           {errors.nid && <p className="text-red-500 text-xs">{errors.nid}</p>}
//           {patientErr && <p className="text-red-500 text-xs">{patientErr.message}</p>}
//         </div>

//         {/* Patient summary */}
//         {patient && (
//           <div className="grid grid-cols-2 gap-4 mb-6">
//             {[
//               ['Name',            patient.name],
//               ['Date of Birth',   patient.date_of_birth ? format(new Date(patient.date_of_birth), 'yyyy-MM-dd') : ''],
//               ['Age',             patient.date_of_birth ? calculateAge(patient.date_of_birth) : ''],
//               ['Phone Number',    patient.phone_number],
//             ].map(([label, val]) => (
//               <div key={label}>
//                 <label className="text-sm">{label}</label>
//                 <input
//                   readOnly
//                   value={val || ''}
//                   className="border p-2 rounded w-full bg-gray-100"
//                 />
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Date & Time */}
//         <div className="mb-6">
//           <label className="block text-sm mb-2">Select Appointment Date & Time</label>
//           <div className="flex gap-6">
//             {/* calendar */}
//             <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} />

//             {/* time slots */}
//             <div className="grid grid-cols-3 gap-4 max-h-[300px] overflow-y-auto">
//               {generateTimeSlots.map((slot) => (
//                 <button
//                   key={slot}
//                   onClick={() => setSelectedTime(slot)}
//                   className={`p-2 rounded-md text-center ${
//                     selectedTime === slot
//                       ? 'bg-indigo-500 text-white'
//                       : 'bg-gray-100 hover:bg-indigo-100'
//                   }`}
//                 >
//                   {slot.slice(0, 5)}
//                 </button>
//               ))}
//             </div>
//           </div>
//           {errors.selectedTime && (
//             <p className="text-red-500 text-sm">{errors.selectedTime}</p>
//           )}
//         </div>

//         {/* Follow-up */}
//         <div className="mb-6">
//           <label className="block text-sm mb-2">Follow-up / Assessment</label>
//           <textarea
//             value={followUp}
//             onChange={(e) => setFollowUp(e.target.value)}
//             rows={3}
//             className="border p-2 rounded w-full"
//           />
//           {errors.followUp && <p className="text-red-500 text-sm">{errors.followUp}</p>}
//         </div>

//         {/* actions */}
//         <div className="flex justify-end gap-4">
//           <button
//             onClick={onClose}
//             className="border border-gray-400 text-gray-500 px-4 py-2 rounded hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={isPending}
//             className="bg-indigo-500 text-white px-6 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
//           >
//             {isPending ? 'Saving…' : 'Confirm Appointment'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AppointmentModal;

// // src/features/home/components/AppointmentModal.jsx
// import React, { useState, useMemo, useCallback } from 'react';
// import { DayPicker }  from 'react-day-picker';
// import { format }     from 'date-fns';
// import { toast }      from 'react-hot-toast';
// import { useMutation, useQueryClient } from '@tanstack/react-query';

// import { usePatient }        from '../hooks/usePatient';
// import { useAvailableTimes } from '../hooks/useAvailableTimes';
// import { useDoctorProfile }  from '../../auth/hooks/useDoctorProfile';
// import { createAppointment } from '../../../services/appointments';
// import { logger }            from '../../../lib/logger';

// import 'react-day-picker/dist/style.css';

// const START_HOUR = 8;
// const END_HOUR   = 22;
// const INTERVAL   = 20;         // minutes

// const AppointmentModal = ({ onClose }) => {
//   /* ───────────────────────── local state ───────────────────────── */
//   const [nid, setNid]                 = useState('');
//   const [searchTriggered, setSearchTriggered] = useState(false);
//   const [selectedDate, setSelectedDate]       = useState(null);
//   const [selectedTime, setSelectedTime]       = useState('');
//   const [followUp, setFollowUp]               = useState('');
//   const [errors, setErrors]                   = useState({});

//   /* ───────────────────────── server data ───────────────────────── */
//   const { data: doctor }  = useDoctorProfile();
//   const { data: patient, error: patientErr } = usePatient(nid, searchTriggered);
//   const { data: bookedTimes = [] } = useAvailableTimes(
//     selectedDate,
//     !!selectedDate
//   );

//   const qc = useQueryClient();

//   /* ────────────────────── mutation (create) ────────────────────── */
//   const { mutateAsync: insertAppt, isPending } = useMutation({
//     mutationFn: createAppointment,
//     onError: (err) =>
//       toast.error(err.message || 'Failed to create appointment'),
//     onSuccess: async (_data, vars) => {
//       toast.success('Appointment created successfully!');
//       await qc.invalidateQueries({
//         queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd')],
//       });
//       onClose();
//     },
//   });

//   /* ───────────────────────── helpers ───────────────────────── */
//   const calculateAge = useCallback((dob) => {
//     if (!dob) return '';
//     const d = new Date(dob);
//     return Math.floor((Date.now() - d.getTime()) / 31_556_900_000);
//   }, []);

//   const handleSearchPatient = () => {
//     if (nid.length !== 10) {
//       toast.error('Please enter a valid 10-digit NID.');
//       return;
//     }
//     setSearchTriggered(true);
//   };

//   /* All potential slots for the chosen day */
//   const generateTimeSlots = useMemo(() => {
//     if (!selectedDate) return [];
//     const slots = [];
//     for (let h = START_HOUR; h <= END_HOUR; h++) {
//       for (let m = 0; m < 60; m += INTERVAL) {
//         const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
//         if (!bookedTimes.includes(str)) slots.push(str);
//       }
//     }
//     return slots;
//   }, [selectedDate, bookedTimes]);

//   /* ───────────────────── submit handler ───────────────────── */
//   const handleSubmit = async () => {
//     const v = {};
//     if (!nid)            v.nid            = 'NID is required.';
//     if (!patient)        v.patient        = 'Patient must be found first.';
//     if (!selectedDate)   v.selectedDate   = 'Please select appointment date.';
//     if (!selectedTime)   v.selectedTime   = 'Please select appointment time.';
//     if (!followUp.trim())v.followUp       = 'Follow-up assessment is required.';
//     if (!doctor)         v.doctor         = 'Doctor profile not loaded.';

//     setErrors(v);
//     if (Object.keys(v).length) return;

//     /* build ISO starts_at from date + time */
//     const [hh, mm] = selectedTime.split(':').map(Number);
//     const starts   = new Date(selectedDate);
//     starts.setHours(hh, mm, 0, 0);

//     const payload = {
//       clinic_id:  doctor.clinic_id,
//       doctor_id:  doctor.id,
//       patient_id: patient.id,
//       starts_at:  starts.toISOString(),  // ⇠ new column
//       status:     'scheduled',
//       follow_up_assessment: followUp,
//     };

//     logger.info('Creating appointment', payload);
//     await insertAppt(payload);
//   };

//   /* ───────────────────────── render ───────────────────────── */
//   return (
//     <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
//       <div className="bg-white rounded-lg p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
//         <button
//           onClick={onClose}
//           className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
//         >
//           ✕
//         </button>

//         <h2 className="text-2xl font-bold mb-6">New Appointment</h2>

//         {/* ── NID search ─────────────────────────────────────────── */}
//         <div className="flex flex-col gap-2 mb-4">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               placeholder="Patient NID (10 digits)"
//               value={nid}
//               onChange={(e) => {
//                 const num = e.target.value.replace(/\D/g, '').slice(0, 10);
//                 setNid(num);
//                 setSearchTriggered(false);
//               }}
//               className={`p-2 rounded flex-1 ${
//                 errors.nid ? 'border-2 border-red-500' : 'border border-gray-300'
//               }`}
//             />
//             <button
//               onClick={handleSearchPatient}
//               disabled={nid.length !== 10}
//               className={`px-4 rounded ${
//                 nid.length !== 10
//                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//                   : 'bg-indigo-500 text-white hover:bg-indigo-600'
//               }`}
//             >
//               Search
//             </button>
//           </div>
//           {errors.nid && (
//             <p className="text-red-500 text-xs">{errors.nid}</p>
//           )}
//           {patientErr && (
//             <p className="text-red-500 text-xs">
//               {patientErr.message}
//             </p>
//           )}
//         </div>

//         {/* ── Patient summary ─────────────────────────────────────── */}
//         {patient && (
//           <div className="grid grid-cols-2 gap-4 mb-6">
//             {[
//               ['Name',          patient.name],
//               ['Date of Birth', patient.date_of_birth
//                                   ? format(
//                                       new Date(patient.date_of_birth),
//                                       'yyyy-MM-dd'
//                                     )
//                                   : ''],
//               ['Age',           patient.date_of_birth
//                                   ? calculateAge(patient.date_of_birth)
//                                   : ''],
//               ['Phone Number',  patient.phone_number],
//             ].map(([label, val]) => (
//               <div key={label}>
//                 <label className="text-sm">{label}</label>
//                 <input
//                   readOnly
//                   value={val || ''}
//                   className="border p-2 rounded w-full bg-gray-100"
//                 />
//               </div>
//             ))}
//           </div>
//         )}

//         {/* ── Date & Time ─────────────────────────────────────────── */}
//         <div className="mb-6">
//           <label className="block text-sm mb-2">
//             Select Appointment Date &amp; Time
//           </label>
//           <div className="flex gap-6">
//             <DayPicker
//               mode="single"
//               selected={selectedDate}
//               onSelect={setSelectedDate}
//             />
//             <div className="grid grid-cols-3 gap-4 max-h-[300px] overflow-y-auto">
//               {generateTimeSlots.map((slot) => (
//                 <button
//                   key={slot}
//                   onClick={() => setSelectedTime(slot)}
//                   className={`p-2 rounded-md text-center ${
//                     selectedTime === slot
//                       ? 'bg-indigo-500 text-white'
//                       : 'bg-gray-100 hover:bg-indigo-100'
//                   }`}
//                 >
//                   {slot}
//                 </button>
//               ))}
//             </div>
//           </div>
//           {errors.selectedTime && (
//             <p className="text-red-500 text-sm">{errors.selectedTime}</p>
//           )}
//         </div>

//         {/* ── Follow-up ────────────────────────────────────────────── */}
//         <div className="mb-6">
//           <label className="block text-sm mb-2">
//             Follow-up / Assessment
//           </label>
//           <textarea
//             value={followUp}
//             onChange={(e) => setFollowUp(e.target.value)}
//             rows={3}
//             className="border p-2 rounded w-full"
//           />
//           {errors.followUp && (
//             <p className="text-red-500 text-sm">{errors.followUp}</p>
//           )}
//         </div>

//         {/* ── actions ─────────────────────────────────────────────── */}
//         <div className="flex justify-end gap-4">
//           <button
//             onClick={onClose}
//             className="border border-gray-400 text-gray-500 px-4 py-2 rounded hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={isPending}
//             className="bg-indigo-500 text-white px-6 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
//           >
//             {isPending ? 'Saving…' : 'Confirm Appointment'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AppointmentModal;


// src/features/home/components/AppointmentModal.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { DayPicker }  from 'react-day-picker';
import { format }     from 'date-fns';
import { toast }      from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usePatient }        from '../hooks/usePatient';
import { useAvailableTimes } from '../hooks/useAvailableTimes';
import { useDoctorProfile }  from '../../auth/hooks/useDoctorProfile';
import { createAppointment } from '../../../services/appointments';
import { logger }            from '../../../lib/logger';

import 'react-day-picker/dist/style.css';

const START_HOUR = 8;
const END_HOUR   = 22;
const INTERVAL   = 20;         // minutes

const AppointmentModal = ({ onClose }) => {
  /* ───────────────────────── local state ───────────────────────── */
  const [nid, setNid]                 = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedDate, setSelectedDate]       = useState(null);
  const [selectedTime, setSelectedTime]       = useState('');
  const [followUp, setFollowUp]               = useState('');
  const [errors, setErrors]                   = useState({});

  /* ───────────────────────── server data ───────────────────────── */
  const { data: doctor }  = useDoctorProfile();
  const { data: patient, error: patientErr } = usePatient(nid, searchTriggered);
  const { data: bookedTimes = [] } = useAvailableTimes(
    selectedDate,
    !!selectedDate
  );

  const qc = useQueryClient();

  /* ────────────────────── mutation (create) ────────────────────── */
  const { mutateAsync: insertAppt, isPending } = useMutation({
    mutationFn: createAppointment,
    onError: (err) =>
      toast.error(err.message || 'Failed to create appointment'),
    onSuccess: async (_data, vars) => {
      toast.success('Appointment created successfully!');
      await qc.invalidateQueries({
        queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd')],
      });
      onClose();
    },
  });

  /* ───────────────────────── helpers ───────────────────────── */
  const calculateAge = useCallback((dob) => {
    if (!dob) return '';
    const d = new Date(dob);
    return Math.floor((Date.now() - d.getTime()) / 31_556_900_000);
  }, []);

  const handleSearchPatient = () => {
    if (nid.length !== 10) {
      toast.error('Please enter a valid 10-digit NID.');
      return;
    }
    setSearchTriggered(true);
  };

  /* All potential slots for the chosen day */
  const generateTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const slots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      for (let m = 0; m < 60; m += INTERVAL) {
        const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (!bookedTimes.includes(str)) slots.push(str);
      }
    }
    return slots;
  }, [selectedDate, bookedTimes]);

  /* ───────────────────── submit handler ───────────────────── */
  const handleSubmit = async () => {
    const v = {};
    if (!nid)            v.nid            = 'NID is required.';
    if (!patient)        v.patient        = 'Patient must be found first.';
    if (!selectedDate)   v.selectedDate   = 'Please select appointment date.';
    if (!selectedTime)   v.selectedTime   = 'Please select appointment time.';
    if (!followUp.trim())v.followUp       = 'Follow-up assessment is required.';
    if (!doctor)         v.doctor         = 'Doctor profile not loaded.';

    setErrors(v);
    if (Object.keys(v).length) return;

    /* build ISO starts_at from date + time */
    const [hh, mm] = selectedTime.split(':').map(Number);
    const starts   = new Date(selectedDate);
    starts.setHours(hh, mm, 0, 0);

/* inside handleSubmit, replace the payload block only */
const payload = {
  clinic_id:  doctor.clinic_id,
  doctor_id:  doctor.id,
  doctor_name: doctor.name,                    // ← NEW (for SMS only)
  patient_id: patient.id,
  patient_name: patient.name,                 // ← NEW (for SMS only)
  patient_phone: patient.phone_number,        // ← NEW (for SMS only)
  org_name: doctor.organization_name || 'Clinic', // ← NEW (for SMS only)

  starts_at:  starts.toISOString(),
  status:     'scheduled',
  follow_up_assessment: followUp,
};
    logger.info('Creating appointment', payload);
    await insertAppt(payload);
  };

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-6">New Appointment</h2>

        {/* ── NID search ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Patient NID (10 digits)"
              value={nid}
              onChange={(e) => {
                const num = e.target.value.replace(/\D/g, '').slice(0, 10);
                setNid(num);
                setSearchTriggered(false);
              }}
              className={`p-2 rounded flex-1 ${
                errors.nid ? 'border-2 border-red-500' : 'border border-gray-300'
              }`}
            />
            <button
              onClick={handleSearchPatient}
              disabled={nid.length !== 10}
              className={`px-4 rounded ${
                nid.length !== 10
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              Search
            </button>
          </div>
          {errors.nid && (
            <p className="text-red-500 text-xs">{errors.nid}</p>
          )}
          {patientErr && (
            <p className="text-red-500 text-xs">
              {patientErr.message}
            </p>
          )}
        </div>

        {/* ── Patient summary ─────────────────────────────────────── */}
        {patient && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              ['Name',          patient.name],
              ['Date of Birth', patient.date_of_birth
                                  ? format(
                                      new Date(patient.date_of_birth),
                                      'yyyy-MM-dd'
                                    )
                                  : ''],
              ['Age',           patient.date_of_birth
                                  ? calculateAge(patient.date_of_birth)
                                  : ''],
              ['Phone Number',  patient.phone_number],
            ].map(([label, val]) => (
              <div key={label}>
                <label className="text-sm">{label}</label>
                <input
                  readOnly
                  value={val || ''}
                  className="border p-2 rounded w-full bg-gray-100"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Date & Time ─────────────────────────────────────────── */}
        <div className="mb-6">
          <label className="block text-sm mb-2">
            Select Appointment Date &amp; Time
          </label>
          <div className="flex gap-6">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
            />
            <div className="grid grid-cols-3 gap-4 max-h-[300px] overflow-y-auto">
              {generateTimeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`p-2 rounded-md text-center ${
                    selectedTime === slot
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 hover:bg-indigo-100'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          {errors.selectedTime && (
            <p className="text-red-500 text-sm">{errors.selectedTime}</p>
          )}
        </div>

        {/* ── Follow-up ────────────────────────────────────────────── */}
        <div className="mb-6">
          <label className="block text-sm mb-2">
            Follow-up / Assessment
          </label>
          <textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            rows={3}
            className="border p-2 rounded w-full"
          />
          {errors.followUp && (
            <p className="text-red-500 text-sm">{errors.followUp}</p>
          )}
        </div>

        {/* ── actions ─────────────────────────────────────────────── */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="border border-gray-400 text-gray-500 px-4 py-2 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-indigo-500 text-white px-6 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Confirm Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;