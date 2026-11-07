import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const render = (source) => renderDoc(parse(source))

test('a heading after an attached fence leaves no paragraph for a flush-left tail (carve#5358)', () => {
  const source = '- a\n  - +\n  ```\n\n    # h\ntail\n'
  assert.equal(render(source), '<ul>\n  <li>a\n    <ul>\n      <li>\n        <pre><code></code></pre>\n' +
    '        <h1 id="h">h</h1>\n      </li>\n    </ul>\n  </li>\n</ul>\n<p>tail</p>')
  assert.deepEqual(modelTrace(source).at(-1), {
    line: 6, step: 'S5', owner: 'doc', rule: 'CARVE-P0-024', form: 'text',
    closed: 2, reached: 'doc',
  })
  assert.match(render('- a\n  - +\n  ```\n\n    p\ntail\n'), /<p>p\ntail<\/p>/)
})

test('1,000 closed-child variants leave their tail outside the list (carve#5358)', () => {
  const blocks = ['# h', '## h', '### h', '#### h', '##### h', '###### h', '---', '***', '| a |', '| b |']
  let count = 0
  for (const outer of ['-', '*', '1.', '2.'])
    for (const inner of ['-', '*', '1.', '2.', '3.'])
      for (const tail of ['tail', 'later', 'word', 'final', 'end'])
        for (const block of blocks) {
          const markerColumn = outer.length + 1
          const contentColumn = markerColumn + inner.length + 1
          const tailIndent = ' '.repeat(Math.floor(count / 4) % 2)
          const base = `${outer} a\n${' '.repeat(markerColumn)}${inner} +\n` +
            `${' '.repeat(markerColumn)}\x60\x60\x60\n\n${' '.repeat(contentColumn)}${block}\n${tailIndent}${tail}\n`
          const mode = count % 4
          const source = mode === 1 ? base.trimEnd().split('\n').map((line) => line ? `> ${line}` : '>').join('\n') + '\n'
            : mode === 2 ? '- root\n' + base.trimEnd().split('\n').slice(0, -1).map((line) => line ? `  ${line}` : '').join('\n') + `\n${tailIndent}${tail}\n`
              : mode === 3 ? base + '\n- after\n' : base
          const html = render(source)
          assert.match(html, new RegExp(`</(?:ul|ol)>\\n\\s*<p>${tail}</p>`), source)
          const trace = modelTrace(source)
          const tailLine = mode === 2 ? 7 : 6
          const expectedOwner = mode === 1 ? 'doc/quote:1' : 'doc'
          assert.equal(trace.find((record) => record.line === tailLine).owner, expectedOwner, source)
          count++
        }
  assert.equal(count, 1000)
})
