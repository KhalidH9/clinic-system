// // src/services/appointments.js
// import { supabase } from '@/lib/supabaseClient';
// import { logger }   from '@/lib/logger';

// /**
//  * Insert new appointment.
//  * Throws on error so TanStack mutations work uniformly.
//  */
// export const createAppointment = async (payload) => {
//   const { error } = await supabase.from('appointments').insert(payload);

//   if (error) {
//     logger.error('Supabase insert error', error);
//     throw new Error('Failed to create appointment');
//   }

//   logger.info('Appointment created', payload);
//   return true;
// };

// // src/services/appointments.js
// import { supabase } from '@/lib/supabaseClient';
// import { logger }   from '@/lib/logger';

// export const createAppointment = async (payload) => {
//   const {
//     clinic_id,
//     doctor_id,
//     patient_id,
//     status           = 'scheduled',
//     starts_at,       // optional – preferred
//     ends_at,         // optional
//     follow_up_assessment,
//     date,            // legacy
//     time,            // legacy (24-h "HH:mm")
//   } = payload;

//   // ── 1. derive starts / ends if only date+time were supplied ──────────────
//   let _starts = starts_at;
//   let _ends   = ends_at;

//   if (!_starts && date && time) {
//     // Combine into ISO string in local TZ → Date → back to ISO
//     _starts = new Date(`${date}T${time}:00`).toISOString();
//   }

//   if (!_ends) {
//     // 30-minute slot unless caller sent ends_at explicitly
//     _ends = new Date(new Date(_starts).getTime() + 30 * 60 * 1_000).toISOString();
//   }

//   const row = {
//     clinic_id,
//     doctor_id,
//     patient_id,
//     starts_at: _starts,
//     ends_at:   _ends,
//     status,
//     follow_up_assessment,
//     // sms_needed defaults to TRUE at the DB level
//   };

//   const { error } = await supabase
//     .from('appointments')
//     .insert(row);

//   if (error) {
//     logger.error('Supabase insert error', error);
//     throw new Error('Failed to create appointment');
//   }

//   logger.info('Appointment created', row);
  
//   return true;
// };

// /* ------------------------------------------------------------------ */
// /*  Update only the status column of an appointment row               */
// /* ------------------------------------------------------------------ */
// // export const updateAppointmentStatus = async ({ id, status }) => {
// //   const { error } = await supabase
// //     .from('appointments')
// //     .update({ status })
// //     .eq('id', id);

// //   if (error) {
// //     logger.error('Supabase update status error', { id, status, error });
// //     throw new Error('Failed to update status');
// //   }

// //   logger.info('Appointment status updated', { id, status });
// //   return true;
// // };

// // after updateAppointmentStatus success, Supabase returns the new row.
// // expose status_updates so the UI can disable immediately
// export const updateAppointmentStatus = async ({ id, status }) => {
//   const { data, error } = await supabase
//     .from('appointments')
//     .update({ status })
//     .eq('id', id)
//     .select('id,status,status_updates')
//     .single();

//   if (error) {
//     logger.error('Supabase update status error', { id, status, error });
//     throw new Error(error.message);
//   }

//   logger.info('Appointment status updated', { id, status });
//   return data;             // { id, status, status_updates }
// };


// src/services/appointments.js
import { supabase } from '@/lib/supabaseClient';
import { logger }   from '@/lib/logger';
import { sendAppointmentSMS } from './sms';
import { format }  from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Create a new appointment + fire-and-forget SMS                    */
/* ------------------------------------------------------------------ */
export const createAppointment = async (payload) => {
  /* ------------ split payload into DB fields vs SMS fields ---------- */
  const {
    /* ■ DB columns */
    clinic_id,
    doctor_id,
    patient_id,
    status = 'scheduled',
    starts_at,                // optional
    ends_at,                  // optional
    follow_up_assessment,
    date,                     // legacy
    time,                     // legacy

    /* ■ SMS-only */
    patient_phone,
    doctor_name,
    patient_name,
    org_name,
  } = payload;

  /* ------------ derive ISO timestamps if only date+time were given -- */
  let _starts = starts_at;
  let _ends   = ends_at;

  if (!_starts && date && time) {
    _starts = new Date(`${date}T${time}:00`).toISOString();
  }
  if (!_ends) {
    _ends = new Date(new Date(_starts).getTime() + 30 * 60 * 1_000).toISOString();
  }

  /* ------------ insert the DB row (only valid columns) -------------- */
  const row = {
    clinic_id,
    doctor_id,
    patient_id,
    starts_at: _starts,
    ends_at:   _ends,
    status,
    follow_up_assessment,
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(row)
    .select('id, starts_at')        // need starts_at for SMS
    .single();

  if (error) {
    logger.error('Supabase insert error', error);
    throw new Error('Failed to create appointment');
  }

  logger.info('Appointment created', data);

  /* ------------ fire-and-forget SMS --------------------------------- */
  if (patient_phone) {
    sendAppointmentSMS({
      to:      patient_phone,
      doctor:  doctor_name,
      patient: patient_name,
      date:    format(new Date(data.starts_at), 'yyyy-MM-dd'),
      time:    format(new Date(data.starts_at), 'HH:mm'),
      org:     org_name ?? 'your clinic',
    }).catch((err) => logger.error('SMS send failed', err));
  }

  return true;
};

/* ------------------------------------------------------------------ */
/*  Update ONLY the status column; return status_updates counter      */
/* ------------------------------------------------------------------ */
export const updateAppointmentStatus = async ({ id, status }) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select('id, status, status_updates')
    .single();

  if (error) {
    logger.error('Supabase update status error', { id, status, error });
    throw new Error(error.message);
  }

  logger.info('Appointment status updated', { id, status });
  return data;   // { id, status, status_updates }
};