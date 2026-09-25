/*
 * PART 11 section 10l, and the corpus sidecar that pins its one worked shape.
 *
 * The clause is checked here rather than only by a fixture because two of the
 * three shapes it decides have no corpus case yet, and the shape it does pin
 * has a golden that agrees with one engine - so a fixture alone cannot tell the
 * rule from that engine's behavior. The sidecar is read through the SAME
 * CommonMark reader the importers answer to (cmark-gfm 0.29.0.gfm.13), and a
 * negative control renders the separator variant so the reader is shown to
 * distinguish the two readings at all.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cmarkGfmToHtml } from '../scripts/lib/markdown-oracle.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(resolve(repo, path), 'utf8')
const grammar = read('resources/grammar.ebnf')

/* The clause text, from its stable id to the next clause marker. */
const clauseText = (id) => {
  const start = grammar.indexOf(`[${id}]`)
  assert.notEqual(start, -1, `${id} is absent from the grammar`)
  const rest = grammar.slice(start + id.length + 2)
  const end = rest.search(/--\s+NORMATIVE\s+\[CARVE-/)
  return rest.slice(0, end === -1 ? rest.length : end).replace(/\n\s+/g, ' ')
}

test('CARVE-P11-047 binds the Markdown target to the source tightness', () => {
  const text = clauseText('CARVE-P11-047')
  assert.match(text, /PART 9 §17 L1/, 'the clause must name where tightness is defined')
  assert.match(
    text,
    /wherever CommonMark can express it/,
    'the rule is bounded by what the target can express, and the bound has to be written',
  )
})

test('CARVE-P11-047 decides all three shapes', () => {
  const text = clauseText('CARVE-P11-047')
  assert.match(text, /nested bullet list/, 'the separator before a nested list is undecided')
  assert.match(text, /block quote/, 'a nested block quote in a tight item is undecided')
  assert.match(text, /A LOOSE LIST KEEPS ITS BLANK LINES/, "a flat loose list's blank line is undecided")
})

test('CARVE-P11-047 is not read as never writing a separator', () => {
  const text = clauseText('CARVE-P11-047')
  assert.match(
    text,
    /CANNOT INTERRUPT keeps its blank line/,
    'an opener that cannot interrupt a paragraph still needs its separator',
  )
})

test('CARVE-P11-035 hands the tight/loose licence to plain text only', () => {
  const text = clauseText('CARVE-P11-035')
  assert.match(
    text,
    /LICENCE IS THIS TARGET'S/,
    'section 10h must say whose the licence is, or its silence reads as a general permission',
  )
  assert.match(text, /§10l/, 'section 10h must point at the target that does keep tightness')
})

/*
 * The sidecar, against the reader. Read back, the golden must carry the
 * tightness the case's own `.html` fixture carries: `<li>parent` with no `<p>`.
 */
const sidecar = read('tests/corpus/05-lists-19.md')

test('the 05-lists-19 sidecar reads back tight', () => {
  assert.doesNotMatch(
    cmarkGfmToHtml(sidecar),
    /<p>/,
    'the golden reads back loose, which is the divergence the clause rules out',
  )
})

test('the reader can see the difference the clause turns on', () => {
  // Without this, the assertion above passes on any input with no paragraph
  // wrapper, including one the clause forbids for other reasons.
  const withSeparator = sidecar.replace('\n  - child', '\n\n  - child')
  assert.notEqual(withSeparator, sidecar, 'the negative control did not change the input')
  assert.match(
    cmarkGfmToHtml(withSeparator),
    /<p>parent<\/p>/,
    'the separator variant reads back tight too, so this reader cannot arbitrate the clause',
  )
})

/*
 * The clause rests on three facts about the target, so they are measured rather
 * than assumed: two shapes CAN be written tight and one cannot. A CommonMark
 * reader that stopped answering this way would make the clause wrong, not the
 * engines.
 */
const loose = (source) => cmarkGfmToHtml(source).includes('<p>a</p>')

test('a quote under a tight item needs no separator', () => {
  assert.equal(loose('- a\n  > q\n'), false, 'the block-quote shape cannot be written tight at all')
  assert.equal(loose('- a\n\n  > q\n'), true, 'the separator does not loosen the item, so it costs nothing')
})

test("a flat list's looseness lives in the blank line", () => {
  assert.equal(loose('- a\n\n- b\n'), true, 'the blank line no longer loosens a flat list')
  assert.equal(loose('- a\n- b\n'), false, 'dropping it is not the loss the clause forbids')
})

test('an ordered list that does not start at 1 cannot interrupt', () => {
  assert.match(
    cmarkGfmToHtml('- a\n  3. b\n'),
    /a\n3\. b/,
    'the marker is read as a list, so the separator this clause keeps is not needed',
  )
  assert.match(
    cmarkGfmToHtml('- a\n\n  3. b\n'),
    /<ol start="3">/,
    'the separator does not produce the list, so it is not what makes tightness unexpressible here',
  )
})

test('the Markdown-target lag is declared with the engine tickets that own it', () => {
  const page = read('docs/implementation-comparison-methodology.md')
  for (const ticket of ['carve-rs#1900', 'carve-php#2380', 'carve-js#2050']) {
    assert.ok(
      page.includes(`markup-carve/${ticket}`),
      `the declared window does not name markup-carve/${ticket}, so the golden's red has no owner`,
    )
  }
})
