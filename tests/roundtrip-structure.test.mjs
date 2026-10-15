import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acceptHtmlLosses, normalize, firstDiff, record, validateBaseline, checkCounts, jsRoundtrip, finishMeasurement, baselineCounts } from '../scripts/lib/roundtrip-structure.mjs'

test('normalization matches the PHP measurement, including non-text strings', () => {
  const tree = { type: 'document', pos: {}, srcByteLength: 99, attrs: { order: ['x'] }, children: [
    { type: 'escaped_text', value: 'a\t', attrs: { id: 'discard' } },
    { type: 'comment', value: 'hidden' }, { type: 'soft_break' }, { type: 'text', value: '\n b', marker: '*' },
    { type: 'autolink', destination: 'a\n b', ref: 'x', rawRef: 'x', bulletChar: '-', delim: '.', separatorWidths: [3], tight: true, boldItalic: true, order: [], position: {} },
    { type: 'code', value: ' x\u0085\u00a0y\ufeff ', attrs: {} },
  ] }
  assert.deepEqual(normalize(tree), { type: 'document', children: [
    { type: 'text', value: 'a b' }, { type: 'link', destination: 'a b' }, { type: 'code', value: ' x y\ufeff ' },
  ] })
  assert.deepEqual(normalize({ attrs: { order: [], id: 'x' } }), { attrs: { id: 'x' } })
  for (const type of ['comment_block', 'block_comment', 'inline_comment']) assert.deepEqual(normalize([{ type }]), [])
})

test('strict normalization keeps the carrier fields and drops only bookkeeping and rawRef', () => {
  const node = { type: 'autolink', pos: {}, srcByteLength: 3, ref: 'r', rawRef: 'R', bulletChar: '*', marker: '*', delim: ')', separatorWidths: [3], tight: true, boldItalic: true, attrs: { order: ['id'] } }
  assert.deepEqual(normalize(node, true), { type: 'autolink', ref: 'r', bulletChar: '*', marker: '*', delim: ')', separatorWidths: [3], tight: true })
  assert.deepEqual(normalize([{ type: 'escaped_text', value: '*' }], true), [{ type: 'escaped_text', value: '*' }])
  assert.deepEqual(normalize([{ type: 'text', value: 'a' }, { type: 'soft_break' }, { type: 'comment' }], true), [{ type: 'text', value: 'a ' }])
  const before = { type: 'list', bulletChar: '*', children: [] }
  assert.equal(firstDiff(normalize(before), normalize({ ...before, bulletChar: '-' })), null)
  assert.equal(firstDiff(normalize(before, true), normalize({ ...before, bulletChar: '-' }, true)).kind, 'value list.bulletChar')
})

test('a span placeholder compares without its header field in both modes', () => {
  const cell = header => ({ type: 'table_cell', header, span: 'colspan', children: [] })
  for (const strict of [false, true]) {
    assert.equal(firstDiff(normalize(cell(false), strict), normalize(cell(true), strict)), null)
    const covering = { type: 'table_cell', header: false, children: [] }
    assert.equal(firstDiff(normalize(covering, strict), normalize({ ...covering, header: true }, strict)).kind, 'value table_cell.header')
  }
})

test('first difference follows reference traversal and sequence attribution', () => {
  assert.deepEqual(firstDiff({ type: 'text' }, { type: 'link' }), { path: '', kind: 'type doc>text => link' })
  assert.equal(firstDiff({ type: 'link', destination: 'a' }, { type: 'link' }).kind, 'lost link.destination')
  assert.equal(firstDiff({ type: 'link' }, { type: 'link', destination: 'a' }).kind, 'added link.destination')
  assert.equal(firstDiff({ type: 'text', value: 'a' }, { type: 'text', value: 'b' }).kind, 'value text.value')
  assert.equal(firstDiff([{ type: 'text' }], [{ type: 'link' }, { type: 'text' }]).kind, 'seq doc> text => link')
  assert.equal(firstDiff([], [{ type: 'text' }]).kind, 'added doc.0')
  assert.equal(firstDiff([{ type: 'text' }], []).kind, 'lost doc.0')
  assert.equal(firstDiff({ type: 'document', children: [] }, { type: 'document', children: [] }), null)
})

test('buckets count each document once and keep the first three examples', () => {
  const stats = { total: 0, identical: 0, errors: 0, buckets: {} }
  for (let i = 0; i < 5; i++) record(stats, `${i}.crv`, { path: '.value', kind: 'value text.value' })
  record(stats, 'same.crv', null)
  record(stats, 'error.crv', null, 'Exception')
  assert.equal(stats.total, 7)
  assert.equal(stats.identical, 1)
  assert.equal(stats.errors, 1)
  assert.equal(stats.different, 5)
  assert.equal(stats.errorBuckets.Exception.count, 1)
  assert.equal(stats.strict, 1)
  assert.equal(Object.keys(stats.buckets).some(kind => kind.startsWith('ERROR')), false)
  assert.equal(stats.buckets['value text.value'].count, 5)
  assert.deepEqual(stats.buckets['value text.value'].examples.map(e => e.file), ['0.crv', '1.crv', '2.crv'])
})

test('a strict difference stays identical and lands in its own bucket', () => {
  const stats = { total: 0, identical: 0, errors: 0, buckets: {} }
  record(stats, 'kept.crv', null)
  record(stats, 'lost.crv', null, undefined, undefined, { path: '.bulletChar', kind: 'value list.bulletChar' })
  assert.equal(stats.identical, 2)
  assert.equal(stats.strict, 1)
  assert.equal(stats.different, undefined)
  assert.deepEqual(stats.buckets, {})
  assert.deepEqual(stats.strictBuckets['value list.bulletChar'].examples.map(e => e.file), ['lost.crv'])
})

test('baseline has a count for every engine and target', () => {
  const baseline = JSON.parse(readFileSync(new URL('../resources/roundtrip-structure-baseline.json', import.meta.url)))
  assert.equal(validateBaseline(baseline), baseline)
  assert.throws(() => validateBaseline({ version: 2, engines: {} }), /Invalid baseline/)
  assert.throws(() => validateBaseline({ ...baseline, version: 1 }), /Unsupported baseline version/)
  const invalid = structuredClone(baseline)
  invalid.engines.php.md.identical = invalid.engines.php.md.total + 1
  assert.throws(() => validateBaseline(invalid), /Invalid baseline/)
  const strictAboveIdentical = structuredClone(baseline)
  strictAboveIdentical.engines.js.html.strict = strictAboveIdentical.engines.js.html.identical + 1
  assert.throws(() => validateBaseline(strictAboveIdentical), /Invalid baseline js\/html/)
  const missingStrict = structuredClone(baseline)
  delete missingStrict.engines.rs.md.strict
  assert.throws(() => validateBaseline(missingStrict), /Invalid baseline rs\/md/)
})

test('baseline gate rejects regressions and skips, and requests a raise for improvements', () => {
  const baseline = { engines: { js: { html: { identical: 5, strict: 3, total: 10 } } } }
  const row = { engine: 'js', target: 'html', status: 'measured', identical: 5, strict: 3, total: 10 }
  assert.deepEqual(checkCounts([row], baseline), { failed: false, notices: [] })
  assert.equal(checkCounts([{ ...row, identical: 4 }], baseline).failed, true)
  const improvement = checkCounts([{ ...row, identical: 6 }], baseline)
  assert.equal(improvement.failed, false)
  assert.match(improvement.notices[0], /raise the baseline/)
  assert.equal(checkCounts([{ ...row, status: 'skipped' }], baseline).failed, true)
  assert.equal(checkCounts([{ ...row, total: 11 }], baseline).failed, true)
  const strictLoss = checkCounts([{ ...row, strict: 2 }], baseline)
  assert.equal(strictLoss.failed, true)
  assert.match(strictLoss.notices[0], /strict regression 2 < 3/)
  const strictGain = checkCounts([{ ...row, strict: 4 }], baseline)
  assert.equal(strictGain.failed, false)
  assert.match(strictGain.notices[0], /raise the strict baseline 3 -> 4/)
})

test('JS roundtrips use the importer source value and the PART 12 export', async () => {
  const js = await import('@markup-carve/carve')
  const source = 'Hello *world*.\n'
  for (const target of ['html', 'md']) {
    assert.equal(firstDiff(normalize(js.carveToAstJson(source)), normalize(jsRoundtrip(js, source, target))), null)
  }
})

const measurement = () => ({ engine: 'php', target: 'md', status: 'measured', total: 0, identical: 0, strict: 0, different: 0, errors: 0, buckets: {}, errorBuckets: {}, strictBuckets: {} })

test('every document error is unsupported and has a null baseline', () => {
  const row = measurement()
  record(row, 'b.crv', null, 'Error', 'missing roundtrip setter')
  record(row, 'a.crv', null, 'Error', 'missing roundtrip setter')
  finishMeasurement(row)
  assert.equal(row.status, 'unsupported')
  assert.equal(row.reason, 'Error: missing roundtrip setter')
  assert.equal(row.different, 0)
  assert.deepEqual(row.buckets, {})
  assert.equal(row.errorBuckets.Error.count, 2)
  assert.equal(baselineCounts([row]).engines.php.md, null)
  const previous = { engines: { php: { md: { identical: 0, strict: 0, total: 2 } } } }
  assert.equal(checkCounts([row], previous).failed, true)
  assert.equal(checkCounts([row], { engines: { php: { md: null } } }).failed, false)
})

test('partial errors stay measured and separate from different trees', () => {
  const row = measurement()
  record(row, 'error.crv', null, 'Error', 'one conversion failed')
  record(row, 'different.crv', { kind: 'value text.value', path: '.value' })
  record(row, 'same.crv', null)
  finishMeasurement(row)
  assert.equal(row.status, 'measured')
  assert.equal(row.total, row.identical + row.different + row.errors)
  assert.equal(row.errors, 1)
  assert.equal(row.different, 1)
  assert.deepEqual(baselineCounts([row]).engines.php.md, { identical: 1, strict: 1, total: 3 })
})

test('explicit null baseline is valid but missing entries are invalid', () => {
  const baseline = baselineCounts(['js', 'php', 'rs'].flatMap(engine => ['html', 'md'].map(target => ({ ...measurement(), engine, target, status: 'unsupported' }))))
  assert.equal(validateBaseline(baseline), baseline)
  delete baseline.engines.php.md
  assert.throws(() => validateBaseline(baseline), /Invalid baseline php\/md/)
})

test('new support requests a baseline and skipped engines still fail', () => {
  const baseline = { engines: { php: { md: null } } }
  const row = { ...measurement(), total: 2, identical: 2 }
  const verdict = checkCounts([row], baseline)
  assert.equal(verdict.failed, false)
  assert.match(verdict.notices[0], /supported now/)
  assert.equal(checkCounts([{ ...row, status: 'skipped' }], baseline).failed, true)
  assert.throws(() => baselineCounts([{ ...row, status: 'skipped' }]), /cannot write baseline/)
})

function withBatchDriver(t, body) {
  const dir = mkdtempSync(join(tmpdir(), 'carve-test-roundtrip-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const driver = join(dir, 'driver')
  writeFileSync(driver, `#!${process.execPath}
const { readFileSync } = require('node:fs')
const { basename } = require('node:path')
const request = JSON.parse(readFileSync(0, 'utf8'))
${body}
`, { mode: 0o755 })
  return args => spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/roundtrip-structure.mjs', import.meta.url)), '--engine', 'rs', '--workers', '2', '--json', ...args], {
    encoding: 'utf8', env: { ...process.env, CARVE_RS_ROUNDTRIP_DRIVER: driver },
  })
}

test('batch CLI reports all-error targets as unsupported and fails their existing baseline', t => {
  const run = withBatchDriver(t, `for (const file of request.files) for (const target of request.targets)
    console.log(JSON.stringify({ file: basename(file), target, error: 'MissingApi', message: 'no roundtrip setter' }))`)
  const output = run(['--check'])
  assert.equal(output.status, 1, output.stderr)
  const report = JSON.parse(output.stdout)
  assert.equal(report.results.length, 2)
  for (const row of report.results) {
    assert.equal(row.status, 'unsupported')
    assert.equal(row.errors, report.total)
    assert.equal(row.different, 0)
    assert.equal(row.errorBuckets.MissingApi.count, report.total)
    assert.deepEqual(row.buckets, {})
    assert.match(row.reason, /no roundtrip setter/)
  }
})

test('batch CLI consumes every worker and keeps partial errors separate from differences', t => {
  const run = withBatchDriver(t, `for (const [i, file] of request.files.entries()) for (const target of request.targets) {
    const row = i > 1 ? { error: 'ConversionError', message: 'one failed conversion' }
      : { before: { type: 'text', value: 'a' }, after: { type: 'text', value: i === 0 ? 'a' : 'b' } }
    console.log(JSON.stringify({ file: basename(file), target, ...row }))
  }`)
  const output = run([])
  assert.equal(output.status, 0, output.stderr)
  const report = JSON.parse(output.stdout)
  for (const row of report.results) {
    assert.equal(row.status, 'measured')
    assert.equal(row.transport, 'batch')
    assert.equal(row.workers, 2)
    assert.equal(row.total, report.total)
    assert.equal(row.identical, 2)
    assert.equal(row.different, 2)
    assert.equal(row.errors, report.total - 4)
    assert.equal(row.buckets['value text.value'].count, 2)
    assert.equal(row.errorBuckets.ConversionError.count, report.total - 4)
  }
})

test('batch CLI waits for driver close after stdout ends', t => {
  const run = withBatchDriver(t, `for (const file of request.files) for (const target of request.targets)
    console.log(JSON.stringify({ file: basename(file), target, before: {}, after: {} }))
  process.stdout.end(() => setTimeout(() => process.exit(request.files.length ? 7 : 0), 30))`)
  const output = run([])
  assert.equal(output.status, 2, output.stderr)
  assert.match(output.stderr, /driver exit 7/)
})

test('batch CLI reports a driver crash after a truncated final row', t => {
  const run = withBatchDriver(t, `if (request.files.length) {
    process.stderr.write('driver panic')
    process.stdout.write('{"file":"truncated', () => process.exit(101))
  }`)
  const output = run([])
  assert.equal(output.status, 2, output.stderr)
  assert.match(output.stderr, /driver exit 101: driver panic/)
})

test('batch CLI consumes large escaped rows split across pipe chunks', t => {
  const run = withBatchDriver(t, `const value = 'quote " slash \\\\ newline \\n ☃ 😀 \u0085 \u2028 \u2029'.repeat(4000)
  for (const [i, file] of request.files.entries()) for (const target of request.targets) {
    const tree = { type: 'code', value: i === 0 ? value : 'small' }
    const row = Buffer.from(JSON.stringify({ file: basename(file), target, before: tree, after: tree }) + '\\n')
    for (let offset = 0; offset < row.length; offset += 8191) process.stdout.write(row.slice(offset, offset + 8191))
  }`)
  const output = run([])
  assert.equal(output.status, 0, output.stderr)
  for (const row of JSON.parse(output.stdout).results) assert.equal(row.identical, row.total)
})

test('Rust driver emits one compact object per document and target', { skip: !process.env.CARVE_RS_ROUNDTRIP_DRIVER }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-test-driver-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = join(dir, 'quotes-☃.crv')
  writeFileSync(file, '```\nquote " slash \\ and ☃\nsecond line\n```\n')
  const output = spawnSync(process.env.CARVE_RS_ROUNDTRIP_DRIVER, [], {
    input: JSON.stringify({ files: [file], targets: ['html', 'md'] }), encoding: 'utf8',
  })
  assert.equal(output.status, 0, output.stderr)
  const lines = output.stdout.trimEnd().split('\n')
  assert.equal(lines.length, 2)
  for (const line of lines) {
    const row = JSON.parse(line)
    assert.equal(row.file, 'quotes-☃.crv')
    assert.equal(row.before.type, 'document')
    assert.equal(firstDiff(normalize(row.before), normalize(row.after)), null)
    assert.equal(row.before.children[0].content, 'quote " slash \\ and ☃\nsecond line\n')
  }
})

const text = value => ({ type: 'text', value })
const doc = children => ({ type: 'document', children })
const definition = label => ({ type: 'link_reference_definition', label, href: '/url' })

test('HTML losses drop unused link definitions and keep used definitions and resolved references', () => {
  const link = { type: 'link', ref: ' used ', rawRef: '[t][ used ]', href: '/url', children: [text('t')] }
  const tree = doc([definition('unused'), definition('used'), { type: 'paragraph', children: [link] }])
  assert.deepEqual(acceptHtmlLosses(tree), doc([definition('used'), { type: 'paragraph', children: [link] }]))
})

test('HTML unresolved references preserve children and raw label whitespace', () => {
  const children = [{ type: 'emphasis', children: [text('t')] }]
  const tree = doc([definition('a b'), { type: 'paragraph', children: [
    { type: 'link', ref: 'a\tb', rawRef: '[t][a\tb]', href: '', children },
  ] }])
  assert.deepEqual(acceptHtmlLosses(tree), doc([{ type: 'paragraph', children: [text('['), ...children, text('][a\tb]')] }]))
})

test('HTML unresolved images, collapsed references and shortcuts preserve their spelling', () => {
  const tree = doc([{ type: 'paragraph', children: [
    { type: 'image', ref: 't', rawRef: '![t][]', children: [text('t')] },
    { type: 'link', ref: 'u', rawRef: '[u]', children: [text('u')] },
  ] }])
  assert.deepEqual(acceptHtmlLosses(tree), doc([{ type: 'paragraph', children: [text('!['), text('t'), text('][]'), text('['), text('u'), text(']')] }]))
})

test('HTML unresolved cross-references become their source text and resolved ones stay', () => {
  const resolved = { type: 'heading_ref', target: 'Intro', href: '#Intro' }
  const tree = doc([{ type: 'paragraph', children: [
    { type: 'strong', children: [text('a '), { type: 'heading_ref', target: 'x*}' }, text(' b')] },
    resolved, { type: 'heading_ref', target: 'Intro|Alt' },
  ] }])
  assert.deepEqual(acceptHtmlLosses(tree), doc([{ type: 'paragraph', children: [
    { type: 'strong', children: [text('a '), text('</#x*}>'), text(' b')] },
    resolved, text('</#Intro|Alt>'),
  ] }]))
})

test('HTML losses match footnote labels exactly and preserve abbreviation definitions', () => {
  const used = { type: 'footnote', label: 'a b', children: [text('used')] }
  const unused = { type: 'footnote', label: ' a b ', children: [text('unused')] }
  const abbreviation = { type: 'abbreviation_def', abbr: 'ABC', expansion: 'words' }
  const reference = { type: 'footnote_ref', label: 'a b' }
  assert.deepEqual(acceptHtmlLosses(doc([unused, used, abbreviation, reference])), doc([used, abbreviation, reference]))
})

test('HTML losses count a reference only where it renders', () => {
  const inner = { type: 'footnote', label: 'inner', children: [text('content')] }
  const unused = { type: 'footnote', label: 'unused', children: [{ type: 'paragraph', children: [
    text('see '), { type: 'footnote_ref', label: 'inner' }, { type: 'link', ref: 'r', rawRef: '[t][r]', href: '/u', children: [text('t')] },
  ] }] }
  assert.deepEqual(acceptHtmlLosses(doc([unused, inner, definition('r')])), doc([]))
  const used = { type: 'footnote', label: 'used', children: [{ type: 'paragraph', children: [{ type: 'footnote_ref', label: 'inner' }] }] }
  const reference = { type: 'paragraph', children: [{ type: 'footnote_ref', label: 'used' }] }
  assert.deepEqual(acceptHtmlLosses(doc([reference, used, inner])), doc([reference, used, inner]))
})

test('HTML loss acceptance returns an independent tree without mutating input', () => {
  const tree = doc([definition('unused'), { type: 'paragraph', children: [
    { type: 'link', ref: 'missing', rawRef: '[t][missing]', children: [text('t')] },
  ] }])
  const original = structuredClone(tree)
  const result = acceptHtmlLosses(tree)
  assert.deepEqual(tree, original)
  assert.notEqual(result, tree)
  result.children[0].children[1].value = 'changed'
  assert.deepEqual(tree, original)
})
