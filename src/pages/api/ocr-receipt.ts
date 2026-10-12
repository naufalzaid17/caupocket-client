// Proxy SSR untuk OCR struk (EPIC V2.1).
// Browser hanya berbicara dengan Astro; JWT httpOnly tidak pernah disentuh
// JavaScript klien — cookie dibaca di server dan diteruskan sebagai header
// Authorization: Bearer <token> ke API Golang.
import type { APIRoute } from 'astro';
import { API_BASE } from '../../services/api';
import { clearTokenCookie, getToken } from '../../utils/auth';

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = getToken({ cookies });
  if (!token) {
    return json({ success: false, message: 'Belum login.', error_code: 'UNAUTHORIZED' }, 401);
  }

  let file: File;
  try {
    const form = await request.formData();
    const candidate = form.get('file');
    if (!(candidate instanceof File) || candidate.size === 0) {
      return json(
        { success: false, message: 'Gambar struk wajib dipilih.', error_code: 'OCR_FILE_REQUIRED' },
        400,
      );
    }
    file = candidate;
  } catch {
    return json(
      { success: false, message: 'Permintaan tidak valid.', error_code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'receipt.jpg');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/ocr/receipt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    });
  } catch {
    return json(
      { success: false, message: 'Tidak dapat menghubungi server Caupocket.', error_code: 'NETWORK_ERROR' },
      502,
    );
  }

  if (res.status === 401) {
    clearTokenCookie({ cookies });
  }

  // Teruskan envelope response backend apa adanya.
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
