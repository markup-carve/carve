import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source)).trim()

test('a marked blank and refused description leave the next paragraph outside the quote', () => {
  assert.equal(render('> - x\n>\n>   :: t\n>   : +\npara\n'), `<blockquote>
  <ul>
    <li><p>x</p>
      <dl>
        <dt>t</dt>
        <dd></dd>
      </dl>
    </li>
  </ul>
</blockquote>
<p>para</p>`)
})

for (const depth of [1, 2, 3]) {
  const quote = '> '.repeat(depth)
  for (const marker of ['- x', '1. x']) {
    for (const follower of ['para', '  para']) {
      test(`marked blank closes the stale quote paragraph: ${depth}, ${marker}, ${JSON.stringify(follower)}`, () => {
        const source = `${quote}${marker}\n${quote.trimEnd()}\n${quote}  :: t\n${quote}  : +\n${follower}\n`
        assert.ok(render(source).endsWith(`</blockquote>\n<p>${follower.trim()}</p>`), source)
      })
    }
  }
}
