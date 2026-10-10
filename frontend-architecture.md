# Caupocket - Frontend Architecture Document

## 1. System Overview
Caupocket Web Client adalah sebuah aplikasi PWA (Progressive Web App) dengan arsitektur hibrida. Sistem ini memprioritaskan performa rendering tinggi dan pengalaman pengguna (UX) yang identik dengan aplikasi *mobile native* (seperti blu atau GoPay).

* **Framework:** Astro
* **Rendering Strategy:** Server-Side Rendering (SSR) via Node.js adapter
* **Styling:** Tailwind CSS (Mobile-first responsive)
* **State & Interactivity:** Astro Islands (Vanilla JS / React fallback untuk komponen kompleks)
* **PWA Setup:** `@astrojs/pwa` (Service workers, manifest)

---

## 2. Directory Structure (Separation of Concerns)
Struktur diatur untuk memisahkan *markup* UI, *logic fetching* API, dan konfigurasi PWA.

```text
caupocket-web/
├── public/                 # Aset statis (manifest.json, icons PWA, favicon)
├── src/
│   ├── components/         
│   │   ├── ui/             # Komponen granular (Button, Input, Modal, SkeletonLoader)
│   │   └── features/       # Komponen domain (GoalCard, TransactionList, BottomNav)
│   ├── layouts/            
│   │   ├── AuthLayout.astro      # Layout untuk halaman login/register
│   │   └── DashboardLayout.astro # Layout utama (mengandung Navbar PWA & Safe Area)
│   ├── pages/              # File-based routing & SSR Logic
│   │   ├── index.astro     # Landing page / Redirect to dashboard
│   │   ├── login.astro     # Halaman Auth (Menangani penyimpanan Cookie)
│   │   └── dashboard/
│   │       ├── index.astro # Tampilan saldo & transaksi terakhir
│   │       └── goals.astro # Tampilan target liburan (Vacation Planner)
│   ├── services/           # Abstraksi pemanggilan API Golang
│   │   ├── api.ts          # Base URL fetcher, global error handling
│   │   └── auth.ts         # Logic HTTP Post login
│   ├── utils/              
│   │   └── formatters.ts   # Helper: formatRupiah(), formatDate()
│   └── styles/
│       └── global.css      # CSS override untuk mematikan sifat web browser
├── astro.config.mjs        # Konfigurasi Astro (Tailwind, PWA, SSR Adapter)
└── tailwind.config.cjs
```

---

## 3. Security & Authentication Flow
Menghindari kerentanan XSS dengan TIDAK menyimpan JWT di `localStorage`.

1. **Login Action:** Halaman `login.astro` (SSR) menangkap form submit, menembak API Golang.
2. **Cookie Setup:** Setelah Golang membalas dengan token JWT, Astro Server mengatur `Set-Cookie` ke browser dengan properti keamanan maksimal:
   * `HttpOnly: true` (Cegah akses Javascript klien)
   * `Secure: true` (Hanya berjalan di HTTPS)
   * `SameSite: lax`
3. **Route Protection:** Setiap masuk ke `/dashboard`, blok skrip `---` di Astro akan mengekstrak token dari cookie klien (`Astro.cookies.get`), dan menyematkannya di header `Authorization: Bearer <token>` saat fetching data profil/saldo ke Golang. Jika gagal (401), Astro me-redirect kembali ke `/login`.

---

## 4. Mobile-First UI/UX Engineering
Memanipulasi web agar terasa dan berperilaku layaknya aplikasi Native iOS/Android.

### 4.1. Core Layouting & Safe Areas
* **Max-Width Constraint:** Menggunakan `max-w-md mx-auto` agar layout selalu dalam rasio smartphone meski dibuka di PC.
* **Safe Area Inset:** Menggunakan padding `pb-[env(safe-area-inset-bottom)]` untuk mengakomodasi navigasi gestur iPhone modern / poni layar.

### 4.2. View Transitions
Mengaktifkan `<ViewTransitions />` dari Astro di tag `<head>` pada `DashboardLayout.astro`. Mencegah layar berkedip putih saat berpindah halaman, menciptakan efek navigasi instan (SPA-like experience).

### 4.3. Navigation & Actions
* **Bottom Navigation Bar:** Berada statis di bawah layar (`fixed bottom-0 z-50`).
* **Floating Action Button (FAB):** Tombol utama berukuran besar yang sedikit menonjol ke atas dari Bottom Nav untuk aksi Core (Tambah Transaksi / Setor Tabungan).

### 4.4. Mikro-Interaksi (Anti-Web Quirks)
CSS global dan Tailwind utility diimplementasikan untuk mematikan fitur bawaan browser:
* `select-none`: Mematikan kemampuan blok teks (mencegah teks tersorot biru secara tidak sengaja).
* `-webkit-tap-highlight-color: transparent`: Menghilangkan kotak biru/abu-abu saat tombol ditekan di HP.
* `overscroll-none`: Mencegah halaman ditarik melebihi batas atas/bawah (bounce effect dari browser).
* `active:scale-95`: Memberikan feedback visual (tombol sedikit mengecil) layaknya aplikasi native saat layar disentuh.

---

## 5. Deployment Strategy (Multi-repo)
Arsitektur dipisah (decoupled) dari Backend untuk optimalisasi pipeline CI/CD.

* **Repository Name:** `caupocket-web`
* **Platform Target:** Vercel atau Netlify
* **Environment Variables:** Membutuhkan `PUBLIC_API_URL` yang menunjuk ke server Golang di tahap production.
