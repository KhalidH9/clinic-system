// // src/features/profile/Profile.jsx
// import React from 'react';
// import { useDoctorProfile } from '../auth/hooks/useDoctorProfile';

// const Profile = () => {
//   const { data: doctor, isLoading, isError, error } = useDoctorProfile();

//   if (isLoading)
//     return (
//       <div className="flex justify-center items-center h-full">
//         Loading profile…
//       </div>
//     );

//   if (isError)
//     return (
//       <div className="flex justify-center items-center h-full text-red-500">
//         {error?.message || 'Failed to load profile.'}
//       </div>
//     );

//   return (
//     <div className="h-full w-full bg-white p-10">
//       <h1 className="text-2xl font-bold mb-8">Doctor Profile</h1>

//       <div className="grid grid-cols-2 gap-8">
//         {[
//           ['Full Name',               doctor.name],
//           ['Email',                   doctor.email],
//           ['Phone Number',            doctor.phone || '—'],
//           ['Specialization',          doctor.specialization],
//           ['License Number',          doctor.license_number],
//           ['Appointment Duration (m)',doctor.appointment_duration],
//           ['Organization Name',       doctor.organization_name || '—'],
//           ['Bio',                     doctor.bio || '—'],
//         ].map(([label, value]) => (
//           <div key={label}>
//             <p className="font-semibold text-gray-600 mb-1">{label}</p>
//             <p className="border p-3 rounded-md break-words">{value}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default Profile;

// src/features/profile/Profile.jsx
import React from 'react';
import { useDoctorProfile } from '../auth/hooks/useDoctorProfile';

const Profile = () => {
  const { data: doctor, isLoading, isError, error } = useDoctorProfile();

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full">
        Loading profile…
      </div>
    );

  if (isError)
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        {error?.message || 'Failed to load profile.'}
      </div>
    );

  return (
    <div className="h-full w-full bg-white p-10">
      <h1 className="text-2xl font-bold mb-8">Profile</h1>

      <div className="grid grid-cols-2 gap-8">
        {[
          ['Name',               doctor.name],
          ['Bio',                     doctor.bio || 'Please contact admin to update information'],
          ['Email',                   doctor.email || 'Please contact admin to update information'],
          ['Phone Number',            doctor.phone_number || 'Please contact admin to update information'],
          ['Specialization',          doctor.specialization || 'Please contact admin to update information'],
          ['License Number',          doctor.licence_no || 'Please contact admin to update information'],
          ['Appointment Duration (m)',doctor.appointment_duration || 'Please contact admin to update information'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="font-semibold text-gray-600 mb-1">{label}</p>
            <p className="border p-3 rounded-md break-words">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
