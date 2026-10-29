import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acceptHtmlLosses, normalize, firstDiff, record, checkExceptions, exceptionFiles, jsRoundtrip, finishMeasurement, exceptionLists } from '../scripts/lib/roundtrip-structure.mjs'
import { readExceptions } from '../scripts/lib/exception-list.mjs'

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

test('every engine and target has both exception lists', () => {
  for (const engine of ['js', 'php', 'rs']) for (const target of ['html', 'md']) {
    for (const file of Object.values(exceptionFiles(engine, target))) {
      const ids = readExceptions(new URL(`../resources/roundtrip/${file}`, import.meta.url))
      assert.ok(ids, `resources/roundtrip/${file} is missing`)
      assert.deepEqual(ids, [...new Set(ids)].sort(), `${file} is not sorted and unique`)
    }
  }
})

const lists = (notIdentical = [], notStrict = []) => () => ({ notIdentical, notStrict })
const corpus = ['a', 'b', 'c', 'd']

test('exception gate rejects unlisted failures and skips, and stale or unknown entries', () => {
  const row = { engine: 'js', target: 'html', status: 'measured', notIdentical: ['a'], notStrict: ['b'] }
  assert.deepEqual(checkExceptions([row], lists(['a'], ['b']), corpus), { failed: false, notices: [] })
  const regression = checkExceptions([{ ...row, notIdentical: ['a', 'c'] }], lists(['a'], ['b']), corpus)
  assert.equal(regression.failed, true)
  assert.match(regression.notices[0], /structure-js-html-not-identical: c fails and is not listed/)
  const improvement = checkExceptions([{ ...row, notIdentical: [] }], lists(['a'], ['b']), corpus)
  assert.equal(improvement.failed, true)
  assert.match(improvement.notices[0], /a passes now; remove it from the list/)
  const strictLoss = checkExceptions([{ ...row, notStrict: ['b', 'd'] }], lists(['a'], ['b']), corpus)
  assert.equal(strictLoss.failed, true)
  assert.match(strictLoss.notices[0], /structure-js-html-not-strict: d fails and is not listed/)
  const strictGain = checkExceptions([{ ...row, notStrict: [] }], lists(['a'], ['b']), corpus)
  assert.match(strictGain.notices[0], /not-strict: b passes now/)
  const unknown = checkExceptions([row], lists(['a', 'z'], ['b']), corpus)
  assert.match(unknown.notices[0], /z is not in the corpus/)
  assert.equal(checkExceptions([row], lists(['a'], ['b', 'b']), corpus).failed, true)
  assert.equal(checkExceptions([{ ...row, notIdentical: ['a', 'c'] }], lists(['c', 'a'], ['b']), corpus).failed, true)
  assert.equal(checkExceptions([{ ...row, status: 'skipped' }], lists(['a'], ['b']), corpus).failed, true)
})

test('a corpus row that round-trips touches no list', () => {
  const row = { engine: 'rs', target: 'md', status: 'measured', notIdentical: ['a'], notStrict: [] }
  assert.equal(checkExceptions([row], lists(['a'], []), [...corpus, 'e']).failed, false)
})

test('JS roundtrips use the importer source value and the PART 12 export', async () => {
  const js = await import('@markup-carve/carve')
  const source = 'Hello *world*.\n'
  for (const target of ['html', 'md']) {
    assert.equal(firstDiff(normalize(js.carveToAstJson(source)), normalize(jsRoundtrip(js, source, target))), null)
  }
})

const measurement = () => ({ engine: 'php', target: 'md', status: 'measured', total: 0, identical: 0, strict: 0, different: 0, errors: 0, buckets: {}, errorBuckets: {}, strictBuckets: {} })

test('every document error is unsupported and writes no lists', () => {
  const row = measurement()
  record(row, 'b.crv', null, 'Error', 'missing roundtrip setter')
  record(row, 'a.crv', null, 'Error', 'missing roundtrip setter')
  finishMeasurement(row)
  assert.equal(row.status, 'unsupported')
  assert.equal(row.reason, 'Error: missing roundtrip setter')
  assert.equal(row.different, 0)
  assert.deepEqual(row.buckets, {})
  assert.equal(row.errorBuckets.Error.count, 2)
  assert.deepEqual(exceptionLists([row]), [])
  assert.equal(checkExceptions([row], lists(['a', 'b']), ['a', 'b']).failed, true)
  assert.equal(checkExceptions([row], () => null, ['a', 'b']).failed, false)
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
  assert.deepEqual(exceptionLists([row]), [
    { file: 'structure-php-md-not-identical', ids: ['different', 'error'] },
    { file: 'structure-php-md-not-strict', ids: [] },
  ])
})

test('a supported row without lists fails and skipped engines cannot write', () => {
  const row = { ...measurement(), total: 2, identical: 2 }
  const verdict = checkExceptions([row], () => null, ['a', 'b'])
  assert.equal(verdict.failed, true)
  assert.match(verdict.notices[0], /has no exception lists/)
  assert.equal(checkExceptions([{ ...row, status: 'skipped' }], () => null, ['a', 'b']).failed, true)
  assert.throws(() => exceptionLists([{ ...row, status: 'skipped' }]), /cannot write exception lists/)
})

test('one missing list of a pair fails a supported row and an unsupported one', () => {
  const half = () => ({ notIdentical: [], notStrict: null })
  const supported = checkExceptions([{ ...measurement(), notIdentical: [] }], half, ['a'])
  assert.equal(supported.failed, true)
  assert.match(supported.notices[0], /structure-php-md-not-strict is missing/)
  const unsupported = { ...measurement(), status: 'unsupported', reason: 'Error' }
  assert.equal(checkExceptions([unsupported], half, ['a']).failed, true)
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
