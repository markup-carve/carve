import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const leaks = (html) => /\u0000|[-]/.test(html)

test('a lazy line after a refused note plus folds without the walk quote prefix (carve#5511)', () => {
  assert.equal(renderDoc(parse('[^a]: +\n+\n\n  > q\nlazy\n')).trim(), '<p>&gt; q\nlazy</p>')
  assert.equal(renderDoc(parse('[^a]: +\n+\n\n  [^b]: > q\nlazy\n')).trim(), '<p>[^b]: &gt; q\nlazy</p>')
})

test('no lazy frame leaks after a refused note plus in any host', () => {
  const hosts = [
    (l) => l,
    (l) => l.map((x) => (x === '' ? '>' : '> ' + x)),
    (l) => l.map((x, i) => (i === 0 ? '- ' + x : x === '' ? '' : '  ' + x)),
  ]
  const followers = ['> q', '> > q', '[^b]: > q', '- > q', '> - q', 'q']
  let checked = 0
  for (const host of hosts) {
    for (const pluses of [1, 2]) {
      for (const blanks of [0, 1]) {
        for (const follower of followers) {
          for (const indent of [0, 1, 2, 3, 4]) {
            for (const lazy of ['lazy', 'lazy\nmore']) {
              const lines = ['[^a]: +', ...Array(pluses).fill('+'), ...Array(blanks).fill(''), ' '.repeat(indent) + follower]
              const source = host(lines).join('\n') + '\n' + lazy + '\n\nsee[^a][^b]\n'
              assert.ok(!leaks(renderDoc(parse(source))), source)
              checked++
            }
          }
        }
      }
    }
  }
  assert.equal(checked, 720)
})
