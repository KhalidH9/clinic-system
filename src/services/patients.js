// // src/services/patients.js
// import { supabase } from '@/lib/supabaseClient';
// import { logger }   from '@/lib/logger';

// /** Delete patient by row id. */
// export const deletePatient = async (patientId) => {
//   const { error } = await supabase
//     .from('patients')
//     .delete()
//     .eq('id', patientId);

//   if (error) {
//     logger.error('Supabase delete patient error', { patientId, error });
//     throw new Error('Delete failed');
//   }

//   logger.info('Patient deleted', { patientId });
//   return true;
// };

// /** Create a patient for the signed-in doctor (user_id row). */
// export const addPatient = async (payload) => {
//       const { error } = await supabase.from('patients').insert(payload);
    
//       if (error) {
//         logger.error('Supabase insert patient error', { error });
//         throw new Error(error.message);
//       }
//       logger.info('Patient created', { patientId: payload.national_id });
//       return true;
//     };

//     export const updatePatient = async ({ id, ...fields }) => {
//       const { error } = await supabase.from('patients').update(fields).eq('id', id);
//       if (error) throw new Error(error.message);
//       return true;
//     };

// src/services/patients.js
import { supabase } from '@/lib/supabaseClient';
import { logger }   from '@/lib/logger';

/* ------------------------------------------------------------------ */
/* Allowed columns in the unified `users` table when role = 'patient' */
/* ------------------------------------------------------------------ */
const PATIENT_FIELDS = new Set([
  'clinic_id',
  'role',
  'name',
  'national_id',
  'nationality',
  'date_of_birth',
  'gender',
  'phone_number',
  'email',
  'medical_diagnose',        // ← NEW
  'follow_up_assessment',    // ← NEW
  'is_active',
]);

/* ------------------------------ utilities ------------------------------ */
const filterPatientFields = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => PATIENT_FIELDS.has(k))
  );

/* ----------------------------- operations ----------------------------- */

/* Delete patient by user-id */
export const deletePatient = async (patientId) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', patientId);

  if (error) {
    logger.error('Supabase delete patient error', { patientId, error });
    throw new Error('Delete failed');
  }

  logger.info('Patient deleted', { patientId });
  return true;
};

/* Create patient (role is forced to 'patient') */
export const addPatient = async (payload) => {
  const row = {
    ...filterPatientFields(payload),
    role: 'patient',
  };

  const { error } = await supabase
    .from('users')
    .insert(row);

  if (error) {
    logger.error('Supabase insert patient error', { error });
    throw new Error(error.message);
  }

  logger.info('Patient created', {
    national_id: row.national_id,
    clinic_id:   row.clinic_id,
  });
  return true;
};

/* Update patient */
export const updatePatient = async ({ id, ...fields }) => {
  const patch = filterPatientFields(fields);

  const { error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', id);

  if (error) {
    logger.error('Supabase update patient error', { id, error });
    throw new Error(error.message);
  }

  logger.info('Patient updated', { id });
  return true;
};
