import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

for (const marker of ['- li', '* li']) {
  for (const fence of ['```', '~~~']) {
    for (const tail of ['p', '# H']) {
      test(`a note keeps ${tail} after a refused plus below ${marker} and ${fence}`, () => {
        const source = `[^a]: +\n${marker}\n  ${fence}\n+\n  ${tail}\n\nsee[^a]`
        const doc = parse(source)
        assert.equal(doc.blocks.length, 1)
        assert.equal(doc.blocks[0].t, 'para')
        assert.equal(doc.footnoteDefs.get('a')?.length, 2)
        assert.equal(modelTrace(source)[4].owner, 'doc/footnote:1')
      })
    }
  }
}
