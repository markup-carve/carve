import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const F = '`'.repeat(3)

// CARVE-P2-006: a closing run indented past its opener is code content (carve#3907).
for (const run of [F, '~~~']) {
  test(`a ${run} closer past the opener stays payload at the document level`, () => {
    assert.equal(html(`${run}\na\n  ${run}\ntail\n`), `<pre><code>a\n  ${run}\ntail\n</code></pre>`)
  })
  test(`a ${run} closer past an indented opener is payload moved with it`, () => {
    assert.equal(html(` ${run}\n a\n  ${run}\n  tail\n`), `<pre><code>a\n ${run}\n tail\n</code></pre>`)
  })
}

// The fence line is paragraph text; the later unclosed opener opens on its own.
for (const [host, pad, close] of [['', '', ''], ['- ', '  ', '</li>\n</ul>'], ['> ', '> ', '</blockquote>']]) {
  test(`a text fence line and a later unclosed opener stay apart, host ${JSON.stringify(host)}`, () => {
    const lines = [`${host}x`, `${pad}${F}`, `${pad}a`, pad.trimEnd(), `${pad} ${F}`]
    const out = html(lines.join('\n') + '\n')
    assert.match(out, /<code>\na<\/code>/)
    assert.match(out, /<pre><code><\/code><\/pre>/)
    if (close) assert.ok(out.includes(close))
  })
}

test('an unclosed opener after a blank leaves a below-column line outside the item', () => {
  assert.equal(html(`- x\n  ${F}\n  a\n\n   ${F}\ntail\n`),
    `<ul>\n  <li>x\n<code>\na</code>\n    <pre><code></code></pre>\n  </li>\n</ul>\n<p>tail</p>`)
})

// §17 L3, L4: a marker body takes a `+` only with a block at its marker column.
test('a `+` with no block at the marker column stays text in the lazy child paragraph', () => {
  const out = html(`- outer\n  - inner\n  ${F}\n  +\n   ${F}\nnext\n`)
  assert.doesNotMatch(out, /<pre>/)
  assert.match(out, /\+\n<\/code>\nnext<\/li>/)
})

// carve#3912: past a below-column line the closer is measured from the authored opener.
for (const run of [F, '~~~']) for (const marker of ['- ', '1. ', '- [ ] ']) {
  test(`a moved opener's closer past a below-column line opens the fence, ${marker.trim()}, ${run}`, () => {
    const pad = ' '.repeat(marker === '1. ' ? 4 : 3)
    const doc = parse(`${marker}[^n]: text\n${pad}${run}\n${pad}code\n out\n${pad}${run}\nafter [^n]\n\nr[^n]\n`)
    assert.deepEqual(doc.blocks[0].items[0].blocks.map((block) => block.t), ['code'])
    assert.deepEqual(doc.blocks[1].lines, ['out', run, 'after [^n]'])
  })
  test(`an opener at the item column with a closer past it stays text, ${marker.trim()}, ${run}`, () => {
    const col = marker === '1. ' ? 3 : 2
    const out = html(`${marker}text\n${' '.repeat(col)}${run}\n${' '.repeat(col)}code\n out\n${' '.repeat(col + 1)}${run}\nafter\n`)
    assert.doesNotMatch(out, /<pre>/)
    assert.match(out, /after<\/li>/)
  })
}

// carve#3909: an absorbed bare `:::` leaves the description body's paragraph open.
for (const bare of [':::', '::::']) {
  test(`a description body folds the next lazy line after an absorbed ${bare}`, () => {
    assert.equal(html(`:: t\n: a\n  :::x\n  ${bare}\nTAIL\n`),
      `<dl>\n  <dt>t</dt>\n  <dd>a\n:::x\n${bare}\nTAIL</dd>\n</dl>`)
  })
}

test('a bare `:::` the paragraph did not absorb still ends the description body', () => {
  assert.match(html(':: t\n: a\n  :::\nTAIL\n'), /<p>TAIL<\/p>$/)
})
