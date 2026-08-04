/*
 * Every field the AST schema names is produced by at least one corpus document.
 *
 * A field in `resources/ast-schema.json` is a promise: a consumer may write
 * `if (node.attribution)` against it. A field nothing produces is either DEAD
 * (the promise is false) or UNIMPLEMENTED (the promise is unkept), and the
 * schema alone cannot tell the two apart - `additionalProperties: false` checks
 * that no engine invents a field, and nothing checked the other direction.
 *
 * That gap is the same shape as PART 10 §10a, which every engine violated
 * identically, and as §3a's resolved half, which the reference implementation
 * did not meet: a rule stated in one place, enforced in none. Here it hid
 * `block_quote.attribution`, described as "the `-- attribution` line" - a syntax
 * the grammar does not define, that no engine emits, and that two engines carry
 * dead plumbing for (carve#599).
 *
 * The exemption list below is the point of the test: an opt-in feature's fields
 * are legitimately absent from a default-profile run, and each has to say which
 * feature it belongs to. A field with no entry and no producer fails.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, resolve as resolveDoc, toAstJson } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

/**
 * Fields no DEFAULT-profile document can produce, and the opt-in feature each
 * belongs to. Tier-2 and Tier-3 features are off unless a host enables them, so
 * their fields never appear in the core corpus - `tests/corpus-optional` is
 * where those are exercised, through per-feature adapters.
 */
const OPT_IN_ONLY = {
  locator: 'citations (Tier-2)',
  locatorLabel: 'citations (Tier-2)',
  locatorValue: 'citations (Tier-2)',
  mode: 'citations (Tier-2): the integral `+` form',
  prefix: 'citations (Tier-2)',
  suffix: 'citations (Tier-2)',
  suppressAuthor: 'citations (Tier-2)',
  raw: 'citations (Tier-2): the undefined-key literal fallback',
  refId: 'index terms (Tier-3): the backlink target id',
  useIndex: 'index terms (Tier-3): the per-key use-site index',
}

const schema = JSON.parse(readFileSync(resolve(repo, 'resources/ast-schema.json'), 'utf8'))

const declaredFields = () => {
  const found = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (node.properties && typeof node.properties === 'object') {
      for (const key of Object.keys(node.properties)) found.add(key)
    }
    for (const value of Object.values(node)) walk(value)
  }
  walk(schema)
  return found
}

const producedFields = () => {
  const found = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      found.add(key)
      walk(value)
    }
  }
  const dir = resolve(repo, 'tests/corpus')
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.crv'))) {
    const source = readFileSync(resolve(dir, name), 'utf8')
    walk(toAstJson(resolveDoc(parse(source, { positions: true }))))
  }
  return found
}

test('every schema field is produced by a corpus document, or named as opt-in', () => {
  const declared = declaredFields()
  const produced = producedFields()
  assert.ok(declared.size > 50, `schema walk found only ${declared.size} fields`)

  const orphaned = [...declared]
    .filter((field) => !produced.has(field) && !(field in OPT_IN_ONLY))
    .sort()

  assert.deepEqual(
    orphaned,
    [],
    'field(s) the schema names that no corpus document produces: ' +
      `${orphaned.join(', ')}. Either the corpus is missing a case for it, or the ` +
      'field describes something the language does not have. If it belongs to an ' +
      'opt-in feature, add it to OPT_IN_ONLY with the feature name.',
  )
})

test('every opt-in exemption is still needed', () => {
  // An exemption is a claim that the core corpus cannot reach the field. When a
  // feature moves into the core, or a corpus case starts covering it, the entry
  // stops being true and turns into a hole in the check above.
  const produced = producedFields()
  const stale = Object.keys(OPT_IN_ONLY)
    .filter((field) => produced.has(field))
    .sort()

  assert.deepEqual(
    stale,
    [],
    `OPT_IN_ONLY names field(s) the corpus now produces: ${stale.join(', ')}. ` +
      'Remove the entry - the exemption is hiding a field that is covered.',
  )
})

test('every opt-in exemption names a field the schema still declares', () => {
  const declared = declaredFields()
  const unknown = Object.keys(OPT_IN_ONLY)
    .filter((field) => !declared.has(field))
    .sort()

  assert.deepEqual(
    unknown,
    [],
    `OPT_IN_ONLY names field(s) the schema no longer declares: ${unknown.join(', ')}.`,
  )
})
