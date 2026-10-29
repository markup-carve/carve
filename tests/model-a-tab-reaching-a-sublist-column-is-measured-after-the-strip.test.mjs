/*
 * carve#4066: an item's body parse strips the content column and walks the
 * rest again (PART 9 SS24 C5). A tab past a content column off a tab stop
 * reaches further there than in the parent's columns, so the parent asks
 * whether a line reaches a descendant's column in the body's own measure.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

test('a fence whose tab reaches a third-level item content column opens in it', () => {
  assert.equal(html('- - 10. a\n    \t```\n    \tx\n    \t```\n'), [
    '<ul>',
    '  <li>',
    '    <ul>',
    '      <li>',
    '        <ol start="10">',
    '          <li>a',
    '            <pre><code>x',
    '</code></pre>',
    '          </li>',
    '        </ol>',
    '      </li>',
    '    </ul>',
    '  </li>',
    '</ul>',
  ].join('\n'))
})

test('the tab spelling reads like the space spelling of the same column', () => {
  const blocks = [['```', 'x', '```'], ['> q'], ['::: d', 'y', ':::']]
  for (const head of ['- - 10. a', '- - - a', '- - 1. a']) {
    for (const block of blocks) {
      for (const blank of ['', '\n']) {
        const tab = `${head}\n${blank}${block.map((line) => `    \t${line}`).join('\n')}\n`
        const spaces = `${head}\n${blank}${block.map((line) => `        ${line}`).join('\n')}\n`
        assert.equal(html(tab), html(spaces), JSON.stringify(tab))
      }
    }
  }
})

test('a tab short of the descendant column stays in the item', () => {
  assert.equal(html('- - 10. a\n  \t```\n  \tx\n  \t```\n'), html('- - 10. a\n    ```\n    x\n    ```\n'))
})
