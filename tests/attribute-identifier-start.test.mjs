/*
 * An attribute identifier may not START with `-`.
 *
 * PART 7 is normative and says so:
 *
 *   identifier = (letter | '_'), {letter | digit | '_' | '-'} ;
 *
 * `resources/carve-core.ohm` had `identStart = letter | "_" | "-"`, so the oracle
 * accepted `{--flag}` and `{#-id}` as attributes where carve-js, carve-rs and
 * carve-php all read literal text - the oracle claiming an input and rendering
 * something else, which is the DEFECT bucket (carve#722).
 *
 * `scripts/formal-core-check.mjs` never saw it: no corpus document writes a
 * dash-first identifier, so all 609 inputs were conformant with the wrong rule in
 * place. That is why these assertions exist as a test rather than as a corpus
 * case - the sweep can only be as good as the shapes it is fed.
 *
 * The dash is still legal from the SECOND character on (`identRest`), which is
 * most of what authors write - `{.my-class}`, `{#my-id}`, `{data-x=1}` - so the
 * boundary is asserted in both directions.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a dash-first bare attribute is literal text', () => {
  // Rendered with smart typography, so the `--` becomes an en dash - which is
  // itself evidence the braces were treated as ordinary content.
  assert.match(html('[x]{--flag}\n'), /^<p>\[x\]\{.flag\}<\/p>$/, html('[x]{--flag}\n'))
  assert.ok(!html('[x]{--flag}\n').includes('<span'), 'it became a span')
})

test('a dash-first id is literal text', () => {
  const out = html('[x]{#-id}\n')
  assert.ok(!out.includes('id="-id"'), out)
  // `#-id` in content is a tag (PART 9 §19), which is what the engines render.
  assert.match(out, /class="tag"/, out)
})

test('a dash-first key=value is literal text', () => {
  const out = html('[x]{-a=1}\n')
  assert.equal(out, '<p>[x]{-a=1}</p>')
})

test('a dash-first attribute on a list marker does not open a list', () => {
  // The marker-attribute form goes through the same identifier rule, and an
  // invalid block there has to leave the line a paragraph.
  assert.equal(html('-{--flag} item\n'), '<p>-{–flag} item</p>')
  assert.match(html('1.{#-id} item\n'), /^<p>1\.\{/, html('1.{#-id} item\n'))
})

test('a dash is still legal after the first character', () => {
  // The boundary the fix must not cross - and the forms authors actually write.
  assert.equal(html('[x]{.ok-class}\n'), '<p><span class="ok-class">x</span></p>')
  assert.equal(html('[x]{#ok-id}\n'), '<p><span id="ok-id">x</span></p>')
  assert.equal(html('[x]{k-v=1}\n'), '<p><span k-v="1">x</span></p>')
})

test('an underscore may still start an identifier', () => {
  // PART 7 allows `_` first; only `-` was over-permitted.
  assert.equal(html('[x]{_u}\n'), '<p><span _u="">x</span></p>')
})

test('a colon is still not an identifier character', () => {
  // Unchanged, and the control that shows this is about the dash specifically
  // rather than identifiers becoming stricter in general.
  assert.equal(html('[x]{a:b}\n'), '<p>[x]{a:b}</p>')
})

test('a raw-format name is still parsed, and a dash-first one is not', () => {
  // `extName` shares `identStart`, so the fix reaches it too. Both rows match
  // carve-js.
  assert.equal(html('`<b>y</b>`{=html}\n'), '<p><b>y</b></p>')
  assert.equal(html('`z`{=-bad}\n'), '<p><code>z</code>{=-bad}</p>')
})
