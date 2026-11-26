import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { caseSpans, mergeCases, rewriteIds, CASES_PATH } from '../scripts/cc-merge.mjs'

const full = readFileSync(new URL(`../${CASES_PATH}`, import.meta.url), 'utf8')
const { spans, close } = caseSpans(full)
const at = spans[spans.length - 3]
// base: the real file without its last two cases
const base = full.slice(0, at[1]) + full.slice(spans[spans.length - 1][1])
const sep = full.slice(spans[0][1], spans[1][0])
const last = (text) => caseSpans(text).spans.at(-1)
const add = (text, body) => { const [, e] = last(text); return text.slice(0, e) + sep + body + text.slice(e) }
const mk = (id, summary) => `{\n   "id": "${id}",\n   "clauses": ["C2-B-001"],\n   "why": "w",\n   "summary": "${summary}",\n   "from": []\n  }`
const ids = (text) => JSON.parse(text).cases.map((c) => c.id)
const maxN = Math.max(...ids(full).map((i) => Number(i.slice(3))))

test('a colliding new case on the moving side takes the next free id', () => {
  const keep = add(base, mk('CC-9001', 'target'))
  const move = add(base, mk('CC-9001', 'moving'))
  const r = mergeCases(base, keep, move)
  assert.deepEqual(r.conflicts, [])
  assert.deepEqual(r.renames, { 'CC-9001': 'CC-9002' })
  const out = JSON.parse(r.text).cases
  assert.equal(out.at(-2).summary, 'target')
  assert.equal(out.at(-1).id, 'CC-9002')
  assert.equal(out.at(-1).summary, 'moving')
})

test('the target text outside the appended case stays byte for byte', () => {
  const keep = add(base, mk('CC-9001', 'target'))
  const r = mergeCases(base, keep, add(base, mk('CC-9001', 'moving')))
  const [, e] = last(keep)
  assert.equal(r.text.slice(0, e), keep.slice(0, e))
  assert.equal(r.text.slice(-20), keep.slice(-20))
})

test('a non-colliding new case keeps its id', () => {
  const r = mergeCases(base, add(base, mk('CC-9001', 't')), add(base, mk('CC-9005', 'm')))
  assert.deepEqual(r.renames, {})
  assert.deepEqual(ids(r.text).slice(-2), ['CC-9001', 'CC-9005'])
})

test('an edit of an existing case on the moving side is applied', () => {
  const [s, e] = spans[0]
  const edited = full.slice(s, e).replace('"id": "CC-001"', '"id": "CC-001", "note": "x"')
  const move = base.slice(0, s) + edited + base.slice(e)
  const r = mergeCases(base, add(base, mk('CC-9001', 't')), move)
  assert.equal(JSON.parse(r.text).cases[0].note, 'x')
})

test('an existing case changed on both sides is a conflict', () => {
  const [s, e] = spans[0]
  const ed = (n) => base.slice(0, s) + full.slice(s, e).replace('"id": "CC-001"', `"id": "CC-001", "note": "${n}"`) + base.slice(e)
  const r = mergeCases(base, ed('a'), ed('b'))
  assert.equal(r.text, null)
  assert.match(r.conflicts[0], /CC-001: changed on both sides/)
})

test('the same new case on both sides is kept once', () => {
  const r = mergeCases(base, add(base, mk('CC-9001', 's')), add(base, mk('CC-9001', 's')))
  assert.deepEqual(r.renames, {})
  assert.equal(ids(r.text).filter((i) => i === 'CC-9001').length, 1)
})

test('rewriteIds applies a rename chain once', () => {
  assert.equal(rewriteIds('CC-10 CC-11 CC-110', { 'CC-10': 'CC-11', 'CC-11': 'CC-12' }), 'CC-11 CC-12 CC-110')
})

test('the real file parses into one span per case', () => {
  assert.equal(spans.length, JSON.parse(full).cases.length)
  assert.ok(close > spans.at(-1)[1])
  assert.ok(maxN > 2000)
})

test('removing the first two cases on the moving side merges', () => {
  const b = caseSpans(base).spans
  const move = base.slice(0, b[0][0]) + base.slice(b[2][0])
  const r = mergeCases(base, add(base, mk('CC-9001', 't')), move)
  assert.deepEqual(r.conflicts, [])
  const out = ids(r.text)
  assert.ok(!out.includes(ids(base)[0]) && !out.includes(ids(base)[1]))
  assert.equal(out.at(-1), 'CC-9001')
})

test('removing two middle cases on the moving side merges', () => {
  const b = caseSpans(base).spans
  const move = base.slice(0, b[4][1]) + base.slice(b[6][1])
  const r = mergeCases(base, base, move)
  assert.equal(ids(r.text).length, ids(base).length - 2)
})
