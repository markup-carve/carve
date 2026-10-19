#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { phpDir, rustBinary } from './lib/engine-locations.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const js = resolve(process.env.CARVE_JS_DIR ?? resolve(root, '../carve-js'), 'dist/cli.js')
const php = resolve(phpDir(), 'bin/carve')
const rust = rustBinary()
if (![js, php, rust].every(path => path && existsSync(path))) {
  console.error('migration evidence: missing engine executable', { js, php, rust })
  process.exit(2)
}
const engines = { js: [process.execPath, js], rust: [rust], php: ['php', php] }
const validateReport = new Ajv2020({ strict: true }).compile(JSON.parse(readFileSync(resolve(root, 'resources/migration-report-schema.json'), 'utf8')))
const cases = [
  ['', true], ['hello', true], ['hello world', true], ['café 世界 123', true],
  ['hello\n', true], ['hello\r\n', true], ['hello\r', true],
  ['hello!', false], [' hello', false], ['hello ', false], ['hello  world', false],
  ['hello\nworld', false], ['hello\tworld', false], ['hello\u00a0world', false],
  ['e\u0301', false], ['*markup*', false],
  ['𝐀 ٣ Ⅻ ½', true], ['hello\n\n', true], ['hello\r\n\r\n', true],
  ['\n', true], ['hello\rworld', false], ['hello\r\nworld', false],
]
let checked = 0
for (const [engine, [command, ...prefix]] of Object.entries(engines)) {
  for (const format of ['djot', 'bbcode']) {
    for (const [source, verified] of cases) {
      const result = spawnSync(command, [...prefix, 'migrate', '--from', format, '--report', '-', '--check-loss'],
        { input: source, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
      const context = `${engine}/${format}/${JSON.stringify(source)}`
      if (result.error) throw new Error(`${context}: ${result.error.message}`)
      assert.equal(result.signal, null, context)
      assert.equal(result.status, verified ? 0 : 1, `${context}: ${result.stderr}`)
      let report
      try { report = JSON.parse(result.stderr) }
      catch (error) { throw new Error(`${context}: invalid report JSON: ${error.message}`) }
      assert.ok(validateReport(report), `${context}: ${JSON.stringify(validateReport.errors)}`)
      assert.equal(report.sourceFormat, format, context)
      const diagnostics = report.diagnostics.map(({ code, severity, fidelity, confidence }) => ({ code, severity, fidelity, confidence }))
      assert.deepEqual(diagnostics, verified
        ? [{ code: 'literal-text-verified', severity: 'info', fidelity: 'preserved', confidence: 'exact' }]
        : [{ code: 'fidelity-unverified', severity: 'warning', fidelity: 'dropped', confidence: 'fallback' }], context)
      if (verified) assert.equal(result.stdout.replace(/\n+$/, ''), source.replace(/\r\n?/g, '\n').replace(/\n+$/, ''), context)
      checked++
    }
  }
}
const inventory = JSON.parse(readFileSync(resolve(root, 'resources/markdown-import-inventory.json'), 'utf8'))
const classes = new Map([
  ...inventory.constructs.map(row => [row.code, row]),
  ['bbcode-quote-field-dropped', { severity: 'warning', fidelity: 'dropped', confidence: 'exact' }],
  ['link-fragment-case-rewritten', { severity: 'info', fidelity: 'normalized', confidence: 'inferred', path: /^link:[^#]*#.+$/ }],
])
// Rows whose ruled report the pinned engines do not write yet. `pinned` is what they
// write instead, compared exactly; once an engine writes the ruled report the row fails
// until that engine is removed here, in the commit that moves its pin.
const UNVERIFIED = { code: 'fidelity-unverified', severity: 'warning', fidelity: 'dropped', confidence: 'fallback' }
const QUOTE_FIELD_LOSS = { code: 'bbcode-quote-field-dropped', severity: 'warning', fidelity: 'dropped', confidence: 'exact', path: 'line:1' }
const AHEAD_OF_PIN = {
  'bbcode-quote-field-dropped': {
    engines: ['js', 'php'],
    pinned: { diagnostics: [{ code: 'fidelity-unverified', severity: 'warning', fidelity: 'dropped', confidence: 'fallback' }] },
  },
  // carve#3341: one attribution reading across the three BBCode importers.
  'bbcode-quote-attribution-nothing-left': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> y\n^\n', diagnostics: [UNVERIFIED] },
    rust: { diagnostics: [UNVERIFIED, { ...QUOTE_FIELD_LOSS, message: 'The BBCode quote user_id cannot be represented in Carve and was dropped.' }] },
    php: { output: '> y\n^\n', diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-space-opener': {
    engines: ['js'],
    js: { output: '> c\n^ name=\\"bob\\" date=\\"2020-01-01\\" #7\n' },
  },
  'bbcode-quote-attribution-unknown-field': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> q3\n^ alice foo=bar (2023-11-14) #12\n', diagnostics: [UNVERIFIED] },
    rust: { output: '> q3\n^ "alice"    foo=bar (2023-11-14) #12\n', diagnostics: [UNVERIFIED, { ...QUOTE_FIELD_LOSS, message: 'The BBCode quote user_id cannot be represented in Carve and was dropped.' }] },
    php: { output: '> q3\n^ "alice"    foo=bar (2023-11-14) #12\n', diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-only-unknown-field': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ foo=bar\n', diagnostics: [UNVERIFIED] },
    rust: { output: '> x\n^ foo=bar\n', diagnostics: [UNVERIFIED] },
    php: { output: '> x\n^ foo=bar\n', diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-unix-time-wins': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ alice (2020-01-01 1700000000)\n', diagnostics: [UNVERIFIED] },
    rust: { diagnostics: [UNVERIFIED] },
    php: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-post-id-wins': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ alice  post_id=8 #7\n', diagnostics: [UNVERIFIED] },
    rust: { output: '> x\n^ alice  post_id=8 #7\n', diagnostics: [UNVERIFIED] },
    php: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-leading-id-loses': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> q\n^ post_id=12 #9\n', diagnostics: [UNVERIFIED] },
    rust: { output: '> q\n^ post_id=12 #9\n', diagnostics: [UNVERIFIED] },
    php: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-repeated-name': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ name=\\"bob\\" name=\\"carl\\"\n', diagnostics: [UNVERIFIED] },
    rust: { diagnostics: [UNVERIFIED] },
    php: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-text-beside-name': {
    engines: ['js', 'rust', 'php'],
    js: { diagnostics: [UNVERIFIED] },
    rust: { diagnostics: [UNVERIFIED] },
    php: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-text-runs-beside-name': {
    engines: ['js', 'rust', 'php'],
    pinned: { diagnostics: [UNVERIFIED] },
  },
  'bbcode-quote-attribution-single-quoted': {
    engines: ['js'],
    js: { output: '> x\n^ name=\\\'bob\\\'\n' },
  },
  'bbcode-quote-attribution-unquoted-values': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ name=bob date=2020-01-01\n' },
    rust: { output: '> x\n^ name=bob date=2020-01-01\n' },
    php: { output: '> x\n^ name=bob date=2020-01-01\n' },
  },
  'bbcode-quote-attribution-author': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ author=alice #3\n' },
    rust: { output: '> x\n^ author=alice #3\n' },
    php: { output: '> x\n^ author=alice #3\n' },
  },
  'bbcode-quote-attribution-text-spacing': {
    engines: ['js', 'rust', 'php'],
    js: { output: '> x\n^ Bob   Smith\n' },
    rust: { output: '> x\n^ Bob   Smith\n' },
    php: { output: '> x\n^ Bob   Smith\n' },
  },
  'link-fragment-case-rewritten': {
    engines: ['js', 'rust', 'php'],
    pinned: {
      output: '# Install Steps\n\nSee [steps](#install-steps).\n',
      diagnostics: [
        { code: 'markdown-atx-heading', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:1' },
        { code: 'markdown-paragraph', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:3' },
        { code: 'markdown-link', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:3' },
      ],
    },
  },
  'link-fragment-case-rewritten-names-the-authored-spelling': {
    engines: ['js', 'rust', 'php'],
    pinned: {
      output: '# Über Uns\n\nSee [a](#%C3%BCber-uns).\n',
      diagnostics: [{ code: 'fidelity-unverified', severity: 'warning', fidelity: 'dropped', confidence: 'fallback' }],
    },
    // carve-rs assesses this input completely where carve-js and carve-php do not.
    rust: {
      output: '# Über Uns\n\nSee [a](#%C3%BCber-uns).\n',
      exit: 0,
      diagnostics: [
        { code: 'markdown-atx-heading', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:1' },
        { code: 'markdown-paragraph', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:3' },
        { code: 'markdown-link', severity: 'info', fidelity: 'preserved', confidence: 'exact', path: 'line:3' },
      ],
    },
  },
}
// The fixup message each row pins (CARVE-P2-031): the old fragment as the link wrote it.
const FIXUP_MESSAGES = {
  'link-fragment-case-rewritten': 'Rewrote link fragment #install-steps to #Install-Steps, the one heading id it matches without regard to case.',
  'link-fragment-case-rewritten-names-the-authored-spelling': 'Rewrote link fragment #über-uns to #%C3%9Cber-Uns, the one heading id it matches without regard to case.',
}
const manifest = JSON.parse(readFileSync(resolve(root, 'tests/importer-fidelity/manifest.json'), 'utf8'))
for (const id of Object.keys(AHEAD_OF_PIN)) assert.ok(manifest.cases.some(row => row.id === id), `AHEAD_OF_PIN names ${id}, which no manifest row has`)
const covered = new Set()
for (const [engine, [command, ...prefix]] of Object.entries(engines)) {
  for (const fixture of manifest.cases.filter(row => row.runner === 'core')) {
    const entry = AHEAD_OF_PIN[fixture.id]
    const pinned = entry?.engines.includes(engine) ? entry[engine] ?? entry.pinned : undefined
    const ahead = pinned ?? {}
    const expected = { ...fixture.expected, ...fixture.expected.engines?.[engine], ...ahead }
    const result = spawnSync(command, [...prefix, 'migrate', '--from', fixture.sourceFormat, '--report', '-', '--check-loss'],
      { input: fixture.input, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
    const context = `${engine}/${fixture.id}`
    assert.ifError(result.error)
    assert.equal(result.signal, null, context)
    assert.equal(result.status, expected.exit, `${context}: ${result.stderr}`)
    const report = JSON.parse(result.stderr)
    assert.ok(validateReport(report), `${context}: ${JSON.stringify(validateReport.errors)}`)
    assert.equal(report.sourceFormat, fixture.sourceFormat, context)
    assert.equal(result.stdout, expected.output, context)
    const diagnostics = report.diagnostics.map(({ code, severity, fidelity, confidence, path, message }, index) => ({
      code, severity, fidelity, confidence, ...(path ? { path } : {}), ...(expected.diagnostics[index]?.message !== undefined ? { message } : {}),
    }))
    assert.deepEqual(diagnostics, expected.diagnostics, `${context}${pinned ? ' (AHEAD_OF_PIN: if this engine now writes the ruled report, remove it from the entry)' : ''}`)
    for (const row of report.diagnostics) {
      assert.ok(row.message.length > 0, context)
      if (row.code === 'structure-unspellable' && fixture.id.includes('ordered-task')) assert.equal(row.message, 'An ordered task item is not spellable as a Carve task item; the checkbox marker was kept as text', context)
      if (row.code === 'bbcode-quote-field-dropped' && fixture.id === 'bbcode-quote-field-dropped') assert.ok(row.message.includes('user_id'), `${context}: the message names the dropped field`)
      if (row.code === 'link-fragment-case-rewritten') assert.equal(row.message, FIXUP_MESSAGES[fixture.id], context)
      const contract = classes.get(row.code)
      if (!contract) {
        assert.equal(row.code, 'fidelity-unverified', context)
        continue
      }
      assert.equal(row.severity, contract.severity, context)
      assert.equal(row.fidelity, contract.fidelity, context)
      assert.equal(row.confidence, contract.confidence, context)
      if (!diagnostics.some(item => item.code === 'fidelity-unverified')) assert.match(row.path ?? '', contract.path ?? /^line:[1-9][0-9]*$/, context)
      covered.add(`${engine}/${row.code}`)
    }
    for (const [profile, html] of Object.entries(fixture.expected.html ?? {})) {
      const rendered = spawnSync(command, [...prefix, ...(profile === 'safe' ? ['--safe'] : [])],
        { input: result.stdout, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 })
      assert.ifError(rendered.error)
      assert.equal(rendered.signal, null, `${context}/${profile}`)
      assert.equal(rendered.status, 0, `${context}/${profile}: ${rendered.stderr}`)
      assert.equal(rendered.stdout, html, `${context}/${profile}: render spelling divergence`)
    }
    for (const construct of fixture.constructs ?? []) covered.add(`${engine}/construct/${construct}`)
    checked++
  }
  for (const row of inventory.constructs) assert.ok(covered.has(`${engine}/${row.code}`) && covered.has(`${engine}/construct/${row.construct}`), `${engine}: no fixture covers ${row.construct}`)
}
console.log(`migration evidence: ${checked} CLI cases across all three engines; no exemptions beyond the declared AHEAD_OF_PIN rows`)
