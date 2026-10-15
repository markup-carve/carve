/*
 * Ill-formed input becomes U+FFFD before the first line is read (CARVE-P0-023).
 *
 * A direct test, not a corpus pair: a corpus `.crv` is UTF-8 text decoded
 * before any engine sees it, so it cannot carry a lone surrogate, and invalid
 * bytes in it would be replaced by the harness's decoder rather than by the
 * processor under test.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))

test('a lone high surrogate in a paragraph becomes U+FFFD', () => {
  const html = render('a\uD800b *x*\n')
  assert.equal(html, render('a�b *x*\n'))
  assert.ok(html.isWellFormed())
})

test('a lone low surrogate and a reversed pair are each replaced per code unit', () => {
  assert.equal(render('a\uDC00b\n'), render('a�b\n'))
  assert.equal(render('a\uDC00\uD800b\n'), render('a��b\n'))
})

test('a lone surrogate never reaches a heading id', () => {
  const html = render('# a\uD800b\n')
  assert.equal(html, render('# a�b\n'))
  assert.ok(html.isWellFormed())
})

test('a well-formed astral character is left alone', () => {
  // The control: a pass that replaced every surrogate code unit would turn
  // U+1F600 into two U+FFFD.
  assert.match(render('a😀b\n'), /a\u{1F600}b/u)
})

test('a noncharacter is content', () => {
  assert.match(render('a￾b﷐c\n'), /a￾b﷐c/)
})
