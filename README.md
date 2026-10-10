# Caupocket Web Client (PWA)

Web client Caupocket — PWA mobile-first dengan Astro SSR, Tailwind CSS, dan
service worker untuk mode offline. Alur autentikasi dirancang aman dari XSS:
JWT **tidak pernah** disentuh JavaScript browser, hanya hidup di cookie
`httpOnly` dan diteruskan oleh Astro server ke API Golang.

## Tech Stack

| Komponen | Pilihan |
|---|---|
| Framework | Astro 5 (SSR, `output: 'server'`) |
| Adapter | `@astrojs/node` (standalone) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| PWA | `@vite-pwa/astro` (workbox, manifest, autoUpdate) |
| View Transitions | `<ClientRouter />` (nama baru `<ViewTransitions/>`) |

## Struktur

```text
src/
├── components/
│   ├── ui/          Button, Input, Select, Card, ProgressBar, EmptyState
│   └── features/    BottomNav+FAB, BalanceCard, TransactionList, GoalCard
├── layouts/         AuthLayout, DashboardLayout (mobile constraint + safe area)
├── pages/
│   ├── login.astro          SSR login → set cookie httpOnly
│   ├── logout.astro         Hapus cookie → redirect /login
│   ├── dashboard/index.astro  Saldo, ringkasan, goals, transaksi terakhir
│   ├── goals.astro          Vacation Planner: buat target + setor dana
│   ├── transactions/new.astro Form catat pemasukan/pengeluaran
│   └── offline.astro        Halaman fallback offline (prerendered)
├── services/         api.ts (fetch client + Bearer), auth.ts, types.ts
├── utils/            formatters.ts (formatRupiah/formatDate), auth.ts (cookie)
└── styles/global.css  Anti-web-quirks (tap-highlight, overscroll, select)
```

## Menjalankan

```bash
npm install
cp .env.example .env        # arahkan PUBLIC_API_URL ke API Golang
npm run build && npm run preview   # produksi (node dist/server/entry.mjs)
npm run dev                        # development
```

Default: `http://localhost:4321`, API di `http://localhost:8080/api/v1`.

### Catatan konfigurasi

- **CSRF**: `security.checkOrigin` Astro aktif. Adapter standalone menghitung
  origin request tanpa port kecuali host didaftarkan di
  `security.allowedDomains` — pastikan host+port dev/production terdaftar di
  `astro.config.mjs`.
- **Service worker**: halaman SSR tidak di-inject otomatis, registrasi
  dilakukan manual di kedua layout via `virtual:pwa-register`.
- **Cookie**: `httpOnly; secure; sameSite=lax` (lihat `src/utils/auth.ts`).
  Cookie `Secure` diterima di `http://localhost` oleh Chrome modern.

## PWA

- Manifest: nama Caupocket, display standalone, theme `#4f46e5`, ikon
  192/512 + maskable (`public/icons/`).
- Strategi cache: halaman **NetworkFirst** (runtime), aset `/_astro/`
  **CacheFirst**, fallback halaman `/offline` (di-precache).
- Ikon dapat di-generate ulang: `npm run generate:icons`.
