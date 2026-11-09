import { test } from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

function medianParseMs(source) {
  parse(source) // Warm up the parser before measuring.
  const samples = []
  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    parse(source)
    samples.push(performance.now() - start)
  }
  return samples.sort((a, b) => a - b)[2]
}

test('carve#5705: an unclosed bracket run does not make the prefilter quadratic', () => {
  assert.equal(renderDoc(parse('[a[a\n')), '<p>[a[a</p>')

  const small = medianParseMs('[a'.repeat(4096) + '\n')
  const large = medianParseMs('[a'.repeat(16384) + '\n')
  assert.ok(large < small * 9 + 5, `8k: ${small.toFixed(2)} ms, 32k: ${large.toFixed(2)} ms`)
})
