/**
 * HTTP Client ke API Golang. HANYA untuk dipakai sisi server (frontmatter)
 * agar token tidak pernah bocor ke bundle klien.
 */
import type { Category, HabitLog, HabitSettings, SavingGoal, Transaction, User, Wallet } from './types';

export const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  error_code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }

  /** Token kadaluarsa/ditolak → pemanggil wajib redirect ke /login. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface RequestOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** fetch wrapper: sisipkan Authorization: Bearer <token> + buka envelope. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  } catch (cause) {
    throw new ApiError('Tidak dapat menghubungi server Caupocket.', 0, 'NETWORK_ERROR');
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* body bukan JSON */
  }

  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.message ?? `Permintaan gagal (HTTP ${res.status}).`,
      res.status,
      json?.error_code,
    );
  }
  return json.data;
}

/** Kumpulan endpoint Caupocket yang dipakai halaman SSR. */
export const api = {
  me: (token: string) => apiFetch<User>('/me', { token }),

  wallets: (token: string) => apiFetch<Wallet[]>('/wallets', { token }),

  categories: (token: string) => apiFetch<Category[]>('/categories', { token }),

  transactions: (token: string, limit = 10) =>
    apiFetch<Transaction[]>(`/transactions?limit=${limit}`, { token }),

  goals: (token: string) => apiFetch<SavingGoal[]>('/goals', { token }),

  createGoal: (token: string, body: { title: string; target_amount: number; target_date?: string }) =>
    apiFetch<SavingGoal>('/goals', { token, method: 'POST', body }),

  createTransaction: (
    token: string,
    body: {
      wallet_id: string;
      category_id?: string;
      type: 'INCOME' | 'EXPENSE';
      amount: number;
      description?: string;
      trx_date?: string;
    },
  ) => apiFetch<Transaction>('/transactions', { token, method: 'POST', body }),

  fundGoal: (token: string, goalId: string, body: { wallet_id: string; amount: number }) =>
    apiFetch<{ transaction: Transaction; goal: SavingGoal }>(`/goals/${goalId}/fund`, {
      token,
      method: 'POST',
      body,
    }),

  habitSettings: (token: string) => apiFetch<HabitSettings>('/habits/settings', { token }),

  updateHabitSettings: (token: string, enabled: boolean) =>
    apiFetch<HabitSettings>('/habits/settings', { token, method: 'PUT', body: { enabled } }),

  habitLogs: (token: string, limit = 20) =>
    apiFetch<HabitLog[]>(`/habits/logs?limit=${limit}`, { token }),
};
