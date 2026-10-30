// CARVE-P9-041 and carve#4178: insert, delete and substitution content is markup
// inside a run, not a run, so a `%%` at its start is text.
import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a %% at the start of editorial content is text', () => {
  assert.equal(html('{+%% b+}\n'), '<p><ins>%% b</ins></p>')
  assert.equal(html('{-%% *b*-}\n'), '<p><del>%% <strong>b</strong></del></p>')
  assert.equal(html('{~%% a~>%% b~}\n'), '<p><del>%% a</del><ins>%% b</ins></p>')
})

test('a separated %% inside editorial content is still a comment', () => {
  assert.equal(html('x {+a %% b+} y\n'), '<p>x <ins>a</ins> y</p>')
})

test('a link inside editorial content is a run of its own again', () => {
  assert.equal(html('{+[%% b](u)+}\n'), '<p><ins><a href="u"></a></ins></p>')
})
