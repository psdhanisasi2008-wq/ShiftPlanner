const BASE = '/api';

export async function api(method, path, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch (e) {
    throw new Error('Cannot reach the backend on http://localhost:8080. Is it running?');
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }
  if (!res.ok) {
    throw new Error((data && data.message) || ('Request failed with status ' + res.status));
  }
  return data;
}