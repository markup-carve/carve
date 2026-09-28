import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { containerDifferentialCases } from '../scripts/lib/container-differential-cases.mjs'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/nested-term-boundary.json', import.meta.url)))
for (const fixture of fixtures) test(`${fixture.name}: a nested term leaves no paragraph to continue`, () => {
  assert.equal(renderDoc(parse(fixture.source)).trim(), fixture.html)
  assert.equal(carveToHtml(fixture.source).trim(), fixture.html)
})
test('the differential matrix includes every family and is deterministic', () => {
  const cases = containerDifferentialCases()
  assert.deepEqual(cases, containerDifferentialCases())
  assert.equal(cases.length, 976)
  assert.equal(new Set(cases.map(c => c.name)).size, cases.length)
  for (const fixture of fixtures) assert.ok(cases.some(c => c.source === fixture.source))
})

function regexCalls(source) {
  const exec = RegExp.prototype.exec
  let calls = 0
  RegExp.prototype.exec = function(value) { calls++; return Reflect.apply(exec, this, [value]) }
  try { parse(source) } finally { RegExp.prototype.exec = exec }
  return calls
}
for (const marker of ['> ', '- ', '1. ']) test(`${marker}: EOF classification work grows with depth`, () => {
  const source = depth => marker.repeat(depth) + 'end\n'
  const small = regexCalls(source(64)), large = regexCalls(source(128))
  assert.ok(small > 64, 'the counter must observe parser work')
  assert.ok(large / small < 2.25, `${small} -> ${large} regex calls`)
  assert.equal(regexCalls(source(128)), large)
})

test('a list term retains its separate continuation rule', () => {
  const source = '- :: term\n: body\ntail\n'
  assert.equal(renderDoc(parse(source)).trim(), carveToHtml(source).trim())
})

for (const depth of [1, 2, 3, 8]) test(`a term at quote depth ${depth} cannot own an unmarked follower`, () => {
  const source = '> '.repeat(depth) + ':: term\ntail\n'
  const actual = renderDoc(parse(source)).trim()
  assert.equal(actual, carveToHtml(source).trim())
  assert.match(actual, /<\/blockquote>\s*<p>tail<\/p>$/)
})
