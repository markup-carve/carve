import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).replace(/\s+/g, ' ').replace(/ ?(<[^>]+>) ?/g, '$1').trim()
const quoted = (source) => source.split('\n').slice(0, -1).map((line) => '> ' + line).join('\n') + '\n'

// §10 I4: a fence-shaped line that opens nothing (an invalid info string) is
// text, so it sets no base for the lines below it (carve#3894). A valid run
// opens even without a closer and takes the rest of the item (carve#4018).
for (const [marker, column] of [['-', 2], ['1.', 3], ['*', 2]]) {
  for (const run of ['```', '~~~', '````']) {
    for (const offset of [1, 2, 3]) {
      const pad = ' '.repeat(column)
      const other = run[0] === '~' ? '```' : '~~~'
      const lines = (opener) => [`${marker} a`, ' '.repeat(column + offset) + opener, `${pad}- c`,
        `${pad}  ${other}`, `${pad}  y`, `${pad}  ${other}`, ''].join('\n')
      const source = lines(run + 'js,title="x"')
      const tag = marker === '1.' ? 'ol' : 'ul'
      test(`an invalid ${run} opener at ${offset} past a ${marker} item keeps the sub-item's fence`, () => {
        assert.match(html(source), new RegExp(`<li>c<pre><code>y</code></pre></li></ul></li></${tag}>$`))
      })
      test(`an invalid ${run} opener at ${offset} past a quoted ${marker} item keeps the sub-item's fence`, () => {
        assert.match(html(quoted(source)), new RegExp(`<li>c<pre><code>y</code></pre></li></ul></li></${tag}></blockquote>$`))
      })
      test(`a closerless ${run} at ${offset} past a ${marker} item takes the rest of the item`, () => {
        assert.match(html(lines(run)), new RegExp(`<li>a<pre><code>- c ${other} y ${other}</code></pre></li></${tag}>$`))
      })
    }
  }
}

// §10 I1 and I4: a bare `:::` interrupts a paragraph, closer or not, at any
// indentation (rule A S3), unless the paragraph absorbed an invalid opener
// (CARVE-P9-016).
for (const indent of ['', ' ', '  ', '   ']) {
  test(`a bare ::: indented ${indent.length} under a paragraph opens a div`, () => {
    assert.equal(html(`p\n${indent}:::\n`), '<p>p</p><div></div>')
  })
  test(`a bare ::: indented ${indent.length} after an absorbed opener stays text`, () => {
    assert.equal(html(`p\n::: {.x}\n${indent}:::\n`), `<p>p ::: {.x} :::</p>`)
  })
}

test('a bare ::: past an item column under its paragraph opens a div in the item', () => {
  assert.equal(html('- a\n    :::\nTAIL\n'), '<ul><li>a<div></div></li></ul><p>TAIL</p>')
})

test('a lazy bare ::: interrupts and opens a div after the item', () => {
  assert.equal(html('- a\n:::\nb\n'), '<ul><li>a</li></ul><div><p>b</p></div>')
})

// A bare fence that does not match the innermost block's width opens one (PART 2).
test('a bare ::: of another width nests inside a div', () => {
  assert.equal(html('::::\nb\n  :::\n::::\n'), '<div><p>b</p><div><div></div></div></div>')
})
