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
