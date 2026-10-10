/**
 * Generator ikon PWA Caupocket (tanpa dependensi eksternal).
 * Menghasilkan PNG RGBA dengan anti-aliasing supersampling 3x3:
 * - public/icons/icon-192.png
 * - public/icons/icon-512.png
 * - public/icons/icon-maskable-512.png (safe zone untuk maskable)
 *
 * Desain: kotak indigo + koin putih dengan slot di tengah.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');

const BG = [79, 70, 229]; // indigo-600 #4f46e5
const FG = [255, 255, 255];

// ---- PNG encoder ----------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Rasterizer ------------------------------------------------------------
/** Uji keanggotaan lingkaran dengan jarak halus (untuk anti-alias). */
function circleSDF(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

/** Rounded-rect SDF. */
function roundRectSDF(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

function drawIcon(size, { coinRadiusRatio, ss = 3 }) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const coinR = size * coinRadiusRatio;
  const slotW = size * 0.34;
  const slotH = size * 0.085;
  const slotR = slotH / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let fgCoverage = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = px + (sx + 0.5) / ss;
          const y = py + (sy + 0.5) / ss;
          const inCoin = circleSDF(x, y, cx, cy, coinR) <= 0;
          const inSlot =
            inCoin && roundRectSDF(x, y, cx, cy, slotW, slotH, slotR) <= 0;
          if (inCoin && !inSlot) fgCoverage++;
        }
      }
      const alpha = fgCoverage / (ss * ss);
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(FG[0] * alpha + BG[0] * (1 - alpha));
      pixels[i + 1] = Math.round(FG[1] * alpha + BG[1] * (1 - alpha));
      pixels[i + 2] = Math.round(FG[2] * alpha + BG[2] * (1 - alpha));
      pixels[i + 3] = 255;
    }
  }
  return encodePNG(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, coinRadiusRatio: 0.34 },
  { file: 'icon-512.png', size: 512, coinRadiusRatio: 0.34 },
  // Maskable: konten dalam safe zone (~radius 20% dari tengah).
  { file: 'icon-maskable-512.png', size: 512, coinRadiusRatio: 0.26 },
];

for (const t of targets) {
  const png = drawIcon(t.size, { coinRadiusRatio: t.coinRadiusRatio });
  writeFileSync(join(OUT_DIR, t.file), png);
  console.log(`✓ ${t.file} (${t.size}x${t.size}, ${png.length} bytes)`);
}
