import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { labelKey } from '../scripts/spec/label-key.mjs'

const html = (src) => renderDoc(parse(src))
const resolves = (src) => /href="\/u"|src="\/u"/.test(html(src))

test('the shared key trims and collapses only ASCII whitespace', () => {
  assert.equal(labelKey(' \ta\r\n\fb '), 'a b')
  assert.equal(labelKey('\u00a0a  b\u00a0'), '\u00a0a b\u00a0')
})

test('explicit and collapsed link labels normalize ASCII whitespace', () => {
  assert.ok(resolves('see [t][ a  b ]\n\n[a b]: /u\n'))
  assert.ok(resolves('see [ a  b ][]\n\n[a b]: /u\n'))
})

test('image labels use the same key', () => {
  assert.ok(resolves('![ a  b ][]\n\n[a b]: /u\n'))
})

test('case and non-ASCII whitespace remain significant', () => {
  assert.ok(!resolves('see [t][A B]\n\n[a b]: /u\n'))
  assert.ok(!resolves('see [t][a\u00a0b]\n\n[a b]: /u\n'))
})

test('normalization does not make a multiline bracket label valid', () => {
  assert.ok(!resolves('see [t][a\nb]\n\n[a b]: /u\n'))
})

test('footnotes resolve through the shared key', () => {
  assert.match(html('see [^ a  b ]\n\n[^a b]: note\n'), /role="doc-noteref"/)
})

test('normalized collisions retain the established winner rules', () => {
  const links = parse('[a b]: /first\n\n[a  b]: /last\n')
  assert.equal(links.linkDefs.get('a b').url, '/last')
  assert.equal(links.linkDefs.get('a b').rawLabel, 'a  b')
  assert.match(html('[t][a b]\n\n[a b]: /first\n\n[a  b]: /last\n'), /href="\/last"/)

  assert.match(
    html('see [^a b]\n\n[^a b]: first\n\n[^a  b]: second\n'),
    />first</,
  )
})

test('the implicit heading fallback still folds case and NFC', () => {
  assert.match(html('# Café\n\nsee [cafe\u0301][]\n'), /href="#Café"/)
})
