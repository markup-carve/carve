import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// A quote prefix is stripped before columns are measured, so a quoted host resumes
// after the block its marker-line `+` took as it does at the top level (carve#5399).
const quoted = (src, prefix) => src.split('\n').map((l) => (l === '' ? prefix.trimEnd() : prefix + l)).join('\n')
const render = (src) => renderDoc(parse(src)).replace(/<blockquote>\s*<blockquote>|<\/blockquote>\s*<\/blockquote>|<\/?blockquote>/g, '').replace(/\s+/g, ' ').trim()

for (const opener of ['::: note', '```']) {
  for (const next of ['tail', '- q', '> q', '# h', '| a |', '1. q']) {
    for (const prefix of ['> ', '> > ']) {
      test(`${JSON.stringify(prefix)} keeps ${next} in the host after ${opener}`, () => {
        const top = `- +\n${opener}\n\n  ${next}\n`
        assert.equal(render(quoted(top, prefix)), render(top))
      })
    }
  }
}

test('the trace keeps the quoted host as the owner of the attached block and what follows', () => {
  for (const [opener, form] of [['::: note', 'div'], ['```', 'code']]) {
    const owners = modelTrace(`> - +\n> ${opener}\n>\n>   - q\n`).map((r) => [r.line, r.owner, r.closed])
    assert.deepEqual(owners, [
      [1, 'doc/quote:1/item:1', undefined],
      [2, `doc/quote:1/item:1/${form}:2`, undefined],
      [3, 'doc/quote:1/item:1', undefined],
      [4, 'doc/quote:1/item:1/item:4', undefined],
    ], opener)
  }
})
