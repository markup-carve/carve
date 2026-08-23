/*
 * A definition list's SPELLED looseness is a published field, because nothing
 * else in the tree can carry it (carve#1624).
 *
 * PART 9 §17 L7 gave both containers with a tight/loose axis one consumed
 * boolean. The LIST half round-trips for free: `list.tight` is a required field
 * and the key sets it false. The DEFINITION LIST half had nowhere to land - the
 * `<dd>` wrapper is derived from the description's block count, and that
 * derivation cannot see the one shape the key exists for, since a blank line
 * between two ENTRIES does not loosen a `<dl>` at all.
 *
 * So the two spellings below render DIFFERENT HTML out of an IDENTICAL block
 * structure. That is the whole finding, and it is what the field answers: PART
 * 12 §8 gives `definition_list` an optional `loose: true`, published only where
 * the looseness was spelled, since everything else about a `<dl>`'s wrapping is
 * derivable and §8 does not publish derivable facts.
 *
 * WHY `loose` AND NOT `tight`. A `tight` field would be absent on almost every
 * definition list, and an absent boolean read as false says LOOSE - the
 * opposite of the default, in the one place a consumer is most likely to write
 * `if (node.tight)`. `const: true` has no such reading, and it is the shape
 * `list.bareMarker` already uses for an authored distinction the default
 * spelling cannot express.
 *
 * The oracle is the measurement here rather than an engine, for the reason the
 * corpus test gives: the spec repo proves its own fixtures without waiting for
 * an implementation to ship a rule. No engine has shipped L7 at all yet, which
 * is why `definition_list.loose` is declared in
 * `tests/schema-fields-are-produced.test.mjs` as engine-rollout-pending.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(repo, 'resources/ast-schema.json'), 'utf8'))
const grammar = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')

const DERIVED = ':: Term\n:  Definition.\n'
const SPELLED = '{loose}\n:: Term\n:  Definition.\n'

/**
 * Everything a `definition_list` publishes EXCEPT the looseness field.
 *
 * An `undefined` value goes too, and for the same reason the comparison is
 * meaningful at all: `JSON.stringify` omits an undefined property, so it cannot
 * carry a distinction on the wire. The oracle spells "this container ended up
 * with no attributes" as `battrs: undefined` after consuming the key, and that
 * is exactly the kind of difference a serialized tree does not have.
 */
const publishedContent = (node) => {
  if (Array.isArray(node)) return node.map(publishedContent)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loose' || value === undefined) continue
      out[key] = publishedContent(value)
    }
    return out
  }
  return node
}

test('the two spellings of a one-block description render differently', () => {
  const derived = renderDoc(parse(DERIVED))
  const spelled = renderDoc(parse(SPELLED))
  assert.equal(derived, '<dl>\n  <dt>Term</dt>\n  <dd>Definition.</dd>\n</dl>')
  assert.equal(spelled, '<dl>\n  <dt>Term</dt>\n  <dd><p>Definition.</p></dd>\n</dl>')
  assert.notEqual(derived, spelled)
})

test('and nothing but the looseness separates their trees', () => {
  /* The load-bearing measurement. Strip the field and the two documents are one
   * tree - same terms, same descriptions, same block counts - so an encoder
   * that does not publish it maps two documents onto one AST, and PART 12 §6's
   * round trip cannot come back to the source it started from. */
  assert.deepEqual(publishedContent(parse(SPELLED)), publishedContent(parse(DERIVED)))
})

test('the list half needs no new field, which is why only one was added', () => {
  /* `tight` is required on `list` and states the whole axis, so L7 sets it and
   * the round trip already holds. The asymmetry between the two containers is
   * deliberate rather than an oversight. */
  assert.equal(parse('- Note text.\n').blocks[0].tight, true)
  assert.equal(parse('{loose}\n- Note text.\n').blocks[0].tight, false)
  assert.ok(schema.$defs.list.required.includes('tight'))
})

test('the schema publishes the spelled fact, and only as a spelled fact', () => {
  const field = schema.$defs.definition_list.properties.loose
  assert.ok(field, 'PART 12 §8 gives definition_list a `loose` field')
  assert.equal(
    field.const,
    true,
    'const true, so an ABSENT field is unambiguous: a boolean read as false would say loose, which is the opposite of the default',
  )
  assert.ok(
    !schema.$defs.definition_list.required.includes('loose'),
    'optional - requiring it would break every serialized tree written before this clause',
  )
  assert.ok(
    !('tight' in schema.$defs.definition_list.properties),
    'no `tight` twin on a definition list: its wrapping is derived, and only the underivable half is published',
  )
})

test('both clauses say it, and L7 no longer says the opposite', () => {
  assert.match(grammar, /`definition_list` *\n? *MAY carry `loose: true`/)
  assert.match(grammar, /A loosened DEFINITION LIST sets `definition_list\.loose`/)
  assert.doesNotMatch(grammar, /THE DEFINITION-LIST HALF HAS NO AST FIELD YET/)
})
