/*
 * A nested container must not re-read its body's indentation once per level
 * (carve#752).
 *
 * Every container hands its body to a nested parse, so a line at depth `d` is
 * visited by `d` enclosing containers. That is the container model and it is
 * not what this guards. What it guards is the cost of each visit: the oracle
 * used to re-walk the line's leading whitespace at every level - three times
 * per visit, unbounded - which is cubic in depth for a document that is only
 * quadratic in bytes, and measured 265 characters of indentation work per byte
 * on a 40 KB ladder.
 *
 * COUNTED, NOT TIMED. Three reasons, all of them recorded in this repository
 * family rather than assumed:
 *
 *   - a wall-clock CEILING passes at every complexity on a fast enough
 *     machine, which is the check-that-cannot-fail catalogued in carve#755;
 *   - a wall-clock RATIO cannot separate linear from superlinear on a shared
 *     machine - carve-js `test/perf-regression.test.ts` records that one
 *     "flaked on nearly every run", and `test/writer-deep-list-perf.test.ts`
 *     carries "No ratio guard here on purpose ... would also fail on the
 *     healthy build";
 *   - a count is identical run to run under any load, which is asserted below
 *     rather than claimed.
 *
 * The load-bearing assertion is SHAPE: work per byte must not climb as the
 * document deepens. It fires with the ceiling raised past usefulness, because
 * it is a statement about the curve rather than about its constant.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'

// A ladder of `d` items, each one indented past the last. `flat` documents are
// the control: the same line count and the same widths with nothing nested.
const shapes = {
  // The plain case: two-column bullets, spaces.
  'bullet ladder': (d) => Array.from({ length: d }, (_, i) => ' '.repeat(2 * i) + '- x').join('\n') + '\n',
  // A different marker, so the guard is not pinned to one content column.
  'ordered ladder': (d) => Array.from({ length: d }, (_, i) => ' '.repeat(3 * i) + '1. x').join('\n') + '\n',
  // DIFFERENTLY SHAPED CONTENT. carve-rs#742 nearly shipped a fix whose
  // pre-test was "no colon on the line", and its ladder was built from `a`, so
  // a ladder of `a: b` would still have cost the full amount and nothing would
  // have said so. This is that document here.
  'prose ladder': (d) => Array.from({ length: d }, (_, i) => ' '.repeat(2 * i) + '- a: b').join('\n') + '\n',
  // TAB indentation, at a content column that is a multiple of 4. The column
  // arithmetic a container derives for its body is exact for a run of spaces,
  // and for a tab run only when the strip lands on a tab stop - this is that
  // second case, and it is here so the rule is exercised rather than asserted.
  'tab ladder': (d) => Array.from({ length: d }, (_, i) => '\t'.repeat(i) + '-   x').join('\n') + '\n',
}

// Indented, but flat: the indentation is read once, by the paragraph collector,
// and never by an enclosing container. This is the control AND the liveness
// check - it must read about one pass over the document, so a counter that
// stopped counting fails here rather than passing everything.
const flatIndented = (d) => Array.from({ length: d }, (_, i) => ' '.repeat(2 * i) + 'x').join('\n') + '\n'
// A quote ladder: `>` is the other container prefix, and it is not indentation.
const quoteLadder = (d) => Array.from({ length: d }, (_, i) => '> '.repeat(i + 1) + 'x').join('\n') + '\n'

function count(src) {
  resetLayoutWork()
  parse(src)
  return {
    // Columns of indentation walked, plus characters written to re-materialize
    // a straddling tab's residual. Loop indices, never string lengths.
    work: layoutWork.scan + layoutWork.pad,
    views: layoutWork.views,
    quoteStrips: layoutWork.quoteStrips,
    lineVisits: layoutWork.lineVisits,
    bytes: src.length,
  }
}

const perByte = (c) => c.work / c.bytes

test('the count is a count: identical on a repeated run', () => {
  const src = shapes['bullet ladder'](200)
  assert.deepEqual(count(src), count(src))
})

test('the counter is on the path the parse actually takes', () => {
  // The first instrument written for carve#752 counted only the BOUNDED scan
  // inside the stripper, read 1.5% of the work and concluded there was nothing
  // to fix. A counter that is not on the path reads zero and proves nothing,
  // so its liveness is asserted here rather than assumed.
  const c = count(flatIndented(200))
  assert.ok(c.lineVisits > 0, 'no lines were visited')
  assert.ok(
    perByte(c) > 0.5 && perByte(c) <= 4,
    `the indentation of a flat indented document must be read a bounded number of ` +
    `times: ${perByte(c).toFixed(2)} per byte`,
  )
})

for (const [name, gen] of Object.entries(shapes)) {
  test(`${name}: indentation work does not climb with depth`, () => {
    const small = count(gen(100))
    const large = count(gen(200))
    const control = count(flatIndented(200))

    assert.ok(small.lineVisits > 0 && large.lineVisits > 0, 'no lines were visited')
    assert.ok(large.work > 0, 'the indentation counter is not counting: 0 columns walked')

    // SHAPE. The bytes of a ladder grow 3.94x from depth 100 to 200; a parse
    // that reads each line's indentation a bounded number of times grows with
    // them, and one that re-reads it per level does not. Before this rule was
    // carried rather than re-walked, this ratio was 2.01.
    const climb = perByte(large) / perByte(small)
    assert.ok(
      climb <= 1.3,
      `work per byte climbed ${climb.toFixed(2)}x from depth 100 to 200 ` +
      `(${perByte(small).toFixed(2)} -> ${perByte(large).toFixed(2)}): the indentation is being re-read per level`,
    )

    // CEILING. A handful of passes over the document, no more. This is what a
    // uniformly slower parse fails, which the shape check above cannot see.
    assert.ok(
      perByte(large) <= 4,
      `${perByte(large).toFixed(2)} characters of indentation work per byte, ceiling 4`,
    )

    // CONTROL. Nesting may cost something; it may not cost a different order
    // of magnitude than the same bytes laid out flat.
    const vsFlat = perByte(large) / perByte(control)
    assert.ok(
      vsFlat <= 4,
      `the ladder costs ${vsFlat.toFixed(1)}x the same bytes laid out flat, ceiling 4`,
    )

    // The strip takes a VIEW of the line rather than walking it, so what
    // matters is how many it takes: one per line visit is the model, and a
    // regression to walk-and-materialize shows up here as several.
    assert.ok(
      large.views <= 2 * large.lineVisits,
      `${(large.views / large.lineVisits).toFixed(2)} slices per line visit, ceiling 2`,
    )
  })
}

test('a quote strips its marker once per line per level', () => {
  // The `>` prefix is fixed-width, so what can go wrong with it is the NUMBER
  // of strips. One per quoted line per enclosing level is the floor the model
  // asks for; carve-rs was doing 77 times that (carve-rs#731), from a loop
  // that unwound the whole remaining prefix on every line to answer a question
  // about the innermost one. Both bounds matter: the floor is the liveness
  // check, the ceiling is the defect.
  const c = count(quoteLadder(200))
  assert.ok(c.quoteStrips > 0, 'the quote-strip counter is not counting: 0 strips')
  assert.ok(
    c.quoteStrips >= 0.5 * c.lineVisits,
    `${c.quoteStrips} strips for ${c.lineVisits} line visits: below the one-per-line floor`,
  )
  assert.ok(
    c.quoteStrips <= 1.2 * c.lineVisits,
    `${(c.quoteStrips / c.lineVisits).toFixed(1)} strips per line visit, ceiling 1.2`,
  )
})

test('a tab run stripped off a tab stop is measured, not derived', () => {
  // The precondition of the derivation, pinned. `- a` establishes a content
  // column of 2, and stripping two columns off `\t\t- b` re-materializes the
  // straddling tab's residual as spaces: the body line becomes `  \t- b`,
  // whose content stands at column 4, not at 8 - 2 = 6. Deriving it anyway
  // reads both items as nested rather than as siblings.
  //
  // Nothing in the corpus reaches this: a detector on the derivation counted
  // ZERO such lines across all 792 corpus documents and 99 on a tab ladder, so
  // dropping the guard leaves the whole suite and the corpus SHA-256 green.
  // This is the case that kills it.
  const src = '- a\n\t\t- b\n\t\t- c\n'
  const list = parse(src).blocks[0]
  const sub = list.items[0].blocks.find((b) => b.t === 'list')
  assert.equal(sub.items.length, 2, 'the two tab-indented items are siblings, not nested')
  assert.equal(sub.items[1].blocks.filter((b) => b.t === 'list').length, 0)
})
