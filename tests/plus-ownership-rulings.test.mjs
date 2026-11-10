import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { cellSource } from './plus-ownership-table.test.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const render = source => renderDoc(parse(source))

test('a refused brace run leaves the following plus to its host (#5830 R03)', () => {
  for (const host of ['item', 'note', 'dd']) for (const form of ['marker', 'own', 'stacked']) {
    const source = cellSource({ host, form, block: 'brace', follower: 'refused `+`', blank: false, ctx: 'plain' })
    const html = render(source)
    assert.equal(html, render(source.replace('{', '\\{')), `${host} ${form}\n${source}\n${html}`)
    assert.doesNotMatch(html, /%%/, `${host} ${form}`)
  }
})

test('a shifted run after an own-line fence blank opens in the parent (#5658 F06)', () => {
  for (const host of ['item', 'note', 'dd']) {
    const source = cellSource({ host, form: 'own', block: 'unclosed fence', follower: 'shifted fence', blank: true, ctx: 'plain' })
    const html = render(source)
    assert.match(html, /<pre><code>a\n\n<\/code><\/pre>/, `${host}\n${source}\n${html}`)
    assert.match(html, /<pre><code> zq<\/code><\/pre>/, `${host}\n${source}\n${html}`)
    assert.equal((html.match(/<pre><code>/g) ?? []).length, 2, `${host}\n${source}\n${html}`)
  }
})

test('a refused marker ends the item fence but keeps the item (#5637)', () => {
  for (const [source, fragment] of [
    ['- ```\n+\n  x', '<pre><code></code></pre>\n    x\n  </li>'],
    ['- ```\n+\n\n  x', '<pre><code></code></pre>\n    <p>x</p>\n  </li>'],
    ['- ```\n  a\n+\n  x', '<pre><code>a\n</code></pre>\n    x\n  </li>'],
    ['- x\n  - L\n+\n  p', '<li>L</li>\n    </ul>\n    p\n  </li>'],
  ]) {
    assert.ok(render(source).includes(fragment), source)
    assert.equal(modelTrace(source).at(-1).owner, 'doc/item:1', source)
  }
})

test('an own-line fence trace releases a line that misses its host after the retained blank (#5640)', () => {
  const source = '- p\n+\n```\ncode\n\n  tail\n\nsee'
  const trace = modelTrace(source)
  assert.equal(trace[6].form, 'payload')
  assert.equal(trace[7].owner, 'doc')
  assert.equal(trace[7].form, 'text')
  assert.match(render(source), /<\/ul>\n<p>see<\/p>$/)
})
