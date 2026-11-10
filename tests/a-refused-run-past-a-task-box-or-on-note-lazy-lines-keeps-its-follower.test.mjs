import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// CARVE-P2-035, carve#5830 supersedes the follower part of carve#5792.
const render = source => renderDoc(parse(source))
const escaped = source => source.replace('{', '\\{')

for (const source of [
  '- [ ] {.x\n      .y}\n[^m]: q\n',
  '- [x] {% a\n      %}\n[^m]: q\n',
  '> - [ ] {.x\n>       .y}\n> [^m]: q\n',
  '- p\n  - [ ] {.x\n        .y}\n[^m]: q\n',
]) test('a task-box run releases its note-definition follower', () => {
  assert.equal(render(source), render(escaped(source)))
  const at = source.split('\n').findIndex(line => line.includes('[^m]:')) + 1
  assert.equal(modelTrace(source).find(record => record.line === at)?.owner,
    modelTrace(escaped(source)).find(record => record.line === at)?.owner)
})

test('a run deeper than the text past the task box is still an attribute run', () => {
  assert.equal(render('- [ ] {.x\n       .y}\n'),
    '<ul class="task-list">\n  <li><input type="checkbox" disabled> </li>\n</ul>')
})

for (const column of [0, 1, 2]) {
  test(`a refused comment run at column ${column} of a note releases its fence follower`, () => {
    const pad = ' '.repeat(column)
    const source = `[^n]: p\n${pad}{% a\n${pad}%}\n  \`\`\`\nafter\n\nx[^n]\n`
    assert.equal(render(source), render(escaped(source)))
  })
}

test('a lazy attribute run in a note leaves its fence follower a block fence', () => {
  const source = '[^n]: p\n{.x\n.y}\n  ```\nafter\n\nx[^n]\n'
  assert.equal(render(source), render(escaped(source)))
})
