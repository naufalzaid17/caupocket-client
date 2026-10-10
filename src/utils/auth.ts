/**
 * Helper autentikasi sisi server (dipanggil dari Astro frontmatter).
 * JWT TIDAK PERNAH disentuh JavaScript browser — hanya hidup di cookie
 * httpOnly dan diteruskan Astro server ke API Golang.
 */
import type { AstroGlobal } from 'astro';

export const TOKEN_COOKIE = 'caupocket_token';
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari (selaras JWT 72h + buffer)

/** Ambil token dari cookie request; undefined bila belum login. */
export function getToken(Astro: AstroGlobal): string | undefined {
  return Astro.cookies.get(TOKEN_COOKIE)?.value;
}

/** Simpan token ke cookie dengan properti keamanan maksimal. */
export function setTokenCookie(Astro: AstroGlobal, token: string): void {
  Astro.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true, // cegah akses JavaScript klien (anti-XSS)
    secure: true, // hanya dikirim via HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });
}

/** Hapus cookie token (logout / token kadaluarsa). */
export function clearTokenCookie(Astro: AstroGlobal): void {
  Astro.cookies.delete(TOKEN_COOKIE, { path: '/' });
}
