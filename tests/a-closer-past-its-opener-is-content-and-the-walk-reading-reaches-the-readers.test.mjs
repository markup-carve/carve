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

// The fence line interrupts the paragraph (carve#4018); the later run past it is payload.
for (const [host, pad, close] of [['', '', ''], ['- ', '  ', '</li>\n</ul>'], ['> ', '> ', '</blockquote>']]) {
  test(`a fence line opens and a later run past it is payload, host ${JSON.stringify(host)}`, () => {
    const lines = [`${host}x`, `${pad}${F}`, `${pad}a`, pad.trimEnd(), `${pad} ${F}`]
    const out = html(lines.join('\n') + '\n')
    assert.match(out, /<p>x<\/p>|<li>x\n/)
    assert.ok(out.includes(`<pre><code>a\n\n ${F}\n</code></pre>`))
    if (close) assert.ok(out.includes(close))
  })
}

test('an unclosed opener after a blank leaves a below-column line outside the item', () => {
  assert.equal(html(`- x\n  ${F}\n  a\n\n   ${F}\ntail\n`),
    `<ul>\n  <li>x\n    <pre><code>a\n\n ${F}\n</code></pre>\n  </li>\n</ul>\n<p>tail</p>`)
})

// §17 L3, L4 with carve#4018: the fence opens at the outer item column, so the `+` is its payload.
test('a `+` under a fence at the outer item column is fence payload', () => {
  const out = html(`- outer\n  - inner\n  ${F}\n  +\n   ${F}\nnext\n`)
  assert.match(out, /<li>inner<\/li>\n\s*<\/ul>\n\s*<pre><code>\+\n `{3}\n<\/code><\/pre>/)
  assert.match(out, /<\/ul>\n<p>next<\/p>$/)
})

// carve#3912, carve#4018: a below-column line ends an open fence; no closer is searched below it.
for (const run of [F, '~~~']) for (const marker of ['- ', '1. ', '- [ ] ']) {
  test(`a moved opener opens the fence and a below-column line ends it, ${marker.trim()}, ${run}`, () => {
    const pad = ' '.repeat(marker === '1. ' ? 4 : 3)
    const doc = parse(`${marker}[^n]: text\n${pad}${run}\n${pad}code\n out\n${pad}${run}\nafter [^n]\n\nr[^n]\n`)
    assert.deepEqual(doc.blocks[0].items[0].blocks.map((block) => block.t), ['code'])
    assert.deepEqual(doc.blocks[1].lines, ['out'])
    assert.deepEqual(doc.blocks[2], { t: 'code', lang: '', title: null, text: 'after [^n]\n\nr[^n]\n' })
  })
  test(`an opener at the item column opens without a closer in the item, ${marker.trim()}, ${run}`, () => {
    const col = marker === '1. ' ? 3 : 2
    const doc = parse(`${marker}text\n${' '.repeat(col)}${run}\n${' '.repeat(col)}code\n out\n${' '.repeat(col + 1)}${run}\nafter\n`)
    assert.deepEqual(doc.blocks[0].items[0].blocks.map((block) => block.t), ['para', 'code'])
    assert.deepEqual(doc.blocks[1].lines, ['out'])
    assert.deepEqual(doc.blocks[2], { t: 'code', lang: '', title: null, text: 'after\n' })
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
