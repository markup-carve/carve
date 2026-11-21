// carve#6297: the patterns of the link-gap-before-destination row must stay linear in a backtracking engine.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const row = model.rules.find((rule) => rule.id === 'link-gap-before-destination')

const testPatterns = []
const walk = (node) => {
  if (Array.isArray(node)) node.forEach(walk)
  else if (node && typeof node === 'object') {
    if (Array.isArray(node.matches) && typeof node.matches[1] === 'string') testPatterns.push(new RegExp(node.matches[1]))
    Object.values(node).forEach(walk)
  }
}
walk(row.report)
const each = new RegExp(row.each.matches[1], 'gd')

// The row as a RegExp interpreter runs it: every match of `each`, every report test on the text it matched.
function runRow(text) {
  const started = performance.now()
  for (const match of text.matchAll(each)) for (const pattern of testPatterns) pattern.test(match[0])
  return performance.now() - started
}

const shapes = {
  'a run of [': (n) => '['.repeat(n),
  '[[[[a] ( repeated': (n) => '[[[[a] ( '.repeat(Math.ceil(n / 9)),
  '[a] ( repeated': (n) => '[a] ('.repeat(Math.ceil(n / 5)),
  '^[ repeated': (n) => '^['.repeat(Math.ceil(n / 2)),
  'a label of (': (n) => `[${'('.repeat(n)})] (x)`,
  'links with a gap': (n) => '[a] (x) '.repeat(Math.ceil(n / 8)),
}

test('link-gap-before-destination grows linearly on the fuzz shapes', () => {
  const slow = []
  for (const [name, make] of Object.entries(shapes)) {
    // The label of `(` was cubic before carve#6297, so its sizes stay small enough to fail fast.
    const [small, big] = name === 'a label of (' ? [256, 2048] : [1024, 8192]
    const a = Math.min(runRow(make(small)), runRow(make(small)))
    const b = Math.min(runRow(make(big)), runRow(make(big)))
    if (b > 3 && b > 16 * Math.max(a, 0.1)) slow.push(`${name}: ${a.toFixed(2)} ms to ${b.toFixed(1)} ms`)
  }
  assert.deepEqual(slow, [])
})
