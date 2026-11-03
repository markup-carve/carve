// carve#4862: a comment or one-line definition closes no list item, description
// body or footnote body; the next visible line picks the owner.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()

for (const [name, src, expected] of [
  ['item', '- a\n%% c\n  b\n', '<ul>\n  <li>a\nb</li>\n</ul>'],
  ['description', ':: t\n:  x\n%% c\n   more\n', '<dl>\n  <dt>t</dt>\n  <dd>x\nmore</dd>\n</dl>'],
  ['link definition', '- a\n[r]: /u\n  b [r][]\n', '<ul>\n  <li>a\nb <a href="/u">r</a></li>\n</ul>'],
  ['quote control', '> a\n%% c\n> b\n', '<blockquote><p>a\nb</p></blockquote>'],
  ['column-0 follower control', '- a\n%% c\nb\n', '<ul>\n  <li>a\nb</li>\n</ul>'],
]) {
  test(`the ticket's ${name} row`, () => assert.equal(html(src), expected))
}

test('an abbreviation definition closes no item either', () => {
  assert.equal(html('- a\n*[HTML]: Hyper\n  HTML\n'), html('- a\n  *[HTML]: Hyper\n  HTML\n'))
})

test('a region marker below a list still closes every item', () => {
  assert.equal(html('- a\n%% #endregion\n  b\n'), '<ul>\n  <li>a</li>\n</ul>\n<p>b</p>')
})

test('an erased comment leaves the fence to close at its own delimiter', () => {
  assert.equal(html('- a\n  ```\n  code\n%% c\n  ```\nafter\n'), html('- a\n  ```\n  code\n  ```\nafter\n'))
})

test('a comment span below the column leaves the next line to decide', () => {
  assert.equal(html('- a\n%%%\nx\n%%%\n  b\n'), html('- a\n  %%%\n  x\n  %%%\n  b\n'))
})

test('a span keeps the extent it has where it is written', () => {
  assert.equal(html('- a\n%%% c\noutside\n%%%\n  b\n'), '<ul>\n  <li>a\n    b\n  </li>\n</ul>')
})
