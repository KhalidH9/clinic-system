// src/services/sms.js
const API = import.meta.env.VITE_SMS_API_URL;

export async function sendAppointmentSMS({ to, doctor, patient, date, time, org }) {
  const res = await fetch(API, {      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        body: `Hello ${patient},
  Dr. ${doctor} scheduled your appointment at ${time} on ${date} in ${org}. See you soon!`,
      }),
    });
    if (!res.ok) throw new Error('SMS failed');
    return res.json();           // { sid: 'SMxxxxxxxx' }
  }