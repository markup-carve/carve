/*
 * `name_word` admits `_`, and `_` is also the underline delimiter, so a
 * mention or tag name run and PART 9 §9's stack compete for the same
 * character. The executable reference let the run take it, so the delimiter
 * never became a candidate and the underline never paired.
 *
 * Which of the two wins is not decidable while the name matches: an `_` the
 * name keeps in `a @ex_ b` is a closer in `_@ex_ b`. So the run reaches the
 * stack as a candidate at every `_` that could close, and `resolveNameRun`
 * hands back the ones that pair with nothing.
 *
 * The two `_` a brace stands against are the grammar's, because a forced
 * underline and an attribute block both need the character before their own
 * and neither can take it back from a name run that already matched.
 *
 * `scripts/formal-core-check.mjs` cannot see any of it: no corpus document
 * writes an underline whose content ends in a mention or tag, so all 1740
 * inputs stayed conformant either way. Hence a test rather than corpus cases.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const mention = (name) => `<span class="mention"><strong>${name}</strong></span>`
const tag = (name) => `<span class="tag"><strong>${name}</strong></span>`

test('an underline closes on the name run that would have taken its delimiter', () => {
  assert.equal(html('_@ex_ y\n'), `<p><u>${mention('@ex')}</u> y</p>`)
  assert.equal(html('_#tag_ y\n'), `<p><u>${tag('#tag')}</u> y</p>`)
  assert.equal(html('x _@ex_ y\n'), `<p>x <u>${mention('@ex')}</u> y</p>`)
  assert.equal(html('_a @ex_ y\n'), `<p><u>a ${mention('@ex')}</u> y</p>`)
  // A name left with nothing but its marker is not a name at all.
  assert.equal(html('_#_ x\n'), '<p><u>#</u> x</p>')
  assert.equal(html('_@_ x\n'), '<p><u>@</u> x</p>')
})

test('the name keeps every underscore that pairs with nothing', () => {
  assert.equal(html('a @ex_ b\n'), `<p>a ${mention('@ex_')} b</p>`)
  assert.equal(html('a @ex__ b\n'), `<p>a ${mention('@ex__')} b</p>`)
  assert.equal(html('#_ x\n'), `<p>${tag('#_')} x</p>`)
  // The leading `_` never opened, so the trailing one is name.
  assert.equal(html('_ @ex_ y\n'), `<p>_ ${mention('@ex_')} y</p>`)
  // The open span is of another kind, so the name keeps its own character.
  assert.equal(html('~@ex_~ y\n'), `<p><s>${mention('@ex_')}</s> y</p>`)
})

test('only the first underscore that closes leaves the name', () => {
  // `_b` cannot close: its right neighbour is a word character.
  assert.equal(html('_@a_b_ y\n'), `<p><u>${mention('@a_b')}</u> y</p>`)
  assert.equal(html('_@ex_z_ y\n'), `<p><u>${mention('@ex_z')}</u> y</p>`)
  // It can here, so the rest of the run is ordinary content.
  assert.equal(html('_@ex_.b_ c\n'), `<p><u>${mention('@ex')}</u>.b_ c</p>`)
  assert.equal(html('_@a_-b_ c\n'), `<p><u>${mention('@a')}</u>-b_ c</p>`)
  assert.equal(html('_@ex__ y\n'), `<p><u>${mention('@ex')}</u>_ y</p>`)
  assert.equal(html('_#a__b_ c\n'), `<p><u>${tag('#a')}</u>_b_ c</p>`)
  // A name `_` is a closer and nothing else, so the pair in `@x-_y_` - where
  // the first could have opened - never splits the run.
  assert.equal(html('a @x-_y_ z\n'), `<p>a ${mention('@x-_y_')} z</p>`)
  assert.equal(html('_@x-_y_ z\n'), `<p><u>${mention('@x-_y')}</u> z</p>`)
})

test('a forced underline and an attribute block get the character first', () => {
  assert.equal(html('{_@ex_} y\n'), `<p><u>${mention('@ex')}</u> y</p>`)
  assert.equal(html('{_a_@b_} x\n'), '<p><u>a_@b</u> x</p>')
  assert.equal(html('_@ex_{.k} y\n'), `<p><u class="k">${mention('@ex')}</u> y</p>`)
  // And hands it back when neither claims it.
  assert.equal(html('a @ex_} b\n'), `<p>a ${mention('@ex_')}} b</p>`)
  assert.equal(html('a @ex_{.k} b\n'), `<p>a ${mention('@ex_')}{.k} b</p>`)
})
