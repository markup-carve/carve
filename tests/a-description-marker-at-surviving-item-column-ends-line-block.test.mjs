import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))

test('a description marker at the surviving item marker column ends a nested line block', () => {
  for (const marker of ['- ', '1. ', '* [ ] ']) {
    for (const chain of ['- ::: |', '- - ::: |']) {
      for (const shift of [0, 1, 2]) {
        const source = `${marker}x\n${' '.repeat(marker.length)}:: t\n${' '.repeat(marker.length)}: ${chain}\n${' '.repeat(marker.length + 5 + shift)}- item\n: z\n`
        const html = render(source)
        assert.match(html, /<p>: z<\/p>\s*$/, source)
        assert.doesNotMatch(html, /- item<br>\s*: z/, source)
      }
    }
  }
})

test('an ordinary nested list keeps a lazy definition-shaped line', () => {
  assert.match(render('- a\n  - b\n: c\n'), /<li>b\n: c<\/li>/)
  assert.match(render('- a\n    ::: note\n    - b\n: c\n'), /<li>b\n: c<\/li>/)
  assert.match(render('- x\n  :: t\n  : desc\n  - b\n: z\n'), /<li>b\n: z<\/li>/)
  assert.match(render('- x\n  :: t\n  : - ::: |\n       - item\n  - b\n: z\n'), /<li>b\n: z<\/li>/)
})
