/*
 * `bare_opener(d) = <!(alnum | '_' | d | slash_if(d)), d, !(ws | d)`: the `'_'`
 * term is the template's own, so it blocks every delimiter, while slash_if(d)
 * blocks only `/` and `_`. The executable reference carried `alnum` and `d`
 * and reached `_` only through the slash_if branch, so `*`, `~` and `=` opened
 * after an intraword underscore.
 *
 * `scripts/formal-core-check.mjs` cannot see it: no corpus document writes a
 * bare delimiter against an underscore, so all 1740 inputs stayed conformant
 * either way. Hence a test rather than corpus cases.
 *
 * The guard is not a flat `prev === '_'`. An underscore that pairs as an
 * opener is markup, and a span does nest inside it, so every suppression row
 * carries the nesting control that rules that reading out.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a bare delimiter does not open after an intraword underscore', () => {
  assert.equal(html('a_*x* y\n'), '<p>a_*x* y</p>')
  assert.equal(html('a_~x~ y\n'), '<p>a_~x~ y</p>')
  assert.equal(html('a_=x= y\n'), '<p>a_=x= y</p>')
  // The `_` standing before the delimiter is itself preceded by one, so the
  // run's second underscore is content just as its first is.
  assert.equal(html('a__*x* y\n'), '<p>a__*x* y</p>')
  // The `/` and `_` halves of the same guard, unchanged.
  assert.equal(html('a_/x/ y\n'), '<p>a_/x/ y</p>')
  assert.equal(html('a_/_a_ y\n'), '<p>a_/_a_ y</p>')
})

test('a bare delimiter does open after an underscore that opens a span', () => {
  assert.equal(html('_*x*_ y\n'), '<p><u><strong>x</strong></u> y</p>')
  assert.equal(html('_~x~_ y\n'), '<p><u><s>x</s></u> y</p>')
  assert.equal(html('_=x=_ y\n'), '<p><u><mark>x</mark></u> y</p>')
  assert.equal(html('a _*x*_ y\n'), '<p>a <u><strong>x</strong></u> y</p>')
  // The underline's own delimiter reads the same boundary: `_` opens after a
  // `*` that closed, because that `*` is not an underscore or a slash.
  assert.equal(html('*x*_y_ z\n'), '<p><strong>x</strong><u>y</u> z</p>')
})

test('slash_if stays restricted to italic and underline', () => {
  assert.equal(html('a/~y~ z\n'), '<p>a/<s>y</s> z</p>')
  assert.equal(html('a/*y* z\n'), '<p>a/<strong>y</strong> z</p>')
  assert.equal(html('a/=y= z\n'), '<p>a/<mark>y</mark> z</p>')
  // Italic and underline do carry it, so a path's segments stay literal.
  assert.equal(html('/a/_b_ c\n'), '<p><em>a</em>_b_ c</p>')
  assert.equal(html('snake_/case/ x\n'), '<p>snake_/case/ x</p>')
  // And a slash at a clean left boundary is an opener, so they nest.
  assert.equal(html('/_x_/ y\n'), '<p><em><u>x</u></em> y</p>')
  assert.equal(html('_/x/_ y\n'), '<p><u><em>x</em></u> y</p>')
})
