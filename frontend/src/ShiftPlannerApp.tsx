import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  type Employee,
  type RosterEntry,
  type Shift,
  type SwapAction,
  type SwapRequest,
} from './services/api';

type Page = 'Dashboard' | 'Weekly Roster' | 'Employees' | 'Swap Requests';
type Notice = { type: 'success' | 'error'; text: string } | null;

const pages: Page[] = ['Dashboard', 'Weekly Roster', 'Employees', 'Swap Requests'];

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mondayOf(date: Date) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDate(monday);
}

function time(value: string) {
  return value.slice(0, 5);
}

export default function ShiftPlannerApp() {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState('');
  const [actingId, setActingId] = useState<number | ''>('');
  const [notice, setNotice] = useState<Notice>(null);
  const [pageError, setPageError] = useState('');
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [rosterLoadedWeek, setRosterLoadedWeek] = useState<string | null>(null);
  const [swapsLoadedWeek, setSwapsLoadedWeek] = useState<string | null>(null);
  const [todayRoster, setTodayRoster] = useState<RosterEntry[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [weekRoster, setWeekRoster] = useState<RosterEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rosterForm, setRosterForm] = useState({ employeeId: '', shiftId: '', workDate: '' });
  const [swapForm, setSwapForm] = useState({ rosterId: '', colleagueId: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [busySwapId, setBusySwapId] = useState<number | null>(null);

  const acting = employees.find((employee) => employee.id === actingId) ?? null;
  const selectedRoster = weekRoster.find((roster) => roster.id === Number(swapForm.rosterId));
  const pageLoading = activePage === 'Dashboard'
    ? !dashboardLoaded
    : activePage === 'Weekly Roster'
      ? rosterLoadedWeek !== weekStart
      : activePage === 'Swap Requests'
        ? swapsLoadedWeek !== weekStart
        : employeesLoading;

  useEffect(() => {
    let cancelled = false;
    api.employees()
      .then((data) => {
        if (cancelled) return;
        setEmployees(data);
        const manager = data.find((employee) => employee.role === 'MANAGER' && employee.active);
        setActingId(manager?.id ?? data[0]?.id ?? '');
        setEmployeesError('');
      })
      .catch((error: Error) => {
        if (!cancelled) setEmployeesError(error.message);
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activePage !== 'Dashboard' || employeesLoading) return;
    let cancelled = false;
    Promise.all([api.rostersForDate(localDate(new Date())), api.swaps()])
      .then(([roster, swapRequests]) => {
        if (cancelled) return;
        setTodayRoster(roster);
        setSwaps(swapRequests);
        setPageError('');
      })
      .catch((error: Error) => {
        if (!cancelled) setPageError(error.message);
      })
      .finally(() => {
        if (!cancelled) setDashboardLoaded(true);
      });
    return () => { cancelled = true; };
  }, [activePage, employeesLoading]);

  useEffect(() => {
    if (activePage !== 'Weekly Roster') return;
    let cancelled = false;
    Promise.all([api.weeklyRoster(weekStart), api.shifts()])
      .then(([roster, availableShifts]) => {
        if (cancelled) return;
        setWeekRoster(roster);
        setShifts(availableShifts);
        setPageError('');
      })
      .catch((error: Error) => {
        if (!cancelled) setPageError(error.message);
      })
      .finally(() => {
        if (!cancelled) setRosterLoadedWeek(weekStart);
      });
    return () => { cancelled = true; };
  }, [activePage, weekStart]);

  useEffect(() => {
    if (activePage !== 'Swap Requests') return;
    let cancelled = false;
    Promise.all([api.swaps(), api.weeklyRoster(weekStart)])
      .then(([swapRequests, roster]) => {
        if (cancelled) return;
        setSwaps(swapRequests);
        setWeekRoster(roster);
        setPageError('');
      })
      .catch((error: Error) => {
        if (!cancelled) setPageError(error.message);
      })
      .finally(() => {
        if (!cancelled) setSwapsLoadedWeek(weekStart);
      });
    return () => { cancelled = true; };
  }, [activePage, weekStart]);

  async function refreshSwaps() {
    setSwaps(await api.swaps());
  }

  async function refreshRoster() {
    const roster = await api.weeklyRoster(weekStart);
    setWeekRoster(roster);
    return roster;
  }

  async function createRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api.createRoster({
        employeeId: Number(rosterForm.employeeId),
        shiftId: Number(rosterForm.shiftId),
        workDate: rosterForm.workDate,
      });
      setNotice({ type: 'success', text: 'Roster assignment created.' });
      setRosterForm({ ...rosterForm, employeeId: '', shiftId: '' });
      await refreshRoster();
    } catch (error) {
      setNotice({ type: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteRoster(roster: RosterEntry) {
    if (!window.confirm(`Delete ${roster.employeeName}'s ${roster.shiftName} assignment on ${roster.workDate}?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.deleteRoster(roster.id);
      setNotice({ type: 'success', text: 'Roster assignment deleted.' });
      await refreshRoster();
    } catch (error) {
      setNotice({ type: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function createSwap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoster) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.createSwap({
        rosterId: selectedRoster.id,
        requesterId: selectedRoster.employeeId,
        colleagueId: Number(swapForm.colleagueId),
        reason: swapForm.reason.trim() || null,
      });
      setNotice({ type: 'success', text: 'Swap request created. Waiting for the colleague.' });
      setSwapForm({ rosterId: '', colleagueId: '', reason: '' });
      await refreshSwaps();
    } catch (error) {
      setNotice({ type: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function performSwapAction(swap: SwapRequest, action: SwapAction) {
    if ((action === 'decline' || action === 'reject') && !window.confirm(`Are you sure you want to ${action} swap request #${swap.id}?`)) return;
    setBusySwapId(swap.id);
    setNotice(null);
    try {
      const updated = await api.swapAction(swap.id, action);
      await refreshSwaps();
      if (updated.status === 'COMPLETED') await refreshRoster();
      setNotice({ type: 'success', text: `Swap request #${swap.id} is now ${updated.status}.` });
    } catch (error) {
      setNotice({ type: 'error', text: (error as Error).message });
    } finally {
      setBusySwapId(null);
    }
  }

  const activeEmployees = employees.filter((employee) => employee.active);
  const pendingSwaps = swaps.filter((swap) => swap.status === 'PENDING_COLLEAGUE' || swap.status === 'COLLEAGUE_ACCEPTED').length;
  const completedSwaps = swaps.filter((swap) => swap.status === 'COMPLETED' || swap.status === 'MANAGER_APPROVED').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      <aside className="w-full bg-slate-900 p-4 text-white md:min-h-screen md:w-64 md:p-5">
        <div className="mb-5 md:mb-10">
          <h1 className="text-2xl font-bold">ShiftPlanner</h1>
          <p className="mt-1 text-sm text-slate-400">Employee Shift Management</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Main navigation">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => { setActivePage(page); setNotice(null); setPageError(''); }}
              className={`shrink-0 rounded-lg px-4 py-3 text-left transition ${activePage === page ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {page}
            </button>
          ))}
        </nav>
        <p className="mt-5 hidden text-xs text-slate-500 md:absolute md:bottom-5 md:block">ShiftPlanner v1.0</p>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">{activePage}</h2>
            <p className="mt-1 text-sm text-slate-500">Manage your team's shifts efficiently.</p>
          </div>
          <label className="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{acting?.name.charAt(0) ?? '?'}</span>
            <span className="flex flex-col">
              <span className="text-xs text-slate-500">Acting as</span>
              <select
                aria-label="Acting as employee"
                className="max-w-52 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                value={actingId}
                onChange={(event) => setActingId(event.target.value ? Number(event.target.value) : '')}
                disabled={employeesLoading || employees.length === 0}
              >
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.role})</option>)}
              </select>
            </span>
          </label>
        </header>

        {(employeesError || pageError) && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{employeesError || pageError}</div>}
        {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-lg px-4 py-3 text-sm ${notice.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}>{notice.text}</div>}

        {activePage === 'Dashboard' && (
          <>
            {pageLoading && <p role="status" className="mb-4 text-sm text-slate-500">Loading dashboard data...</p>}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Total Employees', value: employeesLoading ? '...' : employees.length, icon: '♙' },
                { title: "Today's Shifts", value: pageLoading ? '...' : todayRoster.length, icon: '▣' },
                { title: 'Pending Swap Requests', value: pageLoading ? '...' : pendingSwaps, icon: '↔' },
                { title: 'Completed Swaps', value: pageLoading ? '...' : completedSwaps, icon: '✓' },
              ].map((stat) => (
                <section key={stat.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{stat.title}</p><p className="mt-2 text-3xl font-bold">{stat.value}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">{stat.icon}</span></div>
                </section>
              ))}
            </div>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 md:p-6"><h3 className="text-lg font-bold">Today's Shift Overview</h3><p className="mt-1 text-sm text-slate-500">Assignments for {localDate(new Date())}</p></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Shift</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody>
                    {todayRoster.map((roster) => <tr key={roster.id} className="border-t border-slate-100"><td className="px-5 py-4 font-medium">{roster.employeeName}</td><td className="px-5 py-4">{roster.shiftName}</td><td className="px-5 py-4">{time(roster.startTime)} - {time(roster.endTime)}</td><td className="px-5 py-4">{roster.status}</td></tr>)}
                    {!pageLoading && todayRoster.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No shifts scheduled for today.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 md:p-6"><h3 className="text-lg font-bold">Recent Swap Requests</h3></div>
              <div className="divide-y divide-slate-100">
                {swaps.slice().sort((first, second) => second.id - first.id).slice(0, 5).map((swap) => <div key={swap.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{swap.requesterName} → {swap.colleagueName}</p><p className="text-sm text-slate-500">{swap.workDate} · {swap.shiftName}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{swap.status}</span></div>)}
                {!pageLoading && swaps.length === 0 && <p className="px-5 py-8 text-center text-slate-500">No swap requests yet.</p>}
              </div>
            </section>
          </>
        )}

        {activePage === 'Employees' && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 md:p-6"><h3 className="text-lg font-bold">Employees</h3></div>
            {employeesLoading ? <p role="status" className="p-6 text-sm text-slate-500">Loading employees...</p> : employeesError ? null : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="p-4">Employee ID</th><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Status</th></tr></thead>
                  <tbody>
                    {employees.map((employee) => <tr key={employee.id} className="border-t border-slate-100"><td className="p-4">{employee.id} <span className="text-slate-500">({employee.employeeCode})</span></td><td className="p-4 font-medium">{employee.name}</td><td className="p-4">{employee.email}</td><td className="p-4">{employee.role}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs ${employee.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{employee.active ? 'Active' : 'Inactive'}</span></td></tr>)}
                    {employees.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No employees found.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activePage === 'Weekly Roster' && (
          <>
            <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="flex flex-col gap-2 text-sm font-medium">Week starting<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
              {pageLoading && <span role="status" className="text-sm text-slate-500">Loading roster...</span>}
            </section>
            <form onSubmit={createRoster} className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm font-medium">Employee<select required value={rosterForm.employeeId} onChange={(event) => setRosterForm({ ...rosterForm, employeeId: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2"><option value="">Select employee</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Shift<select required value={rosterForm.shiftId} onChange={(event) => setRosterForm({ ...rosterForm, shiftId: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2"><option value="">Select shift</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.shiftName} ({time(shift.startTime)}-{time(shift.endTime)})</option>)}</select></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Work date<input type="date" required value={rosterForm.workDate} onChange={(event) => setRosterForm({ ...rosterForm, workDate: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" /></label>
              <button type="submit" disabled={busy || employeesLoading} className="self-end rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Saving...' : 'Assign shift'}</button>
            </form>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Shift</th><th className="p-4">Time</th><th className="p-4">Employee</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                <tbody>
                  {weekRoster.map((roster) => <tr key={roster.id} className="border-t border-slate-100"><td className="p-4">{roster.workDate}</td><td className="p-4">{roster.shiftName}</td><td className="p-4">{time(roster.startTime)} - {time(roster.endTime)}</td><td className="p-4 font-medium">{roster.employeeName}</td><td className="p-4">{roster.status}</td><td className="p-4"><button type="button" disabled={busy} onClick={() => void deleteRoster(roster)} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60">Delete</button></td></tr>)}
                  {!pageLoading && weekRoster.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No roster entries for this week.</td></tr>}
                </tbody>
              </table></div>
            </section>
          </>
        )}

        {activePage === 'Swap Requests' && (
          <>
            <form onSubmit={createSwap} className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm font-medium">Week starting<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Roster entry<select required value={swapForm.rosterId} onChange={(event) => setSwapForm({ ...swapForm, rosterId: event.target.value, colleagueId: '' })} className="rounded-md border border-slate-300 px-3 py-2"><option value="">Select assignment</option>{weekRoster.map((roster) => <option key={roster.id} value={roster.id}>{roster.workDate} · {roster.shiftName} · {roster.employeeName}</option>)}</select></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Colleague<select required value={swapForm.colleagueId} onChange={(event) => setSwapForm({ ...swapForm, colleagueId: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2"><option value="">Select colleague</option>{activeEmployees.filter((employee) => employee.id !== selectedRoster?.employeeId).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
              <label className="flex flex-col gap-2 text-sm font-medium">Reason <span className="text-xs font-normal text-slate-500">Optional, up to 500 characters</span><input maxLength={500} value={swapForm.reason} onChange={(event) => setSwapForm({ ...swapForm, reason: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2" /></label>
              <button type="submit" disabled={busy || !selectedRoster} className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Submitting...' : 'Request swap'}</button>
            </form>
            {pageLoading && <p role="status" className="mb-4 text-sm text-slate-500">Loading swap requests...</p>}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-500"><tr><th className="p-4">Requester</th><th className="p-4">Colleague</th><th className="p-4">Date / Shift</th><th className="p-4">Status</th><th className="p-4">Available actions</th></tr></thead>
                <tbody>
                  {swaps.slice().sort((first, second) => second.id - first.id).map((swap) => {
                    const pending = swap.status === 'PENDING_COLLEAGUE';
                    const accepted = swap.status === 'COLLEAGUE_ACCEPTED';
                    const isColleague = acting?.id === swap.colleagueId;
                    const isManager = acting?.role === 'MANAGER';
                    return <tr key={swap.id} className="border-t border-slate-100"><td className="p-4 font-medium">{swap.requesterName}</td><td className="p-4">{swap.colleagueName}</td><td className="p-4">{swap.workDate}<br /><span className="text-sm text-slate-500">{swap.shiftName}</span></td><td className="p-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{swap.status}</span></td><td className="p-4"><div className="flex flex-wrap gap-2">
                      {pending && isColleague && <><button type="button" disabled={busySwapId === swap.id} onClick={() => void performSwapAction(swap, 'accept')} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Accept</button><button type="button" disabled={busySwapId === swap.id} onClick={() => void performSwapAction(swap, 'decline')} className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60">Decline</button></>}
                      {accepted && isManager && <><button type="button" disabled={busySwapId === swap.id} onClick={() => void performSwapAction(swap, 'approve')} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Approve</button><button type="button" disabled={busySwapId === swap.id} onClick={() => void performSwapAction(swap, 'reject')} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60">Reject</button></>}
                      {pending && isManager && <span className="text-sm text-slate-500">Waiting for colleague</span>}
                      {!pending && !accepted && <span className="text-sm text-slate-500">No action available</span>}
                      {accepted && !isManager && <span className="text-sm text-slate-500">Waiting for manager</span>}
                    </div></td></tr>;
                  })}
                  {!pageLoading && swaps.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No swap requests yet.</td></tr>}
                </tbody>
              </table></div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}