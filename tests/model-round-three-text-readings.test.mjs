import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('differing checkbox states share one task list (PART 0 [B-list-keep], PART 9 SS11 N1)', () => {
  assert.equal(html('- [ ] a\n- [x] b\n').match(/<ul/g).length, 1)
})

test('a term alone is a definition list (definition_entry)', () => {
  assert.equal(html(':: t\n'), '<dl>\n  <dt>t</dt>\n</dl>')
})

test('colon-opener recovery ends the type word at a no-break space (CARVE-P7-003)', () => {
  assert.equal(html('::: note x\nstuff\n:::\n'), '<aside class="admonition note" aria-label="Note">\n  <p>stuff</p>\n</aside>')
})

test('a top-level heading is wrapped in its section (CARVE-P2-003, CARVE-P9-019)', () => {
  assert.equal(html('# H\n^ cap\n'), '<section id="H">\n  <h1>H</h1>\n  <p>^ cap</p>\n</section>')
})
