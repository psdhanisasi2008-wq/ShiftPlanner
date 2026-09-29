import { useState } from 'react';

export function useNotice() {
  const [notice, setNotice] = useState(null);
  return {
    notice,
    ok: (text) => setNotice({ type: 'ok', text }),
    err: (text) => setNotice({ type: 'error', text })
  };
}

export function Notice({ notice }) {
  if (!notice) return null;
  return <div className={'notice ' + notice.type}>{notice.text}</div>;
}

export function toIso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function mondayOf(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return toIso(x);
}

export function hhmm(t) {
  return t ? String(t).slice(0, 5) : '';
}