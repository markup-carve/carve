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
 *   2. WHAT THE PINNED REFERENCE BUILD PRODUCES. This began as a rollout
 *      tripwire: no engine emitted the node, so the assertion recorded what
 *      the pin ACTUALLY produced - a paragraph holding the citation group and
 *      the literal `: ` separator - and was written to FAIL the day carve-js
 *      emitted the node. It fired when the pin moved past
 *      markup-carve/carve-js#1122, and the assertion is now the positive one:
 *      parse the corpus-optional citation document and find the three
 *      `citation_definition` nodes in it, schema-valid, with no paragraph left
 *      behind. A spec claim with no expiry is how the AST page has gone stale
 *      twice; this one had one, and it paid.
 *
 *      What does NOT follow from the rollout is the two exemptions that name
 *      this type: `NOT_PRODUCIBLE` in tests/ast-schema.test.mjs and
 *      `OPT_IN_ONLY` in tests/schema-fields-are-produced.test.mjs. Both are
 *      claims about the DEFAULT-profile corpus, where citations is off and
 *      `[@key]: entry` is ordinary paragraph text. An engine shipping §18 does
 *      not change that, so both entries stay.
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
  assert.ok(
    clause.startsWith('18. A CITATION DEFINITION IS A NODE -- NORMATIVE [CARVE-P12-037].'),
    'clause heading missing',
  )
  for (const field of ['key', 'children', 'attrs']) {
    assert.match(
      clause.slice(0, 900),
      new RegExp(`^\\s+${field}\\s`, 'm'),
      `PART 12 §18 does not name the "${field}" field the schema declares`,
    )
  }
})

/*
 * Everything above is about the shape; this is about where the fleet is
 * against it. It was a tripwire while the shape had no producer; it is a
 * conformance assertion now that the pin has one.
 */
const SOURCE = readFileSync(resolve(root, 'tests/corpus-optional/05-citations-numbered.crv'), 'utf8')

test('the pinned reference build emits the node', () => {
  // `parse` is the stage that matters: it is what `toAstJson` serializes, and
  // §3a makes the serialized tree the PRE-RESOLVE one. carve-js's own collect
  // pass runs in the citations extension's `afterParse` hook, which `parse`
  // does not call - so an engine implementing §18 has to build the node here
  // rather than in the hook, and markup-carve/carve-js#1122 is where it did.
  const tree = parse(SOURCE, { extensions: [citations()] })
  const defs = tree.children.filter((node) => node.type === 'citation_definition')
  assert.equal(defs.length, 3, 'the document has three bibliography lines, so it has three nodes')

  // The keys, in source order, and the metadata each line carries.
  assert.deepEqual(defs.map((node) => node.key), ['smith2020', 'jones2019', 'doe2021'])
  assert.deepEqual(defs.map((node) => node.attrs?.keyValues?.year), ['2020', '2019', '2021'])

  // The entry is INLINE content in `children`, not a field and not a block: the
  // emphasis in `*A Study*` has to survive as a node, or the entry is a string
  // a consumer would have to re-parse to render.
  const [smith] = defs
  assert.deepEqual(smith.children.map((node) => node.type), ['text', 'strong', 'text'])
  assert.equal(smith.children[1].children[0].value, 'A Study')

  // And every node the engine builds is a node the schema declares. This is the
  // join between the two layers: layer 1 proved the schema accepts the ruled
  // shape, this proves the pin produces that shape and not a near-miss.
  //
  // ALL THREE, not just the first. A pin that kept `smith` valid while emitting
  // a malformed `entry` for one of the others would still satisfy the key and
  // year assertions above, and this is the only layer that would have caught it.
  for (const node of defs) {
    assert.equal(validate(doc(node)), true, `the pinned build's ${node.key} node failed the schema: ${errors()}`)
  }

  // The definition renders nothing where it sits, so no paragraph is left
  // behind holding a citation group and the literal `: ` separator - the shape
  // this test recorded for as long as the node was unimplemented. Only the
  // prose paragraph cites.
  const citing = tree.children.filter(
    (node) => node.type === 'paragraph' && node.children.some((c) => c.type === 'citation_group'),
  )
  assert.equal(citing.length, 1)
  assert.ok(!citing[0].children.some((c) => c.type === 'text' && c.value.startsWith(': ')))
})
