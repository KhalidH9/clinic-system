// // src/features/home/hooks/usePatient.js
// import { useQuery } from '@tanstack/react-query';
// import { supabase }  from '../../../lib/supabaseClient';
// import { logger }    from '../../../lib/logger';

// /* ------------------------------------------------------------------ */
// /*                         data-fetching logic                        */
// /* ------------------------------------------------------------------ */
// const fetchPatientByNID = async (nid) => {
//   if (!nid) return null;

//   const { data, error } = await supabase
//     .from('patients')
//     .select('*')
//     .eq('national_id', nid)
//     .single();

//   if (error || !data) {
//     logger.warn('Patient search – not found', { nid, error });
//     throw new Error('Patient not found');
//   }

//   logger.info('Patient loaded', { nid });
//   return data;
// };

// /* ------------------------------------------------------------------ */
// /*                        exported React hook                         */
// /* ------------------------------------------------------------------ */
// export const usePatient = (nid, enabled = false) =>
//   useQuery({
//     queryKey: ['patient', nid],
//     queryFn: () => fetchPatientByNID(nid),
//     enabled,
//     suspense: false,   // keep errors local (no ErrorBoundary crash)
//     retry: 0,          // fail-fast on “not found”
//     staleTime: 0,      // always refetch on new search
//     gcTime: 5 * 60 * 1_000,
//   });

// src/features/home/hooks/usePatient.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { logger }   from '../../../lib/logger';
import { useDoctorProfile } from '../../auth/hooks/useDoctorProfile';

const fetchPatientByNID = async ({ queryKey }) => {
  const [_key, nid, clinicId] = queryKey;
  if (!nid || !clinicId) return null;

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('national_id', nid)
    .single();

  if (error || !data) {
    logger.warn('Patient search – not found', { nid, error });
    throw new Error('Patient not found');
  }

  logger.info('Patient loaded', { nid });
  return data;
};

export const usePatient = (nid, enabled = false) => {
  const { data: doctor, isLoading: loadingDoctor } = useDoctorProfile();

  return useQuery({
    queryKey: ['patient', nid, doctor?.clinic_id],
    queryFn: fetchPatientByNID,
    enabled: enabled && !loadingDoctor,
    suspense: false,   // keep errors local
    retry: 0,          // fail-fast on “not found”
    staleTime: 0,      // always refetch on new search
    gcTime: 5 * 60 * 1_000,
  });
};
