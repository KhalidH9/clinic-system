// // src/features/home/components/Timeline.jsx
// import React, { useMemo } from 'react';
// import { format } from 'date-fns';
// import { logger } from '../../../lib/logger';

// /* Business hours — tweak once here */
// const START_HOUR = 8;
// const END_HOUR   = 22;

// /**
//  * Memo-ised hour labels, e.g. ["08:00", "09:00", …]
//  */
// const useHourSlots = () =>
//   useMemo(() => {
//     const out = [];
//     for (let h = START_HOUR; h <= END_HOUR; h += 1) {
//       out.push(`${String(h).padStart(2, '0')}:00`);
//     }
//     return out;
//   }, []);

// const Timeline = React.memo(({ appointments, selectedDate }) => {
//   if (!selectedDate) {
//     return (
//       <div className="flex justify-center items-center h-full text-gray-500">
//         Please select a date to view appointments.
//       </div>
//     );
//   }

//   const hours = useHourSlots();
//   const selectedISO = format(selectedDate, 'yyyy-MM-dd');

//   return (
//     <div className="flex flex-col gap-6">
//       {hours.map((hour) => (
//         <HourRow
//           key={hour}
//           hour={hour}
//           appointments={appointments}
//           selectedISO={selectedISO}
//         />
//       ))}
//     </div>
//   );
// });

// export default Timeline;

// /* ----------------------------------------------------------------------- */
// /* ---------------------------  sub-components  -------------------------- */
// /* ----------------------------------------------------------------------- */

// const HourRow = ({ hour, appointments, selectedISO }) => {
//   const formattedHour = useMemo(() => {
//     const [h, m] = hour.split(':');
//     const d = new Date();
//     d.setHours(h, m, 0, 0);
//     return format(d, 'h:mm a');
//   }, [hour]);

//   const items = useMemo(
//     () =>
//       appointments.filter(
//         (a) =>
//           a?.date === selectedISO &&
//           a?.time?.startsWith(hour.slice(0, 2))
//       ),
//     [appointments, hour, selectedISO]
//   );

//   /* Helpful debug log for over-booking etc. */
//   if (items.length > 1) {
//     logger.warn('Multiple appointments in same slot', {
//       hour,
//       count: items.length,
//     });
//   }

//   return (
//     <div className="border-b pb-4">
//       <div className="font-semibold text-gray-700 mb-2">{formattedHour}</div>

//       <div className="flex flex-col gap-2">
//         {items.map((appt) => (
//           <div
//             key={appt.id}
//             className="p-3 bg-indigo-100 text-indigo-800 rounded-md shadow-sm"
//           >
//             <div className="font-bold">{appt.patient_name}</div>
//             <div className="text-sm">{appt.notes}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// // src/features/home/components/Timeline.jsx
// import React, { useMemo } from 'react';
// import { format, parseISO } from 'date-fns';
// import { logger } from '../../../lib/logger';

// const START_HOUR = 8;
// const END_HOUR   = 22;

// /* memoised hour labels */
// const useHourSlots = () =>
//   useMemo(() => {
//     const out = [];
//     for (let h = START_HOUR; h <= END_HOUR; h += 1) {
//       out.push(`${String(h).padStart(2, '0')}:00`);
//     }
//     return out;
//   }, []);

// const Timeline = React.memo(({ appointments, selectedDate }) => {
//   if (!selectedDate) {
//     return (
//       <div className="flex justify-center items-center h-full text-gray-500">
//         Please select a date to view appointments.
//       </div>
//     );
//   }

//   const hours = useHourSlots();
//   const selectedISO = format(selectedDate, 'yyyy-MM-dd');

//   return (
//     <div className="flex flex-col gap-6">
//       {hours.map((hour) => (
//         <HourRow
//           key={hour}
//           hour={hour}
//           appointments={appointments}
//           selectedISO={selectedISO}
//         />
//       ))}
//     </div>
//   );
// });

// export default Timeline;

// /* --------------------------- sub-components --------------------------- */

// const HourRow = ({ hour, appointments, selectedISO }) => {
//   const formattedHour = useMemo(() => {
//     const [h, m] = hour.split(':');
//     const d = new Date();
//     d.setHours(h, m, 0, 0);
//     return format(d, 'h:mm a');
//   }, [hour]);

//   /* filter by starts_at instead of date+time columns */
//   const items = useMemo(
//     () =>
//       appointments.filter((a) => {
//         const start = parseISO(a.starts_at);
//         return (
//           format(start, 'yyyy-MM-dd') === selectedISO &&
//           String(start.getHours()).padStart(2, '0') === hour.slice(0, 2)
//         );
//       }),
//     [appointments, hour, selectedISO]
//   );

//   if (items.length > 1) {
//     logger.warn('Multiple appointments in same slot', {
//       hour,
//       count: items.length,
//     });
//   }

//   return (
//     <div className="border-b pb-4">
//       <div className="font-semibold text-gray-700 mb-2">{formattedHour}</div>

//       <div className="flex flex-col gap-2">
//         {items.map((appt) => (
//           <div
//             key={appt.id}
//             className="p-3 bg-indigo-100 text-indigo-800 rounded-md shadow-sm"
//           >
//             <div className="font-bold">{appt.patient_id}</div>
//             <div className="text-sm">{appt.status}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// src/features/home/components/Timeline.jsx
import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { updateAppointmentStatus } from '../../../services/appointments';
import { logger } from '../../../lib/logger';

const START_HOUR = 8;
const END_HOUR   = 22;

/* ────────────────────────────────────────────────────────────── */
/* Hour slots helper                                              */
/* ────────────────────────────────────────────────────────────── */
const useHourSlots = () =>
  useMemo(() => {
    const out = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 1) {
      out.push(`${String(h).padStart(2, '0')}:00`);
    }
    return out;
  }, []);

/* ────────────────────────────────────────────────────────────── */
/* Main timeline                                                  */
/* ────────────────────────────────────────────────────────────── */
const Timeline = React.memo(({ appointments, selectedDate }) => {
  if (!selectedDate) {
    return (
      <div className="flex justify-center items-center h-full text-gray-500">
        Please select a date to view appointments.
      </div>
    );
  }

  const hours       = useHourSlots();
  const selectedISO = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="flex flex-col gap-6">
      {hours.map((hour) => (
        <HourRow
          key={hour}
          hour={hour}
          appointments={appointments}
          selectedISO={selectedISO}
        />
      ))}
    </div>
  );
});

export default Timeline;

/* ────────────────────────────────────────────────────────────── */
/* Row for a single hour                                          */
/* ────────────────────────────────────────────────────────────── */
const HourRow = ({ hour, appointments, selectedISO }) => {
  const formattedHour = useMemo(() => {
    const [h, m] = hour.split(':');
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  }, [hour]);

  const items = useMemo(
    () =>
      appointments.filter((a) => {
        const start = parseISO(a.starts_at);
        return (
          format(start, 'yyyy-MM-dd') === selectedISO &&
          String(start.getHours()).padStart(2, '0') === hour.slice(0, 2)
        );
      }),
    [appointments, hour, selectedISO]
  );

  if (items.length > 1) {
    logger.warn('Multiple appointments in same slot', {
      hour,
      count: items.length,
    });
  }

  return (
    <div className="border-b pb-4">
      <div className="font-semibold text-gray-700 mb-2">{formattedHour}</div>

      <div className="flex flex-col gap-2">
        {items.map((appt) => (
          <AppointmentCard key={appt.id} appt={appt} />
        ))}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Card component                                                 */
/* ────────────────────────────────────────────────────────────── */
const statusClasses = {
  scheduled: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100  text-green-800',
  attended:  'bg-green-100  text-green-800',
  cancelled: 'bg-red-100    text-red-800',
};

const selectClasses = {
  scheduled: 'border-indigo-300 text-indigo-800',
  completed: 'border-green-400  text-green-800',
  attended:  'border-green-400  text-green-800',
  cancelled: 'border-red-400    text-red-800',
};

const AppointmentCard = ({ appt }) => {
  const qc = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: updateAppointmentStatus,
        onSuccess: (updated) => {
            toast.success('Status updated');
            qc.setQueriesData(
              { queryKey: ['appointments'], exact: false },        // ← match every date/clinic variant
              (old) =>
                old?.map((a) =>
                  a.id === updated.id ? { ...a, ...updated } : a
                )
            );    
    },
    onError: (err) => toast.error(err.message || 'Update failed'),
  });

    const disabled    = appt.status_updates >= 2;
    const handleChange = (e) =>
    mutate({ id: appt.id, status: e.target.value });

  const startTime = format(parseISO(appt.starts_at), 'HH:mm');

  const patientName = appt.patient?.name || appt.patient_name || '—';
  const headline    = `${patientName} - ${startTime}`;             // ❶ name - time

  return (
    <div
      className={`p-3 rounded-md shadow-sm flex flex-col gap-1 ${
        statusClasses[appt.status] || statusClasses.scheduled
      }`}
    >
      <div className="font-bold">{headline}</div>

      <div className="text-sm break-words">
        {appt.follow_up_assessment || '—'}
      </div>

      {/* ❷ modern status dropdown, colour-matched */}
      <select
        value={appt.status}
        onChange={handleChange}
        /* bg-transparent → inherits the card tint
           w-max → shrinks to content instead of full width            */
           disabled={disabled}
           className={`mt-1 text-sm rounded px-2 py-1 w-max bg-transparent
                       appearance-none focus:ring-0 border
                      ${selectClasses[appt.status]}
                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}      >
        {/* <option value="scheduled">scheduled</option> */}
        <option value="completed">completed</option>
        {/* <option value="attended">attended</option> */}
        <option value="cancelled">cancelled</option>
      </select>
    </div>
  );
};
