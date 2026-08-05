/*
 * Every field the AST schema names is produced by at least one corpus document,
 * ON THE TYPE THAT DECLARES IT.
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
 * PER TYPE, because per NAME was not enough. This check used to collect every
 * field name appearing anywhere in the produced trees into one set, so a name
 * produced by ONE type covered every other type that declared it - and an
 * attribute key or a `pos` component counted too. `refId` slipped through
 * exactly that way (carve#749): declared on `footnote_ref` and
 * `inline_footnote`, produced by neither, and exempted with the reason "index
 * terms (Tier-3)" - a feature the schema has no type for at all. The reason
 * being free text is why nobody noticed the entry did not describe the field it
 * excused.
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
 *
 * Keyed `<type>.<field>`, or `<type>.*` when the whole type is unproduced and
 * every field goes with it. The granularity is the fix for the reason above: an
 * entry now says which TYPE's promise it is excusing, so it cannot quietly
 * excuse a different one.
 */
const OPT_IN_ONLY = {
  'citation.*': 'citations (Tier-2): the citation item shape, including its resolution results',
  'citation_group.*': 'citations (Tier-2): the group wrapper and the integral `+` form',
  'link_reference_definition.*':
    'the reference engine does not emit the node yet (carve-js#690), so none of its ' +
    'fields can appear; carve-php does emit it',
}

/**
 * `attrs` and `pos` are shared `$ref`s every node may carry. They are not a
 * promise an individual type makes, and the corpus attaches attributes to about
 * half the vocabulary - listing the other half as orphans would bury real
 * findings under noise no fix would ever clear.
 */
const UNIVERSAL_FIELDS = new Set(['attrs', 'pos'])

const schema = JSON.parse(readFileSync(resolve(repo, 'resources/ast-schema.json'), 'utf8'))

/**
 * Declared fields, keyed by the type that declares them.
 *
 * A `$defs` entry that pins `type` is keyed by that type. One that does not -
 * `attrs`, `pos`, `citation` - has no `type` on the wire, so an instance cannot
 * be attributed to it; those are keyed by their `$defs` name and their fields
 * are looked for ANYWHERE, which is the old behavior kept only where per-type
 * attribution is impossible.
 */
function declaredFields() {
  const byType = new Map()
  const anywhere = new Map()
  for (const [name, def] of Object.entries(schema.$defs)) {
    const properties = def.properties
    if (!properties) continue
    const own = Object.keys(properties).filter(
      (key) => key !== 'type' && !UNIVERSAL_FIELDS.has(key),
    )
    if (own.length === 0) continue
    const constant = properties.type?.const
    const target = constant ? byType : anywhere
    const label = constant ?? name
    target.set(label, new Set([...(target.get(label) ?? []), ...own]))
  }

  return { byType, anywhere }
}

/**
 * What the corpus produces, at BOTH stages.
 *
 * PART 12 §3a describes the pre-resolve tree and a consumer receives the
 * resolved one, so a field produced at either stage has a producer. Resolution
 * results (`number`, `caption_number.n`, `heading_ref.href`) exist only after
 * resolve; `ref` and `rawRef` only before it.
 */
function producedFields() {
  const byType = new Map()
  const anywhere = new Set()
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (typeof node.type === 'string') {
      let own = byType.get(node.type)
      if (!own) {
        own = new Set()
        byType.set(node.type, own)
      }
      for (const key of Object.keys(node)) if (key !== 'type') own.add(key)
    }
    for (const [key, value] of Object.entries(node)) {
      anywhere.add(key)
      walk(value)
    }
  }
  const dir = resolve(repo, 'tests/corpus')
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.crv'))) {
    const source = readFileSync(resolve(dir, name), 'utf8')
    const parsed = parse(source, { positions: true })
    walk(toAstJson(parsed))
    walk(toAstJson(resolveDoc(parse(source, { positions: true }))))
  }

  return { byType, anywhere }
}

/** Every promise the schema makes, as `<type>.<field>`. */
function orphanedPromises() {
  const declared = declaredFields()
  const produced = producedFields()
  const orphans = []
  for (const [type, fields] of declared.byType) {
    const seen = produced.byType.get(type)
    for (const field of fields) {
      if (seen?.has(field)) continue
      // A type nothing produces is one finding, not one per field: the
      // type-level gate in tests/ast-schema.test.mjs owns it.
      orphans.push(seen ? `${type}.${field}` : `${type}.*`)
    }
  }
  for (const [name, fields] of declared.anywhere) {
    for (const field of fields) {
      if (!produced.anywhere.has(field)) orphans.push(`${name}.*`)
    }
  }

  return [...new Set(orphans)].sort()
}

test('every schema field is produced by a corpus document, or named as opt-in', () => {
  const declared = declaredFields()
  assert.ok(
    declared.byType.size > 40,
    `schema walk found only ${declared.byType.size} types with fields`,
  )

  const orphaned = orphanedPromises().filter((key) => !(key in OPT_IN_ONLY))

  assert.deepEqual(
    orphaned,
    [],
    'promise(s) the schema makes that no corpus document keeps: ' +
      `${orphaned.join(', ')}. Either the corpus is missing a case, or the field ` +
      'describes something the language does not have. If it belongs to an opt-in ' +
      'feature, add it to OPT_IN_ONLY keyed by the TYPE that declares it.',
  )
})

test('every opt-in exemption is still needed', () => {
  // An exemption is a claim that the core corpus cannot reach the field. When a
  // feature moves into the core, or a corpus case starts covering it, the entry
  // stops being true and turns into a hole in the check above.
  const orphans = new Set(orphanedPromises())
  const stale = Object.keys(OPT_IN_ONLY)
    .filter((key) => !orphans.has(key))
    .sort()

  assert.deepEqual(
    stale,
    [],
    `OPT_IN_ONLY names promise(s) the corpus now keeps: ${stale.join(', ')}. ` +
      'Remove the entry - the exemption is hiding a field that is covered.',
  )
})

test('every opt-in exemption names a type the schema still declares', () => {
  const declared = declaredFields()
  const known = new Set([...declared.byType.keys(), ...declared.anywhere.keys()])
  const unknown = Object.keys(OPT_IN_ONLY)
    .filter((key) => !known.has(key.slice(0, key.lastIndexOf('.'))))
    .sort()

  assert.deepEqual(
    unknown,
    [],
    `OPT_IN_ONLY names type(s) the schema no longer declares: ${unknown.join(', ')}.`,
  )
})
