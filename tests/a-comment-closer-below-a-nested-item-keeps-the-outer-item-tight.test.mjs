import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// §17 L1 (carve#3977): a comment closer pairs at any column (CARVE-P9-053), so
// one written below a nested item's column ends no sublist, and a paragraph the
// nested item holds after a blank does not loosen the outer item.
const html = (lines) => renderDoc(parse(lines.join('\n') + '\n'))
const width = (marker) => marker.includes('[') ? marker.length - 4 : marker.length

for (const outer of ['- ', '1. ', '- [ ] ']) {
  for (const inner of ['- ', '10. ']) {
    for (const run of ['%%%', '%%%%']) {
      const oc = width(outer)
      const ic = oc + width(inner)
      for (let closer = oc; closer < ic; closer++) {
        const lines = [outer + 'outer', ' '.repeat(oc) + inner + 'head', ' '.repeat(ic) + run, ' '.repeat(ic) + 'a', ' '.repeat(closer) + run, '']
        test(`"${outer}" / "${inner}", ${run} closer at column ${closer}: the outer item stays tight`, () => {
          const out = html([...lines, ' '.repeat(ic) + 'tail'])
          assert.match(out, /<p>head<\/p>\n\s*<p>tail<\/p>/)
          assert.doesNotMatch(out, /<p>outer<\/p>/)
        })
        test(`"${outer}" / "${inner}", ${run} closer at column ${closer}: a paragraph at the outer column loosens it`, () => {
          assert.match(html([...lines, ' '.repeat(oc) + 'tail']), /outer<\/p>/)
        })
      }
    }
  }
}

test('carve#3977', () => {
  assert.equal(html(['- outer', '  - head', '    %%%', '    a', '   %%%', '', '    tail']),
    '<ul>\n  <li>outer\n    <ul>\n      <li><p>head</p>\n        <p>tail</p>\n      </li>\n    </ul>\n  </li>\n</ul>')
})
