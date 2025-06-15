// // src/features/patients/hooks/usePatients.js
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '../../../lib/supabaseClient';
// import { logger }   from '../../../lib/logger';
// import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';

// export const usePatients = () => {
//   // still wait until doctor profile is loaded → guarantees auth ready
//   const { data: doctor, isLoading } = useDoctorProfile();

//   return useQuery({
//     queryKey: ['patients'],
//     enabled: !isLoading,           // fetch after auth state known
//     suspense: false,
//     staleTime: 5 * 60 * 1_000,
//     gcTime:   30 * 60 * 1_000,
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from('patients')
//         .select('*')
//         .order('name');            // RLS keeps rows per-doctor

//       if (error) {
//         logger.error('Error fetching patients', error);
//         throw new Error('Unable to load patients');
//       }

//       logger.info('Patients loaded', { count: data?.length });
//       return data ?? [];
//     },
//   });
// };

// src/features/patients/hooks/usePatients.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { logger }   from '../../../lib/logger';
import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';

export const usePatients = () => {
  // still wait until doctor profile is loaded → guarantees auth ready
  const { data: doctor, isLoading } = useDoctorProfile();

  return useQuery({
    queryKey: ['patients'],
    enabled: !!doctor && !isLoading, // only once we have doctor → can read clinic_id
    suspense: false,
    staleTime: 5 * 60 * 1_000,
    gcTime:   30 * 60 * 1_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', doctor.clinic_id)
        .order('name');            // now scoped to this doctor’s clinic

      if (error) {
        logger.error('Error fetching patients', error);
        throw new Error('Unable to load patients');
      }

      logger.info('Patients loaded', { count: data?.length });
      return data ?? [];
    },
  });
};