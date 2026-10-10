/*
 * carve#2859, ruled in carve-php#3046. A `]` inside a link destination is an
 * ordinary URL character, so the scan that closes a bracketed run skips the
 * destination whole: `CARVE-P3-001` states its criterion as an open set and
 * docs/dismissed-syntax.md is normative that a destination has no escape
 * processing. carve-php closed an outstanding `[` on such a `]` and lost the
 * link; the shapes below are the ones that exposed it.
 *
 * The corpus carries this property where every reader agrees on it, as category
 * 551. What is here is the half the corpus cannot carry: with an OUTSTANDING `[`
 * in the surrounding text, this repo's executable spec still closes the run at
 * the destination's `]` and renders the whole line literal, so a corpus row for
 * these three shapes would fail its own oracle. They are therefore pinned
 * against the published engine, which implements the ruling, and the gap in
 * scripts/spec is carve#2860.
 *
 * Nothing masked this until carve#2854: both Djot importers percent-encoded a
 * bracket in a destination, so the `]` never reached a parser.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToHtml } from '@markup-carve/carve'

const html = (source) => carveToHtml(source).trim()

test('an outstanding bracket survives a right bracket in a destination', () => {
  assert.equal(html('a [b [x](http://u/]) c\n'), '<p>a [b <a href="http://u/]">x</a> c</p>')
})

test('the image spelling reads the same destination', () => {
  assert.equal(
    html('a [b ![x](http://u/]) c\n'),
    '<p>a [b <img src="http://u/]" alt="x"> c</p>',
  )
})

test('a title holds its own right bracket beside the destination', () => {
  assert.equal(
    html('a [b [x](http://u/] "t]") c\n'),
    '<p>a [b <a href="http://u/]" title="t]">x</a> c</p>',
  )
})

test('the link text may hold the escaped destination it points at', () => {
  // The shape carve-php#3046 was filed on: the importer's own output for a Djot
  // autolink whose body carries brackets.
  assert.equal(
    html('a [[http\\:\\/\\/u\\/\\]](http://u/])\n'),
    '<p>a [<a href="http://u/]">http://u/]</a></p>',
  )
})
