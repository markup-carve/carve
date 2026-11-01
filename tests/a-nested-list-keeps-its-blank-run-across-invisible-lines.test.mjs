import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const twoLists = '<ul>\n  <li>o\n    <ul>\n      <li>a</li>\n    </ul>\n    <ul>\n      <li>b</li>\n    </ul>\n  </li>\n</ul>'

test('erased comments do not split a nested list hard boundary', () => {
  for (const before of [1, 2, 3]) {
    for (const after of [0, 1, 2, 3]) {
      if (before + after < 3) continue
      const source = `- o\n  - a\n${'\n'.repeat(before)}  %% c\n${'\n'.repeat(after)}  - b\n`
      assert.equal(html(source), twoLists, `blank run ${before}+${after}`)
    }
  }
  assert.match(html('- o\n  - middle\n    - a\n\n\n    %% c\n\n    - b\n'),
    /<\/ul>\n        <ul>\n          <li>b<\/li>/)
})
