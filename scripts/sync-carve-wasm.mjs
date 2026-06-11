#!/usr/bin/env node
/*
 * Rebuild ../carve-wasm with wasm-pack and copy its pkg/ into
 * docs/.vitepress/carve-wasm.
 *
 * The Playground page imports the vendored WASM build directly to offer a
 * Rust engine that runs client-side. Whenever carve-rs or carve-wasm changes,
 * run `npm run sync-carve-wasm` (here) to refresh.
 *
 * Requires the Rust toolchain and wasm-pack on PATH:
 *   rustup target add wasm32-unknown-unknown
 *   cargo install wasm-pack   # or the prebuilt installer
 */

import { execSync } from 'node:child_process'
import {
  mkdirSync,
  readdirSync,
  unlinkSync,
  copyFileSync,
  statSync,
  existsSync,
} from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const wasmRoot = resolve(repoRoot, '../carve-wasm')
const libDir = resolve(repoRoot, 'docs/.vitepress/carve-wasm')

// Only these runtime files are vendored; the rest of pkg/ (package.json,
// LICENSE, .gitignore) is build tooling we don't ship into the site.
const KEEP = new Set([
  'carve_wasm.js',
  'carve_wasm.d.ts',
  'carve_wasm_bg.wasm',
  'carve_wasm_bg.wasm.d.ts',
])

if (!existsSync(wasmRoot)) {
  console.error(
    `carve-wasm not found at ${wasmRoot}.\n` +
      `Clone it next to this repo:\n` +
      `  cd .. && git clone https://github.com/markup-carve/carve-wasm.git\n`,
  )
  process.exit(1)
}

console.log(`Building carve-wasm at ${wasmRoot}...`)
execSync('wasm-pack build --target web --release', {
  cwd: wasmRoot,
  stdio: 'inherit',
})

const pkgDir = resolve(wasmRoot, 'pkg')
mkdirSync(libDir, { recursive: true })

// Clear previously vendored build artifacts (preserve README).
for (const f of readdirSync(libDir)) {
  if (KEEP.has(f)) unlinkSync(resolve(libDir, f))
}

let count = 0
for (const f of readdirSync(pkgDir)) {
  if (!KEEP.has(f)) continue
  const src = resolve(pkgDir, f)
  if (!statSync(src).isFile()) continue
  copyFileSync(src, join(libDir, f))
  count += 1
}
console.log(`Copied ${count} files to ${libDir}`)
