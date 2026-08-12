/*
 * The published AST schema, checked against the reference engine.
 *
 * PART 12 makes the serialized AST an interchange format: field names and node
 * types are spec surface, and "a consumer written against one implementation
 * MUST be able to read another's output". Until now that contract lived only in
 * prose plus a golden fixture inside carve-php - one implementation owning the
 * shape every implementation is measured against, which is how the engines'
 * field names diverged in the first place.
 *
 * `resources/ast-schema.json` is that contract as data. This file is what keeps
 * it honest, in three directions:
 *
 *   1. the reference engine's output validates against it, over the whole
 *      corpus - so the schema cannot describe a shape nothing produces;
 *   2. every node type the reference emits is DECLARED - so a new node type
 *      cannot ship without landing in the schema;
 *   3. deliberately malformed documents are REJECTED - so a schema that
 *      accidentally permits everything fails here rather than passing quietly.
 *
 * Point 3 is not ceremony. A JSON Schema with a typo in a keyword name
 * (`additionalProperty`, `require`) validates every input, and a suite that only
 * feeds it valid documents reports that as success.
 *
 * The engine is the `@markup-carve/carve` pin in package.json. `CARVE_JS_DIR`
 * points at a local carve-js checkout instead, the same override
 * `scripts/ast-conformance.mjs` uses, for checking an engine change before the
 * pin moves to it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: true })
const validate = ajv.compile(schema)

test('source layout is a separate closed versioned sidecar', () => {
  const layoutSchema = JSON.parse(readFileSync(resolve(root, 'resources/ast-source-layout-schema.json'), 'utf8'))
  const validateLayout = new Ajv2020({ strict: true }).compile(layoutSchema)
  const layout = { version: 1, encoding: 'utf-8', source: '- a\r\n', lineEndings: 'crlf', bom: false,
    nodes: [{ path: '/children/0', startByte: 0, endByte: 3, markerRaw: '-', markerColumn: 1, contentColumn: 3 }] }
  assert.equal(validateLayout(layout), true, JSON.stringify(validateLayout.errors))
  assert.equal(validateLayout({ ...layout, version: 2 }), false)
  assert.equal(validateLayout({ ...layout, unknown: true }), false)
  assert.equal(validate({ type: 'document', children: [], srcByteLength: 0, sourceLayout: {} }), false)
})

test('figures and tables accept an optional structural short caption', () => {
  const pos = { startLine: 1, endLine: 1, startColumn: 1, endColumn: 2, startOffset: 0, endOffset: 1 }
  const shortCaption = [{ type: 'text', value: 'Navigation label', pos }]
  const image = { type: 'image', src: '/x.png', alt: 'x', pos }
  const figure = { type: 'figure', target: image, caption: [], shortCaption, pos }
  const table = { type: 'table', rows: [], shortCaption, pos }
  assert.equal(validate({ type: 'document', children: [figure, table], srcByteLength: 1 }), true, firstErrors())
  assert.equal(validate({ type: 'document', children: [{ ...figure, shortCaption: 'label' }], srcByteLength: 1 }), false)
})

test('shared source-layout fixtures validate', () => {
  const layoutSchema = JSON.parse(readFileSync(resolve(root, 'resources/ast-source-layout-schema.json'), 'utf8'))
  const validateLayout = new Ajv2020({ strict: true }).compile(layoutSchema)
  const fixtures = JSON.parse(readFileSync(resolve(root, 'resources/ast-source-layout-fixtures.json'), 'utf8'))
  for (const fixture of fixtures.exact) assert.equal(validateLayout(fixture.layout), true, fixture.name)
  for (const fixture of fixtures.sourceFacts) {
    const layout = { version: 1, encoding: 'utf-8', source: fixture.source,
      lineEndings: fixture.lineEndings, bom: fixture.bom, nodes: [] }
    assert.equal(validateLayout(layout), true, fixture.name)
  }
})

/** The reference build: the package pin, or a checkout named by CARVE_JS_DIR. */
const jsDir = process.env.CARVE_JS_DIR
const lib = await import(jsDir ? resolve(jsDir, 'dist/index.js') : '@markup-carve/carve')

const corpusDir = resolve(root, 'tests/corpus')
const corpus = readdirSync(corpusDir)
  .filter((f) => f.endsWith('.crv'))
  .sort()
  .map((f) => ({ name: f, source: readFileSync(resolve(corpusDir, f), 'utf8') }))

/** Every node type the schema declares, i.e. every `$defs` entry pinning `type`. */
function declaredTypes() {
  const types = new Set()
  for (const def of Object.values(schema.$defs)) {
    const constant = def.properties?.type?.const
    if (typeof constant === 'string') types.add(constant)
  }
  return types
}

/** Walk a serialized document, yielding every object carrying a `type`. */
function* walk(node) {
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child)
    return
  }
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string') yield node
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'pos') yield* walk(value)
  }
}

/*
 * TWO STAGES, both spec surface, and this file used to see only the first.
 *
 * PART 12 §3a describes the PRE-RESOLVE tree - an unresolved reference is a link
 * node carrying `ref` and `rawRef`, fields the schema says are "present only
 * between parse and resolve". The RESOLVED tree is what a consumer actually
 * receives, and it is the one scripts/ast-conformance.mjs measures, deliberately
 * (carve#486: a `ref` surviving into the reference AST means the AST was taken
 * before resolve).
 *
 * Checking only `parse()` meant every resolution result was unvalidated here:
 * `caption_number.n`, `footnote_ref.number`, `inline_footnote.number` and
 * `heading_ref.href` do not exist at that stage, so the schema's description of
 * them was never measured against anything. Checking only `resolve()` would drop
 * §3a's fields the other way. So: validate both, and count a type or field as
 * produced if EITHER stage produces it.
 */
function serialize(source) {
  return lib.toAstJson(lib.parse(source))
}

function serializeResolved(source) {
  return lib.toAstJson(
    typeof lib.resolve === 'function' ? lib.resolve(lib.parse(source)) : lib.parse(source),
  )
}

/** Both stages of one document, for the checks that are about coverage. */
function bothStages(source) {
  return [serialize(source), serializeResolved(source)]
}

function firstErrors(n = 4) {
  return (validate.errors ?? [])
    .slice(0, n)
    .map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`)
    .join('; ')
}

test('the reference engine exposes the serializer PART 12 describes', () => {
  assert.equal(
    typeof lib.toAstJson,
    'function',
    'the pinned reference build has no toAstJson - the pin predates PART 12 serialization',
  )
})

test('the corpus is non-trivial', () => {
  assert.ok(corpus.length > 400, `corpus looks truncated: ${corpus.length} documents`)
})

test('every corpus document serializes to a schema-valid AST', () => {
  const failures = []
  for (const { name, source } of corpus) {
    if (!validate(serialize(source))) failures.push(`${name} (parse): ${firstErrors()}`)
    if (!validate(serializeResolved(source))) failures.push(`${name} (resolved): ${firstErrors()}`)
  }
  assert.deepEqual(failures.slice(0, 8), [], `${failures.length} documents fail the schema`)
})

test('every node type the reference emits is declared in the schema', () => {
  const declared = declaredTypes()
  const seen = new Set()
  for (const { source } of corpus) {
    for (const tree of bothStages(source)) for (const node of walk(tree)) seen.add(node.type)
  }
  const undeclared = [...seen].filter((t) => !declared.has(t)).sort()
  assert.deepEqual(undeclared, [], `node types emitted but not in the schema: ${undeclared.join(', ')}`)
})

/*
 * Node types the schema declares that NO default-profile corpus document can
 * produce, and why. The mirror of `tests/schema-fields-are-produced.test.mjs`,
 * which asks the same question one level down and is the reason this gap was
 * visible at all: a declared FIELD without a producer fails there, while a
 * declared NODE TYPE without one passed everything.
 *
 * That is not a hypothetical either. `link_reference_definition` was added to
 * the vocabulary by carve#715 precisely so a writer could reproduce a
 * definition; carve-php emits it, the reference engine does not emit it at all,
 * and every gate stayed green - the type is declared, nothing invalid is
 * produced, and the direction that would have caught it was only checked for
 * fields.
 */
const NOT_PRODUCIBLE = {
  citation_group: 'citations (Tier-2) - off in a default-profile run, exercised by tests/corpus-optional',
}

test('every node type the schema declares is produced by a corpus document, or named as unproducible', () => {
  const seen = new Set()
  for (const { source } of corpus) {
    for (const tree of bothStages(source)) for (const node of walk(tree)) seen.add(node.type)
  }
  const missing = [...declaredTypes()]
    .filter((type) => !seen.has(type) && !(type in NOT_PRODUCIBLE))
    .sort()
  assert.deepEqual(
    missing,
    [],
    `the schema declares node type(s) no corpus document produces: ${missing.join(', ')}. ` +
      'A declared type with no producer is either dead or unimplemented, and the schema ' +
      'cannot tell those apart. Add a corpus document, or name it in NOT_PRODUCIBLE with the reason.',
  )
})

test('every unproducible exemption is still needed', () => {
  const seen = new Set()
  for (const { source } of corpus) {
    for (const tree of bothStages(source)) for (const node of walk(tree)) seen.add(node.type)
  }
  const stale = Object.keys(NOT_PRODUCIBLE).filter((type) => seen.has(type)).sort()
  assert.deepEqual(
    stale,
    [],
    `NOT_PRODUCIBLE names node type(s) the corpus now produces: ${stale.join(', ')}. ` +
      'Delete the entry so the type is gated like every other one.',
  )
})

test('every unproducible exemption names a type the schema still declares', () => {
  const declared = declaredTypes()
  const unknown = Object.keys(NOT_PRODUCIBLE).filter((type) => !declared.has(type)).sort()
  assert.deepEqual(
    unknown,
    [],
    `NOT_PRODUCIBLE names node type(s) the schema no longer declares: ${unknown.join(', ')}.`,
  )
})

test('every type the schema declares is either in the vocabulary or listed as not deniable', () => {
  // profiles.md answers "what can a profile deny", which is a SMALLER set than
  // "what appears in the tree" - and it says so in its own words. The schema may
  // not quietly grow a type outside both lists: that is how a node type ships
  // without anyone deciding whether a host can restrict it.
  const profiles = readFileSync(resolve(root, 'docs/profiles.md'), 'utf8')
  const vocabulary = new Set()
  for (const label of ['Block', 'Inline']) {
    const section = profiles.match(new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)\\n\\n`))
    assert.ok(section, `no ${label} vocabulary paragraph in docs/profiles.md`)
    for (const m of section[1].matchAll(/`([a-z_]+)`/g)) vocabulary.add(m[1])
  }
  // Stated in profiles.md under "The AST has more node types than a profile can
  // deny", and repeated in scripts/ast-conformance.mjs.
  const notDeniable = [
    'document',
    'smart_punctuation',
    'literal_inline',
    'tag',
    'abbreviation_def',
    // A definition line renders nothing in HTML, so denying it would not keep
    // anything off the page - the link or image it feeds is the deniable node.
    // Same argument as abbreviation_def, one definition kind over (carve#642).
    'link_reference_definition',
  ]
  for (const type of notDeniable) {
    assert.match(
      profiles,
      new RegExp(`\`${type}\``),
      `"${type}" is exempt from the vocabulary, so profiles.md has to name it as such`,
    )
  }
  const stray = [...declaredTypes()]
    .filter((t) => !vocabulary.has(t) && !notDeniable.includes(t))
    .sort()
  assert.deepEqual(stray, [], `schema declares types no list accounts for: ${stray.join(', ')}`)
})

test('every declared type is snake_case', () => {
  for (const type of declaredTypes()) {
    assert.match(type, /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, `"${type}" is not snake_case`)
  }
})

/*
 * Rejection cases. Each one is a real divergence an engine has shipped or a
 * class the spec calls out by name, so a schema that stops catching it is a
 * schema that stopped being worth publishing.
 */
const REJECTED = [
  {
    why: 'a root field beyond the three PART 12 section 7 allows',
    doc: { type: 'document', children: [], srcByteLength: 0, footnoteDefs: {} },
  },
  {
    why: 'a root missing srcByteLength',
    doc: { type: 'document', children: [] },
  },
  {
    why: 'an unknown node type',
    doc: { type: 'document', children: [{ type: 'callout', children: [] }], srcByteLength: 0 },
  },
  {
    why: 'a hyphenated type identifier (carve-php shipped `citation-group`)',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [{ type: 'paragraph', children: [{ type: 'critic-comment', text: 'x' }] }],
    },
  },
  {
    why: 'a synonym for a spec field name (`destination` for a link `href`)',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [
        { type: 'paragraph', children: [{ type: 'link', destination: '/a', children: [] }] },
      ],
    },
  },
  {
    why: 'a footnote definition spelled `id` rather than `label` (PART 12 section 7)',
    doc: { type: 'document', srcByteLength: 0, children: [{ type: 'footnote', id: 'a', children: [] }] },
  },
  {
    why: 'frontmatter published as a parsed mapping instead of raw text',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [{ type: 'frontmatter', format: 'yaml', content: { title: 'x' } }],
    },
  },
  {
    why: 'a partial pos - six fields or none',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [{ type: 'thematic_break', pos: { startLine: 1, endLine: 1 } }],
    },
  },
  {
    why: 'a 0-based line in pos (PART 12 section 4 makes lines 1-based)',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [
        {
          type: 'thematic_break',
          pos: { startLine: 0, endLine: 0, startColumn: 1, endColumn: 1, startOffset: 0, endOffset: 0 },
        },
      ],
    },
  },
  {
    why: 'an inline node in block position',
    doc: { type: 'document', srcByteLength: 0, children: [{ type: 'text', value: 'x' }] },
  },
  {
    why: 'a block node in inline position',
    doc: {
      type: 'document',
      srcByteLength: 0,
      children: [{ type: 'paragraph', children: [{ type: 'heading', level: 1, children: [] }] }],
    },
  },
  {
    why: 'a heading level outside 1-6',
    doc: { type: 'document', srcByteLength: 0, children: [{ type: 'heading', level: 7, children: [] }] },
  },
]

for (const { why, doc } of REJECTED) {
  test(`the schema rejects ${why}`, () => {
    assert.equal(validate(doc), false, `expected a violation, got none for ${JSON.stringify(doc)}`)
  })
}

test('the schema accepts a minimal document', () => {
  // The mirror of the rejection block: a validator that rejects EVERYTHING would
  // pass every test above.
  assert.ok(
    validate({ type: 'document', children: [], srcByteLength: 0 }),
    `an empty document must validate: ${firstErrors()}`,
  )
})

/*
 * PART 12 section 12(d): THE SCHEMA IS THE INGEST RULE (carve#881).
 *
 * The clause says an ingest validates the WHOLE payload against this file -
 * types and required fields together, refused at decode. That is only a rule
 * if the schema actually rejects the shapes it is supposed to, so each row
 * below is asserted rather than assumed. It reads as a restatement of the
 * schema, and that is the point: nothing else notices when a constraint is
 * relaxed, and a relaxed constraint turns the clause into a no-op in three
 * engines at once without any of them changing.
 *
 * Every row is one line of the divergence table on carve#881, where each of
 * them was answered at least two ways by engines that had already agreed on
 * (a), (b) and (c). The schema was measured to reject all sixteen before the
 * clause was written; it needed no tightening, which is why the clause could
 * be one sentence.
 */

const INGEST_POS = {
  startLine: 1,
  endLine: 1,
  startColumn: 1,
  endColumn: 2,
  startOffset: 0,
  endOffset: 1,
}
const ingestDoc = () => ({
  type: 'document',
  srcByteLength: 2,
  children: [
    {
      type: 'paragraph',
      pos: { ...INGEST_POS },
      children: [{ type: 'text', value: 'x', pos: { ...INGEST_POS } }],
    },
  ],
})

/** The sixteen payloads section 12(d) refuses, each built from a valid one. */
const INGEST_REFUSED = {
  'a root srcByteLength of the wrong type': () => {
    const d = ingestDoc()
    d.srcByteLength = '2'
    return d
  },
  'a negative root srcByteLength': () => {
    const d = ingestDoc()
    d.srcByteLength = -1
    return d
  },
  'root children of the wrong type': () => {
    const d = ingestDoc()
    d.children = 'x'
    return d
  },
  'root children of null': () => {
    const d = ingestDoc()
    d.children = null
    return d
  },
  'a node missing type': () => {
    const d = ingestDoc()
    delete d.children[0].type
    return d
  },
  'a node type that is not a string': () => {
    const d = ingestDoc()
    d.children[0].type = 7
    return d
  },
  'a paragraph missing children': () => {
    const d = ingestDoc()
    delete d.children[0].children
    return d
  },
  'a text node missing value': () => {
    const d = ingestDoc()
    delete d.children[0].children[0].value
    return d
  },
  // The defect the clause was written to close: carve-php rendered <p>7</p>.
  'a text value that is a number': () => {
    const d = ingestDoc()
    d.children[0].children[0].value = 7
    return d
  },
  'a child that is null': () => {
    const d = ingestDoc()
    d.children[0].children = [null]
    return d
  },
  'a child that is a string': () => {
    const d = ingestDoc()
    d.children[0].children = ['x']
    return d
  },
  // The one a producer will actually write: `class` is what the HTML calls it.
  'attrs spelled class': () => {
    const d = ingestDoc()
    d.children[0].attrs = { class: 'x' }
    return d
  },
  'attrs carrying an unnamed key beside keyValues': () => {
    const d = ingestDoc()
    d.children[0].attrs = { keyValues: { a: 'b' }, bogus: 1 }
    return d
  },
  'attrs of the wrong type': () => {
    const d = ingestDoc()
    d.children[0].attrs = 'x'
    return d
  },
  'a pos carrying an extra key': () => {
    const d = ingestDoc()
    d.children[0].pos.extra = 1
    return d
  },
  'a pos missing endOffset': () => {
    const d = ingestDoc()
    delete d.children[0].pos.endOffset
    return d
  },
}

for (const [what, build] of Object.entries(INGEST_REFUSED)) {
  test(`section 12(d): the schema refuses ${what}`, () => {
    assert.equal(
      validate(build()),
      false,
      `the schema accepts ${what}, so section 12(d) refuses nothing for it`,
    )
  })
}

test('section 12(d): the payload the sixteen are built from is itself accepted', () => {
  // Without this every row above would still pass if the BASE document were
  // invalid - sixteen rejections of a document that was never valid, and a
  // clause that appeared enforced while testing nothing. Same shape as the
  // opt-in trap one module over (carve#755).
  assert.ok(validate(ingestDoc()), `the base document must validate: ${firstErrors()}`)
})

test('section 12(d) does NOT reach a srcByteLength that is merely wrong', () => {
  // (a) is about the field's PRESENCE and (d) about its TYPE. The value is
  // derivable and nothing in the tree depends on it, so all three engines
  // ignore it - a row the clause deliberately leaves alone, pinned so that
  // tightening the schema cannot quietly annex it.
  const d = ingestDoc()
  d.srcByteLength = 99999
  assert.ok(validate(d), `a wrong-but-present srcByteLength must still validate: ${firstErrors()}`)
})
