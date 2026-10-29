import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

test('a line below a nested item folds into its line block as at depth one (carve#4081)', () => {
  assert.equal(html('- a\n  - b\n    ::: |\n    x\ny\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li>b\n        <div class="line-block">\n          <p>x<br>\ny</p>\n        </div>\n      </li>\n    </ul>\n  </li>\n</ul>')
})

test('a bare colon run after a blank opens a div in a nested item, so the line below is a document paragraph', () => {
  assert.match(html('- a\n  - m\n    :::e\n\n    :::\nl\n'), /<\/ul>\n<p>l<\/p>$/)
})

test('a closed div in a nested item leaves no paragraph for the line below', () => {
  assert.match(html('- a\n  - b\n    ::: e\n    x\n    :::\ny\n'), /<\/ul>\n<p>y<\/p>$/)
})
