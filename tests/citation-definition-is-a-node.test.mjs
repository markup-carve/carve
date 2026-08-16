/*
 * PART 12 §18: a `[@key]: entry` bibliography line is a `citation_definition`.
 *
 * WHY THE PIN IS HERE AND NOT IN tests/corpus.
 *
 * The corpus pins a document against its HTML, and HTML cannot see this. A
 * definition renders nothing where it sits: carve-php consumed the line at
 * parse time so it was not in the tree at all, carve-js left it as a paragraph
 * whose first child is a `citation_group` followed by the literal text
 * `: {author=`, and BOTH render the same references list. The two engines
 * published different documents for the same source for as long as the feature
 * has existed and every fixture agreed, because no fixture was looking at the
 * tree (carve#1276).
 *
 * So the assertions below are at the AST level, in two layers:
 *
 *   1. THE WIRE SHAPE, against `resources/ast-schema.json`. The ruled node is
 *      accepted and each near-miss is refused - a missing `key`, a block in
 *      `children`, the `label` field borrowed from §10's link reference
 *      definition, an `entry` field nothing declares. This is the same family
 *      as the §14/§15/§17 shape tests in tests/ast-schema.test.mjs, and it is
 *      the layer that can fail today: edit any part of the schema entry and
 *      one of these flips.
 *
 *   2. A ROLLOUT TRIPWIRE on the pinned reference build. No engine emits the
 *      node yet, so the positive assertion - parse the corpus-optional
 *      citation document and find a `citation_definition` in it - cannot be
 *      written without turning this repo red on a defect that lives elsewhere.
 *      What is written instead is what the pin ACTUALLY produces today, so the
 *      day carve-js emits the node this test fails and the pin flips to the
 *      positive form. A spec claim with no expiry is how the AST page has gone
 *      stale twice; this one has one.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse, citations } from '@markup-carve/carve'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)

const errors = () =>
  (validate.errors ?? [])
    .slice(0, 4)
    .map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`)
    .join('; ')

const pos = { startLine: 3, endLine: 3, startColumn: 1, endColumn: 78, startOffset: 72, endOffset: 149 }

/** The node PART 12 §18 describes, for the corpus-optional document's third line. */
const ruled = {
  type: 'citation_definition',
  key: 'smith2020',
  attrs: { keyValues: { author: 'Smith', year: '2020' } },
  children: [{ type: 'text', value: 'Smith, J. (2020). ', pos }],
  pos,
}

const doc = (...children) => ({ type: 'document', srcByteLength: 150, children })

test('§18: the ruled citation definition is a valid document child', () => {
  assert.equal(validate(doc(ruled)), true, errors())
})

test('§18: the entry field is required, its contents are not', () => {
  // The opposite of §10's `href`, where an empty destination means the line was
  // never a definition in the first place. Nothing here says an empty entry is
  // what any particular source spells - the production requires a space after
  // `]:` and the pinned build accepts a line without one, which §18 leaves
  // open. A schema refusing the empty array would decide it by accident.
  assert.equal(validate(doc({ ...ruled, children: [] })), true, errors())
})

test('§18: the metadata block is optional', () => {
  const { attrs, ...withoutMetadata } = ruled
  assert.equal(validate(doc(withoutMetadata)), true, errors())
})

test('§18: the near-misses are refused', () => {
  const refuses = (why, node) =>
    assert.equal(validate(doc(node)), false, `the schema accepted ${why}`)

  const { key, ...withoutKey } = ruled
  refuses('a definition with no key', withoutKey)

  const { children, ...withoutChildren } = ruled
  refuses('a definition with no entry field at all', withoutChildren)

  refuses('a non-string key', { ...ruled, key: 12 })

  // The entry is INLINE content. A footnote body holds blocks and this does
  // not, which is the whole reason §18 is shaped after §10 rather than after
  // the footnote definition.
  refuses('a block inside the entry', {
    ...ruled,
    children: [{ type: 'paragraph', children: [], pos }],
  })

  // §10's field name for the same slot. Publishing both spellings for one
  // construct is the divergence §1 exists to stop, so only one may validate.
  refuses('the link-definition spelling of the key', {
    type: 'citation_definition',
    label: 'smith2020',
    children: [],
    pos,
  })

  refuses('an undeclared field carrying the entry', { ...ruled, entry: 'Smith, J.' })
})

test('§18: a citation definition is a block, not an inline', () => {
  assert.equal(
    validate(doc({ type: 'paragraph', children: [ruled], pos })),
    false,
    'the schema accepted a citation definition inside a paragraph',
  )
})

test('§18: the schema declares exactly the fields the clause names', () => {
  // The clause and the schema are one contract written twice. A field added to
  // either alone is the drift PART 12 §3 calls spec surface, and it is
  // invisible until two engines disagree at runtime.
  const declared = schema.$defs.citation_definition
  assert.deepEqual(Object.keys(declared.properties).sort(), ['attrs', 'children', 'key', 'pos', 'type'])
  assert.deepEqual([...declared.required].sort(), ['children', 'key', 'type'])
  assert.equal(declared.additionalProperties, false)

  const clause = grammar.slice(grammar.indexOf('18. A CITATION DEFINITION IS A NODE'))
  assert.ok(clause.startsWith('18. A CITATION DEFINITION IS A NODE -- NORMATIVE.'), 'clause heading missing')
  for (const field of ['key', 'children', 'attrs']) {
    assert.match(
      clause.slice(0, 900),
      new RegExp(`^\\s+${field}\\s`, 'm'),
      `PART 12 §18 does not name the "${field}" field the schema declares`,
    )
  }
})

/*
 * The tripwire. Everything above is about the shape; this is about where the
 * fleet is against it.
 */
const SOURCE = readFileSync(resolve(root, 'tests/corpus-optional/05-citations-numbered.crv'), 'utf8')

test('the pinned reference build does not emit the node yet', () => {
  // `parse` is the stage that matters: it is what `toAstJson` serializes, and
  // §3a makes the serialized tree the PRE-RESOLVE one. carve-js's own collect
  // pass runs in the citations extension's `afterParse` hook, which `parse`
  // does not call - so the definition line survives into the published tree as
  // the paragraph below, and an engine implementing §18 has to build the node
  // here rather than in the hook.
  const tree = parse(SOURCE, { extensions: [citations()] })
  const types = tree.children.map((node) => node.type)
  assert.ok(
    !types.includes('citation_definition'),
    'carve-js now emits citation_definition: PART 12 §18 has shipped in the pin, so replace this ' +
      'test with the positive assertion - the definition lines are citation_definition nodes with ' +
      'their key, entry and metadata - and drop citation_definition from NOT_PRODUCIBLE in ' +
      'tests/ast-schema.test.mjs and from OPT_IN_ONLY in tests/schema-fields-are-produced.test.mjs.',
  )

  // What it emits instead, recorded so the gap is a measurement rather than a
  // sentence: the definition lines survive as one paragraph whose first child
  // is the citation group and whose next child is the literal `: ` separator.
  const last = tree.children[tree.children.length - 1]
  assert.equal(last.type, 'paragraph')
  assert.equal(last.children[0].type, 'citation_group')
  assert.equal(last.children[0].items[0].key, 'smith2020')
  assert.match(last.children[1].value, /^: /)
})
