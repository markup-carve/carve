import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { parse } from '../scripts/spec/layout.mjs'
import { firstDivergence, modelTrace, readJsonLines, toJsonLines } from '../scripts/spec/decision-trace.mjs'

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const schema = JSON.parse(readFileSync(join(repo, 'resources/decision-trace-schema.json'), 'utf8'))
const validate = new Ajv2020({ allErrors: true }).compile(schema)
const layout = readFileSync(join(repo, 'resources/spec/01-layout.ebnf'), 'utf8')

const lineCount = (source) => {
  const lines = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

function checkTrace(name, source) {
  const trace = modelTrace(source)
  assert.deepEqual(trace.map((r) => r.line), Array.from({ length: lineCount(source) }, (_, i) => i + 1),
    `${name}: one record per source line, in order`)
  for (const record of trace) {
    assert.ok(validate(record), `${name}: ${JSON.stringify(record)} ${JSON.stringify(validate.errors)}`)
    if (record.cell) assert.ok(layout.includes(`[${record.cell}]`), `${name}: ${record.cell} is not a PART 0 cell id`)
  }
  return trace
}

const FRAGMENTS = [
  '- ', '* ', '1. ', '> ', '>> ', ':: t', ': d', '[^f]: ', '::: note', ':::', '::: |',
  '```', '~~~', '%%%', '%% c', '+', '# H', '| a |', '{#i}', '[r]: /u', 'text', '  ', '    ', '\t',
]

function* variants(count) {
  let state = 7
  const rnd = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)]
  for (let i = 0; i < count; i++) {
    const lines = 1 + Math.floor(rnd() * 7)
    yield Array.from({ length: lines }, () =>
      Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(FRAGMENTS)).join('')).join('\n') + (rnd() < 0.5 ? '\n' : '')
  }
}

test('every corpus document traces one schema-valid record per line', () => {
  const dir = join(repo, 'tests/corpus')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.crv'))) {
    checkTrace(file, readFileSync(join(dir, file), 'utf8'))
  }
})

test('1,000 generated container mixes trace one schema-valid record per line', () => {
  let n = 0
  for (const source of variants(1000)) checkTrace(`variant ${n++} ${JSON.stringify(source)}`, source)
  assert.equal(n, 1000)
})

// WeakSets never compare equal, so the snapshot keeps only what serializes.
const snapshot = (doc) => JSON.stringify(doc, (_, v) => (v instanceof Map ? [...v] : v instanceof Set ? [...v] : v))

test('tracing changes no parse result', () => {
  const dir = join(repo, 'tests/corpus')
  const sources = [...readdirSync(dir).filter((f) => f.endsWith('.crv')).slice(0, 400)
    .map((f) => readFileSync(join(dir, f), 'utf8')), ...variants(300)]
  for (const source of sources) {
    assert.equal(snapshot(parse(source, { trace: [] })), snapshot(parse(source)), JSON.stringify(source))
  }
})

test('the trace names each step of the ownership walk', () => {
  const steps = (source) => modelTrace(source).map((r) => `${r.line} ${r.step} ${r.owner} ${r.form}`)
  assert.deepEqual(steps('- a\n  > q\nlazy\n'), [
    '1 S5 doc/item:1 item',
    '2 S5 doc/item:1/quote:2 quote',
    '3 S4 doc/item:1/quote:2 lazy',
  ])
  assert.deepEqual(steps('```\ncode\n```\n'), ['1 S5 doc/code:1 code', '2 S1 doc/code:1 payload', '3 S1 doc/code:1 closer'])
  assert.deepEqual(steps('- a\n+\n```\n```\n'), ['1 S5 doc/item:1 item', '2 S2 doc/item:1 plus', '3 S5 doc/code:3 code', '4 S1 doc/code:3 closer'])
  assert.equal(modelTrace('- a\n+\n```\n```\n')[2].plus, 2)
  assert.deepEqual(steps('::: note\n- x\n:::\n'), ['1 S5 doc/div:1 div', '2 S5 doc/div:1/item:2 item', '3 S5 doc/div:1 closer'])
  assert.deepEqual(steps('---\na: 1\n---\nx\n'), ['1 INPUT doc frontmatter', '2 INPUT doc frontmatter', '3 INPUT doc frontmatter', '4 S5 doc text'])
})

test('firstDivergence stops at the first differing decision', () => {
  const a = modelTrace('- a\n  > q\nlazy\n')
  assert.equal(firstDivergence(a, a), -1)
  const b = a.map((r) => (r.line === 3 ? { ...r, step: 'S5', owner: 'doc' } : r))
  assert.equal(firstDivergence(a, b), 2)
  assert.equal(firstDivergence(a, a.slice(0, 2)), 2)
  assert.deepEqual(readJsonLines(toJsonLines('spec-model', a)).records, a)
  assert.throws(() => readJsonLines('{"line":1}\n'), /not a carve-decision-trace stream/)
})

test('trace-diff prints the first divergent record against a saved engine trace', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trace-diff-'))
  const input = join(dir, 'in.crv')
  writeFileSync(input, '- a\n  > q\nlazy\n')
  const script = join(repo, 'scripts/trace-diff.mjs')
  const same = join(dir, 'same.jsonl')
  writeFileSync(same, execFileSync(process.execPath, [script, input], { encoding: 'utf8' }))
  assert.match(execFileSync(process.execPath, [script, input, '--engine-trace', same], { encoding: 'utf8' }), /no divergence: 3 records agree/)
  const other = join(dir, 'other.jsonl')
  writeFileSync(other, readFileSync(same, 'utf8').replace('"step":"S4","owner":"doc/item:1/quote:2"', '"step":"S5","owner":"doc"'))
  const run = spawnSync(process.execPath, [script, input, '--engine-trace', other], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /first divergence at record 3, line 3/)
  assert.match(run.stdout, /cites +S4/)
  assert.match(run.stdout, /cites +CARVE-P0-006/)
})
