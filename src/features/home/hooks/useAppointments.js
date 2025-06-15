// // src/features/home/hooks/useAppointments.js
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '../../../lib/supabaseClient';
// import { logger } from '../../../lib/logger';

// const fetchAppointments = async ({ queryKey }) => {
//   const [_key, formattedDate] = queryKey;
//   if (!formattedDate) return [];

//   const { data, error } = await supabase
//     .from('appointments')
//     .select('*')
//     .eq('date', formattedDate)
//     .order('time', { ascending: true });

//   if (error) {
//     logger.error('Error fetching appointments', error);
//     throw new Error('Unable to load appointments');
//   }

//   return data ?? [];
// };

// export const useAppointments = (formattedDate) =>
//   useQuery({
//     queryKey: ['appointments', formattedDate],
//     queryFn: fetchAppointments,
//     enabled: !!formattedDate,
//     staleTime: 5 * 60 * 1_000,
//     gcTime:   60 * 60 * 1_000,
//   });

// src/features/home/hooks/useAppointments.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { logger }   from '../../../lib/logger';
import { addDays }  from 'date-fns';
import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';

const fetchAppointments = async ({ queryKey }) => {
  const [_key, formattedDate, clinicId] = queryKey;
  if (!formattedDate || !clinicId) return [];

  /* build 24 h range */
  const dayStart = new Date(`${formattedDate}T00:00:00`);
  const dayEnd   = addDays(dayStart, 1);

  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:patient_id(name)')
    .eq('clinic_id', clinicId)
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at',  dayEnd.toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    logger.error('Error fetching appointments', error);
    throw new Error('Unable to load appointments');
  }
  return data ?? [];
};

export const useAppointments = (formattedDate) => {
  const { data: doctor, isLoading: loadingDoctor } = useDoctorProfile();

  return useQuery({
    queryKey: ['appointments', formattedDate, doctor?.clinic_id],
    queryFn: fetchAppointments,
    enabled: !!formattedDate && !loadingDoctor,
    staleTime: 5 * 60 * 1_000,
    gcTime:   60 * 60 * 1_000,
  });
};
