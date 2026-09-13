// Shared engine-driver + normalization for the include-conformance suite.
//
// Both the golden generator (scripts/gen-include-conformance.mjs) and the
// carve-js proof runner (tests/include-conformance.test.mjs) import THIS
// module, so the four expected fields are computed exactly one way. The
// generator writes what this produces; the runner asserts against it. They
// cannot drift, because "run a vector" lives in a single place.
//
// PHASE 1 uses carve-js as the reference engine. PHASE 2 adds carve-php and
// carve-rs runners in their own repos; they vendor tests/include-conformance/
// and reimplement only the thin per-engine driver, reproducing the
// normalization contract documented below.

import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  realpathSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SPEC_ROOT = path.resolve(HERE, '..')

/**
 * Resolve a built carve-js. Phase 1 depends on a built carve-js being present;
 * resolution order, first hit wins:
 *   1. CARVE_JS env var  -> a carve-js checkout root (expects dist/index.js) or
 *      a direct path to an index.js.
 *   2. a sibling ../carve-js/dist/index.js next to the spec repo.
 *   3. the installed @markup-carve/carve package (once includes land on main).
 */
export async function loadCarve() {
  const env = process.env.CARVE_JS
  // An EXPLICIT CARVE_JS pins the reference engine: if it is set but fails to
  // import, that is FATAL. Silently falling back to a sibling checkout could
  // regenerate goldens from a different carve-js than the caller selected.
  if (env) {
    const candidate = env.endsWith('.js') ? env : path.join(env, 'dist/index.js')
    try {
      return { mod: await import(pathToFileURL(candidate).href), from: candidate }
    } catch (e) {
      throw new Error(
        `CARVE_JS is set to "${env}" but ${candidate} could not be imported ` +
          `(build it with \`npm run build\`?). Refusing to fall back to another ` +
          `carve-js. Underlying error: ${e?.message ?? e}`,
      )
    }
  }
  // No explicit pin: try optional fallbacks, skipping ones that are simply absent.
  const sibling = path.resolve(SPEC_ROOT, '..', 'carve-js', 'dist', 'index.js')
  try {
    return { mod: await import(pathToFileURL(sibling).href), from: sibling }
  } catch {
    // sibling checkout not present -> try the package
  }
  try {
    const resolved = createRequire(import.meta.url).resolve('@markup-carve/carve')
    return { mod: await import(pathToFileURL(resolved).href), from: resolved }
  } catch {
    // fall through to the explicit error
  }
  throw new Error(
    'Could not load a built carve-js. Set CARVE_JS to a carve-js checkout ' +
      '(with dist/ built via `npm run build`), or place carve-js as a sibling ' +
      'of the spec repo, or install @markup-carve/carve.',
  )
}

/**
 * Build the resolver a virtual-mode vector describes.
 * - `resolverIds`: the resolver strips a leading "./" for lookup and returns a
 *   canonical id, so two spellings of one file collapse (I6/I11 identity).
 * - `resolverThrows`: the resolver throws, exercising the I7 path where the raw
 *   error must be kept OUT of the normalized warning message.
 */
function virtualResolver(vector) {
  const files = vector.files ?? {}
  const opts = vector.options ?? {}
  if (opts.resolverThrows !== undefined) {
    return () => {
      throw new Error(opts.resolverThrows)
    }
  }
  if (opts.resolverIds) {
    return (p) => {
      const id = p.replace(/^\.\//, '')
      return files[id] === undefined ? null : { source: files[id], id }
    }
  }
  return (p) => (files[p] === undefined ? null : files[p])
}

function passOptions(vector) {
  const opts = vector.options ?? {}
  const out = {}
  if (opts.sourcePath !== undefined) out.sourcePath = opts.sourcePath
  if (opts.maxDepth !== undefined) out.maxDepth = opts.maxDepth
  if (opts.maxBytes !== undefined) out.maxBytes = opts.maxBytes
  return out
}

/** Normalize a path/id to the portable spelling: forward slashes throughout. */
function toSlash(p) {
  return p.split(path.sep).join('/')
}

/**
 * Fold an absolute path under the materialized tree base to the "<TMP>"
 * sentinel and switch to forward slashes, so a filesystem vector's ids, warning
 * files and (absolute-path case) fmt output are stable across machines and
 * engines. The base is the WHOLE tree root, so both in-root targets
 * (`<TMP>/root/ok.crv`) and deliberately-out-of-root ones (`<TMP>/secret.crv`)
 * fold under one sentinel. Non-absolute values (a directive path as written,
 * e.g. "../secret.crv") are returned slash-normalized but otherwise untouched.
 */
function normalizeFsPath(value, baseReal) {
  if (typeof value !== 'string' || !baseReal) return value
  if (value === baseReal) return '<TMP>'
  if (value.startsWith(baseReal + path.sep)) {
    return '<TMP>/' + toSlash(value.slice(baseReal.length + 1))
  }
  return toSlash(value)
}

/**
 * Fold any occurrence of the tree base inside a larger string (used for the
 * fmt output of the absolute-path filesystem vector, which embeds a real
 * absolute path). Linux CI keeps the path separator as "/", so a literal
 * replace suffices; the base is unique enough not to collide with content.
 */
function foldTmpInText(text, baseReal) {
  if (!baseReal) return text
  return text.split(baseReal).join('<TMP>')
}

/**
 * Normalize the raw engine warnings to the portable contract: an ordered list
 * of `{ rule, file? }`. Deliberately dropped:
 *   - `message`: host-worded prose, not a cross-engine contract.
 *   - `detail`: the raw resolver error (I7 forbids surfacing it; host-dependent).
 *   - line/column/start/end: source offsets are NOT pinned as a §19 contract and
 *     are the field most likely to diverge; including them would manufacture
 *     false divergences. Attribution travels through `file` (I4), which IS stable.
 */
function normalizeWarnings(warnings, baseReal) {
  return warnings.map((w) => {
    const out = { rule: w.rule }
    if (w.file !== undefined) {
      out.file = baseReal ? normalizeFsPath(w.file, baseReal) : w.file
    }
    return out
  })
}

/**
 * Normalize the dependency set: `{ id, resolved }` in first-encounter order
 * (I11 makes this ordering a hard cross-engine contract). Filesystem ids that
 * are absolute canonical paths are folded to "<ROOT>/...".
 */
function normalizeDependencies(deps, baseReal) {
  return deps.map((d) => ({
    id: baseReal ? normalizeFsPath(d.id, baseReal) : d.id,
    resolved: d.resolved,
  }))
}

/** Materialize a filesystem vector's tree under a fresh tmp dir; caller cleans up. */
function materializeTree(tree) {
  const base = mkdtempSync(path.join(tmpdir(), 'carve-ic-'))
  const symlinks = []
  for (const [rel, content] of Object.entries(tree)) {
    const abs = path.join(base, rel)
    if (content && typeof content === 'object' && 'symlink' in content) {
      symlinks.push([abs, content.symlink])
      continue
    }
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  for (const [abs, target] of symlinks) {
    mkdirSync(path.dirname(abs), { recursive: true })
    // Target is given relative to the tree base so vectors stay machine-independent.
    symlinkSync(path.resolve(base, target), abs)
  }
  return base
}

/**
 * Run one vector through carve-js and return the normalized four-field result
 * plus the raw warning messages (for the optional I7 no-leak assertion).
 */
export function runVector(vector, carve) {
  const { parse, expandIncludes, renderHtml, renderCarve, resolve, fileSystemResolver } = carve

  let base = null
  let baseReal = null
  try {
    let entry
    let expandArgs

    if (vector.mode === 'filesystem') {
      base = materializeTree(vector.tree)
      baseReal = realpathSync(base)
      const rootReal = realpathSync(path.join(base, vector.root))
      // Read the entry source, then bind any absolute-path token to the real
      // tree location. `<ABS:rel>` becomes the canonical absolute path of a tree
      // file, so the absolute-containment case (I10) can be expressed without a
      // machine-specific literal in the committed vector.
      entry = readFileSync(path.join(base, vector.entryPath), 'utf8').replace(
        /<ABS:([^>]+)>/g,
        (_m, rel) => path.join(baseReal, rel),
      )
      const fsOpts = {}
      if (vector.options?.allowAbsolute) fsOpts.allowAbsolute = true
      expandArgs = { ...passOptions(vector), resolve: fileSystemResolver(rootReal, fsOpts) }
      const sp = vector.options?.sourcePath
      if (sp === undefined || sp === '<ENTRY>') {
        expandArgs.sourcePath = realpathSync(path.join(base, vector.entryPath))
      }
    } else {
      entry = vector.entry
      expandArgs =
        vector.resolver === 'none'
          ? passOptions(vector) // no `resolve` key -> no resolver configured (I3)
          : { ...passOptions(vector), resolve: virtualResolver(vector) }
    }

    const doc = parse(entry, { positions: true })
    const result = expandIncludes(doc, entry, expandArgs)
    // Fold the tmp base out of HTML too: a denied absolute-path directive stays
    // literal and would otherwise embed a machine-specific path in the golden.
    const html = foldTmpInText(renderHtml(resolve(result.doc)), baseReal)
    // fmt is the serializer output of the PRE-EXPANSION document: this is what
    // pins I12/I14 (the directive must survive formatting). For the absolute-path
    // filesystem case the entry embeds a real absolute path, so fold it too.
    const fmt = foldTmpInText(renderCarve(parse(entry, { positions: true })), baseReal)

    const out = {
      html,
      fmt,
      warnings: normalizeWarnings(result.warnings, baseReal),
      dependencies: normalizeDependencies(result.dependencies, baseReal),
      rawWarningMessages: result.warnings.map((w) => w.message),
    }

    // Optional I12 stronger-invariant property: expanding the FORMATTED entry
    // must yield the same html + dependency set as expanding the original.
    if (vector.checkFmtExpandEquivalence && vector.mode !== 'filesystem') {
      const fdoc = parse(fmt, { positions: true })
      const fres = expandIncludes(fdoc, fmt, expandArgs)
      out.formattedRun = {
        html: renderHtml(resolve(fres.doc)),
        dependencies: normalizeDependencies(fres.dependencies, baseReal),
      }
    }
    return out
  } finally {
    if (base) rmSync(base, { recursive: true, force: true })
  }
}

export const EXPECTED_FIELDS = ['html', 'fmt', 'warnings', 'dependencies']
