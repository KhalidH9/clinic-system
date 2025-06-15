// // src/features/auth/hooks/useDoctorProfile.js
// import { useQuery } from '@tanstack/react-query';
// import { supabase }  from '../../../lib/supabaseClient';
// import { logger }    from '../../../lib/logger';

// const fetchDoctorProfile = async () => {
//   const { data: auth } = await supabase.auth.getUser();
//   const uid = auth?.user?.id;
//   if (!uid) throw new Error('Not authenticated');

//   const { data, error } = await supabase
//     .from('doctors')
//     .select('*')
//     .eq('user_id', uid)
//     .single();

//   if (error || !data) {
//     logger.warn('Doctor profile not found', { uid, error });
//     throw new Error('Doctor profile not found');
//   }

//   logger.info('Doctor profile loaded', { doctorId: data.id });
//   return data;
// };

// export const useDoctorProfile = () =>
//   useQuery({
//     queryKey: ['doctor-profile'],
//     queryFn: fetchDoctorProfile,
//     suspense: false,            // avoid ErrorBoundary crash loops
//     staleTime: 5 * 60 * 1_000,  // 5 min
//     gcTime:   30 * 60 * 1_000,
//     retry: 1,
//   });

// src/features/auth/hooks/useDoctorProfile.js
import { useQuery } from '@tanstack/react-query';
import { supabase }  from '../../../lib/supabaseClient';
import { logger }    from '../../../lib/logger';

const fetchDoctorProfile = async () => {
  /* current session → uid */
  const { data: authSession } = await supabase.auth.getUser();
  const uid = authSession?.user?.id;
  if (!uid) throw new Error('Not authenticated');

  /* new unified “doctors” view → id = auth.uid() */
  const { data, error } = await supabase
    .from('doctors')       // view: SELECT * FROM users WHERE role='doctor'
    .select('*')
    .eq('id', uid)         // ‹── formerly user_id
    .single();

  if (error || !data) {
    logger.warn('Doctor profile not found', { uid, error });
    throw new Error('Doctor profile not found');
  }

  logger.info('Doctor profile loaded', { doctorId: data.id });
  return data;
};

export const useDoctorProfile = () =>
  useQuery({
    queryKey: ['doctor-profile'],
    queryFn: fetchDoctorProfile,
    suspense: false,
    staleTime: 5 * 60 * 1_000,
    gcTime:   30 * 60 * 1_000,
    retry: 1,
  });
