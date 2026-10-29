import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  agreementPattern, agrees, dateSeed, fence, firstWhere, groupFindings, issueBody, issueTitle,
  mutate, plan, reduce, restrictPattern, rng, shape, signature, signaturesIn,
} from '../scripts/lib/mutation-fuzz.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('the nightly seed is the UTC date', () => {
  assert.equal(dateSeed(new Date('2026-10-29T23:59:00Z')), 20261029)
})

test('a seed reproduces the same mutants, another seed does not', () => {
  const source = '- a\n- b\n\n> c\n'
  const run = (seed) => {
    const r = rng(seed)
    return Array.from({ length: 20 }, () => mutate(source, r, ['::: note\nx\n:::\n']).source)
  }
  assert.deepEqual(run(7), run(7))
  assert.notDeepEqual(run(7), run(8))
  assert.ok(run(7).some((m) => m !== source))
})

test('the agreement pattern groups equal outputs and skips a refusal', () => {
  assert.equal(agreementPattern({ model: 'a', js: 'a', php: 'b', rs: 'a' }), 'js,model,rs|php')
  assert.equal(agreementPattern({ model: undefined, js: 'a', php: 'a', rs: 'a' }), 'js,php,rs')
  assert.ok(agrees('js,model,php,rs'))
  assert.ok(!agrees('js,model|php,rs'))
})

test('a pattern restricted to the participants rendered so far', () => {
  assert.equal(restrictPattern('js,model|php,rs', ['js', 'rs']), 'js|rs')
  assert.equal(restrictPattern('js,model|php,rs', ['js']), 'js')
  assert.equal(restrictPattern('js,model,php|rs', ['js', 'php']), 'js,php')
})

test('the reducer deletes lines, then characters, while the divergence holds', () => {
  const keep = (candidate) => /^> X/m.test(candidate)
  const { source } = reduce('para\n\n> X yz\nmore\n', firstWhere(keep))
  assert.equal(source, '> X\n')
})

test('the reducer stops at its budget', () => {
  let calls = 0
  const keep = (candidate) => { calls += 1; return candidate.includes('k') }
  reduce('a\nb\nc\nk\nd\ne\n'.repeat(20), firstWhere(keep), { budget: 10, chunk: 4 })
  assert.ok(calls <= 10, `${calls} calls`)
})

test('a signature ignores the words and keeps the markup and the pattern', () => {
  assert.equal(shape('> Hello 42\n'), '> x x\n')
  assert.equal(signature('js|php', '> Hello\n'), signature('js|php', '> world\n'))
  assert.notEqual(signature('js|php', '> a\n'), signature('js,php|rs', '> a\n'))
  assert.notEqual(signature('js|php', '> a\n'), signature('js|php', '>> a\n'))
  assert.match(signature('js|php', 'x'), /^[0-9a-f]{16}$/)
})

test('grouping keeps the shortest reproduction and counts the hits', () => {
  const finding = (reduced) => ({ signature: signature('a|b', reduced), pattern: 'a|b', reduced })
  const [group, ...rest] = groupFindings([finding('> abc\n'), finding('> a\n'), finding('> ab\n')])
  assert.equal(rest.length, 0)
  assert.equal(group.hits, 3)
  assert.equal(group.reduced, '> a\n')
})

test('a fence is longer than any backtick run inside it', () => {
  assert.equal(fence('a ```` b', 'carve'), '`````carve\na ```` b\n`````')
  assert.equal(fence('plain'), '```\nplain\n```')
})

const group = (sig, pattern = 'js,model|php,rs') => ({
  signature: sig, pattern, reduced: ' >\n', hits: 2, origin: 'x.crv', applied: ['indentLine'],
  outputs: { model: '<blockquote></blockquote>', js: '<blockquote></blockquote>', php: '<p>&gt;</p>', rs: '<p>&gt;</p>' },
})

test('an issue body carries the signature its dedupe reads back', () => {
  const body = issueBody(group('0123456789abcdef'), { seed: 20261029, mutants: 40, engines: 'e' })
  assert.deepEqual([...signaturesIn([{ number: 5, state: 'OPEN', body }])], [['0123456789abcdef', [{ number: 5, state: 'OPEN' }]]])
  assert.match(body, /--seed=20261029 --max-mutants=40/)
  assert.match(body, /\*\*js\*\*, \*\*model\*\*:/)
  assert.doesNotMatch(issueTitle(group('x')), /\n/)
})

test('the plan comments on open causes, skips closed ones and caps new ones round-robin', () => {
  const existing = new Map([
    ['000000000000000a', [{ number: 1, state: 'OPEN' }]],
    ['000000000000000b', [{ number: 2, state: 'CLOSED' }]],
  ])
  const groups = [
    group('000000000000000a'), group('000000000000000b'),
    group('c1'), group('c2'), group('c3'), group('c4'),
    group('d1', 'js|model,php,rs'), group('d2', 'js|model,php,rs'),
  ]
  const kinds = (cap, perPattern) => plan(groups, existing, cap, perPattern).map((a) => `${a.kind}:${a.group.signature}`)
  assert.deepEqual(kinds(4, 3), [
    'comment:000000000000000a', 'create:d1', 'known-closed:000000000000000b', 'create:d2',
    'create:c1', 'create:c2', 'over-cap:c3', 'over-cap:c4',
  ])
  assert.deepEqual(kinds(10, 2).filter((k) => k.startsWith('create')), ['create:d1', 'create:d2', 'create:c1', 'create:c2'])
})

test('the filer labels new issues and comments on an open one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fuzz-filer-'))
  const log = join(dir, 'calls.log')
  const listing = JSON.stringify([{ number: 9, state: 'OPEN', body: 'fuzz-signature: `000000000000000a`' }])
  writeFileSync(join(dir, 'gh'), [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> '${log}'`,
    `case "$2" in list) printf '%s' '${listing}';; create) echo https://example.test/1;; esac`,
    'cat > /dev/null',
  ].join('\n'))
  chmodSync(join(dir, 'gh'), 0o755)
  const report = join(dir, 'report.json')
  writeFileSync(report, JSON.stringify({
    seed: 1, mutants: 3, disagreements: 2, enginesLine: 'e', groups: [group('000000000000000a'), group('000000000000000c')],
  }))
  const run = spawnSync(process.execPath, [join(repo, 'scripts/fuzz-file-issues.mjs'), `--report=${report}`, '--repo=o/r'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: '' },
  })
  assert.equal(run.status, 0, run.stderr)
  const calls = readFileSync(log, 'utf8').trim().split('\n')
  assert.equal(calls.length, 3)
  assert.match(calls[1], /^issue comment 9 --repo o\/r/)
  assert.match(calls[2], /^issue create --repo o\/r .*--label bug --label area:corpus/)
})

test('the filer fails when gh cannot list issues', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fuzz-filer-'))
  writeFileSync(join(dir, 'gh'), '#!/bin/sh\nexit 1\n')
  chmodSync(join(dir, 'gh'), 0o755)
  const report = join(dir, 'report.json')
  writeFileSync(report, JSON.stringify({ seed: 1, mutants: 0, disagreements: 0, enginesLine: 'e', groups: [] }))
  const run = spawnSync(process.execPath, [join(repo, 'scripts/fuzz-file-issues.mjs'), `--report=${report}`, '--repo=o/r'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  })
  assert.equal(run.status, 2)
})

test('the runner goes red, not green, when an engine is missing', () => {
  const run = spawnSync(process.execPath, [join(repo, 'scripts/fuzz-nightly.mjs'), '--budget-minutes=0.1'], {
    encoding: 'utf8', env: { ...process.env, CARVE_JS_DIR: join(tmpdir(), 'no-such-carve-js') },
  })
  assert.equal(run.status, 2)
  assert.match(run.stderr, /missing engine\(s\): carve-js/)
})
