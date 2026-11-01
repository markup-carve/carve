import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4755: an item on a note's marker line has its content column where its
// text starts (CARVE-P9-083, CARVE-P9-067), so its fence reads payload there
// exactly as the same item indented to that column does in the document.
const render = source => renderDoc(parse(source))
const note = html => html.slice(html.indexOf('<li id="fn1">') + 13, html.lastIndexOf('</li>\n  </ol>'))
const norm = html => html.replace(/<a href="#fnref1"[^>]*>↩<\/a>/g, '').replace(/<p><\/p>/g, '')
  .split('\n').map(l => l.trim()).filter(Boolean).join('\n')

const chains = ['- ', '1. ', '- - ', '-  ', '-{.c} ']
const fences = [['```js', '```'], ['~~~', '~~~'], ['```=html', '```'], ['%%%', '%%%']]
const bodies = [p => `${p}x\n${p}F\n`, p => `${p}x\n\n${p}y\n${p}F\n`, p => `${p}x\n${p}  F\n`]

for (const chain of chains) for (const [open, close] of fences) {
  test(`${JSON.stringify(chain + open)} on a note's marker line reads like the item at its source column`, () => {
    for (const body of bodies) for (let pad = 2; pad <= 11; pad++) {
      const tail = body(' '.repeat(pad)).replaceAll('F', close)
      const inNote = note(render(`[^n]: ${chain}${open}\n${tail}\n[^n]\n`))
      const atDocument = render(`      ${chain}${open}\n${tail}\n`)
      assert.equal(norm(inNote), norm(atDocument), JSON.stringify(tail))
    }
  })
}

test('a closer at the item content column closes the fence', () => {
  assert.match(render('x[^n]\n\n[^n]: - ```js\n        a\n        ```\n'), /<li>\n {10}<pre><code class="language-js">a\n<\/code><\/pre>\n {8}<\/li>/)
})
