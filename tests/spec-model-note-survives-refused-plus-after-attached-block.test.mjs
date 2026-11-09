import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

for (const marker of ['- li', '* li']) {
  for (const fence of ['```', '~~~']) {
    for (const tail of ['p', '# H']) {
      for (const prefix of ['', '> ', '> > ']) {
        test(`a note keeps ${tail} after a refused plus below ${marker} and ${fence} at quote depth ${prefix.length / 2}`, () => {
          const source = `${prefix}[^a]: +\n${prefix}${marker}\n${prefix}  ${fence}\n${prefix}+\n${prefix}  ${tail}\n\nsee[^a]`
          const doc = parse(source)
          assert.equal(doc.footnoteDefs.get('a')?.length, 2)
          assert.match(modelTrace(source)[4].owner, /\/footnote:1$/)
        })
      }
    }
  }
}
