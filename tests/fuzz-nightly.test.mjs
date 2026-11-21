// The pure half of the 0.2 nightly fuzz: generators, agreement, reduction and the issue plan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agreementPattern, DEEP, fence, LONG, mutate, noise, randomDocument, reduce, rng, signature } from '../scripts/lib/fuzz-nightly-gen.mjs'
import { findingsOf, issueBody, issueTitle, plan, SIGNATURE_MARKER, signaturesIn } from '../scripts/lib/fuzz-nightly-issues.mjs'

test('a seed gives the same inputs', () => {
  const run = seed => {
    const r = rng(seed)
    return [mutate('= H\n\n- a\n- b\n', r, ['> q\n']).source, randomDocument(r), noise('a\n  b\n', r)]
  }
  assert.deepEqual(run(7), run(7))
  assert.notDeepEqual(run(7), run(8))
})

test('mutants and generated shapes are well-formed strings', () => {
  const r = rng(3)
  for (let i = 0; i < 200; i++) assert.equal(mutate('a *b*\n', r, []).source.isWellFormed(), true)
  for (const make of Object.values(DEEP)) assert.equal(typeof make(5, r), 'string')
  for (const make of Object.values(LONG)) assert.ok(make(4).length > 0)
})

test('agreement groups the participants by equal output', () => {
  assert.equal(agreementPattern({ js: 'a', php: 'a', rs: 'a' }), 'js,php,rs')
  assert.equal(agreementPattern({ js: 'a', php: 'b', rs: 'a' }), 'js,rs|php')
  assert.equal(agreementPattern({ js: 'a', php: undefined, rs: 'b' }), 'js|rs')
})

test('reduction keeps the finding and drops what it does not need', () => {
  const keeps = candidates => candidates.findIndex(c => c.includes('*['))
  assert.equal(reduce('x\nyy *[ zz\nw\n', keeps).source, '*[')
})

test('signatures ignore words, not markup', () => {
  assert.equal(signature('html', 'js|php', '*abc*\n'), signature('html', 'js|php', '*xyz*\n'))
  assert.notEqual(signature('html', 'js|php', '*abc*\n'), signature('html', 'js|php', '_abc_\n'))
})

test('a fence is longer than every backtick run inside it', () => {
  assert.equal(fence('a ``` b', 'carve'), '````carve\na ``` b\n````')
})

test('the plan files crashes first, comments on open issues and skips closed ones', () => {
  const report = {
    crashes: [{ kind: 'hang', engine: 'rs', case: { kind: 'format', input: '%%\n' }, signature: 'c'.repeat(16), hits: 1 }],
    groups: [
      { target: 'html', pattern: 'js,rs|php', reduced: 'a\n', signature: 'a'.repeat(16), hits: 2 },
      { target: 'tree', pattern: 'js,php|rs', reduced: 'b\n', signature: 'b'.repeat(16), hits: 1 },
      { target: 'lint', pattern: 'js|php,rs', reduced: 'c\n', signature: 'd'.repeat(16), hits: 1 },
    ],
  }
  const findings = findingsOf(report)
  assert.deepEqual(findings.map(f => f.target), ['hang', 'html', 'tree'])
  const existing = signaturesIn([
    { number: 1, state: 'OPEN', body: `${SIGNATURE_MARKER} \`${'a'.repeat(16)}\`` },
    { number: 2, state: 'CLOSED', body: `${SIGNATURE_MARKER} \`${'b'.repeat(16)}\`` },
  ])
  const actions = plan(findings, existing, 5)
  assert.deepEqual(actions.map(a => [a.kind, a.finding.target]), [['create', 'hang'], ['comment', 'html'], ['known-closed', 'tree']])
  assert.deepEqual(plan(findings, new Map(), 1).map(a => a.kind), ['create', 'over-cap', 'over-cap'])
})

test('an issue carries the reduced input, the outputs and its signature', () => {
  const f = { target: 'html', pattern: 'js,rs|php', reduced: '*[\n', outputs: { js: '<p>a</p>', php: '<p>b</p>', rs: '<p>a</p>' }, signature: 'e'.repeat(16), hits: 1, origin: 'CC-1' }
  const body = issueBody(f, { seed: 7, engines: 'spec x' })
  assert.match(issueTitle(f), /^fuzz \(0\.2\): html js,rs\|php on/)
  assert.ok(body.includes('```carve\n*[\n```'))
  assert.ok(body.includes('**js, rs**'))
  assert.ok(body.includes(`${SIGNATURE_MARKER} \`${'e'.repeat(16)}\``))
})
