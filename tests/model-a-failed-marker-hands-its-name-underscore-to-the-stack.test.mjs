/*
 * A mention or tag standing behind a word character that no opener can turn
 * into markup fails PART 9 §7, so it is no name: its `_` is an ordinary
 * delimiter and may open toward a closer outside the name (carve#4025). The
 * brace escape of the unattached-block re-read is how `_{` becomes a name
 * character, hence the `\{` rows. Inside a forced underline the span holds
 * `_` literal, so the rest the marker leaves holds it too.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a failed marker\'s name underscore opens', () => {
  assert.equal(html('x_@_{.c}_\n'), '<p>x_@<u>{.c}</u></p>')
  assert.equal(html('x_#_{.c}_\n'), '<p>x_#<u>{.c}</u></p>')
  assert.equal(html('x@_{.c}_\n'), '<p>x@<u>{.c}</u></p>')
  assert.equal(html('x_@_\\{.c}_\n'), '<p>x_@<u>{.c}</u></p>')
  assert.equal(html('x#_\\}_\n'), '<p>x#<u>}</u></p>')
  assert.equal(html('(x@_\\{c}_)\n'), '<p>(x@<u>{c}</u>)</p>')
  assert.equal(html('x_@_{.c} y_\n'), '<p>x_@<u>{.c} y</u></p>')
})

test('a marker that may still stand keeps its name', () => {
  assert.equal(html('@_\\{.c}_\n'), '<p><span class="mention"><strong>@_</strong></span>{.c}_</p>')
  assert.equal(html('_@ex_\n'), '<p><u><span class="mention"><strong>@ex</strong></span></u></p>')
  assert.equal(html('_@ex_{.k}\n'), '<p><u class="k"><span class="mention"><strong>@ex</strong></span></u></p>')
  assert.equal(html('a_@ex\n'), '<p>a_@ex</p>')
  assert.equal(html('x@a_b_c\n'), '<p>x@a_b_c</p>')
})

test('a failed marker in a forced underline keeps its underscores literal', () => {
  assert.equal(html('{_x_#_a__}\n'), '<p><u>x_#_a_</u></p>')
  assert.equal(html('{_x__@a-_b__}\n'), '<p><u>x__@a-_b_</u></p>')
  assert.equal(html('{_1@_a_{.c}{.d}_}\n'), '<p><u>1@_a_{.c}{.d}</u></p>')
  assert.equal(html('{*x_#_a_*}\n'), '<p><strong>x_#<u>a</u></strong></p>')
})
