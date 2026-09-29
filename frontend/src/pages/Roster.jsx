import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Notice, useNotice, hhmm, mondayOf } from '../ui.jsx';

export default function Roster({ employees }) {
  const [start, setStart] = useState(mondayOf(new Date()));
  const [rows, setRows] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ employeeId: '', shiftId: '', workDate: '' });
  const { notice, ok, err } = useNotice();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    try {
      const data = await api('GET', '/rosters/week?startDate=' + start);
      data.sort((a, b) => (a.workDate + a.startTime).localeCompare(b.workDate + b.startTime));
      setRows(data);
    } catch (x) { err(x.message); }
  }
  useEffect(() => { load(); }, [start]);
  useEffect(() => { api('GET', '/shifts').then(setShifts).catch((x) => err(x.message)); }, []);

  async function add(e) {
    e.preventDefault();
    try {
      await api('POST', '/rosters', {
        employeeId: Number(form.employeeId),
        shiftId: Number(form.shiftId),
        workDate: form.workDate
      });
      ok('Roster entry created.');
      await load();
    } catch (x) { err(x.message); }
  }

  async function remove(r) {
    try {
      await api('DELETE', '/rosters/' + r.id);
      ok('Roster entry deleted.');
      await load();
    } catch (x) { err(x.message); }
  }

  return (
    <div>
      <h2>Weekly roster</h2>
      <Notice notice={notice} />
      <div className="card grid">
        <label>Week starting<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      </div>
      <form className="card grid" onSubmit={add}>
        <label>Employee
          <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
            <option value="">Select</option>
            {employees.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>Shift
          <select value={form.shiftId} onChange={(e) => set('shiftId', e.target.value)}>
            <option value="">Select</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.shiftName} ({hhmm(s.startTime)}-{hhmm(s.endTime)})</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={form.workDate} onChange={(e) => set('workDate', e.target.value)} /></label>
        <div className="row"><button type="submit">Assign</button></div>
      </form>
      <table>
        <thead><tr><th>Date</th><th>Shift</th><th>Time</th><th>Employee</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="6">No entries for this week.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.workDate}</td><td>{r.shiftName}</td><td>{hhmm(r.startTime)}-{hhmm(r.endTime)}</td>
              <td>{r.employeeName}</td><td>{r.status}</td>
              <td><button className="small danger" onClick={() => remove(r)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}