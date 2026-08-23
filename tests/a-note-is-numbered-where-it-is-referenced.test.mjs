/*
 * PART 9R R2: ONE counter, walked in DOCUMENT ORDER
 * (markup-carve/carve#1562).
 *
 * The clause is explicit, and PART 9R's state declaration says it twice:
 *
 *   footnoteSeq : ONE shared document-order counter for both footnote forms
 *
 *   R2 FOOTNOTES. A [^label] use with a matching footnoteDefs entry is
 *   numbered by FIRST-REFERENCE order from footnoteSeq [...] An inline
 *   ^[content] note draws a fresh anonymous number from the SAME footnoteSeq.
 *
 * So the number follows where the use SITS, not which of the two spellings it
 * wears. The oracle resolved the two frames in two consecutive passes - every
 * inline note first, then every labeled reference - which numbers by FORM.
 * `Reference-style[^1] and inline^[...]` came out 2 then 1, and because the
 * endnote list is built from the same order, the two readings also disagreed
 * about which body is `fn1`.
 *
 * WHY NOTHING WAS RED. No corpus document mixes the forms, so 1363 fixtures
 * could all reproduce byte for byte with the counter walked in the wrong
 * order. The authored docs sample that does mix them had no reader at all
 * until markup-carve/carve#1552 gave the oracle one. That absence is what let
 * four readers hold two answers, so the shapes are pinned here directly rather
 * than only through the authored-documents comparison, whose input is a docs
 * page somebody may reword.
 *
 * THE PINNED ENGINE IS ASSERTED BESIDE THE ORACLE, on the same source. The
 * claim is agreement, and an assertion on the oracle alone would restate the
 * oracle.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// The order the noterefs are written, read off the rendered anchors. Reading
// the ORDER rather than one anchor is deliberate: an off-by-one that shifted
// every number would still satisfy a single-anchor assertion.
const noterefs = (out) => [...out.matchAll(/id="(fnref[\w-]*)"/g)].map((m) => m[1])

// The endnote bodies in list order, which is the same counter seen from the
// other end. A pass that numbered the noterefs correctly and built the list
// from a second, differently-ordered walk would pass the check above.
const endnotes = (out) =>
  [...out.matchAll(/<li id="fn\d+">\s*<p>(.*?)(?:<a href="#fnref)/gs)].map((m) => m[1].trim())

const MIXED = {
  'reference then note': {
    source:
      'Reference-style[^1] and inline^[This is the footnote content.] both work.\n' +
      '\n[^1]: Content for the reference footnote.\n',
    refs: ['fnref1', 'fnref2'],
    bodies: ['Content for the reference footnote.', 'This is the footnote content.'],
  },
  'note then reference': {
    source: 'inline^[N] and ref[^1].\n\n[^1]: R.\n',
    refs: ['fnref1', 'fnref2'],
    bodies: ['N', 'R.'],
  },
  'a note between two references': {
    source: 'a[^x] b^[N] c[^y]\n\n[^x]: X.\n\n[^y]: Y.\n',
    refs: ['fnref1', 'fnref2', 'fnref3'],
    bodies: ['X.', 'N', 'Y.'],
  },
  'a repeat reference keeps its first number': {
    // R2's other half, on the same counter: the repeat reuses 1 and takes
    // `fnref1-2`, so the note between them still draws 2 rather than 3.
    source: 'a[^x] b^[N] c[^x]\n\n[^x]: X.\n',
    refs: ['fnref1', 'fnref2', 'fnref1-2'],
    bodies: ['X.', 'N'],
  },
}

for (const [name, expected] of Object.entries(MIXED)) {
  test(`${name}: the oracle numbers by position`, () => {
    const out = html(expected.source)
    assert.deepEqual(noterefs(out), expected.refs, out)
    assert.deepEqual(endnotes(out), expected.bodies, out)
  })

  test(`${name}: the pinned engine agrees`, () => {
    const out = carveToHtml(expected.source).trim()
    assert.deepEqual(noterefs(out), expected.refs, out)
    assert.deepEqual(endnotes(out), expected.bodies, out)
  })
}

test('a note inside a footnote body is still numbered after its host', () => {
  // The bodies are resolved after the document pass, and a body can introduce
  // further frames. The single scan has to hold there too.
  const out = html('a[^x]\n\n[^x]: body with^[inner] note.\n')
  assert.deepEqual(noterefs(out), ['fnref1', 'fnref2'], out)
  assert.equal(carveToHtml('a[^x]\n\n[^x]: body with^[inner] note.\n').trim(), out)
})

test('an unresolved reference draws no number, and the note after it is 1', () => {
  // R2: an unresolved reference degrades to literal source text and takes
  // nothing from the sequence, so merging the two scans must not start
  // counting it.
  const out = html('a[^zz] b^[N]\n')
  assert.match(out, /a\[\^zz\] b/, out)
  assert.deepEqual(noterefs(out), ['fnref1'], out)
})

test('resolving both frames in one scan leaks no pipeline framing', () => {
  /*
   * A NEAR MISS, pinned. The two frames are spelled differently - the note
   * frame carries JSON, the reference frame is raw with a U+0002 separator -
   * and BOTH are wrapped in U+E000 / U+E001. Writing the combined alternation
   * without the reference branch's sentinels still numbered every shape above
   * correctly, and shipped a U+E000 into the rendered HTML.
   *
   * `tests/oracle-framing-never-leaks.test.mjs` generates VERBATIM-body shapes
   * and would not have reached this one, and `scripts/formal-core-check.mjs`
   * guards the corpus, which holds no mixed-form document. So the assertion
   * belongs here, beside the change that could reintroduce it.
   */
  const SENTINELS = /[\u0000\u0002\uE000\uE001]/
  for (const { source } of Object.values(MIXED)) {
    const out = html(source)
    assert.equal(SENTINELS.test(out), false, JSON.stringify(out))
  }
})
