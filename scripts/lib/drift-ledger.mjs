/*
 * The one parser for the hand-maintained drift ledgers under `resources/`.
 *
 * They share a line format - a key, two or more spaces, the reason - and each
 * consumer parsed it for itself into a keyed collection: `engine-pin-drift.txt`
 * into a Map in `scripts/engine-report.mjs`, `engine-fmt-drift.txt` into a Set
 * in `tests/fmt-drift.mjs`, `converter-drift.txt` into a Map in
 * `scripts/compare-impls.mjs`. In every one of them a key listed twice
 * collapsed to a single entry and only the LAST line's reason survived.
 *
 * That is not a rounding error on a count. These files are declarations: a
 * second line for a key means a second reason was written down, and the one a
 * human wrote first is the one discarded. carve#1479 caught it because the pin
 * file held 220 lines while the report printed 215 - five slugs each carried
 * two distinct reasons, and only one of the two was ever shown.
 *
 * So a duplicate key is REJECTED here rather than resolved. No merge could be
 * right: the file is hand-maintained, and a repeated key is an authoring
 * mistake of the same kind as the missing-reason line this parser has always
 * thrown on.
 */
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

/**
 * The keys that appear more than once, in first-seen order.
 *
 * Split out because the call sites REPORT a duplicate differently - two throw,
 * `compare-impls.mjs` accumulates into a failure list so one bad line does not
 * abort a run that takes minutes, and the object-literal ledgers are read out
 * of their own source text - while what COUNTS as a duplicate must not vary.
 *
 * @param {Iterable<string>} keys
 * @returns {Array<string>}
 */
export function duplicateKeys(keys) {
  const seen = new Set()
  const repeated = new Set()
  for (const key of keys) {
    if (seen.has(key)) repeated.add(key)
    seen.add(key)
  }
  return [...repeated]
}

/**
 * Parse a `<key><two or more spaces><reason>` ledger.
 *
 * Blank lines and `#` comments are skipped. A line with no reason throws, as it
 * always did; so now does a key that is listed twice.
 *
 * @param {string} path
 * @returns {Map<string, string>} key to reason, in file order.
 */
export function parseDriftLedger(path) {
  const name = basename(path)
  const entries = new Map()
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const at = line.search(/\s{2,}/)
    if (at === -1) throw new Error(`${name}: no reason on line: ${line}`)
    const key = line.slice(0, at)
    const reason = line.slice(at).trim()
    if (entries.has(key)) {
      throw new Error(
        `${name}: duplicate key on line ${index + 1}: ${key}\n` +
          `  already declared: ${entries.get(key)}\n` +
          `  this line says:   ${reason}\n` +
          `A key is declared once, with one reason. Two lines means one of the two\n` +
          `reasons is being thrown away - keep the one that is still true, delete the other.`,
      )
    }
    entries.set(key, reason)
  }
  return entries
}

/**
 * `resources/converter-drift.txt`, whose lines are `<engine>/<slug>  <reason>`.
 *
 * Kept apart from `parseDriftLedger` because the key is a pair and the caller's
 * contract is different: `scripts/compare-impls.mjs` drives a run that takes
 * minutes and collects every failure before reporting, so a bad line reports
 * itself rather than aborting. Only the REPORTING differs - what counts as a
 * duplicate is the same rule (carve#1479), and living here is what makes it
 * reachable to a test, which it was not while it sat inside a function that
 * needs three engine checkouts before it runs.
 *
 * @param {string} path
 * @returns {{ entries: Map<string, { reason: string, used: boolean }>, failures: Array<string> }}
 */
export function parseConverterLedger(path) {
  const name = basename(path)
  const entries = new Map()
  const failures = []
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const parsed = /^(\S+)\/(\S+) {2}(.+)$/.exec(line)
    if (!parsed) {
      failures.push(`${name} line unparseable: ${JSON.stringify(line)} (format: engine/slug  reason)`)
      continue
    }
    const key = `${parsed[1]}/${parsed[2]}`
    const reason = parsed[3]
    if (entries.has(key)) {
      failures.push(
        `${name}: duplicate entry: ${key} - already declared as ${JSON.stringify(entries.get(key).reason)}, ` +
          `and this line says ${JSON.stringify(reason)}. One of the two reasons is being thrown away; keep the true one.`,
      )
      continue
    }
    entries.set(key, { reason, used: false })
  }
  return { entries, failures }
}

/** The kinds `resources/undeclared-dependencies.txt` accepts. */
export const DEPENDENCY_KINDS = new Set(['vendors', 'couples', 'not-a-dependency'])

/**
 * `resources/undeclared-dependencies.txt`, whose lines are
 * `<repo> -> <target>  <kind>  <reason>`.
 *
 * A third shape rather than a third parser: the key is a PAIR like the
 * converter ledger's, and the value carries a kind as well as a reason, because
 * this ledger says what sort of dependency it is declaring and not only that
 * one exists. Everything else is the house rule - `#` comments, blank lines,
 * two or more spaces before the reason, and one entry per key.
 *
 * Failures are collected rather than thrown, matching `parseConverterLedger`
 * and for the same reason: the caller is a run that takes minutes over the
 * whole org, and a bad line should report itself alongside every other finding
 * instead of aborting the report someone was waiting for.
 *
 * @param {string} path
 * @returns {{ entries: Map<string, { repo: string, target: string, kind: string, reason: string, line: number }>, failures: Array<string> }}
 */
export function parseDependencyLedger(path) {
  const name = basename(path)
  const entries = new Map()
  const failures = []
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const parsed = /^(\S+) *-> *(\S+) {2,}(\S+) {2,}(.+)$/.exec(line)
    if (!parsed) {
      failures.push(
        `${name} line ${index + 1} unparseable: ${JSON.stringify(rawLine)} ` +
          '(format: repo -> target  kind  reason)',
      )
      continue
    }
    const [, repo, target, kind, reason] = parsed
    if (!DEPENDENCY_KINDS.has(kind)) {
      failures.push(
        `${name} line ${index + 1}: unknown kind ${JSON.stringify(kind)} - ` +
          `one of ${[...DEPENDENCY_KINDS].join(', ')}`,
      )
      continue
    }
    if (repo === target) {
      failures.push(`${name} line ${index + 1}: ${repo} cannot depend on itself`)
      continue
    }
    const key = `${repo} -> ${target}`
    if (entries.has(key)) {
      failures.push(
        `${name}: duplicate entry: ${key} - already declared as ` +
          `${JSON.stringify(entries.get(key).reason)}, and this line says ${JSON.stringify(reason)}. ` +
          'One of the two reasons is being thrown away; keep the true one.',
      )
      continue
    }
    entries.set(key, { repo, target, kind, reason, line: index + 1 })
  }
  return { entries, failures }
}

/**
 * The two-directional check the ledger's value depends on.
 *
 * A hand-written note about a hand-written dependency rots exactly the way the
 * wiki prose the Dependency Map replaced did, so neither direction is allowed
 * to pass quietly: a declaration the tool can now read for itself is redundant,
 * and a suppression with nothing left to suppress is describing a world that
 * moved. Both name the line to delete.
 *
 * @param {Iterable<{ repo: string, target: string, kind: string, line: number }>} rows
 * @param {Array<{ repo: string, target: string }>} detected edges the run found on its own.
 * @param {Set<string>} known live repo names.
 * @returns {Array<string>}
 */
export function auditDependencyLedger(rows, detected, known) {
  const failures = []
  const found = new Set(detected.map((edge) => `${edge.repo}|${edge.target}`))
  for (const row of rows) {
    for (const repo of [row.repo, row.target]) {
      if (!known.has(repo)) failures.push(`line ${row.line}: no such repo ${JSON.stringify(repo)}`)
    }
    const isDetected = found.has(`${row.repo}|${row.target}`)
    if (row.kind === 'not-a-dependency' && !isDetected) {
      failures.push(
        `line ${row.line}: ${row.repo} -> ${row.target} suppresses an edge nothing detects any more - delete the line`,
      )
    }
    if (row.kind !== 'not-a-dependency' && isDetected) {
      failures.push(
        `line ${row.line}: ${row.repo} -> ${row.target} is detected on its own now - delete the line`,
      )
    }
  }
  return failures
}

/*
 * The same ledger, spelled as an object literal.
 *
 * `PINNED_DRIFT`, `AHEAD_OF_PIN`, `PINNED_UNIMPLEMENTED` and their siblings are
 * hand-maintained declarations exactly like the `resources/*.txt` files, and a
 * repeated key in one of them is the same authoring mistake with the same
 * consequence: the last value wins and the first reason is gone. It is worse
 * here, because it is legal JavaScript that no runtime check can see - by the
 * time the object exists the duplicate has already been resolved away.
 *
 * So it is read out of the source text instead. Only `const ALL_CAPS = {`
 * declarations are scanned, which is what every declared ledger in this repo is
 * spelled as, so a ledger added later is covered without anyone remembering to
 * list it here.
 */

/**
 * Walk an object literal's source, from the `{`, and collect its own keys.
 *
 * Nested objects and arrays are skipped rather than descended into: a repeated
 * key means something only among siblings.
 *
 * @param {string} source the whole file.
 * @param {number} open index of the opening brace.
 * @returns {{ keys: Array<string>, end: number }}
 */
function scanObjectKeys(source, open) {
  const keys = []
  let depth = 0
  let i = open
  let pendingKey = null
  while (i < source.length) {
    const c = source[i]
    if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i)
      if (i === -1) break
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      if (close === -1) break
      i = close + 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1
      if (depth === 1) pendingKey = source.slice(i + 1, j)
      i = j + 1
      continue
    }
    if (c === '{' || c === '[') {
      depth += 1
      i += 1
      continue
    }
    if (c === '}' || c === ']') {
      depth -= 1
      i += 1
      if (depth === 0) return { keys, end: i }
      continue
    }
    if (c === ':' && depth === 1 && pendingKey !== null) {
      keys.push(pendingKey)
      pendingKey = null
      i += 1
      continue
    }
    if (depth === 1 && /[A-Za-z_$]/.test(c)) {
      const word = /^[A-Za-z0-9_$]+/.exec(source.slice(i))[0]
      pendingKey = word
      i += word.length
      continue
    }
    if (depth === 1 && c === ',') pendingKey = null
    i += 1
  }
  return { keys, end: source.length }
}

/**
 * Every `const ALL_CAPS = { ... }` declaration in a module, with its own keys.
 *
 * @param {string} source
 * @returns {Array<{ name: string, keys: Array<string> }>}
 */
export function declaredObjectLedgers(source) {
  const found = []
  const declaration = /(?:^|\n)(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*\{/g
  let match
  while ((match = declaration.exec(source)) !== null) {
    const open = match.index + match[0].length - 1
    const { keys, end } = scanObjectKeys(source, open)
    found.push({ name: match[1], keys })
    declaration.lastIndex = end
  }
  return found
}

/**
 * Why a `converter-drift.txt` declaration went unused, in the run's own words.
 *
 * FOUR facts arrive as one symptom. The entry was never matched, and that is
 * true when the engine passed, when the case is gone, when a sliced run never
 * reached it, and when the conversion or the render ERRORED. Only the first
 * means the line is stale, and reporting all four as "the engine now matches
 * (or the case is gone)" pointed a reader at a deletion in the three states
 * where deleting is wrong - an errored engine reads exactly like a fixed one
 * (carve#2175).
 *
 * Lives here rather than inside `runConvertMode` for the reason
 * `parseConverterLedger` does: that function needs three engine checkouts
 * before a single line of it runs, so nothing inside it is reachable to a test.
 *
 * @param {string} key `<engine>/<slug>`
 * @param {{ activeNames: Set<string>, corpusSlugs: Set<string>, measuredSlugs: Set<string>, unscored: Map<string, string> }} run
 * @returns {string}
 */
export function unusedConverterDeclaration(key, run) {
  const slash = key.indexOf('/')
  const engine = key.slice(0, slash)
  const slug = key.slice(slash + 1)
  if (!run.activeNames.has(engine)) {
    return `converter-drift.txt declares ${key}, and ${engine} was not measured in this run - it says nothing about whether the line still holds.`
  }
  if (!run.corpusSlugs.has(slug)) {
    return `converter-drift.txt declares ${key}, and the corpus has no case ${slug} - renamed or removed, so the line describes nothing. Repoint it or delete it.`
  }
  if (!run.measuredSlugs.has(slug)) {
    return `converter-drift.txt declares ${key}, and this run did not reach ${slug} (--limit cut it) - a sliced run cannot call a line stale.`
  }
  const why = run.unscored.get(key)
  if (why !== undefined) {
    return `converter-drift.txt declares ${key}, and this run could not score it: ${why}. The line is not stale until a run scores the case and the engine passes.`
  }
  return `converter-drift.txt declares ${key} and the engine now matches - delete the STALE line in the commit that fixed it.`
}

/** The engine names `compare:impls` uses, in the order a ledger key spells them. */
export const FMT_LAYOUT_ENGINES = ['js', 'php', 'rust']

const FULL_REFERENCE = /[\w.-]+\/[\w.-]+#\d+/

/**
 * `resources/engine-fmt-layout.txt`: `<a>|<b>/<slug>  <reason>`, one line per
 * corpus row and engine pair whose `fmt` bytes are an accepted layout
 * difference. Engines are named in FMT_LAYOUT_ENGINES order, so one pair has
 * one spelling, and the reason must cite a fully qualified `owner/repo#N`.
 *
 * Failures are collected, as `parseConverterLedger` does, because the caller
 * is a run that takes minutes.
 *
 * @param {string} path
 * @returns {{ entries: Map<string, { engines: [string, string], slug: string, reason: string }>, failures: Array<string> }}
 */
export function parseFmtLayoutLedger(path) {
  const name = basename(path)
  const entries = new Map()
  const failures = []
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const [index, line] of lines.entries()) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const at = `${name} line ${index + 1}`
    const parsed = /^(\w+)\|(\w+)\/(\S+) {2,}(.+)$/.exec(line)
    if (!parsed) {
      failures.push(`${at} unparseable: ${JSON.stringify(line)} (format: a|b/slug  reason)`)
      continue
    }
    const [, a, b, slug, reason] = parsed
    const ia = FMT_LAYOUT_ENGINES.indexOf(a)
    const ib = FMT_LAYOUT_ENGINES.indexOf(b)
    if (ia === -1 || ib === -1 || ia >= ib) {
      failures.push(`${at}: engine pair ${a}|${b} must be two of ${FMT_LAYOUT_ENGINES.join(', ')}, in that order`)
      continue
    }
    if (!FULL_REFERENCE.test(reason)) {
      failures.push(`${at}: the reason must cite a fully qualified owner/repo#N ticket`)
      continue
    }
    const key = `${a}|${b}/${slug}`
    if (entries.has(key)) {
      failures.push(`${at}: duplicate entry ${key}; one of the two reasons is being thrown away, keep the true one.`)
      continue
    }
    entries.set(key, { engines: [a, b], slug, reason })
  }
  return { entries, failures }
}

/**
 * Whether a `carve`-target disagreement is wholly declared: every pair of
 * engines that wrote different bytes has a ledger line. An errored engine is
 * never excused, because an error is not a layout.
 *
 * @param {string} slug
 * @param {Array<[string, string]>} outputs `[engine, stdout]`, errors spelled `ERROR:...`.
 * @param {Map<string, unknown>} entries
 * @returns {{ excused: boolean, undeclared: Array<string> }}
 */
export function judgeFmtLayout(slug, outputs, entries) {
  if (outputs.some(([, out]) => out.startsWith('ERROR:'))) return { excused: false, undeclared: [] }
  const undeclared = []
  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      if (outputs[i][1] === outputs[j][1]) continue
      const [a, b] = [outputs[i][0], outputs[j][0]].sort(
        (x, y) => FMT_LAYOUT_ENGINES.indexOf(x) - FMT_LAYOUT_ENGINES.indexOf(y),
      )
      const key = `${a}|${b}/${slug}`
      if (!entries.has(key)) undeclared.push(key)
    }
  }
  return { excused: undeclared.length === 0, undeclared }
}

/**
 * The declared lines that no longer describe a difference. A line is stale when
 * its two engines both wrote the row this run and wrote the same bytes, or when
 * the corpus has no such row. A row this run did not reach, or an engine that
 * errored or did not run, says nothing either way.
 *
 * @param {Map<string, { engines: [string, string], slug: string }>} entries
 * @param {Map<string, Map<string, string>>} carveOutputs slug to engine to stdout, this run's.
 * @param {Set<string> | null} corpusSlugs every row of the corpus, or null when unknown.
 * @returns {Array<string>}
 */
export function staleFmtLayout(entries, carveOutputs, corpusSlugs) {
  const stale = []
  for (const [key, { engines: [a, b], slug }] of entries) {
    if (corpusSlugs && !corpusSlugs.has(slug)) {
      stale.push(`${key}: the corpus has no row ${slug}, so the line excuses nothing. Repoint it or delete it.`)
      continue
    }
    const seen = carveOutputs.get(slug)
    const outA = seen?.get(a)
    const outB = seen?.get(b)
    if (outA === undefined || outB === undefined) continue
    if (outA.startsWith('ERROR:') || outB.startsWith('ERROR:')) continue
    if (outA === outB) stale.push(`${key}: ${a} and ${b} now write the same bytes - delete the STALE line.`)
  }
  return stale
}

/**
 * Why this run cannot judge `engine-fmt-layout.txt` lines stale, or null when it
 * can. The rows are measured at `resources/engine-pins.json`, so only a run
 * whose engines are checked out at those pins can say a difference is gone. A
 * local run against sibling checkouts usually is not.
 *
 * @param {{ engines: Record<string, { head: string | null }> }} revisions
 * @param {Record<string, string>} pins `resources/engine-pins.json` `engines`.
 * @returns {string | null}
 */
export function fmtLayoutStaleBlocker(revisions, pins) {
  const off = []
  for (const [name, { head }] of Object.entries(revisions.engines)) {
    const pin = pins[name === 'rust' ? 'rs' : name]
    if (!head || head !== pin) off.push(`${name}=${head ? head.slice(0, 12) : 'unknown'} (pin ${pin ? pin.slice(0, 12) : 'none'})`)
  }
  return off.length ? `engines not at resources/engine-pins.json: ${off.join(', ')}` : null
}
