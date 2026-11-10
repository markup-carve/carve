import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

for (const [host, closerLine, owner] of [
  ['[^a]: +', 5, 'doc/footnote:1/code:2'],
  [':: term\n: +', 6, 'doc/dd:2/code:3'],
]) {
  test(`a shifted closer after an attached blank stays in ${owner}`, () => {
    const source = `${host}\n\`\`\`\na\n\n \`\`\`\nzz\n\nsee[^a]\n`
    const trace = modelTrace(source)
    const closer = trace.find(row => row.line === closerLine)
    assert.equal(closer.owner, owner)
    assert.equal(closer.form, 'closer')
    assert.equal(trace.find(row => row.line === closerLine + 1).owner, 'doc')
    assert.match(renderDoc(parse(source)), /<pre><code>a\n\n<\/code><\/pre>/)
    assert.match(renderDoc(parse(source)), /<p>zz<\/p>/)
  })
}
