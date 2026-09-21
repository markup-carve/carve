/*
 * Every identifier in the executable grammar reads the ENUMERATED ASCII
 * alphabet, not Unicode.
 *
 * PART 7 spells `letter` as the 52 ASCII letters, and `identifier`,
 * `name_word`, `symbol_name`, `email_char` and `language_info` all build on
 * it. Ohm's BUILT-IN `letter` follows Unicode, so `resources/carve-core.ohm`
 * accepted `{.é}`, `{#é}`, `{é=1}`, `{é}`, `:é[x]`, `#é`, `@é`, `:é:{.big}`
 * and `<me@exämple.com>` - nine shapes carve-js, carve-php and carve-rs all
 * leave as literal text. carve#844 narrowed `scheme` for this reason and left
 * the rest of the family behind.
 *
 * `scripts/formal-core-check.mjs` cannot see it: no corpus document writes a
 * non-ASCII identifier, so every input stayed conformant with the wrong
 * alphabet in place. Hence a test rather than a corpus case.
 *
 * Each row carries its ASCII CONTROL, because a rule narrowed to match nothing
 * passes a rejection table on its own.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

// U+00E9 (Ll), U+4F8B (Lo) and U+0430 (Ll, Cyrillic) are letters to Unicode
// and not to PART 7. The full-width digit is the same claim for `digit`.
const NON_ASCII = ['é', '例', 'а', '３']

test('a non-ASCII class or id is literal text', () => {
  for (const ch of NON_ASCII) {
    assert.equal(html(`[x]{.${ch}}\n`), `<p>[x]{.${ch}}</p>`, `class .${ch}`)
    assert.equal(html(`[x]{#${ch}}\n`), `<p>[x]{#${ch}}</p>`, `id #${ch}`)
  }
  assert.equal(html('[x]{.ok}\n'), '<p><span class="ok">x</span></p>')
  assert.equal(html('[x]{#ok}\n'), '<p><span id="ok">x</span></p>')
})

test('a non-ASCII attribute key, bare or valued, is literal text', () => {
  for (const ch of NON_ASCII) {
    assert.equal(html(`[x]{${ch}=1}\n`), `<p>[x]{${ch}=1}</p>`, `key ${ch}=1`)
    assert.equal(html(`[x]{${ch}}\n`), `<p>[x]{${ch}}</p>`, `boolean ${ch}`)
  }
  assert.equal(html('[x]{k=1}\n'), '<p><span k="1">x</span></p>')
  assert.equal(html('[x]{k}\n'), '<p><span k="">x</span></p>')
})

test('the alphabet is ASCII after the first character too', () => {
  // `identRest` carried the same built-in, so a valid ASCII start did not stop
  // the rest of the name from going Unicode.
  assert.equal(html('[x]{.a-é}\n'), '<p>[x]{.a-é}</p>')
  // The brace content is not an attribute block, so `#a` reaches the content
  // as a tag - which is what all three engines render.
  assert.equal(
    html('[x]{#aé}\n'),
    '<p>[x]{<span class="tag"><strong>#a</strong></span>é}</p>',
  )
  assert.equal(html('[x]{.a-b}\n'), '<p><span class="a-b">x</span></p>')
})

test('an extension name and a raw-format name are ASCII', () => {
  assert.equal(html(':é[x]\n'), '<p>:é[x]</p>')
  assert.equal(html('`z`{=é}\n'), '<p><code>z</code>{=é}</p>')
  assert.equal(html(':kbd[x]\n'), '<p><span class="ext-kbd">x</span></p>')
  assert.equal(html('`<b>y</b>`{=html}\n'), '<p><b>y</b></p>')
})

test('a tag or mention name is ASCII', () => {
  assert.equal(html('#é t\n'), '<p>#é t</p>')
  assert.equal(html('@é m\n'), '<p>@é m</p>')
  assert.match(html('#tag t\n'), /class="tag"/)
  assert.match(html('@ex m\n'), /class="mention"/)
})

test('a symbol shortcode name is ASCII', () => {
  // The BARE form renders literally either way - core has no symbol map - so
  // the attributed form is what can tell a parse from a non-parse.
  assert.equal(html(':é:{.big}\n'), '<p>:é:{.big}</p>')
  assert.equal(html(':rocket:{.big}\n'), '<p><span class="big">:rocket:</span></p>')
})

test('an email autolink is ASCII on both sides of the @', () => {
  assert.equal(html('<me@exämple.com>\n'), '<p>&lt;me@exämple.com&gt;</p>')
  assert.equal(html('<mé@example.com>\n'), '<p>&lt;mé@example.com&gt;</p>')
  // The TLD is its own run in the production and needs its own row.
  assert.equal(html('<me@example.cöm>\n'), '<p>&lt;me@example.cöm&gt;</p>')
  assert.match(html('<me@example.com>\n'), /<a href="mailto:me@example\.com">/)
})
