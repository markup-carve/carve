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
import { homedir } from 'node:os'

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

// THE RENDERING-ONLY PROFILE, not the default build. The Playground calls
// exactly one export - `toHtmlWithOptions` - and `--no-default-features` keeps
// the HTML renderers while dropping the AST, import, report and other-renderer
// surfaces nobody here loads. Measured on carve-wasm v0.1.2: 0.54 MB gzip
// against 1.45 MB for the default build, which every visitor to the page
// downloads.
//
// If a page ever needs `parseJson`, an importer or a checked renderer, this
// flag is what removed it - drop the flag rather than reaching around it.
//
// RUSTFLAGS remaps the build host's source prefixes out of the artifact. Rust
// embeds panic locations as absolute paths, so a release build writes the
// developer's cargo home into the committed .wasm - 30 such strings shipped on
// the public docs site, and no text grep could see them because they live in a
// binary. carve-rs arrives as a git dependency, so both the registry and the
// git checkout sit under CARGO_HOME; remapping it covers both.
const cargoHome =
  process.env.CARGO_HOME || resolve(homedir(), '.cargo')
const remap = [
  `--remap-path-prefix=${cargoHome}=/cargo`,
  `--remap-path-prefix=${wasmRoot}=/carve-wasm`,
].join(' ')

console.log(`Building carve-wasm at ${wasmRoot}...`)
execSync('wasm-pack build --target web --release --no-default-features', {
  cwd: wasmRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    RUSTFLAGS: `${process.env.RUSTFLAGS ?? ''} ${remap}`.trim(),
  },
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
