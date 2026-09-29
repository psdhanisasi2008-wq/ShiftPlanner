import { useEffect, useState } from 'react';
import { api } from './api.js';
import Employees from './pages/Employees.jsx';
import Shifts from './pages/Shifts.jsx';
import Roster from './pages/Roster.jsx';
import Swaps from './pages/Swaps.jsx';

const TABS = ['Swaps', 'Roster', 'Employees', 'Shifts'];

export default function App() {
  const [tab, setTab] = useState('Swaps');
  const [employees, setEmployees] = useState([]);
  const [actingId, setActingId] = useState(null);
  const [loadError, setLoadError] = useState('');

  async function loadEmployees() {
    try {
      const data = await api('GET', '/employees');
      setEmployees(data);
      setLoadError('');
      const manager = data.find((e) => e.role === 'MANAGER' && e.active) || data[0];
      setActingId((cur) => (cur !== null ? cur : manager ? manager.id : null));
    } catch (x) { setLoadError(x.message); }
  }
  useEffect(() => { loadEmployees(); }, []);

  const acting = employees.find((e) => e.id === actingId) || null;

  return (
    <div className="app">
      <header>
        <h1>ShiftPlanner</h1>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <label className="acting">Acting as
          <select value={actingId === null ? '' : actingId} onChange={(e) => setActingId(Number(e.target.value))}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
          </select>
        </label>
      </header>
      {loadError && <div className="notice error">{loadError}</div>}
      <main>
        {tab === 'Swaps' && <Swaps employees={employees} acting={acting} />}
        {tab === 'Roster' && <Roster employees={employees} />}
        {tab === 'Employees' && <Employees employees={employees} reload={loadEmployees} />}
        {tab === 'Shifts' && <Shifts />}
      </main>
    </div>
  );
}