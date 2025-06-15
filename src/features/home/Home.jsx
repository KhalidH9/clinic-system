// src/features/home/Home.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format }   from 'date-fns';

import { useAppointments } from './hooks/useAppointments';
import Timeline           from './components/Timeline';
import AppointmentModal   from './components/AppointmentModal';

import { logger } from '../../lib/logger';
import 'react-day-picker/dist/style.css';

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const Home = () => {
  /* ----------------------------- local state ----------------------------- */
  const [selectedDate, setSelectedDate]  = useState(todayMidnight);
  const [calendarMonth, setCalendarMonth]= useState(() => new Date()); // ⇠ NEW
  const [isModalOpen,  setIsModalOpen]   = useState(false);

  /* ----------------------------- memo helpers ---------------------------- */
  const formattedDate = useMemo(
    () => format(selectedDate, 'yyyy-MM-dd'),
    [selectedDate]
  );
  const dayName   = useMemo(() => format(selectedDate, 'EEEE'), [selectedDate]);
  const dayNumber = useMemo(() => format(selectedDate, 'd'),    [selectedDate]);

  /* -------------------------- server state (RQT) ------------------------- */
  const { data: appointments = [], isLoading, isError } = useAppointments(
    formattedDate,
    { suspense: false }
  );

  /* ----------------------------- callbacks ------------------------------ */
  const handleToday = useCallback(() => {
    const today = todayMidnight();
    setSelectedDate(today);
    setCalendarMonth(today);                      // ⇠ jump picker to today
  }, []);

  const onCalendarSelect = useCallback((d) => {
    if (!d) return;
    const normalized = new Date(d.setHours(0, 0, 0, 0));
    setSelectedDate(normalized);
    setCalendarMonth(normalized);                 // ⇠ keep month in sync
    logger.info('Calendar date selected', { date: normalized.toISOString() });
  }, []);

  /* ------------------------------ render -------------------------------- */
  return (
    <div className="h-full w-full bg-white p-8 flex flex-col gap-8">
      {/* ───────── Header ───────── */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{dayName}</h1>
          <h2 className="text-lg">{dayNumber}</h2>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md shadow-md"
          >
            Add New Appointment
          </button>
          <button
            onClick={handleToday}
            className="border border-indigo-500 text-indigo-500 px-4 py-2 rounded-md hover:bg-indigo-100"
          >
            Today
          </button>
        </div>
      </header>

      {/* ───────── Body ───────── */}
      <div className="flex gap-8 flex-1">
        {/* Timeline column */}
        <section className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              Loading timeline…
            </div>
          ) : isError ? (
            <div className="text-red-500 text-center mt-20">
              Failed to load appointments.
            </div>
          ) : appointments.length ? (
            <Timeline appointments={appointments} selectedDate={selectedDate} />
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400">
              No appointments for this day.
            </div>
          )}
        </section>

        {/* Calendar column */}
        <aside className="w-80 p-4 bg-gray-50 rounded-lg shadow-md">
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={calendarMonth}          /* ⇠ controls visible month */
            onMonthChange={setCalendarMonth}
            onSelect={onCalendarSelect}
            modifiersClassNames={{
              today:
                'bg-indigo-100 text-indigo-700 font-bold rounded-full',
            }}
          />
        </aside>
      </div>

      {/* ───────── Modal ───────── */}
      {isModalOpen && (
        <AppointmentModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default Home;
