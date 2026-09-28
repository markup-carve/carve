import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

/*
 * The engine a BINDING actually runs, which is the published crate it pins and
 * never carve-rs `main`.
 *
 * carve-rb links `carve-lang` at an exact version by org policy, so a
 * comparison against `main` reports every tree-moving carve-rs commit as a
 * carve-rb divergence. It is not one, and it cannot be fixed in any repo until
 * carve-rs publishes and carve-rb bumps - which is how that comparison came to
 * need a declared window and a ledger that went stale between release cuts
 * (carve#2175, carve#2482, carve#2483). Measured at carve-rb `bf0c76c7`
 * pinning `=0.1.6`: 61 of 1924 documents differ against `main`, 0 against the
 * tag it pins.
 *
 * So the pinned build is fetched and compared against instead. Then a
 * difference is unambiguously a gap in the BINDING, which is the only thing
 * this comparison was ever able to act on.
 */

/**
 * The `carve-lang` version a binding pins, read from its manifest.
 *
 * The LINE has to name carve-lang, either as the dependency key or through
 * `package =`. A pattern that took the first `version = "…"` on any dependency
 * line read carve-rb's `magnus = { version = "0.8" }` and reported the pin as
 * 0.8 - which fails loudly at `cargo install`, but only after the comparison
 * has already decided what it is comparing against.
 */
export function pinnedCrateVersion(manifestPath) {
  let manifest
  try {
    manifest = readFileSync(manifestPath, 'utf8')
  } catch {
    return null
  }
  for (const line of manifest.split('\n')) {
    const named = /^\s*(?:carve-lang|carve_lang)\s*=/.test(line) || /\bpackage\s*=\s*"carve-lang"/.test(line)
    if (!named) continue
    const version = /\bversion\s*=\s*"=?([^"]+)"/.exec(line)?.[1]
    if (version) return version
    // `carve-lang = "=0.1.6"`, the shorthand with no inline table.
    return /=\s*"=?([^"]+)"\s*$/.exec(line)?.[1] ?? null
  }
  return null
}

/** What `cargo install --root` recorded in that root, so a cache hit is checked. */
function installedVersion(root) {
  try {
    return /^"carve-lang ([^ ]+) /m.exec(readFileSync(resolve(root, '.crates.toml'), 'utf8'))?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * A `carve` binary at `version`, built from crates.io and cached per version.
 *
 * `CARVE_RS_PINNED_BIN` overrides it outright, for a CI job that provisions the
 * build in its own step and for an offline run. `source` says which of the
 * three it was, because an override can point at any build and a report that
 * names the pin either way is claiming something it did not check.
 *
 * @returns {{ path: string|null, why: string|null, built: boolean,
 *   source: 'override'|'cache'|'built'|null }}
 */
export function pinnedEngineBinary(version, { cacheRoot, install = true } = {}) {
  if (!version) {
    return { path: null, why: 'could not read the pinned carve-lang version', built: false, source: null }
  }

  const override = process.env.CARVE_RS_PINNED_BIN
  if (override) {
    return existsSync(override)
      ? { path: override, why: null, built: false, source: 'override' }
      : { path: null, why: `CARVE_RS_PINNED_BIN=${override} does not exist`, built: false, source: null }
  }

  const root = cacheRoot ?? process.env.CARVE_PIN_CACHE ?? resolve(tmpdir(), `carve-lang-pin-${version}`)
  const binary = resolve(root, 'bin', 'carve')
  // The version is in the path AND checked in the root's own record: a cache
  // directory that holds something else would otherwise be read as this pin.
  if (existsSync(binary) && installedVersion(root) === version) {
    return { path: binary, why: null, built: false, source: 'cache' }
  }
  if (!install) {
    return { path: null, why: `no cached carve-lang ${version} under ${root}`, built: false, source: null }
  }

  // `--locked` so the published lockfile decides the dependency versions, and
  // the inherited CARGO_TARGET_DIR is dropped: this build belongs to the pin,
  // not to whatever checkout the caller was building.
  const { CARGO_TARGET_DIR: _ignored, ...env } = process.env
  const install_ = spawnSync(
    'cargo',
    ['install', 'carve-lang', '--version', version, '--locked', '--bin', 'carve', '--root', root],
    { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000 },
  )
  if (install_.status !== 0 || !existsSync(binary)) {
    const detail = (install_.stderr ?? '').trim().split('\n').filter(Boolean).at(-1) ?? 'no output'
    return { path: null, why: `cargo install carve-lang ${version} failed: ${detail}`, built: false, source: null }
  }
  return { path: binary, why: null, built: true, source: 'built' }
}
