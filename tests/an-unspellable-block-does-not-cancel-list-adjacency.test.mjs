/*
 * PART 11 §10j: an unspellable block does not cancel the adjacency it cannot
 * spell.
 *
 * A whitespace-only paragraph does two things at once. It is not empty, so a
 * writer tracking list adjacency treats it as a block that separates two
 * sibling lists and never writes PART 9 §11 N1a's hard boundary; and it has no
 * Carve spelling, so nothing of it reaches the page. The lists come back with
 * ONE blank line between them - the loose separator - and MERGE. What is lost
 * is a document boundary, not a blank line, and that is a PART 11 §1
 * violation.
 *
 * WHY THIS IS A HAND-BUILT PAYLOAD AND NOT A CORPUS DOCUMENT. No Carve source
 * spells a whitespace-only paragraph: a lone ASCII-space line is a BLANK LINE,
 * so `- a`, that line, `- b` parses to two lists and no paragraph at all. The
 * parse-driven corpus therefore cannot reach this tree whatever it is written
 * to assert - the same structural blind spot as carve#1615 - so the fixture
 * enters through the AST ingest.
 *
 * AND IT MUST NOT ENTER THROUGH THE HTML IMPORTER. carve#1628 ruled that an
 * importer KEEPS a no-break space, so `<p>&nbsp;</p>` between two lists builds
 * a paragraph that is spellable, survives the write, and holds the boundary on
 * its own. Reaching this tree through an import would stop reproducing the day
 * that ruling lands in the engines, which is the defect this fixture exists to
 * avoid being. An AST patch, an editor round trip and a `--from-json` payload
 * all still reach it.
 *
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt and the PIN_LAG map in
 * tests/html-import-contract.check.mjs, and it fails in BOTH directions. When
 * the pin moves past the fix, the declaration below goes red and the line goes
 * out with the bump.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, fromAstJson, renderCarve, renderHtml } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

// Declared lag against the `@markup-carve/carve` build package.json pins.
// Delete this in the commit that moves the pin past markup-carve/carve-js#1400.
const PIN_LAG =
  'the writer lets a whitespace-only paragraph cancel list adjacency, so the ' +
  'PART 9 §11 N1a boundary is never written and the two lists come back as ' +
  'one loose list (PART 11 §10j; markup-carve/carve#1621)'

const list = (text) => ({
  type: 'list',
  ordered: false,
  tight: true,
  bulletChar: '-',
  items: [{ type: 'list_item', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] }],
})

// Two sibling lists with one block between them. Hand-built, with no `pos`
// anywhere: this is the payload an editor hands back, not anything a parser
// produced.
const payload = (between) => ({
  type: 'document',
  srcByteLength: 0,
  children: [list('a'), ...(between === null ? [] : [between]), list('b')],
})

const paragraph = (children) => ({ type: 'paragraph', children })
const text = (value) => ({ type: 'text', value })

const ingest = (between) => fromAstJson(JSON.parse(JSON.stringify(payload(between))))
const written = (between) => renderCarve(ingest(between))
const direct = (between) => renderHtml(ingest(between))

// The invariant PART 11 §1 states, over the block that sits between the lists.
const roundTripKeeps = (between) => carveToHtml(written(between)) === direct(between)

// How many top-level lists the WRITTEN source comes back as. This is the value
// the clause is about: the boundary either survived the write or it did not.
const listsAfterRoundTrip = (between) =>
  (carveToHtml(written(between)).match(/<ul[\s>]/g) ?? []).length

test('PART 11 §10j is in the grammar', () => {
  assert.match(grammar, /10j\. AN UNSPELLABLE BLOCK DOES NOT CANCEL THE ADJACENCY IT CANNOT SPELL/)
})

test('no Carve source spells the tree, which is why the corpus cannot hold it', () => {
  // The premise the whole fixture rests on. A lone ASCII-space line is a blank
  // line, so this document is two lists and the separator is unreachable from
  // source. If that ever changes, this belongs in the corpus instead.
  assert.equal((carveToHtml('- a\n\n \n\n- b\n').match(/<ul[\s>]/g) ?? []).length, 2)
  assert.ok(
    !carveToHtml('- a\n\n \n\n- b\n').includes('<p> </p>'),
    'an ASCII-space line now spells a paragraph, so this shape is reachable from source',
  )
})

test('the control: with nothing between them the boundary is written', () => {
  // The mechanism is present and it works. Without this, a fix that simply
  // stopped writing boundaries would look like a pass everywhere else.
  assert.equal(listsAfterRoundTrip(null), 2)
  assert.ok(roundTripKeeps(null), 'the control lost the boundary')
})

test('a SPELLABLE block between the lists is untouched by this clause', () => {
  // Two controls that separate §10j from "always write a boundary between two
  // lists". A thematic break and a no-break-space paragraph both reach the
  // page, so they separate the lists as they always did.
  for (const between of [{ type: 'thematic_break' }, paragraph([text(' ')])]) {
    assert.ok(roundTripKeeps(between), `a spellable block lost its round trip: ${between.type}`)
    assert.equal(listsAfterRoundTrip(between), 2)
  }
})

test('an UNSPELLABLE block does not cancel the adjacency (PART 11 §10j)', () => {
  const between = paragraph([text(' ')])
  if (PIN_LAG) {
    // Fails in the other direction too: when the engine writes the boundary,
    // this assertion goes red and the declaration must go out.
    assert.equal(
      listsAfterRoundTrip(between),
      1,
      `pin lag is declared and the engine no longer has it - delete PIN_LAG: ${PIN_LAG}`,
    )
    return
  }
  assert.equal(
    listsAfterRoundTrip(between),
    2,
    'the whitespace-only paragraph cancelled the boundary and the two lists merged',
  )
})

test('the empty paragraph is the sibling shape the pin already gets right', () => {
  // The measurement the ruling turns on: the pinned build writes the boundary
  // across an EMPTY paragraph and not across a whitespace-only one, and the two
  // trees differ in nothing the writer can put on the page. If this ever
  // regresses, §10j lost the evidence that settled it without a cross-engine
  // tally.
  assert.equal(listsAfterRoundTrip(paragraph([])), 2)
})

test('the block itself is still lost, and the clause bounds the loss to it', () => {
  // §10j does not claim the paragraph survives - it claims the BOUNDARY does.
  // Asserting the whole invariant here would pin a promise the clause never
  // made, and would go green only when a different clause landed.
  const between = paragraph([text(' ')])
  assert.ok(!written(between).includes(' '))
  assert.ok(direct(between).includes('<p>'), 'the tree the writer was handed had a paragraph')
})
