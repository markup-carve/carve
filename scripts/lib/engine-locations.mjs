/*
 * Where the sibling engine checkouts live.
 *
 * Shared so a second differential runner cannot drift from the first about
 * which directory "the php engine" means. Both honor the same env vars, which
 * is how CI points at checkouts that are not siblings.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const rustDir = () => process.env.CARVE_RS_DIR ?? resolve(root, '../carve-rs')
export const phpDir = () => process.env.CARVE_PHP_DIR ?? resolve(root, '../carve-php')

/** Resolve Cargo configuration without building or fetching dependencies. */
function configuredTargetDir(dir) {
  if (!dir || !existsSync(join(dir, 'Cargo.toml'))) return null
  const result = spawnSync('cargo', ['metadata', '--format-version=1', '--no-deps', '--offline'], {
    cwd: dir, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) return null
  try {
    const target = JSON.parse(result.stdout).target_directory
    if (typeof target !== 'string' || !isAbsolute(target)) return null
    return target
  } catch {
    return null
  }
}

/** Cargo's depfile identifies which checkout produced a shared artifact. */
function builtFromCheckout(binary, dir) {
  try {
    const dependency = join(realpathSync(dir), 'src/main.rs').replace(/ /g, '\\ ')
    const depfile = readFileSync(`${binary}.d`, 'utf8').replace(/\\\r?\n/g, ' ')
    return depfile.split('\n')[0].split(': ').slice(1).join(': ').split(/(?<!\\)\s+/).includes(dependency)
  } catch {
    return false
  }
}

/** Prefer the active Cargo target directory to artifacts left in the checkout. */
function binaryLocations(dir) {
  const candidates = []
  const override = process.env.CARGO_TARGET_DIR
  const targetDir = override || configuredTargetDir(dir)
  if (targetDir) {
    // cargo resolves a relative CARGO_TARGET_DIR against the directory cargo
    // itself ran in, which for this binary is the carve-rs checkout and never
    // this repo. Resolving it against `root` would invent a path nothing built.
    const base = isAbsolute(targetDir) ? targetDir : resolve(dir ?? root, targetDir)
    const builds = [join(base, 'release/carve'), join(base, 'debug/carve')]
    candidates.push(...builds)
  }
  // Absolute paths remain valid when a runner changes its working directory.
  if (dir) candidates.push(resolve(dir, 'target/release/carve'), resolve(dir, 'target/debug/carve'))
  return { candidates: [...new Set(candidates)], configured: Boolean(targetDir && !override &&
    resolve(targetDir) !== resolve(realpathSync(dir), 'target')) }
}

/** A regular checkout artifact retains the resolver's existing trust policy. */
function localCheckoutBuild(binary, dir) {
  try {
    return realpathSync(binary).startsWith(`${join(realpathSync(dir), 'target')}/`)
  } catch {
    return false
  }
}

/** Paths searched, including configured artifacts rejected for unknown provenance. */
export function rustBinaryCandidates(dir = rustDir()) {
  return binaryLocations(dir).candidates
}

/** Explicit target overrides are trusted; discovered builds need checkout provenance. */
export function rustBinary(dir = rustDir()) {
  const { candidates, configured } = binaryLocations(dir)
  return candidates.find((candidate) => existsSync(candidate) &&
    (!configured || localCheckoutBuild(candidate, dir) || builtFromCheckout(candidate, dir))) ?? null
}
