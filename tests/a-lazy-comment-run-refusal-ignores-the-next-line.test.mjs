import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const escaped = (src) => html(src.replace(/^((?:> )?) *\{%/m, (m) => m.replace('{%', '\\{%')))

// carve#5851: a lazy `{%` run whose continuation misses its host's body column
// is refused (carve#5830 rule B), whatever line follows it (rule A).
const hosts = [
  ['nested item', '- a\n  - b\n', 4],
  ['note', '[^n]: p\n', 2],
  ['description', ':: t\n  : b\n', 4],
  ['quoted item', '> - b\n', 2],
]
const followers = ['', ' tail\n', '\n  - z\n', '   > q\nafter\n']
for (const [name, head, body] of hosts) for (const follower of followers) {
  const quote = name === 'quoted item' ? '> ' : ''
  const note = name === 'note' ? '\nx[^n]\n' : ''
  test(`a lazy comment run in a ${name} is refused before ${JSON.stringify(follower)}`, () => {
    const source = `${head}${quote}{% c\n${quote} d %}\n${follower.replace(/^(?=.)/gm, quote)}${note}`
    assert.equal(html(source), escaped(source))
  })
  test(`a comment run reaching the ${name} body column stays hidden before ${JSON.stringify(follower)}`, () => {
    const source = `${head}${quote}{% c\n${quote}${' '.repeat(body)}d %}\n${follower.replace(/^(?=.)/gm, quote)}${note}`
    assert.ok(!html(source).includes('{%'), source)
  })
}

test('the reproduction keeps its literal run before a lazy line', () => {
  assert.equal(html('- a\n  - b\n{% c\n d %}\n tail\n'), `<ul>
  <li>a
    <ul>
      <li>b
{% c
d %}
tail</li>
    </ul>
  </li>
</ul>`)
})
