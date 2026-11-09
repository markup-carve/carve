import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { cellSource } from './plus-ownership-table.test.mjs'

const render = source => renderDoc(parse(source))

test('a refused brace run keeps the following plus literal in every marker host (#5658 R03)', () => {
  for (const host of ['item', 'note', 'dd']) for (const form of ['marker', 'own', 'stacked']) {
    const source = cellSource({ host, form, block: 'brace', follower: 'refused `+`', blank: false, ctx: 'plain' })
    const html = render(source)
    assert.match(html, /\{\.x\n\.y\}\n\+\nzq/, `${host} ${form}\n${source}\n${html}`)
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
