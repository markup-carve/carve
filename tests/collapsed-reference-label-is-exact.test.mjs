/*
 * A COLLAPSED reference label matches EXACTLY, like an explicit one.
 *
 * §6 and PART 9R R1 say it in the same words: "case-sensitive, no whitespace
 * folding". The oracle honored that for the explicit `[text][ref]` form and
 * trimmed + collapsed the label for the collapsed `[text][]` form, so it was
 * wrong in BOTH directions at once - it matched a definition whose spacing
 * differed, and failed to match the identical one:
 *
 *   see [ b  c][]  +  [b c]: /u     resolved   (should not)
 *   see [ b  c][]  +  [ b  c]: /u   literal    (should resolve)
 *
 * All three engines are exact on both rows. carve-js folded the explicit form
 * and fixed it in carve-js#674; carve-php folded both forms plus the definition
 * key and fixed it in carve-php#822; carve-rs was always exact. The oracle was
 * the last one holding a fold, and it held it on the OTHER half of the rule -
 * which is why chasing the engines against the oracle's explicit behavior never
 * turned it up (carve#708).
 *
 * The image path keyed the same way and is fixed with it, in both places it is
 * keyed: resolution in html.mjs and the figure-unwrap prepass in layout.mjs.
 *
 * The IMPLICIT heading fallback stays deliberately looser - `refKey` trims,
 * collapses and folds case, because a heading reference is prose quoted from
 * elsewhere rather than an identifier the author wrote twice. All four
 * implementations agree on that, and the last test here pins it.
 *
 * Nothing in the corpus uses a label containing whitespace, which is how one
 * half of a two-clause rule stayed broken in three implementations at once.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src))
const resolves = (src) => /href="\/u"|src="\/u"/.test(html(src))

test('a collapsed label with differing internal spacing does not resolve', () => {
  assert.ok(!resolves('see [ b  c][]\n\n[b c]: /u\n'))
})

test('a collapsed label with identical spacing does resolve', () => {
  // Exact, not stripped: collapsing OR trimming would break this.
  assert.ok(resolves('see [ b  c][]\n\n[ b  c]: /u\n'))
})

test('padding is part of a collapsed label', () => {
  assert.ok(resolves('see [ b][]\n\n[ b]: /u\n'))
  assert.ok(!resolves('see [ b][]\n\n[b]: /u\n'))
})

test('an ordinary collapsed label still resolves', () => {
  // The boundary: the common case must not become literal.
  assert.ok(resolves('see [b c][]\n\n[b c]: /u\n'))
})

test('case is still not folded for a collapsed label', () => {
  assert.ok(!resolves('see [BAR][]\n\n[bar]: /u\n'))
})

test('an explicit label is still exact', () => {
  // The half that was already right, re-asserted so a shared-helper refactor
  // cannot regress it while fixing the collapsed one.
  assert.ok(resolves('see [t][ b  c]\n\n[ b  c]: /u\n'))
  assert.ok(!resolves('see [t][ b  c]\n\n[b c]: /u\n'))
})

test('a collapsed IMAGE reference is exact too', () => {
  assert.ok(resolves('![ a  b][]\n\n[ a  b]: /u\n'))
  assert.ok(!resolves('![ a  b][]\n\n[a b]: /u\n'))
})

test('a resolved image reference with a caption still becomes a figure', () => {
  // The layout prepass keys the label the same way to decide whether a figure
  // survives. If that key and the resolution key disagree, this either unwraps a
  // figure around literal text or drops the caption from a resolving image.
  const out = html('![ a  b][]\n^ cap\n\n[ a  b]: /p.png\n')
  assert.match(out, /<figcaption>cap<\/figcaption>/, out)
})

test('an unresolved image reference with a caption stays literal', () => {
  // The other side of that prepass: no definition, so no figure.
  const out = html('![ a  b][]\n^ cap\n\n[a b]: /p.png\n')
  assert.ok(!out.includes('<figcaption>'), out)
})

test('an implicit heading reference still folds whitespace and case', () => {
  // The fuzzy path, deliberately unchanged and agreed by all four.
  assert.match(html('# My  Heading\n\nsee [my heading][]\n'), /href="#My-Heading"/)
})
