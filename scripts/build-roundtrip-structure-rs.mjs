#!/usr/bin/env node
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { rustDir } from './lib/engine-locations.mjs'

const dir = mkdtempSync(join(tmpdir(), 'carve-roundtrip-build-'))
const target = resolve(process.env.CARGO_TARGET_DIR ?? '/var/tmp/cargo-shared/carve-rs')
try {
  const source = fileURLToPath(new URL('./roundtrip-structure.rs', import.meta.url))
  writeFileSync(join(dir, 'Cargo.toml'), `[package]
name = "carve-structural-roundtrip"
version = "0.0.0"
edition = "2021"

[[bin]]
name = "carve-structural-roundtrip"
path = ${JSON.stringify(source)}

[dependencies]
carve = { package = "carve-lang", path = ${JSON.stringify(resolve(rustDir()))} }
serde_json = "1"

[profile.dev]
debug = "line-tables-only"
`)
  const lock = join(rustDir(), 'Cargo.lock')
  if (existsSync(lock)) copyFileSync(lock, join(dir, 'Cargo.lock'))
  const result = spawnSync('cargo', ['build', '--manifest-path', join(dir, 'Cargo.toml'), '--bin', 'carve-structural-roundtrip'], {
    stdio: 'inherit', env: { ...process.env, CARGO_TARGET_DIR: target },
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = result.status ?? 1
  else console.log(join(target, 'debug/carve-structural-roundtrip'))
} finally {
  rmSync(dir, { recursive: true, force: true })
}
