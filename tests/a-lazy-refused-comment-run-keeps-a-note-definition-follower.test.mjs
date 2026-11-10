import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

const source = '[^n]: p\n{% a\n%}\n[^m]: q\n\nx[^n]\n'

test('a refused comment run leaves the next definition to ordinary ownership', () => {
  const escaped = source.replace('{', '\\{')
  assert.deepEqual(modelTrace(source), modelTrace(escaped))
  assert.equal(renderDoc(parse(source)), renderDoc(parse(escaped)))
})
