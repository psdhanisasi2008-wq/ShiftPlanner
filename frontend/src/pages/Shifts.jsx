import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Notice, useNotice, hhmm } from '../ui.jsx';

const empty = { shiftName: '', startTime: '', endTime: '' };

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const { notice, ok, err } = useNotice();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function load() {
    try { setShifts(await api('GET', '/shifts')); } catch (x) { err(x.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api('PUT', '/shifts/' + editId, form);
        ok('Shift updated.');
      } else {
        await api('POST', '/shifts', form);
        ok('Shift created.');
      }
      setForm(empty);
      setEditId(null);
      await load();
    } catch (x) { err(x.message); }
  }

  async function remove(s) {
    try {
      await api('DELETE', '/shifts/' + s.id);
      ok('Shift deleted.');
      await load();
    } catch (x) { err(x.message); }
  }

  return (
    <div>
      <h2>Shifts</h2>
      <Notice notice={notice} />
      <form className="card grid" onSubmit={submit}>
        <label>Name<input value={form.shiftName} onChange={(e) => set('shiftName', e.target.value)} /></label>
        <label>Start<input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></label>
        <label>End<input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></label>
        <div className="row">
          <button type="submit">{editId ? 'Save changes' : 'Add shift'}</button>
          {editId && <button type="button" className="secondary" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
        </div>
      </form>
      <p className="hint">An end time earlier than the start time means the shift ends after midnight.</p>
      <table>
        <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Actions</th></tr></thead>
        <tbody>
          {shifts.map((s) => (
            <tr key={s.id}>
              <td>{s.shiftName}</td><td>{hhmm(s.startTime)}</td><td>{hhmm(s.endTime)}</td>
              <td className="row">
                <button className="small" onClick={() => { setEditId(s.id); setForm({ shiftName: s.shiftName, startTime: hhmm(s.startTime), endTime: hhmm(s.endTime) }); }}>Edit</button>
                <button className="small danger" onClick={() => remove(s)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}