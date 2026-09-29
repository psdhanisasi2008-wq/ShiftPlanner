import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Notice, useNotice, hhmm, mondayOf } from '../ui.jsx';

const PATHS = { accept: '/accept', decline: '/decline', approve: '/manager/approve', reject: '/manager/reject' };

export default function Swaps({ employees, acting }) {
  const [swaps, setSwaps] = useState([]);
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [weekRosters, setWeekRosters] = useState([]);
  const [form, setForm] = useState({ rosterId: '', colleagueId: '', reason: '' });
  const { notice, ok, err } = useNotice();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const nameOf = (id) => { const e = employees.find((x) => x.id === id); return e ? e.name : String(id); };

  async function loadSwaps() {
    try {
      const data = await api('GET', '/swaps');
      data.sort((a, b) => b.id - a.id);
      setSwaps(data);
    } catch (x) { err(x.message); }
  }
  async function loadWeek() {
    try { setWeekRosters(await api('GET', '/rosters/week?startDate=' + weekStart)); } catch (x) { err(x.message); }
  }
  useEffect(() => { loadSwaps(); }, []);
  useEffect(() => { loadWeek(); }, [weekStart]);

  const selectedRoster = weekRosters.find((r) => String(r.id) === String(form.rosterId));

  async function create(e) {
    e.preventDefault();
    if (!selectedRoster) { err('Select a roster entry first.'); return; }
    try {
      await api('POST', '/swaps', {
        rosterId: selectedRoster.id,
        requesterId: selectedRoster.employeeId,
        colleagueId: Number(form.colleagueId),
        reason: form.reason || null
      });
      ok('Swap request created. Waiting for the colleague.');
      setForm({ rosterId: '', colleagueId: '', reason: '' });
      await loadSwaps();
    } catch (x) { err(x.message); }
  }

  async function act(swap, action) {
    try {
      const result = await api('PUT', '/swaps/' + swap.id + PATHS[action]);
      if (result.status === 'COMPLETED') {
        ok('Swap ' + swap.id + ' completed. The roster now belongs to ' + nameOf(result.currentRosterEmployeeId) + '.');
      } else {
        ok('Swap ' + swap.id + ' is now ' + result.status + '.');
      }
      await loadSwaps();
      await loadWeek();
    } catch (x) { err(x.message); }
  }

  const isManager = acting && acting.role === 'MANAGER';

  return (
    <div>
      <h2>Swap requests</h2>
      <p className="hint">Acting as: {acting ? acting.name + ' (' + acting.role + ')' : 'nobody selected'}. Change it in the top bar.</p>
      <Notice notice={notice} />
      <form className="card grid" onSubmit={create}>
        <label>Week starting<input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></label>
        <label>Roster entry
          <select value={form.rosterId} onChange={(e) => set('rosterId', e.target.value)}>
            <option value="">Select</option>
            {weekRosters.map((r) => <option key={r.id} value={r.id}>{r.workDate} {r.shiftName} - {r.employeeName}</option>)}
          </select>
        </label>
        <label>Colleague
          <select value={form.colleagueId} onChange={(e) => set('colleagueId', e.target.value)}>
            <option value="">Select</option>
            {employees.filter((x) => x.active && (!selectedRoster || x.id !== selectedRoster.employeeId)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>Reason<input value={form.reason} onChange={(e) => set('reason', e.target.value)} /></label>
        <div className="row"><button type="submit">Request swap</button></div>
      </form>
      <div className="scroll">
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Shift</th><th>Requester</th><th>Colleague</th><th>Current owner</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {swaps.length === 0 && <tr><td colSpan="8">No swap requests yet.</td></tr>}
            {swaps.map((s) => {
              const pending = s.status === 'PENDING_COLLEAGUE';
              const accepted = s.status === 'COLLEAGUE_ACCEPTED';
              const isColleague = acting && acting.id === s.colleagueId;
              return (
                <tr key={s.id}>
                  <td>{s.id}</td><td>{s.workDate}</td><td>{s.shiftName}</td>
                  <td>{s.requesterName}</td><td>{s.colleagueName}</td>
                  <td>{nameOf(s.currentRosterEmployeeId)}</td>
                  <td><span className={'badge ' + s.status}>{s.status}</span></td>
                  <td className="row">
                    {pending && isColleague && <button className="small" onClick={() => act(s, 'accept')}>Accept</button>}
                    {pending && isColleague && <button className="small secondary" onClick={() => act(s, 'decline')}>Decline</button>}
                    {(pending || accepted) && isManager && <button className="small" onClick={() => act(s, 'approve')}>Approve</button>}
                    {(pending || accepted) && isManager && <button className="small danger" onClick={() => act(s, 'reject')}>Reject</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}