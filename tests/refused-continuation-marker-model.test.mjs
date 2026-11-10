import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'

const vectors = JSON.parse(readFileSync(new URL('./lint-rule-vectors/refused-continuation-marker.json', import.meta.url))).vectors
const rawDecisions = new Map([
  ['second-offer', [4]],
  ['blank-stop', [2]],
  ['nested-quote', [2]],
  ['accepted', []],
  ['not-an-offer', []],
  ['suppressed-line', [3]],
  ['legacy-nested-quote-unclaimed-before-list', []],
])

for (const { name, source } of vectors) {
  test(`${name}: the P6 walk decides whether the lone marker was refused`, () => {
    const stateSink = {}
    parse(source, { stateSink })
    const refused = stateSink.refusedPlusLines.map(index => index + 1)
    if (rawDecisions.has(name)) assert.deepEqual(refused, rawDecisions.get(name))
    else for (const finding of vectors.find(vector => vector.name === name).expected.findings) {
      assert.ok(refused.includes(finding.line), `${name}: model did not refuse line ${finding.line}`)
    }
  })
}
