/*
 * The layout oracle still exposes the 1.2 `tight` and `loose` fields. These
 * controls preserve its rendering measurement while the 2.0 schema requires
 * `spacing` on both list kinds (carve#1624, carve#3598).
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

test('the 2.0 list and definition list record spacing explicitly', () => {
  /* `tight` is required on `list` and states the whole axis, so L7 sets it and
   * the round trip already holds. The asymmetry between the two containers is
   * deliberate rather than an oversight. */
  assert.equal(parse('- Note text.\n').blocks[0].tight, true)
  assert.equal(parse('{loose}\n- Note text.\n').blocks[0].tight, false)
  assert.ok(schema.$defs.list.required.includes('spacing'))
  assert.ok(schema.$defs.definition_list.required.includes('spacing'))
  assert.deepEqual(schema.$defs.list.properties.spacing.enum, ['tight', 'loose'])
  assert.deepEqual(schema.$defs.definition_list.properties.spacing.enum, ['tight', 'loose'])
})

test('the 2.0 schema removes the old looseness fields', () => {
  assert.ok(!('loose' in schema.$defs.definition_list.properties))
  assert.ok(!('tight' in schema.$defs.list.properties))
})

test('PART 12 states the 2.0 spacing field', () => {
  assert.match(grammar, /`definition_list\.spacing`/)
  assert.match(grammar, /`list`[^\n]*`spacing`/)
})
