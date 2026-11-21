// carve#6346: the `span` lookup of block-marker-as-text keys every inline node that is no text node, so a braced
// inline form that opens a line of a line block or of an emphasis continued from the line above is no failed
// attribute line (C2-B-090). A small evaluator of the operators the key uses runs it on hand-built inline records.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const row = model.rules.find((rule) => rule.id === 'block-marker-as-text')
const lookup = row.let.span.lookup

const field = (item, name) => name.split('.').slice(1).reduce((at, key) => at?.[key], item)
function value(item, expr) {
  if (typeof expr !== 'object' || expr === null || Array.isArray(expr)) return expr
  const [op] = Object.keys(expr)
  const arg = expr[op]
  if (op === 'f') return field(item, arg)
  if (op === 'if') return holds(item, arg[0]) ? value(item, arg[1]) : value(item, arg[2])
  throw new Error(`value operator ${op}`)
}
function holds(item, expr) {
  const [op] = Object.keys(expr)
  const arg = expr[op]
  if (op === 'all') return arg.every((part) => holds(item, part))
  if (op === 'any') return arg.some((part) => holds(item, part))
  if (op === 'not') return !holds(item, arg)
  if (op === 'eq') return value(item, arg[0]) === value(item, arg[1])
  throw new Error(`test operator ${op}`)
}
const key = (item) => value(item, lookup.key)

test('the span lookup reads inline records and keys them by their start', () => {
  assert.equal(lookup.over, 'inline')
  assert.equal(lookup.field, 'start')
  assert.deepEqual(lookup.value, { v: 'candidate_start' })
})

test('a non-text inline node is keyed at its start whatever holds it', () => {
  for (const parent of ['paragraph', 'line', 'heading', 'caption', 'definition_term', 'strong', 'emphasis', 'span', 'link']) {
    assert.equal(key({ type: 'underline', parent, start: 6 }), 6, parent)
  }
  assert.equal(key({ type: 'highlight', parent: 'line', start: 0 }), 0)
})

test('a text node gets no key', () => {
  for (const parent of ['paragraph', 'line', 'strong']) assert.equal(key({ type: 'text', parent, start: 3 }), false, parent)
})
