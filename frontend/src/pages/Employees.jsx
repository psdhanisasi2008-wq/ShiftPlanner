import { useState } from 'react';
import { api } from '../api.js';
import { Notice, useNotice } from '../ui.jsx';

const empty = { employeeCode: '', name: '', email: '', role: 'EMPLOYEE', active: true };

export default function Employees({ employees, reload }) {
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const { notice, ok, err } = useNotice();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    try {
      if (editId) {
        await api('PUT', '/employees/' + editId, form);
        ok('Employee updated.');
      } else {
        await api('POST', '/employees', form);
        ok('Employee created.');
      }
      setForm(empty);
      setEditId(null);
      await reload();
    } catch (x) { err(x.message); }
  }

  function edit(emp) {
    setEditId(emp.id);
    setForm({ employeeCode: emp.employeeCode, name: emp.name, email: emp.email, role: emp.role, active: emp.active });
  }

  async function deactivate(emp) {
    try {
      await api('DELETE', '/employees/' + emp.id);
      ok(emp.name + ' was deactivated.');
      await reload();
    } catch (x) { err(x.message); }
  }

  return (
    <div>
      <h2>Employees</h2>
      <Notice notice={notice} />
      <form className="card grid" onSubmit={submit}>
        <label>Code<input value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} /></label>
        <label>Name<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label>Email<input value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label>Role
          <select value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="MANAGER">MANAGER</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active
        </label>
        <div className="row">
          <button type="submit">{editId ? 'Save changes' : 'Add employee'}</button>
          {editId && <button type="button" className="secondary" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
        </div>
      </form>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.employeeCode}</td><td>{emp.name}</td><td>{emp.email}</td><td>{emp.role}</td>
              <td>{emp.active ? 'Yes' : 'No'}</td>
              <td className="row">
                <button className="small" onClick={() => edit(emp)}>Edit</button>
                {emp.active && <button className="small danger" onClick={() => deactivate(emp)}>Deactivate</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}