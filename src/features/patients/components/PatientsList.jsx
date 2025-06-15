// // src/features/patients/components/PatientsList.jsx
// import React, { useState, useMemo } from 'react';
// import { format } from 'date-fns';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { toast } from 'react-hot-toast';
// import {
//   TrashIcon,
//   PlusIcon,
//   PencilSquareIcon,
// } from '@heroicons/react/24/outline';
// import { Dialog } from '@headlessui/react';
// import { useForm } from 'react-hook-form';
// import ReactFlagsSelect from 'react-flags-select';
// import { getName as isoToName } from 'country-list';

// import { usePatients } from '../hooks/usePatients';
// import { deletePatient, addPatient, updatePatient } from '../../../services/patients';
// import { supabase } from '../../../lib/supabaseClient';

// /* util */
// const ageFromDOB = (d) =>
//   d ? Math.floor((Date.now() - new Date(d)) / 31_556_900_000) : '';

// /* ------------------------------------------------------------------ */
// /*                           Patients list                            */
// /* ------------------------------------------------------------------ */
// const PatientsList = () => {
//   const { data: patients = [], isLoading, isError } = usePatients();
//   const [search, setSearch] = useState('');
//   const [addOpen, setAddOpen] = useState(false);
//   const [editPatient, setEditPatient] = useState(null);
//   const [deleteId, setDeleteId] = useState(null);
//   const qc = useQueryClient();

//   /* delete mutation */
//   const { mutate: deleteOne, isPending: deleting } = useMutation({
//     mutationFn: deletePatient,
//     onSuccess: () => {
//       toast.success('Patient deleted');
//       qc.invalidateQueries(['patients']);
//     },
//     onError: (err) => toast.error(err.message),
//   });

//   /* filtered rows */
//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return q
//       ? patients.filter(
//           (p) =>
//             p.name.toLowerCase().includes(q) ||
//             p.national_id.toLowerCase().includes(q)
//         )
//       : patients;
//   }, [patients, search]);

//   if (isLoading)
//     return <div className="text-center text-gray-500">Loading patients…</div>;
//   if (isError)
//     return (
//       <div className="text-center text-red-500">Failed to load patients</div>
//     );

//   return (
//     <div className="p-8 bg-white rounded-lg shadow-md">
//       {/* header */}
//       <div className="flex justify-between items-center mb-6">
//         <h2 className="text-2xl font-bold">Patients</h2>
//         <button
//           onClick={() => setAddOpen(true)}
//           className="flex items-center px-4 py-2 bg-indigo-500 text-white rounded-md shadow-md hover:bg-indigo-600"
//         >
//           <PlusIcon className="h-5 w-5 mr-2" />
//           Add New Patient
//         </button>
//       </div>

//       {/* search */}
//       <input
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         placeholder="Search by name or NID…"
//         className="mb-4 p-2 border rounded w-full max-w-sm"
//       />

//       {/* table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full table-auto border-collapse">
//           <thead className="text-center">
//             <tr className="bg-gray-100 text-sm font-semibold text-gray-700">
//               <th className="p-3">Name</th>
//               <th className="p-3">NID</th>
//               <th className="p-3">Gender</th>
//               <th className="p-3">DOB</th>
//               <th className="p-3">Age</th>
//               <th className="p-3">Nationality</th>
//               <th className="p-3">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((p) => (
//               <tr key={p.id} className="border-b hover:bg-gray-50">
//                 <td className="p-3 text-center">{p.name}</td>
//                 <td className="p-3 text-center font-mono">{p.national_id}</td>
//                 <td className="p-3 text-center capitalize">{p.gender}</td>
//                 <td className="p-3 text-center">
//                   {format(new Date(p.date_of_birth), 'yyyy-MM-dd')}
//                 </td>
//                 <td className="p-3 text-center">{ageFromDOB(p.date_of_birth)}</td>
//                 <td className="p-3 text-center">{p.nationality}</td>
//                 <td className="p-3 flex justify-center gap-2">
//                   <button
//                     title="Modify"
//                     onClick={() => setEditPatient(p)}
//                     className="text-indigo-600 hover:text-indigo-800"
//                   >
//                     <PencilSquareIcon className="h-5 w-5" />
//                   </button>
//                   <button
//                     title="Delete"
//                     onClick={() => setDeleteId(p.id)}
//                     disabled={deleting}
//                     className="text-red-500 hover:text-red-700 disabled:opacity-50"
//                   >
//                     <TrashIcon className="h-5 w-5" />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//             {!filtered.length && (
//               <tr>
//                 <td colSpan="7" className="py-4 text-center text-gray-400">
//                   No patients found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* modals */}
//       {addOpen && <AddPatientModal onClose={() => setAddOpen(false)} />}
//       {editPatient && (
//         <EditPatientModal
//           patient={editPatient}
//           onClose={() => setEditPatient(null)}
//         />
//       )}
//       {deleteId && (
//         <ConfirmDelete
//           id={deleteId}
//           onCancel={() => setDeleteId(null)}
//           onDelete={() => {
//             deleteOne(deleteId);
//             setDeleteId(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// /* ------------------------------------------------------------------ */
// /*                         Add patient modal                          */
// /* ------------------------------------------------------------------ */
// const AddPatientModal = ({ onClose }) => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     setError,
//     reset,
//     setValue,
//   } = useForm();
//   const [countryCode, setCountryCode] = useState('');
//   const qc = useQueryClient();

//   const { mutateAsync: createOne, isPending } = useMutation({
//     mutationFn: addPatient,
//     onSuccess: () => {
//       toast.success('Patient added successfully');
//       qc.invalidateQueries(['patients']);
//       reset();
//       onClose();
//     },
//     onError: (err) => toast.error(err.message),
//   });

//   const onSubmit = async (form) => {
//     const { data: user } = await supabase.auth.getUser();
//     if (!user?.user?.id) return toast.error('Not authenticated');
//     await createOne({ ...form, user_id: user.user.id });
//   };

//   return (
//     <Dialog
//       open
//       onClose={() => {
//         reset();
//         onClose();
//       }}
//       className="fixed z-10 inset-0 overflow-y-auto"
//     >
//       <ModalShell title="Add New Patient">
//         <PatientForm
//           errors={errors}
//           register={register}
//           setValue={setValue}
//           countryCode={countryCode}
//           setCountryCode={setCountryCode}
//           onSubmit={handleSubmit(onSubmit)}
//         />

//         <ModalActions
//           isSubmitting={isPending}
//           onCancel={() => {
//             reset();
//             onClose();
//           }}
//           submitLabel="Submit"
//         />
//       </ModalShell>
//     </Dialog>
//   );
// };

// /* ------------------------------------------------------------------ */
// /*                        Edit patient modal                          */
// /* ------------------------------------------------------------------ */
// const EditPatientModal = ({ patient, onClose }) => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     setError,
//     setValue,
//     reset,
//   } = useForm({ defaultValues: { ...patient } });

//   const [countryCode, setCountryCode] = useState('');
//   const qc = useQueryClient();

//   const { mutateAsync: save, isPending } = useMutation({
//     mutationFn: updatePatient,
//     onSuccess: () => {
//       toast.success('Patient updated');
//       qc.invalidateQueries(['patients']);
//       reset();
//       onClose();
//     },
//     onError: (err) => {
//       if (err.message.includes('national_id'))
//         setError('national_id', { message: 'NID already exists' });
//       else toast.error(err.message);
//     },
//   });

//   const onSubmit = (data) => save({ id: patient.id, ...data });

//   return (
//     <Dialog
//       open
//       onClose={() => {
//         reset();
//         onClose();
//       }}
//       className="fixed z-10 inset-0 overflow-y-auto"
//     >
//       <ModalShell title="Edit Patient">
//         <PatientForm
//           errors={errors}
//           register={register}
//           setValue={setValue}
//           countryCode={countryCode}
//           setCountryCode={setCountryCode}
//           onSubmit={handleSubmit(onSubmit)}
//         />

//         <ModalActions
//           isSubmitting={isPending}
//           onCancel={() => {
//             reset();
//             onClose();
//           }}
//           submitLabel="Save Changes"
//         />
//       </ModalShell>
//     </Dialog>
//   );
// };

// /* ------------------------------------------------------------------ */
// /*   Shared sub‑components to keep both modals visually identical     */
// /* ------------------------------------------------------------------ */
// const ModalShell = ({ title, children }) => (
//   <div className="flex items-center justify-center min-h-screen px-4">
//     <div className="fixed inset-0 bg-black opacity-30" aria-hidden />
//     <div className="bg-white rounded-lg p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
//       <Dialog.Title className="text-lg font-bold mb-4">{title}</Dialog.Title>
//       {children}
//     </div>
//   </div>
// );

// const PatientForm = ({
//     errors,
//     register,
//     setValue,
//     countryCode,
//     setCountryCode,
//     onSubmit,            // <<< inject handler
//   }) => (
//     <form
//       id="patient-form"   /* ↞ matches ModalActions */
//       onSubmit={onSubmit} /* ↞ connect react‑hook‑form */
//       className="space-y-4"
//     >
//       <Field label="Name" error={errors.name}>
//       <input
//         {...register('name', { required: true })}
//         className="mt-1 p-2 border rounded w-full"
//       />
//     </Field>

//     <Field label="National ID" error={errors.national_id}>
//       <input
//         {...register('national_id', {
//           required: 'This field is required',
//           pattern: { value: /^[0-9]{10}$/, message: 'Must be exactly 10 digits' },
//         })}
//             className="mt-1 p-2 border rounded w-full font-mono"
//               />
//     </Field>

//     <Field label="Gender" error={errors.gender}>
//       <select
//         {...register('gender', { required: true })}
//         className="mt-1 p-2 border rounded w-full"
//       >
//         <option value="">Select</option>
//         <option value="male">Male</option>
//         <option value="female">Female</option>
//       </select>
//     </Field>

//     <Field label="Date of Birth" error={errors.date_of_birth}>
//       <input
//         type="date"
//         {...register('date_of_birth', { required: true })}
//         className="mt-1 p-2 border rounded w-full"
//       />
//     </Field>

//     <Field label="Nationality" error={errors.nationality}>
//       <ReactFlagsSelect
//         selected={countryCode}
//         onSelect={(code) => {
//           setCountryCode(code);
//           setValue('nationality', isoToName(code), { shouldValidate: true });
//         }}
//         searchable
//         className="mt-1"
//         placeholder="Select country"
//       />
//     </Field>

//     <Field label="Phone Number" error={errors.phone_number}>
//       <input
//         {...register('phone_number', {
//           required: 'This field is required',
//           pattern: {
//             value: /^\+9665[0-9]{8}$/,
//             message: 'Must match +9665xxxxxxxx',
//           },
//         })}
//         className="mt-1 p-2 border rounded w-full"
//       />
//     </Field>

//     <Field label="Medical History" error={errors.medical_history}>
//       <textarea
//         {...register('medical_history', { required: true })}
//         className="mt-1 p-2 border rounded w-full"
//       />
//     </Field>
//   </form>
// );

// const ModalActions = ({ isSubmitting, onCancel, submitLabel }) => (
//   <div className="mt-6 flex justify-end space-x-2">
//     <button
//       type="button"
//       onClick={onCancel}
//       className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//     >
//       Cancel
//     </button>
//     <button
//       type="submit"
//       form="patient-form"
//       disabled={isSubmitting}
//       className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
//     >
//       {submitLabel}
//     </button>
//   </div>
// );

// /* --- other tiny helpers --- */
// const ConfirmDelete = ({ id, onCancel, onDelete }) => (
//   <Dialog open onClose={onCancel} className="fixed z-10 inset-0 overflow-y-auto">
//     <div className="flex items-center justify-center min-h-screen px-4">
//       <div className="fixed inset-0 bg-black/30" />
//       <div className="bg-white rounded max-w-sm mx-auto p-6 z-20">
//         <Dialog.Title className="font-bold text-lg">Confirm Deletion</Dialog.Title>
//         <Dialog.Description className="text-sm text-gray-600 mt-1">
//           Deleting this patient will also remove associated appointments.
//         </Dialog.Description>
//         <div className="mt-4 flex justify-end gap-2">
//           <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
//             Cancel
//           </button>
//           <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   </Dialog>
// );

// const Field = ({ label, error, children }) => (
//   <div>
//     <label className="block text-sm font-medium">{label}</label>
//     {children}
//     {error && (
//       <span className="text-red-500 text-sm">
//         {error.message || 'This field is required'}
//       </span>
//     )}
//   </div>
// );

// export default PatientsList;

// src/features/patients/components/PatientsList.jsx
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  TrashIcon,
  PlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import ReactFlagsSelect from 'react-flags-select';
import { getName as isoToName } from 'country-list';

import { usePatients } from '../hooks/usePatients';
import { deletePatient, addPatient, updatePatient } from '../../../services/patients';
import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';
import { supabase } from '../../../lib/supabaseClient';

/* util */
const ageFromDOB = (d) =>
  d ? Math.floor((Date.now() - new Date(d)) / 31_556_900_000) : '';

/* ------------------------------------------------------------------ */
/*                           Patients list                            */
/* ------------------------------------------------------------------ */
const PatientsList = () => {
  const { data: patients = [], isLoading, isError } = usePatients();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  /* delete mutation */
  const { mutate: deleteOne, isPending: deleting } = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      toast.success('Patient deleted');
      qc.invalidateQueries(['patients']);
    },
    onError: (err) => toast.error(err.message),
  });

  /* filtered rows */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? patients.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.national_id.toLowerCase().includes(q)
        )
      : patients;
  }, [patients, search]);

  if (isLoading)
    return <div className="text-center text-gray-500">Loading patients…</div>;
  if (isError)
    return (
      <div className="text-center text-red-500">Failed to load patients</div>
    );

  return (
    <div className="p-8 bg-white rounded-lg shadow-md">
      {/* header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Patients</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-500 text-white rounded-md shadow-md hover:bg-indigo-600"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Patient
        </button>
      </div>

      {/* search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or NID…"
        className="mb-4 p-2 border rounded w-full max-w-sm"
      />

      {/* table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead className="text-center">
            <tr className="bg-gray-100 text-sm font-semibold text-gray-700">
              <th className="p-3">Name</th>
              <th className="p-3">NID</th>
              <th className="p-3">Gender</th>
              <th className="p-3">DOB</th>
              <th className="p-3">Age</th>
              <th className="p-3">Nationality</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-center">{p.name}</td>
                <td className="p-3 text-center font-mono">{p.national_id}</td>
                <td className="p-3 text-center capitalize">{p.gender}</td>
                <td className="p-3 text-center">
                  {format(new Date(p.date_of_birth), 'yyyy-MM-dd')}
                </td>
                <td className="p-3 text-center">{ageFromDOB(p.date_of_birth)}</td>
                <td className="p-3 text-center">{p.nationality}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button
                    title="Modify"
                    onClick={() => setEditPatient(p)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setDeleteId(p.id)}
                    disabled={deleting}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="7" className="py-4 text-center text-gray-400">
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* modals */}
      {addOpen && <AddPatientModal onClose={() => setAddOpen(false)} />}
      {editPatient && (
        <EditPatientModal
          patient={editPatient}
          onClose={() => setEditPatient(null)}
        />
      )}
      {deleteId && (
        <ConfirmDelete
          id={deleteId}
          onCancel={() => setDeleteId(null)}
          onDelete={() => {
            deleteOne(deleteId);
            setDeleteId(null);
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*                         Add patient modal                          */
/* ------------------------------------------------------------------ */
const AddPatientModal = ({ onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  const [countryCode, setCountryCode] = useState('');
  const qc = useQueryClient();

  // get current doctor's profile (to retrieve clinic_id)
  const { data: doctor } = useDoctorProfile();

  const { mutateAsync: createOne, isPending } = useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      toast.success('Patient added successfully');
      qc.invalidateQueries(['patients']);
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = async (form) => {
    if (!doctor?.clinic_id) {
      toast.error('Unable to determine your clinic');
      return;
    }
    await createOne({
      ...form,
      clinic_id: doctor.clinic_id,
    });
  };

  return (
    <Dialog
      open
      onClose={() => {
        reset();
        onClose();
      }}
      className="fixed z-10 inset-0 overflow-y-auto"
    >
      <ModalShell title="Add New Patient">
        <PatientForm
          errors={errors}
          register={register}
          setValue={setValue}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          onSubmit={handleSubmit(onSubmit)}
        />
        <ModalActions
          isSubmitting={isPending}
          onCancel={() => {
            reset();
            onClose();
          }}
          submitLabel="Submit"
        />
      </ModalShell>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/*                        Edit patient modal                          */
/* ------------------------------------------------------------------ */
const EditPatientModal = ({ patient, onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    reset,
  } = useForm({ defaultValues: { ...patient } });
  const [countryCode, setCountryCode] = useState('');
  const qc = useQueryClient();

  const { mutateAsync: save, isPending } = useMutation({
    mutationFn: updatePatient,
    onSuccess: () => {
      toast.success('Patient updated');
      qc.invalidateQueries(['patients']);
      reset();
      onClose();
    },
    onError: (err) => {
      if (err.message.includes('national_id'))
        setError('national_id', { message: 'NID already exists' });
      else toast.error(err.message);
    },
  });

  const onSubmit = (data) => save({ id: patient.id, ...data });

  return (
    <Dialog
      open
      onClose={() => {
        reset();
        onClose();
      }}
      className="fixed z-10 inset-0 overflow-y-auto"
    >
      <ModalShell title="Edit Patient">
        <PatientForm
          errors={errors}
          register={register}
          setValue={setValue}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          onSubmit={handleSubmit(onSubmit)}
        />
        <ModalActions
          isSubmitting={isPending}
          onCancel={() => {
            reset();
            onClose();
          }}
          submitLabel="Save Changes"
        />
      </ModalShell>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/*             Shared sub-components (unchanged)                      */
/* ------------------------------------------------------------------ */
const ModalShell = ({ title, children }) => (
  <div className="flex items-center justify-center min-h-screen px-4">
    <div className="fixed inset-0 bg-black opacity-30" aria-hidden />
    <div className="bg-white rounded-lg p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
      <Dialog.Title className="text-lg font-bold mb-4">{title}</Dialog.Title>
      {children}
    </div>
  </div>
);

const PatientForm = ({ errors, register, setValue, countryCode, setCountryCode, onSubmit }) => (
  <form id="patient-form" onSubmit={onSubmit} className="space-y-4">
    <Field label="Name" error={errors.name}>
      <input
        {...register('name', { required: true })}
        className="mt-1 p-2 border rounded w-full"
      />
    </Field>

    <Field label="National ID" error={errors.national_id}>
      <input
        {...register('national_id', {
          required: 'This field is required',
          pattern: { value: /^[0-9]{10}$/, message: 'Must be exactly 10 digits' },
        })}
        className="mt-1 p-2 border rounded w-full font-mono"
      />
    </Field>

    <Field label="Gender" error={errors.gender}>
      <select
        {...register('gender', { required: true })}
        className="mt-1 p-2 border rounded w-full"
      >
        <option value="">Select</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </Field>

    <Field label="Date of Birth" error={errors.date_of_birth}>
      <input
        type="date"
        {...register('date_of_birth', { required: true })}
        className="mt-1 p-2 border rounded w-full"
      />
    </Field>

    <Field label="Nationality" error={errors.nationality}>
      <ReactFlagsSelect
        selected={countryCode}
        onSelect={(code) => {
          setCountryCode(code);
          setValue('nationality', isoToName(code), { shouldValidate: true });
        }}
        searchable
        className="mt-1"
        placeholder="Select country"
      />
    </Field>

    <Field label="Phone Number" error={errors.phone_number}>
      <input
        {...register('phone_number', {
          required: 'This field is required',
          pattern: {
            value: /^\+9665[0-9]{8}$/,
            message: 'Must match +9665xxxxxxxx',
          },
        })}
        className="mt-1 p-2 border rounded w-full"
      />
    </Field>

    <Field label="Medical Diagnose" error={errors.medical_history}>
      <textarea
        {...register('medical_diagnose', { required: true })}
        className="mt-1 p-2 border rounded w-full"
      />
    </Field>
  </form>
);

const ModalActions = ({ isSubmitting, onCancel, submitLabel }) => (
  <div className="mt-6 flex justify-end space-x-2">
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
    >
      Cancel
    </button>
    <button
      type="submit"
      form="patient-form"
      disabled={isSubmitting}
      className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
    >
      {submitLabel}
    </button>
  </div>
);

const ConfirmDelete = ({ id, onCancel, onDelete }) => (
  <Dialog open onClose={onCancel} className="fixed z-10 inset-0 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="fixed inset-0 bg-black/30" />
      <div className="bg-white rounded max-w-sm mx-auto p-6 z-20">
        <Dialog.Title className="font-bold text-lg">Confirm Deletion</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-600 mt-1">
          Deleting this patient will also remove associated appointments.
        </Dialog.Description>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  </Dialog>
);

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium">{label}</label>
    {children}
    {error && <span className="text-red-500 text-sm">{error.message || 'This field is required'}</span>}
  </div>
);

export default PatientsList;