export type Role = 'MANAGER' | 'EMPLOYEE';
export type RosterStatus = 'ASSIGNED' | 'SWAPPED';
export type SwapStatus = 'PENDING_COLLEAGUE' | 'COLLEAGUE_ACCEPTED' | 'COLLEAGUE_DECLINED' | 'MANAGER_APPROVED' | 'MANAGER_REJECTED' | 'COMPLETED';
export type SwapAction = 'accept' | 'decline' | 'approve' | 'reject';

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Shift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
}

export interface RosterEntry {
  id: number;
  employeeId: number;
  employeeName: string;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  workDate: string;
  status: RosterStatus;
  createdAt: string;
}

export interface SwapRequest {
  id: number;
  rosterId: number;
  workDate: string;
  shiftName: string;
  currentRosterEmployeeId: number;
  requesterId: number;
  requesterName: string;
  colleagueId: number;
  colleagueName: string;
  reason: string | null;
  status: SwapStatus;
  colleagueApproved: boolean;
  managerApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ErrorBody {
  message?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the backend at http://localhost:8080. Check that Spring Boot is running.');
  }

  const raw = await response.text();
  let body: unknown;
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      body = raw;
    }
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? (body as ErrorBody).message
      : undefined;
    throw new Error(message || (typeof body === 'string' ? body : `Request failed with status ${response.status}.`));
  }
  return body as T;
}

function json(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export const api = {
  employees: () => request<Employee[]>('/employees'),
  shifts: () => request<Shift[]>('/shifts'),
  weeklyRoster: (startDate: string) => request<RosterEntry[]>(`/rosters/week?startDate=${encodeURIComponent(startDate)}`),
  rostersForDate: (date: string) => request<RosterEntry[]>(`/rosters/date/${encodeURIComponent(date)}`),
  createRoster: (body: { employeeId: number; shiftId: number; workDate: string }) => request<RosterEntry>('/rosters', json(body)),
  deleteRoster: (id: number) => request<void>(`/rosters/${id}`, { method: 'DELETE' }),
  swaps: () => request<SwapRequest[]>('/swaps'),
  createSwap: (body: { rosterId: number; requesterId: number; colleagueId: number; reason: string | null }) => request<SwapRequest>('/swaps', json(body)),
  swapAction: (id: number, action: SwapAction) => {
    const endpoint: Record<SwapAction, string> = {
      accept: 'accept',
      decline: 'decline',
      approve: 'manager/approve',
      reject: 'manager/reject',
    };
    return request<SwapRequest>(`/swaps/${id}/${endpoint[action]}`, { method: 'PUT' });
  },
};