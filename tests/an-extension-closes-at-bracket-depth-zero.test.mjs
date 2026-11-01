/*
 * An inline extension's content closes at the `]` at bracket depth zero; an
 * unbalanced `[` falls back to the first unescaped `]` (carve#4513).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const ext = (body, name = 'foo') => `<span class="ext-${name}">${body}</span>`

for (const [src, out] of [
  [':foo[[x](u) y]', ext('<a href="u">x</a> y')],
  [':foo[a [b] c]', ext('a [b] c')],
  [':foo[a [b [c] d] e]', ext('a [b [c] d] e')],
  [':foo[[x]]', ext('[x]')],
  [':foo[]', ext('')],
  // Past depth zero and with an unbalanced `[`, the first `]` closes.
  [':foo[a]b]', `${ext('a')}b]`],
  [':foo[a [b c] d', `${ext('a [b c')} d`],
  [':foo[[a] b', `${ext('[a')} b`],
  [':foo[[[a] b] c', `${ext('[[a')} b] c`],
  // Escapes do not count toward the depth.
  [':foo[a\\]b]', ext('a]b')],
  [':foo[a\\[b]', ext('a[b')],
  [':foo[a\\[b] c]', `${ext('a[b')} c]`],
  [':foo[a\\\\]b]', `${ext('a\\')}b]`],
  // A nested extension and an attribute block.
  [':foo[:bar[x] y]', ext(`${ext('x', 'bar')} y`)],
  [':foo[[x](u)]{.c}', '<span class="ext-foo c"><a href="u">x</a></span>'],
  // The depth count does not read code spans; the `]` bounds the run (carve#3973 X5).
  [':foo[`a] b`', `${ext('<code>a</code>')} b<code></code>`],
]) {
  test(`${src} renders ${out}`, () => {
    assert.equal(html(`${src}\n`), `<p>${out}</p>`)
  })
}

test('a long chain of openers stays bounded', () => {
  const src = `:a[${'['.repeat(32000)}]\n`
  assert.ok(html(src).includes('ext-a'))
})
