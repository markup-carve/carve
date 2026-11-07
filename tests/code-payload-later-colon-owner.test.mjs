import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a quote-shaped code payload line does not keep an ended term-only boundary (carve#5368)', () => {
  assert.equal(render('- a\n  ```\n  > literal\n  ```\n  :: m\n\n  para\n: l\n'),
    '<ul>\n  <li><p>a</p>\n    <pre><code>&gt; literal\n</code></pre>\n    <dl>\n      <dt>m</dt>\n    </dl>\n' +
    '    <p>para\n: l</p>\n  </li>\n</ul>')
})

test('a code payload line does not change how the lines after its fence read (carve#5372)', () => {
  const norm = (html) => html.replace(/<pre><code>[^<]*<\/code><\/pre>/g, 'PRE')
  let count = 0
  for (const head of ['- a\n', '1. a\n', '> - a\n'])
    for (const payload of ['> literal', '>', '> > q', '>> q', '> - x', '- x', '# h', '| a |', ':: t', ': d', '{.x}'])
      for (const run of ['```', '~~~'])
        for (const mid of ['  :: m\n', '  :: m\n  : n\n', ''])
          for (const gap of ['\n  para\n', ''])
            for (const tail of [': l', ' : l', ':: l']) {
              const quote = head.startsWith('>') ? '> ' : ''
              const ind = head.startsWith('1.') ? '   ' : '  '
              const lines = (pl) => [ind + run, ind + pl, ind + run, ...(mid + gap).replace(/^  /gm, ind).split('\n').slice(0, -1)]
              const build = (pl) => head + lines(pl).map((l) => quote + l + '\n').join('') + tail + '\n'
              const source = build(payload)
              assert.equal(norm(render(source)), norm(render(build('literal'))), source)
              count++
            }
  assert.equal(count, 1188)
})
