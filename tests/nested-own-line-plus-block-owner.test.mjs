import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const render = (source) => renderDoc(parse(source))

test('a block at a nested item content column stays after its own-line plus paragraph (carve#5357)', () => {
  const source = '- a\n  - b\n  +\n  h\n    # H\n'
  assert.equal(render(source), '<ul>\n  <li>a\n    <ul>\n      <li>b\n        h\n' +
    '        <h1 id="H">H</h1>\n      </li>\n    </ul>\n  </li>\n</ul>')
  assert.equal(modelTrace(source).at(-1).owner, 'doc/item:1/item:2')
  assert.equal(render('- a\n  - b\n  +\n  {x}\n  h\n    # H\n'),
    '<ul>\n  <li>a\n    <ul>\n      <li>b\n        <p x="">h</p>\n' +
    '        <h1 id="H">H</h1>\n      </li>\n    </ul>\n  </li>\n</ul>')
  assert.ok(render('- a\n  - b\n  +\n  h\n   # H\n').indexOf('<h1') >
    render('- a\n  - b\n  +\n  h\n   # H\n').indexOf('</li>'))
})

test('1,000 nested plus variants keep the next block in the child item (carve#5357)', () => {
  const blocks = [
    ['# H', '<h1'], ['## H', '<h2'], ['### H', '<h3'], ['#### H', '<h4'],
    ['##### H', '<h5'], ['###### H', '<h6'], ['> q', '<blockquote'],
    ['---', '<hr>'], ['***', '<hr>'], ['| a |', '<table>'],
  ]
  let count = 0
  for (const outer of ['-', '*', '1.', '2.'])
    for (const inner of ['-', '*', '1.', '2.', '3.'])
      for (const word of ['h', 'text', 'alpha', 'body', 'word'])
        for (const [block, fragment] of blocks) {
          const markerColumn = outer.length + 1
          const contentColumn = markerColumn + inner.length + 1
          const base = `${outer} a\n${' '.repeat(markerColumn)}${inner} b\n${' '.repeat(markerColumn)}+\n` +
            `${' '.repeat(markerColumn)}${word}\n${' '.repeat(contentColumn)}${block}\n`
          const mode = count % 4
          const source = mode === 1 ? base + `${' '.repeat(markerColumn)}${inner} c\n`
            : mode === 2 ? base.trimEnd().split('\n').map((line) => `> ${line}`).join('\n') + '\n'
              : mode === 3 ? '- root\n' + base.trimEnd().split('\n').map((line) => `  ${line}`).join('\n') + '\n'
                : base
          const html = render(source)
          const childStart = html.indexOf('<li>b')
          const blockAt = html.indexOf(fragment, childStart)
          assert.ok(childStart >= 0 && blockAt > childStart && blockAt < html.indexOf('</li>', childStart), source)
          const owner = modelTrace(source).find((record) => record.line === (mode === 3 ? 6 : 5)).owner
          const expectedOwner = mode === 2 ? 'doc/quote:1/item:1/item:2'
            : mode === 3 ? 'doc/item:1/item:2/item:3' : 'doc/item:1/item:2'
          assert.ok(owner.startsWith(expectedOwner), source)
          count++
        }
  assert.equal(count, 1000)
})
