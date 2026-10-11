import React, { useState, useEffect } from 'react';
import { Plus, IndianRupee, Users, CalendarDays, DoorOpen, Pill, ArrowLeft, Search, Pencil, Check, Printer, BedDouble, Stethoscope } from 'lucide-react';
import { Modal, Field, StatusBadge, ClinicHeader, Segmented, inputCls, btnPrimary, btnGhost } from './ui.jsx';
import { CreateCourseModal, StartSessionModal, CompleteSessionModal, BillModal, MissedModal } from './dialogs.jsx';
import { buildDemoData } from './demo.js';
import {
  STORAGE_KEY, DEFAULT_DATA, loadData, uid, addDays, todayISO, nowHHMM, fmtDate, money, sdate,
  roomBusy, doctorBusy, nameOf, rxRow, billParts, courseSessions, courseTotal, courseEnd, nextDateAfter, cleanPhone, phoneOk,
} from './lib.js';

// ---------- app ----------
const AyurvedicClinicApp = () => {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState('patients');
  const [patientId, setPatientId] = useState(null);
  const [dlg, setDlg] = useState(null); // { type: 'start' | 'complete' | 'bill' | 'missed', id }

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }, [data]);

  const patchSession = (id, patch) =>
    setData(d => ({ ...d, sessions: d.sessions.map(s => (s.id === id ? { ...s, ...patch } : s)) }));

  const actions = {
    setData,
    createCourse: (course, sessions) =>
      setData(d => ({ ...d, courses: [...d.courses, course], sessions: [...d.sessions, ...sessions] })),

    // Blocks the start if the room or doctor got taken in the meantime.
    startSession: (id, { roomId, doctorId, startTime }) =>
      setData(d => {
        if (roomBusy(d.sessions, roomId) || doctorBusy(d.sessions, doctorId)) return d;
        const room = d.rooms.find(r => r.id === roomId);
        const doctor = d.doctors.find(x => x.id === doctorId);
        return {
          ...d,
          sessions: d.sessions.map(s => s.id === id
            ? { ...s, status: 'in-progress', roomId, doctorId, roomName: room?.name, doctorName: doctor?.name, startTime, actualDate: todayISO() }
            : s),
        };
      }),

    completeSession: (id, payload) => patchSession(id, { ...payload, status: 'completed', endTime: nowHHMM() }),
    cancelSession: (id) =>
      patchSession(id, { status: 'planned', roomId: '', doctorId: '', roomName: '', doctorName: '', startTime: '', actualDate: '' }),

    markMissed: (id, addReplacement) =>
      setData(d => {
        const missed = d.sessions.find(s => s.id === id);
        const course = d.courses.find(c => c.id === missed.courseId);
        const mine = d.sessions.filter(s => s.courseId === missed.courseId);
        let sessions = d.sessions.map(s => (s.id === id ? { ...s, status: 'missed' } : s));
        if (addReplacement) {
          const last = mine.reduce((m, s) => (s.date > m ? s.date : m), '');
          sessions = [...sessions, {
            id: uid('S'), courseId: course.id, patientId: course.patientId, number: Math.max(...mine.map(s => s.number)) + 1,
            date: nextDateAfter(last, course.perWeek), status: 'planned',
          }];
        }
        return { ...d, sessions };
      }),

    saveBill: (id, bill) => patchSession(id, { bill }),
    updateRx: (sessionId, rxId, patch) =>
      setData(d => ({
        ...d,
        sessions: d.sessions.map(s => s.id === sessionId
          ? { ...s, prescription: s.prescription.map(r => (r.id === rxId ? { ...r, ...patch } : r)) }
          : s),
      })),
    toggleGiven: (sessionId, rxId) =>
      setData(d => ({
        ...d,
        sessions: d.sessions.map(s => s.id === sessionId
          ? { ...s, prescription: s.prescription.map(r => (r.id === rxId ? { ...r, given: !r.given } : r)) }
          : s),
      })),
  };

  const goPatient = (id) => { setPage('patients'); setPatientId(id); };
  const open = (type, id) => setDlg({ type, id });
  const close = () => setDlg(null);
  const dlgSession = dlg && data.sessions.find(s => s.id === dlg.id);

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: IndianRupee },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
    { id: 'rooms', label: 'Rooms & Doctors', icon: DoorOpen },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b-4 border-brand-600 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Sri Dhanvanthri Ayurveda Marunthagam" className="h-14 w-auto" />
          <nav className="flex gap-1 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setPage(t.id); setPatientId(null); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                  page === t.id ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-brand-50 hover:text-brand-600'
                }`}
              >
                <t.icon size={18} /> {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {page === 'patients' && !patientId && <PatientsPage data={data} actions={actions} onOpen={setPatientId} />}
        {page === 'patients' && patientId && (
          <PatientDetail data={data} actions={actions} open={open} patient={data.patients.find(p => p.id === patientId)} onBack={() => setPatientId(null)} />
        )}
        {page === 'revenue' && <RevenuePage data={data} />}
        {page === 'schedule' && <SchedulePage data={data} open={open} goPatient={goPatient} />}
        {page === 'pharmacy' && <PharmacyPage data={data} actions={actions} />}
        {page === 'rooms' && <RoomsPage data={data} actions={actions} />}
      </main>

      {dlg?.type === 'start' && dlgSession && (
        <StartSessionModal data={data} session={dlgSession} onClose={close}
          onStart={(v) => { actions.startSession(dlgSession.id, v); close(); }} />
      )}
      {dlg?.type === 'complete' && dlgSession && (
        <CompleteSessionModal data={data} session={dlgSession} onClose={close}
          onCancel={() => { actions.cancelSession(dlgSession.id); close(); }}
          onComplete={(payload) => { actions.completeSession(dlgSession.id, payload); open('bill', dlgSession.id); }} />
      )}
      {dlg?.type === 'bill' && dlgSession && (
        <BillModal data={data} session={dlgSession} onClose={close} onSave={(bill) => actions.saveBill(dlgSession.id, bill)} />
      )}
      {dlg?.type === 'missed' && dlgSession && (
        <MissedModal session={dlgSession} onClose={close} onConfirm={(add) => { actions.markMissed(dlgSession.id, add); close(); }} />
      )}
    </div>
  );
};

// ---------- revenue: money by category, and who came ----------
const RevenuePage = ({ data }) => {
  const [date, setDate] = useState(todayISO());

  // Money collected on this day (paid bills), split into the three lines.
  const paid = data.sessions.filter(s => s.bill?.status === 'paid' && s.bill.paidDate === date);
  const sum = { massage: 0, medicines: 0, oils: 0 };
  paid.forEach(s => { const p = billParts(s.bill); sum.massage += p.massage; sum.medicines += p.medicines; sum.oils += p.oils; });
  const total = sum.massage + sum.medicines + sum.oils;
  const pending = data.sessions.filter(s => s.bill?.status === 'pending' && sdate(s) === date).reduce((t, s) => t + s.bill.total, 0);

  const done = data.sessions.filter(s => s.status === 'completed' && sdate(s) === date).length;
  const notCame = data.sessions.filter(s => s.status === 'missed' && s.date === date).length;
  const toCome = data.sessions.filter(s => s.status === 'planned' && s.date === date).length;

  const lines = [
    { label: 'Massage sessions', value: sum.massage, bar: 'bg-brand-600' },
    { label: 'Pharmacy (medicines)', value: sum.medicines, bar: 'bg-accent' },
    { label: 'Massage oils', value: sum.oils, bar: 'bg-logo-orange' },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-700">Revenue</h1>
        <div className="flex items-center gap-2">
          <input type="date" className={`${inputCls} w-auto`} value={date} onChange={e => e.target.value && setDate(e.target.value)} />
          <button className={btnGhost} onClick={() => setDate(todayISO())}>Today</button>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-brand-900 to-brand-700 text-white p-5">
        <p className="text-sm text-brand-100">Collected {date === todayISO() ? 'today' : fmtDate(date)}</p>
        <p className="text-4xl font-bold mt-1">{money(total)}</p>
        {pending > 0 && <p className="text-sm text-accent mt-1">{money(pending)} still to be paid</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {lines.map(l => (
          <div key={l.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{l.label}</p>
            <p className="text-2xl font-bold text-gray-900">{money(l.value)}</p>
            <div className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
              <div className={`h-full ${l.bar}`} style={{ width: `${total ? Math.round((l.value / total) * 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Massages done</p>
          <p className="text-3xl font-bold text-green-700">{done}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Did not come</p>
          <p className={`text-3xl font-bold ${notCame ? 'text-red-600' : 'text-gray-400'}`}>{notCame}</p>
          {toCome > 0 && <p className="text-xs text-gray-500">{toCome} more still due</p>}
        </div>
      </div>
    </>
  );
};

// ---------- patients ----------
const PatientsPage = ({ data, actions, onOpen }) => {
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const list = data.patients.filter(p => `${p.name} ${p.phone}`.toLowerCase().includes(query.toLowerCase()));

  const loadDemo = () => {
    if (window.confirm('Replace everything with demo data?')) actions.setData(buildDemoData());
  };
  const reset = () => {
    if (window.confirm('Delete ALL patients, courses and sessions?')) actions.setData(DEFAULT_DATA);
  };

  return (
    <>
      <div className="relative flex overflow-hidden rounded-xl bg-gradient-to-r from-brand-900 to-brand-700 text-white shadow-sm h-40 sm:h-44">
        <div className="relative z-10 flex flex-col justify-center px-6 sm:w-3/5">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">Sri Dhanvanthri Ayurveda Marunthagam</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">Healing, one session at a time</h2>
          <p className="text-sm text-brand-100 mt-1 hidden sm:block">Register patients, plan treatment courses and record every recovery.</p>
        </div>
        <img src={`${import.meta.env.BASE_URL}banner.jpg`} alt="Ayurvedic massage treatment" className="absolute right-0 top-0 h-full w-full sm:w-[45%] object-cover object-[center_35%] opacity-30 sm:opacity-100" />
        <div className="absolute inset-y-0 right-[45%] w-24 bg-gradient-to-r from-brand-700 to-transparent translate-x-full hidden sm:block" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-700">Patients</h1>
        <button className={btnPrimary} onClick={() => setShowForm(true)}><Plus size={18} /> Register patient</button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
        <input className={`${inputCls} pl-10`} placeholder="Search by name or phone" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {list.length === 0 && (
          <p className="p-6 text-center text-gray-500 text-sm">
            {data.patients.length === 0 ? 'No patients yet. Register one, or load the demo data below.' : 'No patients match your search.'}
          </p>
        )}
        {list.map(p => {
          const mine = data.sessions.filter(s => s.patientId === p.id);
          const live = mine.find(s => s.status === 'in-progress');
          const next = mine.filter(s => s.status === 'planned').sort((a, b) => a.date.localeCompare(b.date))[0];
          const pending = mine.filter(s => s.bill?.status === 'pending').reduce((sum, s) => sum + s.bill.total, 0);
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="w-full text-left p-4 min-h-16 hover:bg-gray-50 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">{p.phone}{p.age ? ` · ${p.age} yrs` : ''}</p>
              </div>
              <div className="text-sm text-gray-600 text-right space-y-1">
                {live ? <StatusBadge status="in-progress" /> : <p>{next ? `Next: ${fmtDate(next.date)}` : 'No upcoming session'}</p>}
                {pending > 0 && <p className="text-yellow-700">Pending {money(pending)}</p>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 justify-center pt-2 flex-wrap">
        <button className={btnGhost} onClick={loadDemo}>Load demo data</button>
        <button className={btnGhost} onClick={reset}>Reset</button>
      </div>

      {showForm && (
        <RegisterModal
          onClose={() => setShowForm(false)}
          onSave={(p) => { actions.setData(d => ({ ...d, patients: [...d.patients, p] })); setShowForm(false); }}
        />
      )}
    </>
  );
};

const RegisterModal = ({ onClose, onSave }) => {
  const [f, setF] = useState({ name: '', phone: '', age: '', gender: 'Male', complaint: '' });
  const [touched, setTouched] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const phoneBad = touched && !phoneOk(f.phone);

  return (
    <Modal title="Register patient" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!f.name.trim() || !phoneOk(f.phone)) return;
          onSave({ id: uid('P'), ...f, name: f.name.trim(), phone: cleanPhone(f.phone), registeredDate: todayISO() });
        }}
      >
        <Field label="Full name *"><input className={inputCls} value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Phone (10 digits) *">
          <input className={`${inputCls} ${phoneBad ? 'border-red-400' : ''}`} value={f.phone} onChange={set('phone')} inputMode="tel" maxLength={14} />
          {phoneBad && <span className="text-sm text-red-600">Enter a 10-digit phone number.</span>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><input className={inputCls} value={f.age} onChange={set('age')} inputMode="numeric" /></Field>
          <Field label="Gender">
            <select className={inputCls} value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option><option>Other</option></select>
          </Field>
        </div>
        <Field label="Complaint"><textarea className={inputCls} rows={3} value={f.complaint} onChange={set('complaint')} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={!f.name.trim()}>Register</button>
        </div>
      </form>
    </Modal>
  );
};

// ---------- patient page: courses, sessions, money ----------
const PatientDetail = ({ data, actions, open, patient, onBack }) => {
  const [showCreate, setShowCreate] = useState(false);
  if (!patient) return null;

  const mine = data.sessions.filter(s => s.patientId === patient.id);
  const courses = data.courses.filter(c => c.patientId === patient.id);
  const busyNow = mine.some(s => s.status === 'in-progress');
  const bills = mine.filter(s => s.bill).map(s => s.bill);
  const paid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.total, 0);
  const pending = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.total, 0);

  return (
    <>
      <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 min-h-11"><ArrowLeft size={16} /> All patients</button>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-sm text-gray-600">{patient.phone}{patient.age ? ` · ${patient.age} yrs` : ''} · {patient.gender}</p>
            {patient.complaint && <p className="text-sm text-gray-700 mt-2">{patient.complaint}</p>}
          </div>
          <button className={btnPrimary} onClick={() => setShowCreate(true)}><Plus size={18} /> Create session</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50"><p className="text-xs text-gray-500">Total paid</p><p className="text-lg font-bold text-green-700">{money(paid)}</p></div>
          <div className="p-3 rounded-lg bg-yellow-50"><p className="text-xs text-gray-500">Pending</p><p className="text-lg font-bold text-yellow-700">{money(pending)}</p></div>
        </div>
      </div>

      {courses.length === 0 && <p className="text-center text-gray-500 text-sm p-6">No course yet. Click "Create session" to plan the treatment.</p>}

      {courses.map(course => {
        const sessions = courseSessions(data, course.id);
        const done = sessions.filter(s => s.status === 'completed').length;
        const nextPlanned = sessions.find(s => s.status === 'planned');
        return (
          <section key={course.id} className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-lg">{course.treatment}</h2>
              <p className="text-sm text-gray-500">
                {fmtDate(course.startDate)} → {fmtDate(courseEnd(sessions))} · {done} of {courseTotal(sessions)} sessions done · {money(course.fee)} per session
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {sessions.map(s => (
                <div key={s.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">#{s.number} · {fmtDate(sdate(s))}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.bill && <StatusBadge status={s.bill.status} />}
                      <StatusBadge status={s.status} />
                      {s.id === nextPlanned?.id && (
                        <>
                          <button className={`${btnPrimary} !py-1.5`} disabled={busyNow} onClick={() => open('start', s.id)}>Start session</button>
                          <button className={`${btnGhost} !py-1.5`} onClick={() => open('missed', s.id)}>Missed</button>
                        </>
                      )}
                      {s.status === 'in-progress' && <button className={`${btnPrimary} !py-1.5`} onClick={() => open('complete', s.id)}>Complete session</button>}
                      {s.status === 'completed' && <button className={`${btnGhost} !py-1.5`} onClick={() => open('bill', s.id)}>{s.bill?.status === 'paid' ? 'Receipt' : 'Bill'}</button>}
                    </div>
                  </div>
                  {s.status === 'in-progress' && (
                    <p className="text-sm text-yellow-800">{nameOf(data.rooms, s.roomId, s.roomName)} · {nameOf(data.doctors, s.doctorId, s.doctorName)} · started {s.startTime}</p>
                  )}
                  {s.status === 'completed' && <SessionNotes data={data} s={s} />}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {showCreate && (
        <CreateCourseModal patient={patient} onClose={() => setShowCreate(false)} onSave={(c, ss) => { actions.createCourse(c, ss); setShowCreate(false); }} />
      )}
    </>
  );
};

const SessionNotes = ({ data, s }) => (
  <div className="text-sm text-gray-600 space-y-1">
    <p>
      {nameOf(data.rooms, s.roomId, s.roomName)} · {nameOf(data.doctors, s.doctorId, s.doctorName)} · {s.startTime}–{s.endTime} · Pain {s.painBefore} → {s.painAfter} ({s.outcome})
    </p>
    {s.feedback && <p>Patient: “{s.feedback}”</p>}
    {s.doctorNotes && <p className="text-gray-800">{s.doctorNotes}</p>}
    {s.prescription?.length > 0 && (
      <p className="text-brand-700">Medicines: {s.prescription.map(r => { const m = rxRow(r); return `${m.name}${m.duration ? ` (${m.duration})` : ''}`; }).join(', ')}</p>
    )}
  </div>
);

// ---------- schedule (also the dashboard) ----------
const SchedulePage = ({ data, open, goPatient }) => {
  const [date, setDate] = useState(todayISO());
  const today = todayISO();
  const patientName = (id) => data.patients.find(p => p.id === id)?.name || 'Unknown';

  const live = data.sessions.filter(s => s.status === 'in-progress');
  const collection = data.sessions.filter(s => s.bill?.status === 'paid' && s.bill.paidDate === today).reduce((sum, s) => sum + s.bill.total, 0);
  const daySessions = data.sessions.filter(s => sdate(s) === date && s.roomId && s.status !== 'planned');
  const due = data.sessions.filter(s => s.status === 'planned' && s.date === date);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4"><p className="text-sm text-gray-500">Today's collection</p><p className="text-2xl font-bold text-brand-700">{money(collection)}</p></div>
        <div className="bg-white rounded-lg border border-gray-200 p-4"><p className="text-sm text-gray-500">In progress now</p><p className="text-2xl font-bold text-brand-700">{live.length}</p></div>
      </div>

      {live.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-yellow-800 mb-2">In progress</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {live.map(s => (
              <div key={s.id} className="bg-white border border-yellow-300 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{patientName(s.patientId)}</p>
                  <p className="text-gray-600">{nameOf(data.rooms, s.roomId, s.roomName)} · {nameOf(data.doctors, s.doctorId, s.doctorName)} · since {s.startTime}</p>
                </div>
                <button className={`${btnPrimary} !py-1.5`} onClick={() => open('complete', s.id)}>Complete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-700">Schedule</h1>
        <div className="flex items-center gap-2">
          <button className={btnGhost} onClick={() => setDate(addDays(date, -1))}>←</button>
          <input type="date" className={`${inputCls} w-auto`} value={date} onChange={e => e.target.value && setDate(e.target.value)} />
          <button className={btnGhost} onClick={() => setDate(addDays(date, 1))}>→</button>
          <button className={btnGhost} onClick={() => setDate(today)}>Today</button>
        </div>
      </div>
      <p className="text-gray-600">{fmtDate(date)}</p>

      {due.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Due this day (open the patient to start)</p>
          <div className="flex gap-2 flex-wrap">
            {due.map(s => (
              <button key={s.id} onClick={() => goPatient(s.patientId)} className="px-3 py-2 min-h-11 rounded-lg bg-brand-50 border border-brand-200 hover:bg-brand-100 text-sm text-gray-900">
                {patientName(s.patientId)} · #{s.number}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.rooms.filter(r => r.active).map(room => {
          const inUse = roomBusy(data.sessions, room.id);
          const here = daySessions.filter(s => s.roomId === room.id);
          return (
            <div key={room.id} className={`bg-white rounded-lg border ${inUse ? 'border-yellow-300' : 'border-gray-200'}`}>
              <div className="p-3 border-b border-gray-200 flex items-start justify-between gap-2">
                <div><p className="font-semibold text-gray-900">{room.name}</p><p className="text-xs text-gray-500">{room.building}</p></div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${inUse ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>{inUse ? 'In use' : 'Free'}</span>
              </div>
              <div className="p-2 space-y-2 min-h-20">
                {here.length === 0 && <p className="text-sm text-gray-400 p-2">No sessions</p>}
                {here.map(s => (
                  <div key={s.id} className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                    <p className="text-sm font-medium text-gray-900">{s.startTime} · {patientName(s.patientId)}</p>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="text-xs text-gray-600">{nameOf(data.doctors, s.doctorId, s.doctorName)}</span>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------- pharmacy ----------
const PharmacyPage = ({ data, actions }) => {
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null); // the medicine row being edited
  const today = todayISO();
  const saveEdit = () => {
    if (edit.name.trim()) actions.updateRx(edit.sessionId, edit.id, { name: edit.name.trim(), dose: edit.dose, duration: edit.duration, instructions: edit.instructions });
    setEdit(null);
  };

  // Today's completed sessions that have a prescription, grouped by patient.
  const rxSessions = data.sessions.filter(s => s.status === 'completed' && sdate(s) === today && s.prescription?.length > 0);
  const patientIds = [...new Set(rxSessions.map(s => s.patientId))];
  const medsOf = (pid) => rxSessions.filter(s => s.patientId === pid).flatMap(s => s.prescription.map(r => ({ ...rxRow(r), sessionId: s.id })));
  const sel = patientIds.includes(selected) ? selected : null;
  const selPatient = data.patients.find(p => p.id === sel);
  const selSession = rxSessions.find(s => s.patientId === sel);
  const selMeds = sel ? medsOf(sel) : [];
  const allGiven = selMeds.length > 0 && selMeds.every(r => r.given);

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-700">Pharmacy</h1>
      <p className="text-gray-600 text-sm">Patients with a prescription from today's sessions. Click a patient to see the medicines.</p>

      {patientIds.length === 0 && <p className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500 text-sm">No prescriptions today.</p>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="min-w-0 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 self-start">
          {patientIds.map(pid => {
            const list = medsOf(pid);
            const all = list.every(r => r.given);
            return (
              <button key={pid} onClick={() => { setSelected(pid); setEdit(null); }} className={`w-full text-left p-4 min-h-16 flex items-center justify-between gap-2 hover:bg-gray-50 ${sel === pid ? 'bg-brand-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-900">{data.patients.find(p => p.id === pid)?.name}</p>
                  <p className="text-sm text-gray-500">{list.length} medicine{list.length > 1 ? 's' : ''}</p>
                </div>
                <StatusBadge status={all ? 'completed' : 'pending'} label={all ? 'All given' : undefined} />
              </button>
            );
          })}
        </div>

        {sel && (
          <div className="print-area min-w-0 bg-white rounded-lg border border-gray-200 p-4 space-y-4 self-start">
            <ClinicHeader title="Prescription">
              {allGiven && <span className="no-print inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">All given</span>}
            </ClinicHeader>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-gray-500">Patient</p><p className="font-medium">{selPatient?.name}{selPatient?.age ? `, ${selPatient.age}` : ''}</p></div>
              <div><p className="text-gray-500">Date</p><p className="font-medium">{fmtDate(today)}</p></div>
              <div><p className="text-gray-500">Doctor</p><p className="font-medium">{nameOf(data.doctors, selSession?.doctorId, selSession?.doctorName)}</p></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-2">Medicine</th><th className="py-2 pr-2">Dose</th><th className="py-2 pr-2">Duration</th><th className="py-2 pr-2">Instructions</th>
                    <th className="no-print py-2 text-center">Given</th><th className="no-print py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selMeds.map(r => edit?.id === r.id ? (
                    <tr key={r.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-2"><input className={inputCls} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} aria-label="Medicine" /></td>
                      <td className="py-2 pr-2"><input className={inputCls} value={edit.dose} onChange={e => setEdit({ ...edit, dose: e.target.value })} aria-label="Dose" /></td>
                      <td className="py-2 pr-2"><input className={inputCls} value={edit.duration} onChange={e => setEdit({ ...edit, duration: e.target.value })} aria-label="Duration" /></td>
                      <td className="py-2 pr-2"><input className={inputCls} value={edit.instructions} onChange={e => setEdit({ ...edit, instructions: e.target.value })} aria-label="Instructions" /></td>
                      <td className="no-print" />
                      <td className="no-print py-2 whitespace-nowrap">
                        <button className={`${btnPrimary} !px-3`} onClick={saveEdit}><Check size={16} /> Save</button>
                        <button className="block mx-auto mt-1 text-xs text-gray-500 min-h-8" onClick={() => setEdit(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className={`border-b border-gray-100 ${r.given ? 'bg-green-50 print:bg-white' : ''}`}>
                      <td className="py-3 pr-2 font-medium text-gray-900">{r.name}</td>
                      <td className="py-3 pr-2 text-gray-700">{r.dose}</td>
                      <td className="py-3 pr-2 text-gray-700">{r.duration}</td>
                      <td className="py-3 pr-2 text-gray-700">{r.instructions}</td>
                      <td className="no-print py-3 text-center">
                        <input type="checkbox" aria-label={`Given: ${r.name}`} className="h-7 w-7 accent-[#018917] cursor-pointer" checked={!!r.given} onChange={() => actions.toggleGiven(r.sessionId, r.id)} />
                      </td>
                      <td className="no-print py-3 text-right">
                        <button className="p-2 min-h-11 min-w-11 text-gray-500 hover:text-brand-700" aria-label={`Edit ${r.name}`} onClick={() => setEdit({ id: r.id, sessionId: r.sessionId, name: r.name, dose: r.dose, duration: r.duration, instructions: r.instructions })}><Pencil size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-8 flex justify-end">
              <div className="w-56 border-t border-gray-400 pt-1 text-center text-xs text-gray-500">Doctor's signature</div>
            </div>

            <div className="no-print flex justify-end">
              <button className={btnPrimary} disabled={!!edit} onClick={() => window.print()}><Printer size={18} /> Print prescription</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ---------- rooms & doctors ----------
// One row: rename, hide / show. Items are hidden, never deleted, so old sessions keep their names.
const NameRow = ({ item, sub, canHide, onRename, onToggle }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const save = () => { if (name.trim()) onRename(name.trim()); setEditing(false); };

  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
        ) : (
          <>
            <p className={`font-medium ${item.active ? 'text-gray-900' : 'text-gray-400'}`}>{item.name}{!item.active && ' (hidden)'}</p>
            {sub && <p className="text-sm text-gray-500">{sub}</p>}
          </>
        )}
      </div>
      <div className="flex gap-2">
        {editing
          ? <button className={btnPrimary} onClick={save}><Check size={18} /> Save</button>
          : <button className={btnGhost} onClick={() => { setName(item.name); setEditing(true); }} aria-label="Rename"><Pencil size={16} /></button>}
        <button className={btnGhost} disabled={item.active && !canHide} title={!canHide && item.active ? 'In use right now' : ''} onClick={onToggle}>{item.active ? 'Hide' : 'Show'}</button>
      </div>
    </div>
  );
};

// "since 16:45 · 25 min" for a running session.
const sinceText = (startTime) => {
  const [h, m] = (startTime || '').split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const start = new Date(); start.setHours(h, m, 0, 0);
  const mins = Math.round((Date.now() - start.getTime()) / 60000);
  const elapsed = mins < 0 ? '' : mins < 60 ? ` · ${mins} min` : ` · ${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `since ${startTime}${elapsed}`;
};

const initials = (name) => name.replace(/^Dr\.?\s*/i, '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

// A room drawn like a sleeper berth on a bus: green when free, red when busy.
const RoomTile = ({ room, live, patient, doctor }) => {
  const busy = !!live;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden flex flex-col shadow-sm ${busy ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
      <div className={`px-3 py-2 flex items-center justify-between text-white ${busy ? 'bg-red-500' : 'bg-green-600'}`}>
        <span className="font-semibold">{room.name}</span>
        <span className="text-xs font-bold uppercase tracking-wider">{busy ? 'Busy' : 'Free'}</span>
      </div>
      <div className="p-3 flex-1 flex flex-col items-center text-center min-h-36">
        <div className={`h-2.5 w-14 rounded-full mb-3 ${busy ? 'bg-red-200' : 'bg-green-200'}`} />
        {busy ? (
          <>
            <p className="font-semibold text-gray-900">{patient}</p>
            <p className="text-sm text-gray-700">with {doctor}</p>
            <p className="text-xs text-red-700 mt-2">{sinceText(live.startTime)}</p>
          </>
        ) : (
          <>
            <BedDouble size={36} className="text-green-500" />
            <p className="text-sm text-green-800 mt-2">Ready for the next patient</p>
          </>
        )}
      </div>
    </div>
  );
};

const DoctorTile = ({ doctor, live, patient, room }) => {
  const busy = !!live;
  return (
    <div className={`rounded-2xl border-2 p-3 flex items-center gap-3 shadow-sm ${busy ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
      <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold ${busy ? 'bg-red-500' : 'bg-green-600'}`}>{initials(doctor.name)}</div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{doctor.name}</p>
        <p className={`text-xs font-bold uppercase tracking-wider ${busy ? 'text-red-700' : 'text-green-700'}`}>{busy ? 'Busy' : 'Free'}</p>
        {busy && <p className="text-xs text-gray-700 truncate">{patient} · {room}</p>}
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub, tone }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    <p className="text-xs text-gray-500">{sub}</p>
  </div>
);

const RoomsPage = ({ data, actions }) => {
  const [tab, setTab] = useState('live');
  const [, setTick] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [building, setBuilding] = useState('New building');
  const [docName, setDocName] = useState('');

  // Refresh the "25 min" counters.
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const buildings = [...new Set(data.rooms.map(r => r.building))];
  const patientName = (id) => data.patients.find(p => p.id === id)?.name || 'Unknown';
  const liveRoom = (id) => data.sessions.find(s => s.status === 'in-progress' && s.roomId === id);
  const liveDoctor = (id) => data.sessions.find(s => s.status === 'in-progress' && s.doctorId === id);
  const activeRooms = data.rooms.filter(r => r.active);
  const activeDoctors = data.doctors.filter(d => d.active);
  const roomsFree = activeRooms.filter(r => !liveRoom(r.id)).length;
  const doctorsFree = activeDoctors.filter(d => !liveDoctor(d.id)).length;

  const edit = (key, id, patch) => actions.setData(d => ({ ...d, [key]: d[key].map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  const addRoom = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    actions.setData(d => ({ ...d, rooms: [...d.rooms, { id: uid('R'), name: roomName.trim(), building: building.trim() || 'Main building', active: true }] }));
    setRoomName('');
  };
  const addDoctor = (e) => {
    e.preventDefault();
    if (!docName.trim()) return;
    actions.setData(d => ({ ...d, doctors: [...d.doctors, { id: uid('D'), name: docName.trim(), active: true }] }));
    setDocName('');
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-700">Rooms &amp; Doctors</h1>
        <div className="w-full sm:w-72">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'live', label: 'Live status' }, { value: 'manage', label: 'Manage' }]} />
        </div>
      </div>

      {tab === 'live' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Rooms free" value={`${roomsFree} of ${activeRooms.length}`} sub={`${activeRooms.length - roomsFree} busy`} tone="text-green-700" />
            <Stat label="Rooms busy" value={activeRooms.length - roomsFree} sub="sessions running" tone={activeRooms.length - roomsFree ? 'text-red-600' : 'text-gray-400'} />
            <Stat label="Doctors free" value={`${doctorsFree} of ${activeDoctors.length}`} sub={`${activeDoctors.length - doctorsFree} with a patient`} tone="text-green-700" />
          </div>

          {buildings.map(b => {
            const rooms = activeRooms.filter(r => r.building === b);
            if (rooms.length === 0) return null;
            const free = rooms.filter(r => !liveRoom(r.id)).length;
            return (
              <section key={b} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 text-lg">{b}</h2>
                  <span className="text-sm text-gray-500">{free} of {rooms.length} free</span>
                </div>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.map(r => {
                    const live = liveRoom(r.id);
                    return <RoomTile key={r.id} room={r} live={live} patient={live && patientName(live.patientId)} doctor={live && nameOf(data.doctors, live.doctorId, live.doctorName)} />;
                  })}
                </div>
              </section>
            );
          })}

          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 text-lg mb-3 flex items-center gap-2"><Stethoscope size={20} className="text-brand-600" /> Doctors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDoctors.map(d => {
                const live = liveDoctor(d.id);
                return <DoctorTile key={d.id} doctor={d} live={live} patient={live && patientName(live.patientId)} room={live && nameOf(data.rooms, live.roomId, live.roomName)} />;
              })}
            </div>
          </section>

          <div className="flex gap-4 text-sm text-gray-600 justify-center">
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-green-50 border-2 border-green-500" /> Free</span>
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-red-50 border-2 border-red-500" /> Busy</span>
          </div>
        </>
      )}

      {tab === 'manage' && (
        <>
          <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
          <form onSubmit={addRoom} className="bg-white rounded-lg border border-gray-200 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
            <Field label="Room name"><input className={inputCls} value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g. Room 5" /></Field>
            <Field label="Building">
              <input className={inputCls} list="buildings" value={building} onChange={e => setBuilding(e.target.value)} />
              <datalist id="buildings">{buildings.map(b => <option key={b} value={b} />)}</datalist>
            </Field>
            <button className={btnPrimary} type="submit" disabled={!roomName.trim()}><Plus size={18} /> Add room</button>
          </form>
          {buildings.map(b => (
            <section key={b} className="bg-white rounded-lg border border-gray-200">
              <h2 className="p-4 border-b border-gray-200 font-semibold text-gray-900">{b}</h2>
              <div className="divide-y divide-gray-100">
                {data.rooms.filter(r => r.building === b).map(r => (
                  <NameRow key={r.id} item={r} canHide={!liveRoom(r.id)}
                    onRename={(name) => edit('rooms', r.id, { name })} onToggle={() => edit('rooms', r.id, { active: !r.active })} />
                ))}
              </div>
            </section>
          ))}

          <h2 className="text-lg font-semibold text-gray-900 pt-4">Doctors</h2>
          <form onSubmit={addDoctor} className="bg-white rounded-lg border border-gray-200 p-4 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <Field label="Doctor / therapist name"><input className={inputCls} value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Dr. Anand" /></Field>
            <button className={btnPrimary} type="submit" disabled={!docName.trim()}><Plus size={18} /> Add doctor</button>
          </form>
          <section className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {data.doctors.map(d => (
              <NameRow key={d.id} item={d} canHide={!liveDoctor(d.id)}
                onRename={(name) => edit('doctors', d.id, { name })} onToggle={() => edit('doctors', d.id, { active: !d.active })} />
            ))}
          </section>
        </>
      )}
    </>
  );
};

export default AyurvedicClinicApp;
