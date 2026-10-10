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
 * The `carve-lang` pin a binding carries, read from its manifest.
 *
 * The LINE has to name carve-lang, either as the dependency key or through
 * `package =`. A pattern that took the first `version = "…"` on any dependency
 * line read carve-rb's `magnus = { version = "0.8" }` and reported the pin as
 * 0.8 - which fails loudly at `cargo install`, but only after the comparison
 * has already decided what it is comparing against.
 *
 * Two spellings are a pin. A crates.io version is the one org policy asks for.
 * A `git`/`rev` pair is what carve-rb moved to in carve-rb#185, and a reader
 * that knew only the first spelling returned null on it, which the workflow
 * step turned into a hard failure of four AST shards (carve#2881).
 *
 * @returns {{ kind: 'version', value: string, git: null }
 *   | { kind: 'rev', value: string, git: string } | null}
 */
export function pinnedEnginePin(manifestPath) {
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
    if (version) return { kind: 'version', value: version, git: null }
    const rev = /\brev\s*=\s*"([0-9a-fA-F]{7,40})"/.exec(line)?.[1]
    const git = /\bgit\s*=\s*"([^"]+)"/.exec(line)?.[1]
    if (rev && git) return { kind: 'rev', value: rev, git }
    // `carve-lang = "=0.1.6"`, the shorthand with no inline table.
    const short = /=\s*"=?([^"]+)"\s*$/.exec(line)?.[1]
    return short ? { kind: 'version', value: short, git: null } : null
  }
  return null
}

/** The `carve-lang` row `cargo install --root` recorded, so a cache hit is checked. */
function installedRow(root) {
  try {
    return /^"carve-lang ([^"]+)"/m.exec(readFileSync(resolve(root, '.crates.toml'), 'utf8'))?.[1] ?? null
  } catch {
    return null
  }
}

/** Whether the row that root recorded is the pin asked for, not another build. */
function rowIsPin(row, pin) {
  if (!row) return false
  // `0.1.6 (registry+https://…)` for a version pin; `0.1.9 (git+https://…?rev=889e916f#889e916f…)`
  // for a rev. The version pin matches on the version word, the rev pin on the
  // revision, because a git build's version word is whatever the crate happened
  // to carry at that commit and says nothing about which commit it was.
  return pin.kind === 'version'
    ? row.split(' ')[0] === pin.value
    : new RegExp(`\\b${pin.value.slice(0, 7)}[0-9a-fA-F]*\\b`).test(row)
}

/** How a pin reads in a message, so a failure names the thing it could not get. */
export function pinLabel(pin) {
  if (!pin) return 'unknown'
  return pin.kind === 'version' ? `carve-lang ${pin.value}` : `carve-lang at ${pin.git} rev ${pin.value.slice(0, 8)}`
}

/**
 * A `carve` binary at `pin`, built once and cached per pin.
 *
 * `CARVE_RS_PINNED_BIN` overrides it outright, for a CI job that provisions the
 * build in its own step and for an offline run. `source` says which of the
 * three it was, because an override can point at any build and a report that
 * names the pin either way is claiming something it did not check.
 *
 * @param {{ kind: 'version'|'rev', value: string, git: string|null }|null} pin
 * @returns {{ path: string|null, why: string|null, built: boolean,
 *   source: 'override'|'cache'|'built'|null }}
 */
export function pinnedEngineBinary(pin, { cacheRoot, install = true } = {}) {
  if (!pin) {
    return { path: null, why: 'could not read the pinned carve-lang version', built: false, source: null }
  }

  const override = process.env.CARVE_RS_PINNED_BIN
  if (override) {
    return existsSync(override)
      ? { path: override, why: null, built: false, source: 'override' }
      : { path: null, why: `CARVE_RS_PINNED_BIN=${override} does not exist`, built: false, source: null }
  }

  const root = cacheRoot ?? process.env.CARVE_PIN_CACHE ?? resolve(tmpdir(), `carve-lang-pin-${pin.kind}-${pin.value}`)
  const binary = resolve(root, 'bin', 'carve')
  // The pin is in the path AND checked in the root's own record: a cache
  // directory that holds something else would otherwise be read as this pin.
  if (existsSync(binary) && rowIsPin(installedRow(root), pin)) {
    return { path: binary, why: null, built: false, source: 'cache' }
  }
  if (!install) {
    return { path: null, why: `no cached ${pinLabel(pin)} under ${root}`, built: false, source: null }
  }

  // `--locked` so the pinned lockfile decides the dependency versions, and the
  // inherited CARGO_TARGET_DIR is dropped: this build belongs to the pin, not
  // to whatever checkout the caller was building.
  const { CARGO_TARGET_DIR: _ignored, ...env } = process.env
  const args = pin.kind === 'version'
    ? ['install', 'carve-lang', '--version', pin.value]
    : ['install', 'carve-lang', '--git', pin.git, '--rev', pin.value]
  const install_ = spawnSync(
    'cargo',
    [...args, '--locked', '--bin', 'carve', '--root', root],
    { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900_000 },
  )
  if (install_.status !== 0 || !existsSync(binary)) {
    const detail = (install_.stderr ?? '').trim().split('\n').filter(Boolean).at(-1) ?? 'no output'
    return { path: null, why: `cargo install ${pinLabel(pin)} failed: ${detail}`, built: false, source: null }
  }
  return { path: binary, why: null, built: true, source: 'built' }
}
