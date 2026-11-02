import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  coalesceFamilies, family, familiesIn, findingIn, issueBody, lagBehindPin, plan, signaturesIn, skeleton,
} from '../scripts/lib/mutation-fuzz.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const group = (sig, { pattern = 'js,php,rs|model', reduced = '%%%\nr\n', lag } = {}) => ({
  signature: sig, pattern, reduced, hits: 1, origin: 'x.crv', applied: ['deleteLine'],
  outputs: { model: '', js: '<p>r</p>', php: '<p>r</p>', rs: '<p>r</p>' },
  ...(lag ? { lag } : {}),
})

test('an engine that renders what the model at its spec pin renders is lag, not a new cause', () => {
  const outputs = { model: '', js: '<p>r</p>', php: '<p>r</p>', rs: '' }
  const pinned = { js: { pin: 'aaaa', output: '<p>r</p>' }, php: { pin: 'bbbb', output: '<p>r</p>' }, rs: { pin: 'cccc', output: '' } }
  assert.deepEqual(lagBehindPin(outputs, pinned), { js: 'aaaa', php: 'bbbb' })
})

test('one dissenting engine its pinned model does not explain leaves the finding to file', () => {
  const outputs = { model: '', js: '<p>r</p>', php: '<p>x</p>', rs: '' }
  const pinned = { js: { pin: 'aaaa', output: '<p>r</p>' }, php: { pin: 'bbbb', output: '<p>r</p>' } }
  assert.equal(lagBehindPin(outputs, pinned), null)
  assert.equal(lagBehindPin(outputs, { js: pinned.js }), null, 'no pinned model for php')
  assert.equal(lagBehindPin({ ...outputs, model: undefined }, pinned), null, 'the model refused')
  assert.equal(lagBehindPin({ model: 'a', js: 'a', php: 'a', rs: 'a' }, pinned), null, 'nothing dissents')
})

test('a shape family ignores indentation, blank lines, words and repeated lines', () => {
  assert.equal(skeleton('- - - ::: |\n     ~~~\nb\n'), '- - - ::: |\n~~~\nx')
  const base = family('js,rs|model,php', '- - - ::: |\n     ~~~\nb\n')
  assert.equal(family('js,rs|model,php', '- - - ::: |\n    ~~~\n\nword\nmore\n'), base)
  assert.notEqual(family('js|model,php|rs', '- - - ::: |\n     ~~~\nb\n'), base)
  assert.notEqual(family('js,rs|model,php', '- - - :::\n     ~~~\nb\n'), base)
})

test('a filed body gives back the pattern and the reduced document', () => {
  const g = group('0123456789abcdef', { reduced: '- a\n  ```\nb\n' })
  assert.deepEqual(findingIn(issueBody(g, { seed: 1, mutants: 1, engines: 'e' })), { pattern: g.pattern, reduced: g.reduced })
  assert.equal(findingIn('no fuzz body'), null)
})

test('families map to the lowest open issue and skip closed ones', () => {
  const body = (reduced) => issueBody(group('0123456789abcdef', { reduced }), { seed: 1, mutants: 1, engines: 'e' })
  const found = familiesIn([
    { number: 12, state: 'OPEN', body: body(' %%%\n  r\n') },
    { number: 11, state: 'OPEN', body: body('%%%\nr\n') },
    { number: 10, state: 'CLOSED', body: body('%%%\n\nr\n') },
    { number: 9, state: 'OPEN', body: 'not a fuzz body' },
  ])
  assert.deepEqual([...found.values()], [11])
})

test('the plan skips lag, comments on an open issue of the same family and creates at most five', () => {
  const families = new Map([[family('js,php,rs|model', '%%%\nr\n'), 40]])
  const groups = [
    group('lag', { lag: { js: 'aaaa' }, reduced: '- x\n' }),
    group('fam', { reduced: '  %%%\n\n  word\n' }),
    ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((s, i) => group(s, { pattern: `p${i}|model`, reduced: `${'>'.repeat(i + 1)} q\n` })),
  ]
  const actions = plan(groups, new Map(), undefined, undefined, families)
  const kinds = actions.map((a) => `${a.kind}:${a.group.signature}${a.issue ? `#${a.issue}` : ''}`)
  assert.ok(kinds.includes('known-lag:lag'))
  assert.ok(kinds.includes('comment:fam#40'))
  assert.equal(kinds.filter((k) => k.startsWith('create:')).length, 5)
  assert.equal(kinds.filter((k) => k.startsWith('over-cap:')).length, 1)
})

test('the filer files nothing for lag, comments on the family issue and lists the rest in the summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fuzz-filer-'))
  const log = join(dir, 'calls.log')
  const summary = join(dir, 'summary.md')
  writeFileSync(join(dir, 'listing.json'), JSON.stringify([
    { number: 40, state: 'OPEN', body: issueBody(group('000000000000000a'), { seed: 1, mutants: 1, engines: 'e' }) },
  ]))
  writeFileSync(join(dir, 'gh'), [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> '${log}'`,
    `case "$2" in list) cat '${dir}/listing.json';; create) echo https://example.test/1;; esac`,
    'cat > /dev/null',
  ].join('\n'))
  chmodSync(join(dir, 'gh'), 0o755)
  const report = join(dir, 'report.json')
  writeFileSync(report, JSON.stringify({
    seed: 1, mutants: 3, disagreements: 3, enginesLine: 'e',
    groups: [
      group('000000000000000b', { lag: { js: 'aaaa', php: 'bbbb', rs: 'cccc' }, reduced: '- o\n\n  %%%\n  n\n' }),
      group('000000000000000c', { reduced: ' %%%\n\n r\n' }),
      group('000000000000000d', { pattern: 'js|model,php,rs', reduced: '[^f]: t\n- t\n' }),
    ],
  }))
  const run = spawnSync(process.execPath, [join(repo, 'scripts/fuzz-file-issues.mjs'), `--report=${report}`, '--repo=o/r', '--cap=0'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: summary },
  })
  assert.equal(run.status, 0, run.stderr)
  const calls = readFileSync(log, 'utf8').trim().split('\n')
  assert.equal(calls.length, 2)
  assert.match(calls[1], /^issue comment 40 --repo o\/r/)
  const written = readFileSync(summary, 'utf8')
  assert.match(written, /not filed, lag behind a spec move: 000000000000000b/)
  assert.match(written, /js \(spec pin aaaa\), php \(spec pin bbbb\), rs \(spec pin cccc\)/)
  assert.match(written, /commented 000000000000000c on #40 \(same shape family\)/)
  assert.match(written, /held back .*000000000000000d[^\n]*\n {4}\[\^f\]: t\n {4}- t/)
})

test('groups of one shape family merge into the shortest reproduction before filing', () => {
  const a = { ...group('aaaaaaaaaaaaaaaa', { reduced: '- - - ::: |\n     ~~~\nlonger\n' }), hits: 2 }
  const b = { ...group('bbbbbbbbbbbbbbbb', { reduced: '- - - ::: |\n    ~~~\nb\n' }), hits: 1 }
  const other = group('cccccccccccccccc', { reduced: '> q\n' })
  const merged = coalesceFamilies([a, b, other])
  assert.equal(merged.length, 2)
  const fam = merged.find((g) => g.reduced.startsWith('- - -'))
  assert.equal(fam.signature, 'bbbbbbbbbbbbbbbb')
  assert.equal(fam.hits, 3)
  assert.deepEqual(fam.variants, ['aaaaaaaaaaaaaaaa'])
})

test('a capped listing looks up open families once when a group is still unmatched', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fuzz-filer-'))
  const log = join(dir, 'calls.log')
  const filler = Array.from({ length: 1000 }, (_, i) => ({ number: 1000 + i, state: 'CLOSED', body: 'fuzz-signature: `ffffffffffffffff`' }))
  writeFileSync(join(dir, 'all.json'), JSON.stringify(filler))
  writeFileSync(join(dir, 'open.json'), JSON.stringify([
    { number: 7, state: 'OPEN', body: issueBody(group('000000000000000a'), { seed: 1, mutants: 1, engines: 'e' }) },
  ]))
  writeFileSync(join(dir, 'gh'), [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> '${log}'`,
    `case "$*" in *"--state open"*) cat '${dir}/open.json';; *"issue list"*"--search 000"*) echo '[]';; *"issue list"*) cat '${dir}/all.json';; esac`,
    'cat > /dev/null',
  ].join('\n'))
  chmodSync(join(dir, 'gh'), 0o755)
  const report = join(dir, 'report.json')
  writeFileSync(report, JSON.stringify({ seed: 1, mutants: 1, disagreements: 1, enginesLine: 'e', groups: [group('000000000000000c', { reduced: '  %%%\n\n  r\n' })] }))
  const run = spawnSync(process.execPath, [join(repo, 'scripts/fuzz-file-issues.mjs'), `--report=${report}`, '--repo=o/r'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: '' },
  })
  assert.equal(run.status, 0, run.stderr)
  const calls = readFileSync(log, 'utf8').trim().split('\n')
  assert.equal(calls.filter((c) => c.includes('--state open')).length, 1)
  assert.match(calls.at(-1), /^issue comment 7 /)
})

test('a body carries the merged signatures so each is known on the next run', () => {
  const body = issueBody({ ...group('000000000000000a'), variants: ['000000000000000b'] }, { seed: 1, mutants: 1, engines: 'e' })
  assert.deepEqual([...signaturesIn([{ number: 3, state: 'OPEN', body }]).keys()], ['000000000000000a', '000000000000000b'])
})

test('a merged variant that names a closed issue keeps the family from being refiled', () => {
  const g = { ...group('000000000000000a'), variants: ['000000000000000b'] }
  const existing = new Map([['000000000000000b', [{ number: 4, state: 'CLOSED' }]]])
  assert.deepEqual(plan([g], existing).map((a) => [a.kind, a.issue]), [['known-closed', 4]])
})
