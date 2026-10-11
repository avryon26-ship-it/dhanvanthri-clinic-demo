// Fake clinic data for the client demo. Dates are relative to today so it always looks current.
import { addDays, todayISO, nowHHMM, generateDates, nextDateAfter, DEFAULT_DATA } from './lib.js';

const ROOMS = [
  { id: 'R1', name: 'Room 1', building: 'Main building', active: true },
  { id: 'R2', name: 'Room 2', building: 'Main building', active: true },
  { id: 'R3', name: 'Room 3', building: 'New building', active: true },
  { id: 'R4', name: 'Room 4', building: 'New building', active: true },
];
const DOCTORS = [
  { id: 'D1', name: 'Dr. Raj Kumar', active: true },
  { id: 'D2', name: 'Dr. Sanjana Kapoor', active: true },
  { id: 'D3', name: 'Dr. Meena Iyer', active: true },
];
const PATIENTS = [
  ['Rajesh Kumar', '9876543210', 45, 'Male', 'Chronic lower back pain for 6 months'],
  ['Meena Devi', '9876501234', 35, 'Female', 'Stress and poor sleep'],
  ['Arun Kumar', '9845012345', 51, 'Male', 'Knee pain and stiffness (arthritis)'],
  ['Priya Sharma', '9790123456', 38, 'Female', 'Neck and shoulder stiffness from desk work'],
  ['Suresh Iyer', '9988776655', 56, 'Male', 'Numbness in both legs (diabetic)'],
  ['Lakshmi Narayanan', '9443322110', 62, 'Female', 'Cervical spondylosis, pain on turning neck'],
  ['Karthik Raja', '9600112233', 29, 'Male', 'Ankle sprain from football'],
  ['Anitha Selvam', '9715551212', 41, 'Female', 'Migraine and tension headaches'],
];
const NOTES = [
  'Muscles tight along the lower back. Warm oil massage given. Patient relaxed well.',
  'Less stiffness than last week. Continued same oil, added gentle stretching advice.',
  'Good response. Pain reducing, movement improving. Advised to avoid cold food.',
  'Slight soreness after last visit, reduced pressure today. Patient comfortable.',
  'Steady improvement. Continue weekly sessions and daily home exercises.',
];
const FEEDBACK = ['Feeling lighter today', 'Slept well after last session', 'Pain is much less in the morning', 'Wants slightly firmer pressure', 'Very relaxed'];
const METHODS = ['Cash', 'UPI', 'Card'];
const RX = [
  { name: 'Ashwagandha Churna', dose: '1 tsp, at bedtime', duration: '30 days', instructions: 'Take with warm milk' },
  { name: 'Pain Care Oil', dose: 'Twice daily', duration: '15 days', instructions: 'Apply on leg and massage gently' },
  { name: 'Triphala Churna', dose: '1 tsp, at night', duration: '15 days', instructions: 'Take with warm water' },
];

// todayStatus: what the session that falls today should look like.
const COURSES = [
  { p: 0, treatment: 'Abhyanga + Kati Basti', offset: -42, months: 3, perWeek: 1, fee: 900, todayStatus: 'completed', medicines: 150, oils: 100, method: 'Cash' },
  { p: 1, treatment: 'Shirodhara', offset: -14, months: 1, perWeek: 2, fee: 1200, todayStatus: 'in-progress' },
  { p: 2, treatment: 'Janu Basti', offset: -35, months: 2, perWeek: 1, fee: 1000, todayStatus: 'planned', missedIndex: 2 },
  { p: 3, treatment: 'Neck & shoulder massage', offset: -7, months: 1, perWeek: 1, fee: 700, todayStatus: 'planned' },
  { p: 4, treatment: 'Pizhichil', offset: -63, months: 2, perWeek: 1, fee: 1500, todayStatus: 'planned', lastPending: true },
  { p: 5, treatment: 'Cervical therapy', offset: 0, months: 3, perWeek: 1, fee: 800, todayStatus: 'missed' },
  { p: 6, treatment: 'Sports massage', offset: -21, months: 1, perWeek: 2, fee: 800, todayStatus: 'completed', medicines: 0, oils: 150, method: 'UPI' },
];

export const buildDemoData = () => {
  const today = todayISO();
  const patients = PATIENTS.map(([name, phone, age, gender, complaint], i) => ({
    id: `P${i + 1}`, name, phone, age: String(age), gender, complaint, registeredDate: addDays(today, -70 + i * 5),
  }));
  const courses = [];
  const sessions = [];

  COURSES.forEach((spec, ci) => {
    const patient = patients[spec.p];
    const course = {
      id: `C${ci + 1}`, patientId: patient.id, treatment: spec.treatment,
      startDate: addDays(today, spec.offset), months: spec.months, perWeek: spec.perWeek, fee: spec.fee,
    };
    courses.push(course);
    const dates = generateDates(course.startDate, course.perWeek, course.months * 4 * course.perWeek);
    const todayIdx = dates.findIndex(d => d >= today);
    if (todayIdx >= 0) dates[todayIdx] = today; // make sure one session falls today

    const list = dates.map((date, i) => {
      const room = ROOMS[(i + ci) % ROOMS.length];
      const doctor = DOCTORS[(i + ci) % DOCTORS.length];
      const s = { id: `S${ci + 1}-${i + 1}`, courseId: course.id, patientId: patient.id, number: i + 1, date, status: 'planned' };
      const isToday = date === today;
      const status = date < today ? 'completed' : isToday ? spec.todayStatus : 'planned';
      if (spec.missedIndex === i || (isToday && spec.todayStatus === 'missed')) return { ...s, status: 'missed' };
      if (status === 'planned') return s;

      const base = { ...s, status, roomId: room.id, doctorId: doctor.id, roomName: room.name, doctorName: doctor.name, actualDate: date };
      if (status === 'in-progress') {
        // Meena is in Room 1 with Dr. Raj Kumar, started 25 minutes ago.
        const started = new Date(Date.now() - 25 * 60000);
        const hhmm = `${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')}`;
        return { ...base, roomId: 'R1', doctorId: 'D1', roomName: 'Room 1', doctorName: 'Dr. Raj Kumar', startTime: hhmm < nowHHMM() ? hhmm : '09:00' };
      }

      const painBefore = Math.max(3, 8 - Math.floor(i / 2));
      const rx = i % 3 === 0 || isToday ? [{ ...RX[(i + ci) % RX.length], id: `RX${ci}-${i}`, given: !isToday }] : [];
      if (isToday && spec.p === 0) rx.push({ ...RX[2], id: `RX${ci}-${i}b`, given: false });
      const isPendingBill = spec.lastPending && i === dates.length - 1;
      const medicines = spec.medicines ?? (i % 3 === 0 ? 150 : 0);
      const oils = spec.oils ?? (i % 4 === 1 ? 200 : 0);
      const total = course.fee + medicines + oils;
      return {
        ...base,
        startTime: `${10 + (i % 5)}:00`, endTime: `${10 + (i % 5)}:45`,
        painBefore, painAfter: Math.max(1, painBefore - 3), outcome: i === 3 ? 'same' : 'better',
        feedback: FEEDBACK[i % FEEDBACK.length], doctorNotes: NOTES[i % NOTES.length], prescription: rx,
        bill: {
          fee: course.fee, medicines, oils, discount: 0, total,
          status: isPendingBill ? 'pending' : 'paid',
          method: isPendingBill ? '' : (isToday ? spec.method : METHODS[i % 3]),
          paidDate: isPendingBill ? '' : date,
        },
      };
    });

    // Every missed session already has its replacement at the end of the course.
    list.filter(s => s.status === 'missed').forEach(() => {
      const last = list[list.length - 1];
      list.push({
        id: `S${ci + 1}-${list.length + 1}`, courseId: course.id, patientId: patient.id, number: list.length + 1,
        date: nextDateAfter(last.date, course.perWeek), status: 'planned',
      });
    });
    sessions.push(...list);
  });

  return { ...DEFAULT_DATA, patients, rooms: ROOMS, doctors: DOCTORS, courses, sessions };
};
