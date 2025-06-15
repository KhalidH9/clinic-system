// // src/features/home/hooks/useAvailableTimes.js
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '../../../lib/supabaseClient';
// import { format }   from 'date-fns';
// import { logger }   from '../../../lib/logger';

// const fetchAvailableTimes = async (date) => {
//   if (!date) return [];

//   const iso = format(date, 'yyyy-MM-dd');
//   const { data, error } = await supabase
//     .from('appointments')
//     .select('time')
//     .eq('date', iso);

//   if (error) {
//     logger.error('Supabase error (available-times)', error);
//     throw new Error('Failed to load available times');
//   }
//   return data?.map((d) => d.time) || [];
// };

// export const useAvailableTimes = (date, enabled = false) =>
//   useQuery({
//     queryKey: ['available-times', date],
//     queryFn: () => fetchAvailableTimes(date),
//     enabled,
//     retry: 0,        // fail-fast
//     staleTime: 0,    // always fresh on open
//     gcTime: 5 * 60 * 1_000,
//   });

// src/features/home/hooks/useAvailableTimes.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { format, addDays, parseISO } from 'date-fns';
import { logger }   from '../../../lib/logger';
import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';

const fetchAvailableTimes = async ({ queryKey }) => {
  const [_key, date, clinicId] = queryKey;
  if (!date || !clinicId) return [];

  /* build 24 h range in ISO */
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = addDays(dayStart, 1);

  const { data, error } = await supabase
    .from('appointments')
    .select('starts_at')
    .eq('clinic_id', clinicId)
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at',  dayEnd.toISOString());

  if (error) {
    logger.error('Supabase error (available-times)', error);
    throw new Error('Failed to load available times');
  }

  /* return “HH:mm” strings */
  return (data || []).map((d) =>
    format(parseISO(d.starts_at), 'HH:mm')
  );
};

export const useAvailableTimes = (date, enabled = false) => {
  const { data: doctor, isLoading: loadingDoctor } = useDoctorProfile();

  return useQuery({
    queryKey: ['available-times', date, doctor?.clinic_id],
    queryFn: fetchAvailableTimes,
    enabled: enabled && !loadingDoctor,
    retry: 0,
    staleTime: 0,
    gcTime: 5 * 60 * 1_000,
  });
};
