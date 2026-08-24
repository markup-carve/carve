/*
 * PART 11 §1c: a wrapper its own content spells away is a declared ceiling.
 *
 * Where a block's whole content is a single node whose own spelling, at that
 * block's column, is read back as a block opener of the node's kind, the writer
 * emits that spelling and the WRAPPER is lost. `parse(fmt(x)) == parse(x)`
 * cannot hold for such a document, so what the producer owes is that the loss
 * is DECLARED - `structure-unspellable` where there is a diagnostic channel,
 * and a contract that names the carve-out where there is not.
 *
 * WHY THIS IS A TEST AND NOT A CORPUS DOCUMENT. The corpus compares a source
 * against rendered output, and this clause is about a WRITE: the document that
 * exposes it (a leading space before an image) renders exactly as its own
 * source says, and only the round trip through the writer moves. A `.crv` file
 * has nowhere to put the second half.
 *
 * WHAT MAKES EACH ASSERTION ABLE TO FAIL is named beside it. The controls
 * matter as much as the shapes: a rule read as "a paragraph around an image is
 * always dropped" and a rule read as "the writer never keeps a wrapper" both
 * pass the two positive cases and fail the controls.
 *
 * PIN LAG IS DECLARED, never tolerated, and it fails in BOTH directions - the
 * same rule as resources/engine-pin-drift.txt. The build package.json pins
 * predates markup-carve/carve-js#1422, which is the change that puts the
 * `structure-unspellable` row on the paragraph-wrapped image, so the declared
 * value below is the row's ABSENCE. When the pin moves past it the assertion
 * goes red and the declaration goes out with the bump.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlToCarve, parse, renderCarve } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

// Declared lag against the `@markup-carve/carve` build package.json pins.
// Delete this in the commit that moves the pin past markup-carve/carve-js#1422.
const PIN_LAG =
  'the importer writes a paragraph holding one image as a block image and ' +
  'reports nothing, so the declared loss §1c requires is not on the record ' +
  '(markup-carve/carve-js#1422)'

const types = (source) => parse(source).children.map((block) => block.type)

// A `paragraph` whose whole content is ONE node, reached the only way source
// reaches it - the leading space, which the block layer reads as a paragraph.
const wrapped = (body) => parse(' ' + body + '\n')

// A `paragraph` whose whole content is one COMMENT, which no source reaches at
// any indent (the test below measures that), so it is lifted out of a paragraph
// that also held text. This is the payload an editor or an AST ingest hands
// back, and it is the second shape with the property.
const commentParagraph = () => {
  const document = parse('zz %% c\n')
  const only = document.children[0].children.find((child) => child.type === 'comment')
  assert.ok(only, 'no comment node to lift - the fixture no longer builds the shape it is about')
  return { type: 'document', srcByteLength: 0, children: [{ type: 'paragraph', children: [only] }] }
}

// The two the clause is stated over, and what each one's content spells.
const SHAPES = [
  { kind: 'image', spelled: '![a](u)\n', tree: () => wrapped('![a](u)') },
  { kind: 'comment', spelled: '%% c\n', tree: commentParagraph },
]

test('PART 11 §1c is in the grammar', () => {
  assert.match(grammar, /1c\. A WRAPPER ITS OWN CONTENT SPELLS AWAY IS A DECLARED CEILING/)
})

test('an image paragraph HAS a top-level spelling, which is the premise §1c rests on', () => {
  // If a leading space stopped producing a paragraph, the ceiling would be a
  // property of the grammar rather than a choice the writer makes, and the
  // clause's "uniform and not positional" paragraph would be describing
  // nothing. Every positive assertion below is downstream of this one.
  assert.deepEqual(types(' ![a](u)\n'), ['paragraph'])
  assert.deepEqual(types('![a](u)\n'), ['image'])
})

test('a comment paragraph has NO spelling at any indent, which is why the rule is not one about indentation', () => {
  // The second shape does not even have the top-level escape the first one
  // has: `%%` opens a block comment at every column. A clause written as "use
  // the indented form where one exists" would leave this shape unstated.
  for (const indent of ['', ' ', '  ', '   ', '\t']) {
    assert.deepEqual(types(indent + '%% c\n'), ['comment'], `indent ${JSON.stringify(indent)} spelled a paragraph`)
  }
})

test('one level down there is no spelling at ANY width, which is why the ceiling is uniform', () => {
  // The measurement the ruling turns on. A list marker's content column absorbs
  // the padding, so every width writes the same tree and `list_item > paragraph
  // > image` has no source at all. A writer that indented at top level and
  // could not one level down would be two rules with nothing declaring the
  // difference.
  for (let width = 1; width <= 7; width++) {
    const item = parse('-' + ' '.repeat(width) + '![a](u)\n').children[0].items[0]
    assert.deepEqual(
      item.children.map((child) => child.type),
      ['image'],
      `a list item at content width ${width} spelled the paragraph`,
    )
  }
})

test('the writer emits the content and loses the wrapper (PART 11 §1c)', () => {
  for (const { kind, spelled, tree } of SHAPES) {
    const before = tree()
    assert.deepEqual(before.children.map((b) => b.type), ['paragraph'], `${kind}: the fixture is not a paragraph`)

    const written = renderCarve(before)
    assert.equal(written, spelled, `${kind}: the writer did not emit the content's own spelling`)
    assert.deepEqual(types(written), [kind], `${kind}: the wrapper survived, so §1c no longer describes the writer`)
  }
})

test('the control: a block that spells anything ELSE keeps its wrapper', () => {
  // Three shapes that separate §1c from "a paragraph around an image is always
  // dropped". Each holds one of the two nodes plus something the page can see,
  // so the wrapper has a spelling of its own and no ceiling is reached.
  for (const source of [
    ' ![a](u) and text\n', // a text run beside it
    ' ![a](u) ![b](v)\n', // a second node beside it
    '\u00a0![a](u)\n', // a NO-BREAK SPACE, which PART 11 §7 puts on the content side
    ' zz %% c\n', // the comment shape, with content before it
  ]) {
    const written = renderCarve(parse(source))
    assert.deepEqual(types(written), ['paragraph'], `a spellable wrapper was lost: ${JSON.stringify(source)}`)
  }
})

test('the control: the writer is not simply dropping every wrapper', () => {
  // Without this, a writer that emitted nothing but its children would pass
  // every assertion above. A plain paragraph round-trips as a paragraph.
  assert.deepEqual(types(renderCarve(parse(' hello\n'))), ['paragraph'])
})

test('the loss is DECLARED where the producer has a channel to declare it in', () => {
  const { value, report } = htmlToCarve('<p><img src="g.jpg" alt="G"></p>')
  const codes = report.diagnostics.map((d) => d.code)

  // The source half holds on both sides of the pin: the wrapper is lost either
  // way, and only the reporting moves.
  assert.equal(value, '![G](g.jpg)\n')
  assert.deepEqual(types(value), ['image'])

  if (PIN_LAG) {
    // Fails in the other direction too: when the pinned build reports the row,
    // this assertion goes red and the declaration must go out.
    assert.deepEqual(codes, [], `pin lag is declared and the engine no longer has it - delete PIN_LAG: ${PIN_LAG}`)
    return
  }
  assert.deepEqual(codes, ['structure-unspellable'], 'the wrapper was lost and nothing said so')
})
