#!/usr/bin/env node
// One local command to fetch the three engine main heads, build them, and run the readiness gate.
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const prepared = args.includes('--prepared')
const forwarded = args
const pinned = args.includes('--baseline-heads')
const baselineHeads = JSON.parse(readFileSync(resolve(root, 'scripts/next2-readiness-baseline.json'), 'utf8')).engineHeads
const engines = [
  ['js', 'carve-js', 'CARVE_JS_DIR'],
  ['php', 'carve-php', 'CARVE_PHP_DIR'],
  ['rs', 'carve-rs', 'CARVE_RS_DIR'],
]
function run(file, argv, options = {}) {
  const result = spawnSync(file, argv, { cwd: root, stdio: 'inherit', timeout: 12 * 60_000, ...options })
  if (result.error || result.status !== 0) throw new Error(`${file} ${argv.join(' ')} failed (${result.error ?? result.status})`)
}
function output(file, argv) {
  const result = spawnSync(file, argv, { cwd: root, encoding: 'utf8', timeout: 30_000 })
  if (result.error || result.status !== 0) throw new Error(`${file} ${argv.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}
const dirs = Object.fromEntries(engines.map(([name, repository, variable]) => [name, resolve(process.env[variable] ?? resolve(root, 'engines', repository))]))
const target = process.env.CARGO_TARGET_DIR ?? '/var/tmp/cargo-shared/carve-rs'
if (!prepared) {
  for (const [name, repository] of engines) {
    const dir = dirs[name]
    if (!existsSync(resolve(dir, '.git'))) {
      mkdirSync(dirname(dir), { recursive: true })
      run('git', ['clone', '--depth', '1', '--branch', 'main', `https://github.com/markup-carve/${repository}.git`, dir])
    }
    const dirty = output('git', ['-C', dir, 'status', '--porcelain'])
    if (dirty) throw new Error(`${dir} has local changes; use a clean checkout or set its CARVE_*_DIR variable`)
    // --baseline-heads replays the engine commits the baseline was measured on, as pull requests do.
    run('git', ['-C', dir, 'fetch', '--depth', '1', 'origin', pinned ? baselineHeads[name] : 'main'])
    const head = output('git', ['-C', dir, 'rev-parse', 'HEAD'])
    const next = output('git', ['-C', dir, 'rev-parse', 'FETCH_HEAD'])
    if (head !== next) run('git', ['-C', dir, 'switch', '--detach', next])
  }
  run('npm', ['ci'], { cwd: dirs.js })
  run('npm', ['run', 'build'], { cwd: dirs.js })
  run('composer', ['install', '--no-dev', '--no-interaction', '--no-progress'], { cwd: dirs.php })
  const env = { ...process.env, CARGO_BUILD_JOBS: '4', CARGO_TARGET_DIR: target }
  run('cargo', ['build', '--manifest-path', resolve(dirs.rs, 'Cargo.toml'), '--bin', 'carve'], { env })
  run('cargo', ['build', '--manifest-path', resolve(root, 'scripts/next2-readiness-rs/Cargo.toml')], { env })
}
run(process.execPath, [resolve(root, 'scripts/next2-readiness.mjs'), ...forwarded], {
  env: { ...process.env, CARVE_JS_DIR: dirs.js, CARVE_PHP_DIR: dirs.php, CARVE_RS_DIR: dirs.rs,
    CARVE_RS_BIN: process.env.CARVE_RS_BIN ?? resolve(target, 'debug/carve'),
    CARVE_RS_READINESS_BIN: process.env.CARVE_RS_READINESS_BIN ?? resolve(target, 'debug/carve-next2-readiness') },
})
