import React, { useState } from 'react';
import { Plus, Printer, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal, Field, Segmented, ChoiceGrid, ClinicHeader, inputCls, btnPrimary, btnGhost } from './ui.jsx';
import {
  uid, todayISO, nowHHMM, fmtDate, money, billParts, generateDates, roomBusy, doctorBusy, courseSessions, courseTotal,
} from './lib.js';

// ---------- Create a course (the "Create session" dialog) ----------
export const CreateCourseModal = ({ patient, onClose, onSave }) => {
  const [f, setF] = useState({ treatment: 'Massage', startDate: todayISO(), months: 3, perWeek: 1, fee: 800 });
  const total = f.months * 4 * f.perWeek;
  const dates = generateDates(f.startDate, f.perWeek, total);
  const fee = Number(f.fee) || 0;
  const canSave = f.treatment.trim() && f.startDate && fee > 0;

  const save = () => {
    const course = {
      id: uid('C'), patientId: patient.id, treatment: f.treatment.trim(), startDate: f.startDate,
      months: f.months, perWeek: f.perWeek, fee,
    };
    const sessions = dates.map((date, i) => ({
      id: uid('S'), courseId: course.id, patientId: patient.id, number: i + 1, date, status: 'planned',
    }));
    onSave(course, sessions);
  };

  return (
    <Modal title={`Create session for ${patient.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Treatment name"><input className={inputCls} value={f.treatment} onChange={e => setF({ ...f, treatment: e.target.value })} /></Field>
        <Field label="Start date"><input type="date" className={inputCls} value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Number of months">
          <Segmented value={f.months} onChange={months => setF({ ...f, months })} options={[1, 2, 3, 6].map(m => ({ value: m, label: `${m} month${m > 1 ? 's' : ''}` }))} />
        </Field>
        <Field label="Visits">
          <Segmented value={f.perWeek} onChange={perWeek => setF({ ...f, perWeek })} options={[{ value: 1, label: 'Once a week' }, { value: 2, label: 'Twice a week (Mon & Thu)' }]} />
        </Field>
        <Field label="Fee per session (₹)"><input type="number" min="0" className={inputCls} value={f.fee} onChange={e => setF({ ...f, fee: e.target.value })} /></Field>

        <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-sm grid grid-cols-2 gap-2">
          <div><p className="text-gray-500">End date</p><p className="font-semibold text-gray-900">{dates.length ? fmtDate(dates[dates.length - 1]) : '—'}</p></div>
          <div><p className="text-gray-500">Total sessions</p><p className="font-semibold text-gray-900">{total}</p></div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!canSave} onClick={save}>Create {total} sessions</button>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Start a session: pick doctor, room, start time ----------
export const StartSessionModal = ({ data, session, onClose, onStart }) => {
  const [doctorId, setDoctorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState(nowHHMM());
  const patient = data.patients.find(p => p.id === session.patientId);

  const doctors = data.doctors.filter(d => d.active).map(d => {
    const busy = doctorBusy(data.sessions, d.id);
    return { id: d.id, name: d.name, disabled: busy, note: busy ? 'Busy' : 'Free' };
  });
  const rooms = data.rooms.filter(r => r.active).map(r => {
    const busy = roomBusy(data.sessions, r.id);
    return { id: r.id, name: r.name, disabled: busy, note: busy ? 'In use' : r.building };
  });

  return (
    <Modal title={`Start session #${session.number} · ${patient?.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Doctor / therapist">
          <ChoiceGrid items={doctors} value={doctorId} onChange={setDoctorId} />
        </Field>
        <Field label="Room">
          <ChoiceGrid items={rooms} value={roomId} onChange={setRoomId} />
        </Field>
        <Field label="Start time"><input type="time" className={inputCls} value={startTime} onChange={e => setStartTime(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!doctorId || !roomId || !startTime} onClick={() => onStart({ doctorId, roomId, startTime })}>Start session</button>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Complete a session ----------
export const CompleteSessionModal = ({ data, session, onClose, onComplete, onCancel }) => {
  const [f, setF] = useState({ painBefore: 5, painAfter: 3, outcome: 'better', feedback: '', doctorNotes: '' });
  const [rx, setRx] = useState([]);
  const patient = data.patients.find(p => p.id === session.patientId);
  const setLine = (id, k, v) => setRx(rx.map(l => (l.id === id ? { ...l, [k]: v } : l)));

  const submit = () => {
    const prescription = rx.filter(l => l.name.trim()).map(l => ({ ...l, name: l.name.trim(), given: false }));
    onComplete({ ...f, painBefore: Number(f.painBefore), painAfter: Number(f.painAfter), prescription });
  };

  const pain = (label, k) => (
    <Field key={k} label={`${label}: ${f[k]} / 10`}>
      <input type="range" min="0" max="10" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="w-full h-8 accent-[#018917]" />
    </Field>
  );

  return (
    <Modal title={`Complete session #${session.number} · ${patient?.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{pain('Pain before', 'painBefore')}{pain('Pain after', 'painAfter')}</div>
        <Field label="Is the pain…">
          <Segmented value={f.outcome} onChange={outcome => setF({ ...f, outcome })} options={[{ value: 'better', label: 'Better' }, { value: 'same', label: 'Same' }, { value: 'worse', label: 'Worse' }]} />
        </Field>
        <Field label="Patient's feedback / suggestion"><textarea rows={2} className={inputCls} value={f.feedback} onChange={e => setF({ ...f, feedback: e.target.value })} /></Field>
        <Field label="Doctor's notes"><textarea rows={3} className={inputCls} value={f.doctorNotes} onChange={e => setF({ ...f, doctorNotes: e.target.value })} placeholder="What was done, how the patient responded, advice for next visit…" /></Field>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Prescription (optional)</p>
          <div className="space-y-3">
            {rx.map(l => (
              <div key={l.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <input className={`${inputCls} col-span-2`} placeholder="Medicine name" value={l.name} onChange={e => setLine(l.id, 'name', e.target.value)} />
                  <input className={inputCls} placeholder="Dose (e.g. twice daily)" value={l.dose} onChange={e => setLine(l.id, 'dose', e.target.value)} />
                  <input className={inputCls} placeholder="Duration (e.g. 15 days)" value={l.duration} onChange={e => setLine(l.id, 'duration', e.target.value)} />
                  <div className="col-span-2 flex gap-2">
                    <input className={inputCls} placeholder="Instructions (e.g. apply on leg)" value={l.instructions} onChange={e => setLine(l.id, 'instructions', e.target.value)} />
                    <button className="px-3 text-red-600" onClick={() => setRx(rx.filter(x => x.id !== l.id))} aria-label="Remove medicine"><Trash2 size={20} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className={`${btnGhost} mt-2 flex items-center gap-2`} onClick={() => setRx([...rx, { id: uid('RX'), name: '', dose: '', duration: '', instructions: '' }])}><Plus size={18} /> Add medicine</button>
        </div>

        <div className="flex justify-between items-center gap-2 pt-1 flex-wrap">
          <button className="text-sm text-red-600 hover:text-red-800 min-h-11" onClick={onCancel}>Cancel session (back to Planned)</button>
          <button className={btnPrimary} onClick={submit}><CheckCircle2 size={18} /> Complete</button>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Bill, payment and receipt ----------
export const BillModal = ({ data, session, onClose, onSave }) => {
  const course = data.courses.find(c => c.id === session.courseId);
  const patient = data.patients.find(p => p.id === session.patientId);
  const saved = session.bill;
  const [medicines, setMedicines] = useState(saved?.medicines ?? saved?.extra ?? '');
  const [oils, setOils] = useState(saved?.oils ?? '');
  const [discount, setDiscount] = useState(saved?.discount ?? '');
  const [method, setMethod] = useState(saved?.method || 'Cash');

  const fee = saved?.fee ?? course?.fee ?? 0;
  const total = Math.max(0, fee + (Number(medicines) || 0) + (Number(oils) || 0) - (Number(discount) || 0));
  const make = (status) => ({
    fee, medicines: Number(medicines) || 0, oils: Number(oils) || 0, discount: Number(discount) || 0, total, status,
    method: status === 'paid' ? method : '', paidDate: status === 'paid' ? todayISO() : '',
  });

  if (saved?.status === 'paid') {
    const sessions = courseSessions(data, session.courseId);
    return (
      <Modal title="Receipt" onClose={onClose}>
        <div id="receipt" className="print-area space-y-3 text-sm">
          <ClinicHeader title="Receipt"><p className="text-xs text-gray-500">No. {session.id.slice(-6).toUpperCase()}</p></ClinicHeader>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-gray-500">Patient</p><p className="font-medium">{patient?.name}</p></div>
            <div><p className="text-gray-500">Date</p><p className="font-medium">{fmtDate(saved.paidDate)}</p></div>
            <div><p className="text-gray-500">Treatment</p><p className="font-medium">{course?.treatment}</p></div>
            <div><p className="text-gray-500">Session</p><p className="font-medium">#{session.number} of {courseTotal(sessions)}</p></div>
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between"><span>Session fee</span><span>{money(saved.fee)}</span></div>
            {billParts(saved).medicines > 0 && <div className="flex justify-between"><span>Medicines</span><span>{money(billParts(saved).medicines)}</span></div>}
            {saved.oils > 0 && <div className="flex justify-between"><span>Massage oils</span><span>{money(saved.oils)}</span></div>}
            {saved.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>− {money(saved.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2"><span>Total paid ({saved.method})</span><span>{money(saved.total)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button className={btnGhost} onClick={onClose}>Close</button>
          <button className={btnPrimary} onClick={() => window.print()}><Printer size={18} /> Print receipt</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Bill · ${patient?.name} · session #${session.number}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Session fee ({course?.treatment})</span><span className="font-semibold">{money(fee)}</span></div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Medicines (₹)"><input type="number" min="0" className={inputCls} value={medicines} onChange={e => setMedicines(e.target.value)} placeholder="0" /></Field>
          <Field label="Massage oils (₹)"><input type="number" min="0" className={inputCls} value={oils} onChange={e => setOils(e.target.value)} placeholder="0" /></Field>
          <Field label="Discount (₹)"><input type="number" min="0" className={inputCls} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" /></Field>
        </div>
        <div className="flex justify-between p-3 bg-brand-50 border border-brand-200 rounded-lg text-lg"><span>Total</span><span className="font-bold text-brand-700">{money(total)}</span></div>
        <Field label="Paid by">
          <Segmented value={method} onChange={setMethod} options={['Cash', 'UPI', 'Card'].map(m => ({ value: m, label: m }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-1 flex-wrap">
          <button className={btnGhost} onClick={() => { onSave(make('pending')); onClose(); }}>Pay later</button>
          <button className={btnPrimary} onClick={() => onSave(make('paid'))}>Mark as paid</button>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Missed: offer a replacement session ----------
export const MissedModal = ({ session, onClose, onConfirm }) => (
  <Modal title={`Session #${session.number} missed?`} onClose={onClose}>
    <p className="text-sm text-gray-700 mb-4">Add one replacement session at the end of the course?</p>
    <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
      <button className={btnGhost} onClick={onClose}>Cancel</button>
      <button className={btnGhost} onClick={() => onConfirm(false)}>Missed only</button>
      <button className={btnPrimary} onClick={() => onConfirm(true)}>Missed + add replacement</button>
    </div>
  </Modal>
);
