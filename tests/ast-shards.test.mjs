import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { selectShard } from '../scripts/lib/shard.mjs'
import { populationFingerprint, verifyShardReports } from '../scripts/lib/shard-reports.mjs'
import { fingerprint, ingestCorpus } from '../scripts/lib/import-comparison.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const corpus = readdirSync(`${root}/tests/corpus`).filter(name => name.endsWith('.crv')).sort()
const synthetic = [
  '<astral: emphasis after an emoji>', '<astral: inside a blockquote>', '<astral: across two lines>',
  ...JSON.parse(readFileSync(`${root}/resources/ast-code-payload-samples.json`, 'utf8')).map(sample => sample.name),
]
function reports(population, mode) {
  return Array.from({ length: 4 }, (_, index) => ({
    complete: true, mode, shard: { index, total: 4 },
    documents: selectShard(population, { index, total: 4 }),
    population: populationFingerprint(population), revisions: { engine: 'same-commit' },
    ...(mode === 'ingest' ? { interpreters: { js: '22.0.0', php: '8.3.0' } } : {}),
  }))
}
for (const [mode, population] of [['ast', [...synthetic, ...corpus]], ['ingest', ingestCorpus(root)]]) {
  test(`${mode}: four shards cover the real corpus exactly once`, () => {
    const shards = reports(population, mode)
    verifyShardReports(shards, population, mode)
    assert.deepEqual(shards.flatMap(report => report.documents).sort(), [...population].sort())
  })
  test(`${mode}: a missing shard or document fails the union`, () => {
    const shards = reports(population, mode)
    assert.throws(() => verifyShardReports(shards.slice(1), population, mode), /union/)
    shards[0].documents.pop()
    assert.throws(() => verifyShardReports(shards, population, mode), /omitted/)
  })
  test(`${mode}: duplicates, wrong ownership and incomplete reports fail`, () => {
    const shards = reports(population, mode)
    assert.throws(() => verifyShardReports([...shards, shards[0]], population, mode), /Duplicate/)
    const wrong = structuredClone(shards)
    wrong[0].documents[0] = wrong[1].documents[0]
    assert.throws(() => verifyShardReports(wrong, population, mode), /omitted/)
    shards[0].complete = false
    assert.throws(() => verifyShardReports(shards, population, mode), /Incomplete/)
  })
  test(`${mode}: different corpus or engine revisions fail`, () => {
    const shards = reports(population, mode)
    assert.throws(() => verifyShardReports(shards, population.slice(1), mode), /population/)
    shards[1].revisions.engine = 'new-commit'
    assert.throws(() => verifyShardReports(shards, population, mode), /revisions/)
  })
}


test('AST union runs the corpus-wide gates without engine builds', () => {
  const directory = mkdtempSync(join(tmpdir(), 'carve-ast-union-'))
  try {
    const population = [...synthetic, ...corpus]
    for (const entry of reports(population, 'ast')) {
      const engines = ['carve-js', 'carve-rs', 'carve-rb', 'carve-php']
      Object.assign(entry, {
        jsProv: {}, notMeasured: [], staleBuilds: [], referenceCoverageGaps: 0,
        deferredGateFailures: entry.shard.index === 0 ? ['fixture deferred failure'] : [],
        attemptedDocuments: Object.fromEntries(engines.map(engine => [engine, entry.documents])),
        measurements: engines.map(engine => ({ engine, label: engine, findings: [] })),
        paths: engines.map(engine => [engine, entry.documents.map(name => [name, 'document'])]),
        values: engines.map(engine => [engine, entry.documents.map(name => [name, []])]),
        spans: engines.map(engine => [engine, entry.documents.map(name => [name, [{ path: '$', type: 'document', span: 'startOffset=0 endOffset=1' }]])]),
      })
      writeFileSync(join(directory, `ast-${entry.shard.index}.json`), JSON.stringify(entry))
    }
    const result = spawnSync(process.execPath, [join(root, 'scripts/ast-conformance.mjs'), `--merge-reports=${directory}`], {
      cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, CARVE_REQUIRE_ALL_ENGINES: '1' },
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stdout, /THREE-WAY SHAPE COMPARISON/)
    assert.match(result.stderr, /fixture deferred failure/)
    assert.doesNotMatch(result.stderr, /build not found|ReferenceError|TypeError/)
    const path = join(directory, 'ast-0.json')
    const incomplete = JSON.parse(readFileSync(path, 'utf8'))
    incomplete.attemptedDocuments['carve-rs'].pop()
    writeFileSync(path, JSON.stringify(incomplete))
    const omitted = spawnSync(process.execPath, [join(root, 'scripts/ast-conformance.mjs'), `--merge-reports=${directory}`], { cwd: root, encoding: 'utf8' })
    assert.notEqual(omitted.status, 0)
    assert.match(omitted.stderr, /Incomplete engine measurement/)
    rmSync(join(directory, 'ast-1.json'))
    const missing = spawnSync(process.execPath, [join(root, 'scripts/ast-conformance.mjs'), `--merge-reports=${directory}`], { cwd: root, encoding: 'utf8' })
    assert.notEqual(missing.status, 0)
    assert.match(missing.stderr, /union does not cover/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('ingest union reconciles the ledger once and rejects missing comparisons', () => {
  const directory = mkdtempSync(join(tmpdir(), 'carve-ingest-union-'))
  try {
    const fixture = join(directory, 'fixture')
    mkdirSync(join(fixture, 'scripts'), { recursive: true })
    cpSync(join(root, 'scripts/lib'), join(fixture, 'scripts/lib'), { recursive: true })
    cpSync(join(root, 'scripts/import-comparison.mjs'), join(fixture, 'scripts/import-comparison.mjs'))
    mkdirSync(join(fixture, 'tests/corpus'), { recursive: true })
    for (const name of ['a', 'b', 'c', 'd']) writeFileSync(join(fixture, `tests/corpus/${name}.crv`), 'x\n')
    const shards = reports(ingestCorpus(fixture), 'ingest')
    const observation = { expected: '<p>x</p>', actual: '<p>y</p>', status: 0 }
    const ledger = { version: 1, differences: [{
      key: `${shards[0].documents[0]}/js->php`, observation, fingerprint: fingerprint(observation),
      reason: 'Synthetic reader disagreement', issue: 'https://github.com/markup-carve/carve/issues/2642',
    }] }
    mkdirSync(join(fixture, 'resources'))
    writeFileSync(join(fixture, 'resources/ingest-comparison-drift.json'), JSON.stringify(ledger))
    for (const entry of shards) {
      entry.counts = { documents: entry.documents.length, pairs: entry.documents.length * 9 }
      entry.differences = Object.fromEntries(ledger.differences
        .filter(row => entry.documents.some(document => row.key.startsWith(`${document}/`)))
        .map(row => [row.key, row.observation]))
      writeFileSync(join(directory, `ingest-${entry.shard.index}.json`), JSON.stringify(entry))
    }
    const run = () => spawnSync(process.execPath, [join(fixture, 'scripts/import-comparison.mjs'), 'ingest', `--merge-reports=${directory}`], { cwd: fixture, encoding: 'utf8', timeout: 30000 })
    const good = run()
    assert.equal(good.status, 0, good.stderr)
    assert.match(good.stdout, /0 failures/)
    const changed = shards[0]
    const declared = ledger.differences[0].key
    delete changed.differences[declared]
    writeFileSync(join(directory, `ingest-${changed.shard.index}.json`), JSON.stringify(changed))
    const stale = run()
    assert.equal(stale.status, 1, stale.stderr)
    assert.equal(stale.stderr.trim(), `STALE comparison declaration: ${declared}`)
    changed.differences[declared] = observation
    changed.differences[`${changed.documents[0]}/php->js`] = observation
    writeFileSync(join(directory, 'ingest-0.json'), JSON.stringify(changed))
    const undeclared = run()
    assert.equal(undeclared.status, 1, undeclared.stderr)
    assert.equal(undeclared.stderr.trim(), `NEW comparison difference: ${changed.documents[0]}/php->js`)
    delete changed.differences[`${changed.documents[0]}/php->js`]
    changed.differences[declared] = { ...observation, actual: '<p>z</p>' }
    writeFileSync(join(directory, 'ingest-0.json'), JSON.stringify(changed))
    const changedObservation = run()
    assert.equal(changedObservation.status, 1, changedObservation.stderr)
    assert.equal(changedObservation.stderr.trim(), `CHANGED comparison difference: ${declared}`)
    changed.differences[declared] = observation
    shards[0].counts.pairs--
    writeFileSync(join(directory, 'ingest-0.json'), JSON.stringify(shards[0]))
    const incomplete = run()
    assert.equal(incomplete.status, 2, incomplete.stderr)
    assert.match(incomplete.stderr, /comparison count differs/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
