import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('the reported marker is a document paragraph after the surviving item', () => {
  assert.equal(render('- x\n  :: t\n  : - ::: |\n       - item\n: z\n'), `<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>
        <ul>
          <li>
            <div class="line-block">
              <p>&nbsp;- item</p>
            </div>
          </li>
        </ul>
      </dd>
    </dl>
  </li>
</ul>
<p>: z</p>`)
})

test('a description marker at the surviving item marker column ends a nested line block', () => {
  for (const marker of ['- ', '1. ', '* [ ] ']) {
    for (const chain of ['- ::: |', '- - ::: |']) {
      for (const shift of [0, 1, 2]) {
        const source = `${marker}x\n${' '.repeat(marker.length)}:: t\n${' '.repeat(marker.length)}: ${chain}\n${' '.repeat(marker.length + 3 + chain.indexOf(':::') + shift)}- item\n: z\n`
        const html = render(source)
        assert.match(html, /<p>: z<\/p>\s*$/, source)
        assert.doesNotMatch(html, /- item<br>\s*: z/, source)
      }
    }
  }
})

test('a list in a description ends the item at its marker column (carve#5321)', () => {
  assert.match(render('- x\n  :: t\n  : prose ::: |\n       - item\n: z\n'), /<li>item<\/li>[\s\S]*<p>: z<\/p>\s*$/)
})

test('an ordinary nested list keeps a lazy definition-shaped line', () => {
  assert.match(render('- a\n  - b\n: c\n'), /<li>b\n: c<\/li>/)
  assert.match(render('- a\n    ::: note\n    - b\n: c\n'), /<li>b\n: c<\/li>/)
  assert.match(render('- x\n  :: t\n  : desc\n  - b\n: z\n'), /<li>b\n: z<\/li>/)
  assert.match(render('- x\n  :: t\n  : - ::: |\n       - item\n  - b\n: z\n'), /<li>b\n: z<\/li>/)
  assert.match(render('- x\n  :: t\n  : - ::: |\n       - item\n     - b\n: z\n'), /<li>b\n: z<\/li>/)
  assert.match(render('- x\n  :: t\n  : - ::: |\n       - deep\n      - less\n: z\n'), /<p>: z<\/p>\s*$/)
})
