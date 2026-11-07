import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a blank after a definition list a quote `+` attaches loosens the item (carve#5378)', () => {
  assert.equal(render('- a\n  > +\n  :: t\n  : u\n\n    : z\n'),
    '<ul>\n  <li><p>a</p>\n    <blockquote>\n      <dl>\n        <dt>t</dt>\n        <dd>u</dd>\n      </dl>\n' +
    '    </blockquote>\n    <p>: z</p>\n  </li>\n</ul>')
})

test('the `+` spelling and the prefixed spelling of the quoted list read alike (carve#5378)', () => {
  let count = 0
  for (const host of ['- a', '1. a', '* a'])
    for (const dl of [[':: t', ': u'], [':: t', ': u', ': v'], [':: t', ': u', '  more']])
      for (const zc of [2, 3, 4, 5, 6])
        for (const z of [': z', 'w', ':: s']) {
          const ind = host.startsWith('1.') ? '   ' : '  '
          const tail = ['', ' '.repeat(zc + ind.length - 2) + z]
          const plus = [host, `${ind}> +`, ...dl.map((l) => ind + l), ...tail].join('\n') + '\n'
          const prefixed = [host, ...dl.map((l) => `${ind}> ${l}`), ...tail].join('\n') + '\n'
          assert.equal(render(plus), render(prefixed), plus)
          count++
        }
  assert.equal(count, 135)
})
