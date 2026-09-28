import { carveToHtml } from '@markup-carve/carve'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { classifyImports, processFailure, missesTarget, fingerprint, htmlBytes, ingestCorpus, reconcileDifferences } from '../scripts/lib/import-comparison.mjs'

const read = name => JSON.parse(readFileSync(new URL(`./import-comparison/${name}.json`, import.meta.url), 'utf8'))
const answers = () => Object.fromEntries(['js', 'php', 'rust'].map(engine => [engine, { status: 0, source: '/x/\n', html: '<p><em>x</em></p>' }]))

test('import comparison distinguishes spelling, meaning and failed imports', () => {
  const results = answers()
  assert.equal(classifyImports(results), 'identical')
  results.php.source = '{/x/}\n'
  assert.equal(classifyImports(results), 'spelling')
  results.rust.html = '<p>x</p>'
  assert.equal(classifyImports(results), 'meaning')
  results.php = { status: 2, stdout: '', stderr: 'cannot import' }
  assert.equal(classifyImports(results), 'failed')
})

test('HTML comparison preserves content whitespace', () => {
  assert.equal(htmlBytes('<pre>x\n</pre>\n'), '<pre>x\n</pre>')
  assert.notEqual(htmlBytes('<pre>x\n</pre>'), htmlBytes('<pre>x</pre>'))
  assert.notEqual(htmlBytes('<p> a </p>'), htmlBytes('<p>a</p>'))
})

test('comparison declarations reject new, changed, resolved and duplicate differences', () => {
  const value = { kind: 'meaning', answers: answers() }
  value.answers.rust.html = '<p>x</p>'
  const row = { key: 'case', observation: value, fingerprint: fingerprint(value), reason: 'Different imported emphasis', issue: 'https://github.com/markup-carve/carve/issues/2493' }
  const ledger = { version: 1, differences: [row] }
  assert.deepEqual(reconcileDifferences({ case: value }, ledger), [])
  assert.match(reconcileDifferences({ case: { ...value, answers: { ...value.answers, php: { status: 2, stderr: 'cannot import' } } } }, ledger)[0], /^CHANGED/)
  assert.match(reconcileDifferences({}, ledger)[0], /^STALE/)
  assert.throws(() => reconcileDifferences({}, { version: 1, differences: [{ ...row, observation: {} }] }), /observation fingerprint/)
  assert.match(reconcileDifferences({ extra: value }, { version: 1, differences: [] })[0], /^NEW/)
  assert.throws(() => reconcileDifferences({}, { version: 1, differences: [row, row] }), /duplicate/)
  assert.throws(() => reconcileDifferences({}, { version: 1, differences: [{ ...row, issue: '' }] }), /issue/)
  assert.throws(() => reconcileDifferences({}, { version: 1, differences: [{ ...row, fingerprint: '*' }] }), /fingerprint/)
})

test('AST ingest discovers nested optional and converter corpora and refuses an empty population', () => {
  const root = mkdtempSync(join(tmpdir(), 'carve-ingest-inventory-'))
  try {
    mkdirSync(join(root, 'tests'))
    assert.throws(() => ingestCorpus(root), /empty/)
    for (const dir of ['corpus', 'corpus-optional/nested', 'corpus-convert/case', 'other']) {
      mkdirSync(join(root, 'tests', dir), { recursive: true })
      writeFileSync(join(root, 'tests', dir, 'input.crv'), 'text\n')
      writeFileSync(join(root, 'tests', dir, 'expected.html'), '<p>text</p>')
    }
    assert.deepEqual(ingestCorpus(root), [
      'tests/corpus-convert/case/input.crv', 'tests/corpus-optional/nested/input.crv', 'tests/corpus/input.crv',
    ])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the public suites retain their pinned population and unique case ids', () => {
  const commonmark = read('commonmark')
  const djot = read('djot')
  assert.equal(commonmark.length, 652)
  assert.deepEqual(commonmark.map(item => item.example), Array.from({ length: 652 }, (_, i) => i + 1))
  assert.equal(djot.length, 277)
  assert.equal(new Set(djot.map(item => item.id)).size, 277)
  for (const item of commonmark) {
    assert.equal(typeof item.markdown, 'string')
    assert.equal(typeof item.html, 'string')
  }
  for (const item of djot) assert.equal(typeof item.source, 'string')
  assert.equal(djot.filter(item => item.filters).length, 3)
})

test('shared import targets cover both source formats and the equivalent HTML inputs', () => {
  const targets = read('targets')
  assert.equal(targets.length, 4)
  for (const target of targets) assert.equal(htmlBytes(carveToHtml(target.expectedCarve)), target.expectedHtml)
  assert.equal(new Set(targets.map(item => item.id)).size, 4)
  assert.equal(targets[0].expectedHtml, targets[1].expectedHtml)
  assert.equal(targets[2].expectedHtml, targets[3].expectedHtml)
  assert.equal(targets[0].expectedHtml, '<p><em>(foo)</em></p>')
  assert.match(targets[2].expectedHtml, /<strong><span id="id" key="\*">b<\/span><\/strong>/)
})

test('an unavailable engine replaces an old report with an incomplete verdict', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'carve-import-missing-'))
  const report = join(temporary, 'report.json')
  try {
    writeFileSync(report, JSON.stringify({ complete: true, failures: [] }))
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../scripts/import-comparison.mjs', import.meta.url)),
      'import', '--report', report,
    ], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, CARVE_JS_DIR: join(temporary, 'absent'), CARVE_PHP_DIR: join(temporary, 'absent'), CARVE_RS_DIR: join(temporary, 'absent'), CARGO_TARGET_DIR: join(temporary, 'absent') },
    })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /could not complete/)
    const verdict = JSON.parse(readFileSync(report, 'utf8'))
    assert.equal(verdict.complete, false)
    assert.equal(verdict.differences, undefined)
  } finally { rmSync(temporary, { recursive: true, force: true }) }
})

test('crashes, signals, timeouts and process launch failures cannot become declarations', () => {
  for (const [engine, error] of [
    ['php', { code: 255, stdout: '', stderr: '' }],
    ['rust', { code: 101, stdout: '', stderr: '' }],
    ['php', { code: 2, stdout: 'Fatal error: failed', stderr: '' }],
    ['rust', { code: 1, signal: 'SIGKILL' }],
    ['js', { code: 1, killed: true }],
    ['php', { code: 'ENOENT' }],
  ]) assert.throws(() => processFailure(engine, error))
  assert.deepEqual(processFailure('rust', { code: 2, stdout: '', stderr: 'cannot import' }), {
    status: 2, stdout: '', stderr: 'cannot import',
  })
})

test('agreement on wrong output still misses the shared target', () => {
  const results = answers()
  assert.equal(classifyImports(results), 'identical')
  assert.equal(missesTarget(results, '<p>x</p>'), true)
  assert.equal(missesTarget(results, '<p><em>x</em></p>'), false)
})

test('meaning fingerprints ignore spelling but retain failure diagnostics', () => {
  const value = { kind: 'meaning', answers: answers() }
  value.answers.rust.html = '<p>x</p>'
  const before = fingerprint(value)
  value.answers.php.source = '{/x/}\n'
  assert.equal(fingerprint(value), before)
  value.answers.php.html = '<p>changed</p>'
  assert.notEqual(fingerprint(value), before)
  value.kind = 'failed'
  value.answers.php = { status: 2, stdout: '', stderr: 'first refusal' }
  const failed = fingerprint(value)
  value.answers.php.stderr = 'another refusal'
  assert.notEqual(fingerprint(value), failed)
})
