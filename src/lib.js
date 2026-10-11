// Helpers, storage and the booking rules. Everything lives in localStorage.
export const STORAGE_KEY = 'clinicV3';

export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => new Date(`${s}T00:00:00`);
export const addDays = (s, n) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const todayISO = () => toISO(new Date());
export const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDate = (s) =>
  s ? fromISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Clinic details printed on prescriptions and receipts (taken from the clinic's website; edit here).
export const CLINIC = {
  name: 'Sri Dhanvanthri Ayurveda Marunthagam',
  address: 'L 153, Stage 3, TNHB Colony, V.M. Chatram, Tirunelveli, Tamil Nadu – 627 011',
  phones: '+91 900 3777757 · +91 888 3777757 · +91 801 2777757',
  website: 'sridhanvanthriayurveda.com',
};

export const DEFAULT_DATA = {
  patients: [],
  rooms: [
    { id: 'R1', name: 'Room 1', building: 'Main building', active: true },
    { id: 'R2', name: 'Room 2', building: 'Main building', active: true },
    { id: 'R3', name: 'Room 3', building: 'New building', active: true },
  ],
  doctors: [
    { id: 'D1', name: 'Doctor 1', active: true },
    { id: 'D2', name: 'Doctor 2', active: true },
  ],
  courses: [],  // { id, patientId, treatment, startDate, months, perWeek, fee }
  sessions: [], // { id, courseId, patientId, number, date, status, roomId, doctorId, roomName, doctorName,
                //   startTime, endTime, actualDate, painBefore, painAfter, outcome, feedback, doctorNotes,
                //   prescription: [{ id, name, dose, duration, instructions, given }], bill: { fee, medicines, oils, discount, total, status, method, paidDate } }
};

export const loadData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_DATA, ...JSON.parse(saved) } : DEFAULT_DATA;
  } catch {
    return DEFAULT_DATA;
  }
};

// ---- dates for a course ----
const MON_THU = [1, 4];
const isMonThu = (d) => MON_THU.includes(fromISO(d).getDay());

// Once a week: every 7 days from the start date. Twice a week: Mondays and Thursdays.
export const generateDates = (start, perWeek, total) => {
  if (!start || total < 1) return [];
  if (perWeek === 1) return Array.from({ length: total }, (_, i) => addDays(start, i * 7));
  const out = [];
  let d = start;
  while (out.length < total) {
    if (isMonThu(d)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
};

export const nextDateAfter = (last, perWeek) => {
  if (perWeek === 1) return addDays(last, 7);
  let d = addDays(last, 1);
  while (!isMonThu(d)) d = addDays(d, 1);
  return d;
};

// ---- rules ----
// The day a session actually happened (or is planned for).
export const sdate = (s) => s.actualDate || s.date;
// A room or doctor is busy only while a session using it is In progress.
export const roomBusy = (sessions, roomId) => sessions.some(s => s.status === 'in-progress' && s.roomId === roomId);
export const doctorBusy = (sessions, doctorId) => sessions.some(s => s.status === 'in-progress' && s.doctorId === doctorId);
// Rooms and doctors are hidden, never deleted, so old sessions keep their names.
export const nameOf = (list, id, snapshot) => list.find(x => x.id === id)?.name || snapshot || '—';

export const courseSessions = (data, courseId) =>
  data.sessions.filter(s => s.courseId === courseId).sort((a, b) => a.number - b.number);
export const courseTotal = (sessions) => sessions.filter(s => s.status !== 'missed').length;
export const courseEnd = (sessions) => sessions.reduce((m, s) => (s.date > m ? s.date : m), '');

export const cleanPhone = (s) => s.replace(/[\s-]/g, '');
export const phoneOk = (s) => /^\d{10}$/.test(cleanPhone(s));

// One prescription row, with older saved rows (howTo / qty) mapped to the new columns.
export const rxRow = (r) => ({ ...r, dose: r.dose ?? '', duration: r.duration ?? r.qty ?? '', instructions: r.instructions ?? r.howTo ?? '' });

// Splits a bill into the three revenue lines. Massage = whatever is left after medicines and oils,
// so the three always add up to the bill total (a discount comes off the massage fee).
export const billParts = (b) => {
  const medicines = b.medicines ?? b.extra ?? 0; // older bills had a single "extra" amount
  const oils = b.oils ?? 0;
  return { massage: Math.max(0, b.total - medicines - oils), medicines, oils };
};
