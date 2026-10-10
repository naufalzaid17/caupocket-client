/**
 * Logic HTTP untuk autentikasi (login ke API Golang).
 */
import { apiFetch } from './api';
import type { User } from './types';

interface LoginData {
  token: string;
  user: User;
}

/** POST /auth/login — mengembalikan JWT + profil user. */
export function login(email: string, password: string): Promise<LoginData> {
  return apiFetch<LoginData>('/auth/login', { method: 'POST', body: { email, password } });
}
