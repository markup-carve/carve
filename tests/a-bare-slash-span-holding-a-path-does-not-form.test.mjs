/*
 * carve#4810: a bare `/` span whose content holds a literal `/` between two word
 * characters does not form, and all its slashes stay text.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a path with two or more segments stays text', () => {
  assert.equal(html('see /usr/local/ and the /api/v1/ route\n'), '<p>see /usr/local/ and the /api/v1/ route</p>')
  assert.equal(html('/1/2/\n'), '<p>/1/2/</p>')
  assert.equal(html('/a/b/ c/\n'), '<p>/a/b/ c/</p>')
  // A word character with its extender is still a word character.
  assert.equal(html('/é/b/\n'), '<p>/é/b/</p>')
})

test('the decline is local to the one span', () => {
  assert.equal(html('/a/b/ /c/\n'), '<p>/a/b/ <em>c</em></p>')
  assert.equal(html('/a/b *c/ d*\n'), '<p>/a/b <strong>c/ d</strong></p>')
  assert.equal(html('*/a/b/*\n'), '<p><strong>/a/b/</strong></p>')
  assert.equal(html('/see *a/b* now/\n'), '<p>/see <strong>a/b</strong> now/</p>')
})

test('a single segment and every other form still form', () => {
  assert.equal(html('/etc/\n'), '<p><em>etc</em></p>')
  assert.equal(html('{/a/b/}\n'), '<p><em>a/b</em></p>')
  assert.equal(html('/*a/b*/\n'), '<p><strong><em>a/b</em></strong></p>')
  assert.equal(html('/a\\/b/\n'), '<p><em>a/b</em></p>')
  assert.equal(html('/x `a/b` y/\n'), '<p><em>x <code>a/b</code> y</em></p>')
  assert.equal(html('/see [a/b](u) now/\n'), '<p><em>see <a href="u">a/b</a> now</em></p>')
  assert.equal(html('/a {/b/c/} d/\n'), '<p><em>a <em>b/c</em> d</em></p>')
  assert.equal(html('/a /b/\n'), '<p><em>a /b</em></p>')
  assert.equal(html('/a_/b/\n'), '<p><em>a_/b</em></p>')
})
