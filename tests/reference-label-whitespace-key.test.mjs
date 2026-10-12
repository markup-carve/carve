import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { labelKey } from '../scripts/spec/label-key.mjs'

const html = (src) => renderDoc(parse(src))
const resolves = (src) => /href="\/u"|src="\/u"/.test(html(src))

test('the shared key trims and collapses space runs only', () => {
  assert.equal(labelKey('  a   b  '), 'a b')
  assert.equal(labelKey('a\tb'), 'a\tb')
  assert.equal(labelKey('a\fb'), 'a\fb')
  assert.equal(labelKey('\ta b\t'), '\ta b\t')
  assert.equal(labelKey('\u00a0a  b\u00a0'), '\u00a0a b\u00a0')
})

test('a tab or a form feed in a label is content (PART 9R R1)', () => {
  assert.ok(!resolves('see [t][a\tb]\n\n[a b]: /u\n'))
  assert.ok(!resolves('see [t][a\fb]\n\n[a b]: /u\n'))
  assert.ok(resolves('see [t][a\tb]\n\n[a\tb]: /u\n'))
  assert.doesNotMatch(html('see [^a\tb]\n\n[^a b]: note\n'), /role="doc-noteref"/)
})

test('a definition separator is a run of spaces and a tab after it is content', () => {
  assert.ok(resolves('see [t][a]\n\n[a]:  /u\n'))
  assert.ok(!resolves('see [t][a]\n\n[a]: \t/u\n'))
  assert.ok(!resolves('see [t][a]\n\n[a]:\t/u\n'))
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

test('the implicit heading fallback folds NFC but not case', () => {
  assert.match(html('# Café\n\nsee [Cafe\u0301][]\n'), /href="#Café"/)
  assert.doesNotMatch(html('# Café\n\nsee [cafe\u0301][]\n'), /href=/)
})
