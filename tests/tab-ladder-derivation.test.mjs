/*
 * The derived column of a container's body line equals a fresh walk of it -
 * exhaustively, for every indentation run of spaces and tabs up to length 7 and
 * every sequence of strips.
 *
 * carve#752 stopped the oracle re-walking a body line's indentation at every
 * enclosing level, by DERIVING the body's column from the parent's. That
 * derivation was a subtraction, `col - cols`, which is exact only for a run of
 * spaces or a strip that lands on a tab stop. Everywhere else - a tab run at a
 * content column that is not a multiple of 4 - the residual re-materialized as
 * spaces moves every later tab stop on the line, so the subtraction is wrong
 * and the line was walked instead, once per level. That is carve#930: correct,
 * and still superlinear.
 *
 * It is now derived in every case, from the SOURCE run rather than from a
 * column. The claim that buys is narrow and total: for any line and any strip,
 * the derived measurement equals `indentCols` of the text the same strip
 * produced. A single wrong column is a wrong parse - `- a` then `\t\t- b` reads
 * as siblings or as nesting depending on whether the answer is 4 or 6 - so the
 * claim is checked by enumeration rather than by sampling.
 *
 * 2 x 3^7 runs times four strip widths at three levels: about 20k parses of the
 * arithmetic, under a second.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { indentCols, dedentMeasured, parse } from '../scripts/spec/layout.mjs'

/** Every string of spaces and tabs up to `maxLen`, followed by `tail`. */
function* runs(maxLen, tail) {
  const alphabet = [' ', '\t']
  const build = function* (prefix, left) {
    yield prefix + tail
    if (left === 0) return
    for (const ch of alphabet) yield* build(prefix + ch, left - 1)
  }
  yield* build('', maxLen)
}

test('a derived body column equals a walk of the line it was derived from', () => {
  // Widths a container actually establishes: `- x` is 2, `1. x` is 3, `-   x`
  // is 4, and 0 and 1 are the degenerate ends. Two off-stop widths (2, 6) are
  // in there on purpose - they are the case the subtraction cannot answer.
  const widths = [0, 1, 2, 3, 4, 6]
  let checked = 0
  let derived = 0

  for (const tail of ['- x', 'x', '']) {
    for (const line of runs(7, tail)) {
      for (const a of widths) {
        for (const b of widths) {
          // Three levels deep: the second and third strips run against a line
          // that already carries re-materialized padding, which is where a
          // source-coordinate slip would show up and a one-level check would
          // not.
          let m = indentCols(line)
          let text = line
          for (const cols of [a, b, a]) {
            const dd = dedentMeasured(m, text, cols)
            const walked = indentCols(dd.text)
            checked += 1
            assert.ok(
              dd.meas,
              `nothing was derived for ${JSON.stringify(line)} stripped by ${cols}: ` +
                'the body line is being re-walked instead',
            )
            assert.equal(
              dd.meas.col,
              walked.col,
              `derived column ${dd.meas.col}, walked ${walked.col}\n` +
                `  source ${JSON.stringify(line)} stripped by ${cols}\n` +
                `  gave   ${JSON.stringify(dd.text)}`,
            )
            assert.equal(
              dd.meas.rest,
              walked.rest,
              `derived content ${JSON.stringify(dd.meas.rest)}, walked ${JSON.stringify(walked.rest)} ` +
                `for ${JSON.stringify(dd.text)}`,
            )
            // `tabs` is conservative by design: it may claim a tab the suffix no
            // longer holds, which costs a table. It may never DENY one, since
            // that is what would take the inexact shortcut.
            if (walked.tabs) {
              assert.equal(dd.meas.tabs, true, `tabs denied for ${JSON.stringify(dd.text)}`)
            }
            if (dd.meas.L) derived += 1
            m = dd.meas
            text = dd.text
          }
        }
      }
    }
  }

  assert.ok(checked > 10000, `only ${checked} cases enumerated`)
  // Liveness: if the derivation stopped being used, every case above would be
  // comparing a walk against a walk and would pass on anything.
  assert.equal(derived, checked, `${checked - derived} of ${checked} cases fell back to a walk`)
})

test('a tab ladder off the stop nests the way a walk says it does', () => {
  // The arithmetic above, read as a parse. Content column 2, tab indentation:
  // item `i` sits at column 4i, so item i+1 (4i + 4) is 2 past item i's content
  // column - one level of nesting per item, never two, and never flat.
  const depth = 12
  const src = Array.from({ length: depth }, (_, i) => '\t'.repeat(i) + '- x').join('\n') + '\n'

  let node = parse(src).blocks[0]
  let levels = 0
  while (node && node.t === 'list') {
    levels += 1
    assert.equal(node.items.length, 1, `level ${levels} holds ${node.items.length} items, expected 1`)
    node = node.items[0].blocks.find((b) => b.t === 'list')
  }
  assert.equal(levels, depth, `the ladder nested ${levels} deep, expected ${depth}`)
})
