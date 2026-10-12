/**
 * Fallback binary native → WASM untuk lingkungan dengan Application Control
 * (mis. Windows Smart App Control) yang memblokir modul native baru hasil
 * `npm install` (rollup & compiler Astro). Di mesin sehat, skrip ini no-op.
 *
 * Dijalankan otomatis via postinstall.
 */
import { execSync } from 'node:child_process';
import { existsSync, renameSync, cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'package.json'));

function npmInstall(pkg) {
  execSync(`npm install --no-save --force --legacy-peer-deps ${pkg}`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

async function blocked(mod) {
  try {
    await import(mod);
    return false;
  } catch (err) {
    const msg = [String(err?.message), String(err?.cause?.message ?? '')].join(' ');
    return /Application Control policy has blocked/i.test(msg);
  }
}

// Entry ESM rollup bisa dimuat tanpa menyentuh binary native — uji modul
// native-nya langsung agar deteksi akurat.
function rollupNativeBlocked() {
  try {
    require('rollup/dist/native.js');
    return false;
  } catch (err) {
    const msg = [String(err?.message), String(err?.cause?.message ?? '')].join(' ');
    return /Application Control policy has blocked/i.test(msg);
  }
}

// --- 1. Rollup → @rollup/wasm-node -----------------------------------------
if (rollupNativeBlocked()) {
  console.log('[patch] rollup native diblokir → alihkan ke @rollup/wasm-node');
  if (!existsSync(join(ROOT, 'node_modules/@rollup/wasm-node'))) {
    npmInstall('@rollup/wasm-node');
  }
  const nativeDir = join(ROOT, 'node_modules/rollup');
  if (existsSync(nativeDir) && !existsSync(join(ROOT, 'node_modules/rollup-native-locked'))) {
    renameSync(nativeDir, join(ROOT, 'node_modules/rollup-native-locked'));
  }
  cpSync(join(ROOT, 'node_modules/@rollup/wasm-node'), nativeDir, { recursive: true });
  console.log('[patch] rollup memakai build WASM');
} else {
  console.log('[patch] rollup native OK');
}

// --- 2. Compiler Astro → binding wasm32-wasi --------------------------------
if (await blocked('@astrojs/compiler-binding')) {
  console.log('[patch] compiler binding native diblokir → pasang wasm32-wasi');
  const ver = require('@astrojs/compiler-binding/package.json').version;
  if (!existsSync(join(ROOT, 'node_modules/@astrojs/compiler-binding-wasm32-wasi'))) {
    npmInstall(`@astrojs/compiler-binding-wasm32-wasi@${ver}`);
  }
  console.log('[patch] compiler Astro memakai binding WASM (fallback otomatis napi-rs)');
} else {
  console.log('[patch] compiler binding native OK');
}
