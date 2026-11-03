import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s*\n\s*/g, ' ').replace(/> /g, '>').replace(/ </g, '<')

const pinned = [
  ['a list marker with no content is text, not structural (CARVE-P9-080)', '| a |\n-\n^ cap\n', '<table><tbody><tr><td>a</td></tr></tbody></table><p>- ^ cap</p>'],
  ['a + without an eligible host is text (CARVE-P9-080)', '| a |\n+\n^ cap\n', '<table><tbody><tr><td>a</td></tr></tbody></table><p>+ ^ cap</p>'],
  ['a quote prefix alone gives a + no host (PART 2)', '> a\n> +\n> b\n', '<blockquote><p>a + b</p></blockquote>'],
  ['a + at an inner quote\'s marker column, through the outer prefix (PART 2)', '> > a\n> +\n> b\n', '<blockquote><blockquote><p>a</p><p>b</p></blockquote></blockquote>'],
  ['a refused marker renders nothing (CARVE-P9-067)', '- ```\n  x\n+\n\n  y\n', '<ul><li><pre><code>x</code></pre></li></ul><p>y</p>'],
  ['a list marker after a refused + is a sibling (CARVE-P9-067)', '- a\n+\n- b\n', '<ul><li>a</li><li>b</li></ul>'],
  ['a + without an eligible host folds under a paragraph (CARVE-P9-067)', 'p\n+\n- b\n', '<p>p + - b</p>'],
  ['= before > never opens (CARVE-P3-022)', '=>a=\n', '<p>=&gt;a=</p>'],
  ['an arrow whose = closes a span is gone (§9)', '=a<=>=b=\n', '<p><mark>a&lt;</mark>≥b=</p>'],
  ['a + follower that attaches consumes both (CARVE-P9-067)', '- +\n+\nx\n', '<ul><li>x</li></ul>'],
  ['a refused + follower renders nothing (CARVE-P9-067)', '- +\n+\n\nx\n', '<ul><li></li></ul><p>x</p>'],
]

for (const [name, source, expected] of pinned) {
  test(name, () => assert.equal(html(source), expected))
}

test('the second marker of one claimed block is reported as refused', () => {
  const stateSink = {}
  const source = '- +\n[^n]: a\n+\n> q\n\nsee[^n]\n'
  const rendered = renderDoc(parse(source, { stateSink }))
  assert.ok(stateSink.refusedPlusLines.includes(2))
  assert.doesNotMatch(rendered, /<p>\+<\/p>/)
})

test('a plus inside an invisible comment fence is not a refused marker', () => {
  const stateSink = {}
  parse('- a\n+\n%%%\n+\n%%%\nb\n', { stateSink })
  assert.deepEqual(stateSink.refusedPlusLines, [])
})
