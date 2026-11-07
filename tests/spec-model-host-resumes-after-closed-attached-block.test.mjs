import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// After a closed block a marker-line `+` takes, the host resumes at its content
// column, whatever block follows (CARVE-P0-024, carve#5407).
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><')
const render = (src) => norm(renderDoc(parse(src)))

test('a list marker after a closed attached fence and a blank opens a sub-list in the item', () => {
  assert.equal(render('- +\n```\n```\n\n  - x\n'), '<ul><li><pre><code></code></pre><ul><li>x</li></ul></li></ul>')
})

test('a heading after a closed attached fence and a blank stays in the item', () => {
  assert.equal(render('- +\n```\n```\n\n  # h\n'), '<ul><li><pre><code></code></pre><h1 id="h">h</h1></li></ul>')
})

const hosts = {
  item: (body) => [`- +\n${body}`, '<ul><li>', '</li></ul>'],
  note: (body) => [`[^1]: +\n${body}\n[^1]\n`, '<li id="fn1">', '<p><a href="#fnref1"'],
  description: (body) => [`:: t\n: +\n${body}`, '<dd>', '</dd>'],
}
const blocks = ['```\n```', '~~~\n~~~', '::: x\n:::', '# h', '> q', '| a |']
const followers = ['tail', '- y', '# g', '> z', '::: w\n  :::']

for (const [name, host] of Object.entries(hosts)) {
  for (const block of blocks) {
    for (const blank of ['\n', '']) {
      for (const follower of followers) {
        // With no blank, `  > z` continues the quote, and an interrupting line's end of the quote is a separate case.
        if (block === '> q' && !blank && follower !== 'tail' && follower !== '- y') continue
        const body = `${block}\n${blank}  ${follower}\n`
        test(`the ${name} keeps ${JSON.stringify(follower)} after ${JSON.stringify(block)}${blank ? ' and a blank' : ''}`, () => {
          const [src, open, close] = host(body)
          const html = render(src)
          const inner = html.slice(html.indexOf(open) + open.length, html.lastIndexOf(close))
          const leaf = follower === 'tail' ? 'tail' : follower.startsWith('- ') ? '<li>y</li>' : follower.startsWith('#') ? '>g</h1>' : follower.startsWith('>') ? '<p>z</p>' : '<div class="w">'
          assert.ok(inner.includes(leaf), `${JSON.stringify(src)} rendered ${html}`)
        })
      }
    }
  }
}
