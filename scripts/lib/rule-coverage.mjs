/*
 * Rule-coverage gate: shared, side-effect-free pieces.
 *
 * Every normative rule the spec model implements names a mutation of the model
 * source in resources/rule-coverage/mutations.json. A rule is COVERED when its
 * mutated model makes at least one core corpus row render differently. The
 * baseline in resources/rule-coverage/baseline.json is the ratchet: the gate
 * fails when a rule leaves coverage, and when a rule gains coverage the baseline
 * still lists as uncovered (so the list only shrinks).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const MUTATIONS_PATH = 'resources/rule-coverage/mutations.json'
export const BASELINE_PATH = 'resources/rule-coverage/baseline.json'

// The model reads these at import time, so a mutant copy needs them beside it.
export const MODEL_FILES = { dirs: ['scripts/spec', 'resources/spec'], files: ['resources/carve-core.ohm', 'resources/ast-schema.json'] }

const EDITABLE = /^(scripts\/spec\/[a-z0-9-]+\.mjs|resources\/carve-core\.ohm|resources\/spec\/[a-z0-9-]+\.json)$/

const count = (text, needle) => {
  let n = 0
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) n += 1
  return n
}

/** Validate the mutation map against the rule registry. Returns error strings. */
export function validateMutations (map, registry) {
  const errors = []
  const ids = new Set(registry.rules.map((rule) => rule.id))
  const scopes = new Set(registry.scopes.map((scope) => scope.id))
  for (const scope of map.scopes ?? []) if (!scopes.has(scope)) errors.push(`unknown scope '${scope}'`)
  const seen = new Set()
  for (const entry of map.mutations ?? []) {
    if (!ids.has(entry.rule)) errors.push(`${entry.rule}: not a rule id in resources/spec/rules.json`)
    if (seen.has(entry.rule)) errors.push(`${entry.rule}: more than one mutation entry`)
    seen.add(entry.rule)
    if (!Array.isArray(entry.edits) || entry.edits.length === 0) errors.push(`${entry.rule}: no edits`)
    for (const edit of entry.edits ?? []) {
      if (!EDITABLE.test(edit.file ?? '')) errors.push(`${entry.rule}: '${edit.file}' is not spec model source`)
      if (typeof edit.find !== 'string' || edit.find === '' || typeof edit.replace !== 'string') errors.push(`${entry.rule}: an edit needs a non-empty find and a replace`)
      else if (edit.find === edit.replace) errors.push(`${entry.rule}: an edit whose replace equals its find mutates nothing`)
    }
  }
  for (const [id, reason] of Object.entries(map.unmapped ?? {})) {
    if (!ids.has(id)) errors.push(`${id}: listed as unmapped but not a rule id in resources/spec/rules.json`)
    if (seen.has(id)) errors.push(`${id}: listed as unmapped and given a mutation`)
    if (typeof reason !== 'string' || reason === '') errors.push(`${id}: an unmapped rule needs a reason`)
  }
  return errors
}

/** Apply one entry's edits to file contents read through `read(file)`. */
export function applyEdits (entry, read) {
  const out = new Map()
  for (const edit of entry.edits) {
    const text = out.get(edit.file) ?? read(edit.file)
    const hits = count(text, edit.find)
    if (hits !== 1) throw new Error(`${entry.rule}: find matches ${hits} times in ${edit.file}, needs exactly 1: ${JSON.stringify(edit.find.slice(0, 80))}`)
    out.set(edit.file, text.replace(edit.find, () => edit.replace))
  }
  return out
}

/** Rules the gate answers for: every registry rule in a gated scope. */
export function gatedRules (map, registry) {
  const scopes = new Set(map.scopes)
  return registry.rules.filter((rule) => scopes.has(rule.scope)).map((rule) => rule.id)
}

/*
 * Compare a measured result against the committed baseline and, when given, the
 * baseline of the base branch. `killed` maps every mapped rule to its killing
 * row or null. `unmapped` is the mutation map's reason list: a rule the base
 * did not know at all may join the baseline only when it is listed there,
 * because the model has no code a corpus row could kill (an importer rule).
 */
export function ratchet ({ gated, killed, baseline, base, unmapped = {} }) {
  const failures = []
  const uncovered = gated.filter((id) => !killed.get(id)).sort()
  const listed = new Set(baseline.uncovered)
  for (const id of uncovered) {
    if (!listed.has(id)) failures.push(`${id}: no corpus row kills its mutation${killed.has(id) ? '' : ' (no mutation entry)'}; add a killing row, or a mutation entry with one`)
  }
  const now = new Set(uncovered)
  for (const id of baseline.uncovered) {
    if (!now.has(id)) failures.push(`${id}: covered now, so remove it from the baseline (npm run rules:coverage -- --write)`)
  }
  if (base) {
    const before = new Set(base.uncovered)
    const known = new Set([...base.uncovered, ...Object.keys(base.killers ?? {})])
    for (const id of baseline.uncovered) {
      if (before.has(id) || (!known.has(id) && Object.hasOwn(unmapped, id))) continue
      failures.push(`${id}: added to the uncovered baseline; the list may only shrink`)
    }
  }
  return { uncovered, failures }
}

/*
 * Rules the corpus cannot tell apart: mapped rules whose mutations fail exactly
 * the same non-empty row set. Needs full kill sets (`--full`).
 */
export function redundantGroups (killSets) {
  const byKey = new Map()
  for (const [id, rows] of killSets) {
    if (rows.length === 0) continue
    const key = [...rows].sort().join('\n')
    byKey.set(key, [...(byKey.get(key) ?? []), id])
  }
  return [...byKey.values()].filter((group) => group.length > 1).map((group) => group.sort())
}

export const readJson = (repo, path) => JSON.parse(readFileSync(resolve(repo, path), 'utf8'))
