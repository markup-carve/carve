import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a `: ` line at a stacked item marker column ends the item with an open description (carve#5369)', () => {
  assert.equal(render('- - a\n    :: t\n    : d\n: z\n'),
    '<ul>\n  <li>\n    <ul>\n      <li>a\n        <dl>\n          <dt>t</dt>\n          <dd>d</dd>\n' +
    '        </dl>\n      </li>\n    </ul>\n  </li>\n</ul>\n<p>: z</p>')
  assert.match(render('- x\n  - - > +\n       :: t\n       : d\n  : z\n'), /<dd>d<\/dd>\n[\s\S]*\n    : z\n  <\/li>\n<\/ul>$/)
})

test('stacked and own-line nesting read a later `: ` line alike (carve#5369)', () => {
  const norm = (html) => html.replace(/<li><p>Q<\/p>/g, '<li>').replace(/<li>Q\s*/g, '<li>').replace(/>\s+</g, '><')
  let count = 0
  for (const depth of [2, 3])
    for (const m of ['- ', '1. ', '* '])
      for (const zc of [0, 1, 2, 3, 4, 5, 6, 7])
        for (const tail of ['', 'x\n', '\n', '  y\n'])
          for (const dd of [true, false]) {
            const w = m.length
            let own = ''
            for (let k = 0; k < depth - 1; k++) own += ' '.repeat(k * w) + m + 'Q\n'
            own += ' '.repeat((depth - 1) * w) + m + 'a\n'
            const pad = ' '.repeat(depth * w)
            const body = pad + ':: t\n' + (dd ? pad + ': d\n' : '') + tail + ' '.repeat(zc) + ': z\n'
            const source = m.repeat(depth) + 'a\n' + body
            assert.equal(norm(render(source)), norm(render(own + body)), source)
            count++
          }
  assert.equal(count, 384)
})
