#!/usr/bin/env node
/*
 * Differential fuzzing of the Carve 0.2 engines (carve-js, carve-php, carve-rs on next2).
 *
 * Inputs come from four sources: mutants of the 0.2 conformance inputs, random documents, deep nesting around
 * the limits of C2-B-190 and C2-I-118, and line-ending, tab and control-character noise over all of them.
 * Every input goes through parse, render, format and lint in each engine, and the run compares, across the
 * engines: the tree (AST JSON), the HTML, the fmt output, the lint findings (code and line, C2-T-019) and the
 * parse diagnostics. Per engine it also checks the writer gates C2-W-002 (parse(fmt(x)) == parse(x)) and
 * C2-W-003 (fmt(fmt(x)) == fmt(x)), and imports the rendered HTML in every engine.
 *
 * A crash, a hang, an internal error that is not a Carve refusal, and time that grows faster than linear
 * (`--timing`) are reported per engine. Every finding is reduced while it holds and grouped by a cause
 * signature. There is no spec model on next2, so a 2-of-3 split is a lead, not a verdict.
 *
 *   node scripts/fuzz-nightly.mjs --seed=20261121 --budget-minutes=20 --report=/tmp/fuzz-nightly.json
 *   node scripts/fuzz-nightly.mjs --timing --report=/tmp/fuzz-nightly-timing.json
 *
 * Engines: CARVE_JS_DIR (installed checkout), CARVE_PHP_DIR (composer install), CARVE_RS_READINESS_BIN (the
 * release build of scripts/next2-readiness-rs). Exit 0 whatever was found; exit 2 when the harness is broken.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  agreementPattern, dateSeed, DEEP, family, LONG, mutate, noise, randomDocument, reduce, rng, signature,
} from './lib/fuzz-nightly-gen.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const option = (key, fallback) => {
  const arg = process.argv.find(a => a.startsWith(`--${key}=`))
  return arg ? arg.slice(key.length + 3) : fallback
}
const flag = key => process.argv.includes(`--${key}`)
const seed = Number(option('seed', dateSeed()))
const budgetMs = Number(option('budget-minutes', 20)) * 60_000
const batchSize = Number(option('batch', 120))
const maxReductions = Number(option('max-reductions', 120))
const maxPerPattern = Number(option('max-per-pattern', 3))
const reportPath = option('report', null)
const MAX_SEED_LENGTH = 1500
const fail = message => { console.error(`fuzz-nightly: ${message}`); process.exit(2) }
if (!Number.isInteger(seed) || seed < 0) fail(`--seed must be a non-negative integer, got ${option('seed')}`)

const jsDir = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'engines/carve-js'))
const phpDir = resolve(process.env.CARVE_PHP_DIR ?? resolve(root, 'engines/carve-php'))
const rsDir = resolve(process.env.CARVE_RS_DIR ?? resolve(root, 'engines/carve-rs'))
const rsBin = resolve(process.env.CARVE_RS_READINESS_BIN ?? resolve(root, 'scripts/next2-readiness-rs/target/release/carve-next2-readiness'))
const missing = [
  !existsSync(resolve(jsDir, 'src/index.ts')) && `carve-js (${jsDir})`,
  !existsSync(resolve(phpDir, 'vendor/autoload.php')) && `carve-php (${phpDir}, run composer install)`,
  !existsSync(rsBin) && `carve-rs readiness driver (${rsBin})`,
].filter(Boolean)
if (missing.length) fail(`missing engine(s): ${missing.join(', ')}`)
const head = dir => { try { return execFileSync('git', ['-C', dir, 'rev-parse', '--short=8', 'HEAD'], { encoding: 'utf8' }).trim() } catch { return 'unknown' } }
const engines = { spec: head(root), js: head(jsDir), php: head(phpDir), rs: head(rsDir) }
const enginesLine = `spec ${engines.spec}, carve-js ${engines.js}, carve-php ${engines.php}, carve-rs ${engines.rs}`
const ENGINES = ['js', 'php', 'rs']

// Each engine is a child process per batch, so a crash, a hang or a memory blowup costs one batch and is then
// pinned on one input by bisection. Limits keep a runaway input from taking the machine.
const COMMANDS = {
  js: ['node', ['--max-old-space-size=4096', resolve(root, 'scripts/lib/fuzz-nightly-js.mjs')], { CARVE_JS_DIR: jsDir }],
  php: ['php', ['-d', 'memory_limit=4G', resolve(root, 'scripts/lib/fuzz-nightly-php.php')], { CARVE_PHP_DIR: phpDir }],
  rs: ['sh', ['-c', 'ulimit -v 8000000; exec "$0"', rsBin], {}],
}
function spawnEngine(engine, cases, timeoutMs) {
  const [command, args, env] = COMMANDS[engine]
  const started = performance.now()
  const run = spawnSync(command, args, {
    input: JSON.stringify(cases), encoding: 'utf8', maxBuffer: 1 << 30, timeout: timeoutMs, killSignal: 'SIGKILL',
    env: { ...process.env, ...env },
  })
  const ms = performance.now() - started
  if (run.status === 0) {
    try {
      const out = JSON.parse(run.stdout)
      if (Array.isArray(out) && out.length === cases.length) return { out, ms }
    } catch { /* fall through to a failed batch */ }
  }
  const timedOut = run.error?.code === 'ETIMEDOUT' || (run.signal === 'SIGKILL' && ms >= timeoutMs - 50)
  return { failed: { timedOut, status: run.status, signal: run.signal, stderr: String(run.stderr ?? run.error ?? '').slice(-1500) }, ms }
}

const crashes = []
// Records per case, or per-case failure records found by bisecting a failed batch.
function runEngine(engine, cases) {
  if (!cases.length) return []
  const { out, failed } = spawnEngine(engine, cases, 60_000 + 200 * cases.length)
  if (out) return out
  if (cases.length === 1) {
    const single = spawnEngine(engine, cases, SINGLE_TIMEOUT)
    if (single.out) return single.out
    const kind = single.failed.timedOut ? 'hang' : 'crash'
    crashes.push({ engine, kind, case: cases[0], ...single.failed })
    return [{ crashed: kind, detail: single.failed.stderr.split('\n').filter(Boolean).slice(-3).join(' | ') }]
  }
  // A crash is found by halving. A timeout is the sum of slow cases, which halving would run again and again, so
  // each case then runs on its own.
  if (failed.timedOut) return cases.flatMap(c => runEngine(engine, [c]))
  const half = Math.ceil(cases.length / 2)
  return [...runEngine(engine, cases.slice(0, half)), ...runEngine(engine, cases.slice(half))]
}
const SINGLE_TIMEOUT = 15_000

const KINDS = ['parse', 'render', 'format', 'lint']
const casesOf = inputs => inputs.flatMap(input => KINDS.map(kind => ({ kind, input })))

const lastSegment = name => String(name ?? 'Error').split('\\').pop()
// A refusal is a Carve error; anything else thrown is an engine defect (crash class).
const isCarveError = (engine, name) => engine === 'php'
  ? String(name).startsWith('MarkupCarve\\')
  : /^Carve\w*Error$|^ImportInputError$|^BbcodeInputTooLargeError$/.test(String(name))
const errorKey = name => `ERR:${lastSegment(name).replace(/^Carve/, '').replace(/Exception$/, 'Error')}`
const sortKeys = value => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, sortKeys(value[k])]))
  return value
}
// C2-A-161, C2-A-162: tree equality skips positions and srcByteLength.
// C2-A-161, C2-A-162: tree equality skips source geometry and the resolution fields of data/ast-results.json.
const RESULT_FIELDS = new Map(Object.entries(JSON.parse(readFileSync(resolve(root, 'spec/0.2/data/ast-results.json'), 'utf8')).nodes)
  .map(([type, fields]) => [type, new Set(fields.map(f => f.field))]))
const semantic = value => {
  if (Array.isArray(value)) return value.map(semantic)
  if (!value || typeof value !== 'object') return value
  const skipped = RESULT_FIELDS.get(value.type)
  return Object.fromEntries(Object.entries(value)
    .filter(([k]) => !['pos', 'segments', 'srcByteLength'].includes(k) && !skipped?.has(k))
    .map(([k, v]) => [k, semantic(v)]))
}
const lineOf = (source, offset) => {
  const prefix = Buffer.from(source, 'utf8').subarray(0, offset).toString('utf8')
  return prefix.split(/\r\n|\r|\n/).length
}
const findingKeys = (source, diagnostics) => (diagnostics ?? [])
  .map(d => `${d.code}@${d.line ?? (d.range ? lineOf(source, d.range.startOffset) : '?')}`).sort()
const LOSS = new Set(['structure-unspellable', 'field-unspellable', 'writer-refused'])

/** One engine's view of one input: a value per comparison target. */
function viewOf(engine, input, [parse, render, format, lint]) {
  const internal = []
  const value = (rec, pick) => {
    if (!rec) return 'MISSING'
    if (rec.crashed) return `CRASH:${rec.crashed}`
    if (rec.unsupported) return undefined
    if (rec.accepted === false || rec.error) {
      if (!isCarveError(engine, rec.error)) internal.push(`${lastSegment(rec.error)}: ${rec.message ?? ''}`.slice(0, 200))
      return errorKey(rec.error)
    }
    return pick(rec)
  }
  const view = {
    tree: value(parse, r => JSON.stringify(sortKeys(r.tree))),
    parsediag: value(parse, r => (r.diagnostics ?? []).map(d => d.code).sort().join(' ')),
    html: value(render, r => r.html),
    fmt: value(format, r => r.carve),
    lint: value(lint, r => findingKeys(input, r.diagnostics).join(' ')),
  }
  view.loss = (format?.diagnostics ?? []).some(d => LOSS.has(d.code))
  view.internal = internal
  view.ms = Math.max(...[parse, render, format, lint].map(r => r?.ms ?? 0))
  return view
}

const CROSS = ['tree', 'parsediag', 'html', 'fmt', 'lint']
function runInputs(inputs, which = ENGINES) {
  const cases = casesOf(inputs)
  const views = inputs.map(() => ({}))
  for (const engine of which) {
    const out = runEngine(engine, cases)
    inputs.forEach((input, i) => { views[i][engine] = viewOf(engine, input, out.slice(i * 4, i * 4 + 4)) })
  }
  return views
}

/** Per engine: C2-W-003 (stable) and C2-W-002 (roundtrip) on the inputs whose fmt reported no loss. */
function selfChecks(inputs, views) {
  const results = inputs.map(() => ({}))
  for (const engine of ENGINES) {
    const todo = inputs.map((input, i) => ({ i, view: views[i][engine] }))
      .filter(({ view }) => typeof view.fmt === 'string' && !view.fmt.startsWith('ERR:') && !view.fmt.startsWith('CRASH:') && !view.loss && typeof view.tree === 'string' && !view.tree.startsWith('ERR:'))
    const again = runInputs(todo.map(({ view }) => view.fmt), [engine])
    todo.forEach(({ i, view }, k) => {
      const second = again[k][engine]
      const stable = second.fmt === view.fmt
      // Frontmatter fields are the C2-W-002 exception; the raw node is compared.
      // C2-W-002: root `metadata.fields` is the frontmatter exception.
      const strip = text => {
        try {
          const t = semantic(JSON.parse(text))
          if (t.metadata) delete t.metadata.fields
          return JSON.stringify(sortKeys(t))
        } catch { return text }
      }
      const roundtrip = strip(second.tree) === strip(view.tree)
      results[i][engine] = { stable, roundtrip, fmt2: second.fmt, tree2: second.tree }
    })
  }
  return results
}

/** Import of one engine's HTML in every engine (import-html.md); compares the Carve each returns. */
function importChecks(htmls) {
  const views = htmls.map(() => ({}))
  for (const engine of ENGINES) {
    const out = runEngine(engine, htmls.map(html => ({ kind: 'import', html })))
    out.forEach((rec, i) => {
      if (rec.crashed) views[i][engine] = `CRASH:${rec.crashed}`
      else if (rec.unsupported) views[i][engine] = undefined
      else if (rec.accepted === false || rec.error) views[i][engine] = isCarveError(engine, rec.error) ? errorKey(rec.error) : `INTERNAL:${lastSegment(rec.error)}`
      else views[i][engine] = rec.carve
    })
  }
  return views
}

// ---- inputs
const read = path => JSON.parse(readFileSync(resolve(root, 'spec/0.2', path), 'utf8'))
const pool = [...read('conformance/examples.json').examples, ...read('conformance/clause-cases.json').cases]
  .filter(c => typeof c.input === 'string' && !c.files && !c.options?.extensions && c.input.length <= MAX_SEED_LENGTH && c.input.trim())
  .map(c => ({ id: c.id, source: c.input.endsWith('\n') ? c.input : `${c.input}\n` }))
if (!pool.length) fail('no 0.2 conformance inputs')
const donors = pool.map(doc => doc.source)
const r = rng(seed)
const DEPTHS = [3, 49, 50, 51, 99, 100, 101, 150, 198, 199, 200, 201, 202, 250, 300, 399, 400, 401, 500]
function nextInput() {
  const mode = r.pick(['mutate', 'mutate', 'mutate', 'mutate', 'random', 'random', 'deep', 'noise'])
  if (mode === 'mutate') {
    const doc = r.pick(pool)
    const m = mutate(doc.source, r, donors)
    return { mode, origin: doc.id, applied: m.applied, source: m.source }
  }
  if (mode === 'random') return { mode, origin: 'random', applied: [], source: randomDocument(r) }
  if (mode === 'deep') {
    const name = r.pick(Object.keys(DEEP))
    const depth = r.pick(DEPTHS)
    let source = DEEP[name](depth, r)
    if (r.chance(0.3)) source = mutate(source, r, donors).source
    return { mode, origin: `deep:${name}:${depth}`, applied: [], source }
  }
  const doc = r.pick(pool)
  return { mode, origin: doc.id, applied: ['noise'], source: noise(doc.source, r) }
}
// Long inputs are the timing run's ground (`--timing`); here they only slow every engine down.
const MAX_INPUT = 16_000
function nextSmallInput() {
  for (;;) {
    const input = nextInput()
    if (input.source.length <= MAX_INPUT) return input
  }
}

// ---- reduction
const crossPattern = (views, target) => agreementPattern(Object.fromEntries(ENGINES.map(e => [e, views[e][target]])))
function patternFor(target, source) {
  if (CROSS.includes(target)) return crossPattern(runInputs([source])[0], target)
  if (target === 'stable' || target === 'roundtrip') {
    const views = runInputs([source])
    const self = selfChecks([source], views)[0]
    return ENGINES.filter(e => self[e] && !self[e][target]).join(',') || 'none'
  }
  if (target === 'internal') return ENGINES.filter(e => runInputs([source], [e])[0][e].internal.length).join(',') || 'none'
  return 'none'
}
/** The first candidate that keeps the same (target, pattern), testing candidates in one batch per engine. */
function firstKeeping(target, pattern, candidates) {
  if (CROSS.includes(target)) {
    const views = runInputs(candidates)
    return views.findIndex(v => crossPattern(v, target) === pattern)
  }
  if (target === 'stable' || target === 'roundtrip') {
    const involved = pattern.split(',')
    const views = runInputs(candidates)
    const self = selfChecks(candidates, views)
    return self.findIndex(s => ENGINES.filter(e => s[e] && !s[e][target]).join(',') === involved.join(','))
  }
  if (target === 'internal') {
    const views = runInputs(candidates)
    return views.findIndex(v => ENGINES.filter(e => v[e].internal.length).join(',') === pattern)
  }
  return -1
}
function firstCrashing(engine, kind, call, candidates) {
  for (const [i, source] of candidates.entries()) {
    const before = crashes.length
    runEngine(engine, [{ kind: call, input: source }])
    const found = crashes.slice(before).some(c => c.kind === kind)
    crashes.length = before
    if (found) return i
  }
  return -1
}

// ---- timing (`--timing`): time per call at each of `--timing-sizes`, 4x apart
function timing() {
  const rows = []
  const sizes = option('timing-sizes', '2000,8000,32000,128000').split(',').map(Number)
  const [smaller, larger] = sizes.slice(-2)
  for (const [name, make] of Object.entries(LONG)) {
    const row = { name, sizes: {} }
    for (const size of sizes) {
      let n = 1
      while (make(n).length < size) n *= 2
      while (n > 1 && make(n).length > size * 1.2) n = Math.floor(n * 0.9)
      const source = make(n)
      const cell = { bytes: Buffer.byteLength(source) }
      for (const engine of ENGINES) {
        for (const kind of KINDS) {
          const base = engine === 'rs' ? spawnEngine(engine, [{ kind, input: 'x\n' }], 60_000).ms : 0
          const res = spawnEngine(engine, [{ kind, input: source }], 120_000)
          const ms = res.out ? (engine === 'rs' ? Math.max(0, res.ms - base) : res.out[0].ms) : null
          cell[`${engine}.${kind}`] = res.out ? Math.round(ms * 10) / 10 : (res.failed.timedOut ? 'timeout' : 'crash')
          if (!res.out) crashes.push({ engine, kind: res.failed.timedOut ? 'hang' : 'crash', case: { kind, input: source.slice(0, 300) + (source.length > 300 ? '...' : '') }, ...res.failed })
        }
      }
      row.sizes[size] = cell
    }
    // Superlinear: 4x the input costs more than 8x the time, at a measurable size.
    row.superlinear = ENGINES.flatMap(e => KINDS.map(k => `${e}.${k}`)).filter(key => {
      const a = row.sizes[smaller][key]
      const b = row.sizes[larger][key]
      return (typeof b !== 'number' && typeof a === 'number') || (typeof a === 'number' && typeof b === 'number' && b > 250 && b > a * 8)
    })
    rows.push(row)
    console.log(`timing ${name}: ${JSON.stringify(row.sizes[larger])}${row.superlinear.length ? `  SUPERLINEAR ${row.superlinear.join(' ')}` : ''}`)
  }
  return rows
}

// ---- main loop
console.log(`fuzz-nightly: seed=${seed} budget=${budgetMs / 60_000} min, ${enginesLine}, ${pool.length} seed inputs`)
const started = Date.now()
const findings = []
const perKey = new Map()
const stats = { inputs: 0, byMode: {}, disagreements: {}, selfFailures: {}, importDisagreements: 0, internal: 0, slow: [] }
let timingRows = null
if (flag('timing')) timingRows = timing()
const baseline = runInputs(pool.slice(0, 60).map(doc => doc.source))
const agreeing = baseline.filter(v => CROSS.every(t => !crossPattern(v, t).includes('|'))).length
console.log(`fuzz-nightly: ${agreeing} of ${baseline.length} unmutated seed inputs agree on every target`)
if (agreeing < baseline.length * 0.3) fail(`only ${agreeing} of ${baseline.length} seed inputs agree; the harness is suspect`)

const record = (target, pattern, input, extra = {}) => {
  const key = `${target} ${pattern}`
  if (findings.length >= maxReductions || (perKey.get(key) ?? 0) >= maxPerPattern) return
  perKey.set(key, (perKey.get(key) ?? 0) + 1)
  // Lint splits are the lint parity harness's ground (scripts/lint-parity.mjs), so they get a short reduction.
  // Lint and parse-diagnostic splits are not filed (scripts/lint-parity.mjs owns them), so they are kept unreduced.
  const reduced = target === 'lint' || target === 'parsediag' ? input.source
    : reduce(input.source, cands => firstKeeping(target, pattern, cands), { budget: 300 }).source
  const views = runInputs([reduced])[0]
  findings.push({
    target, pattern, origin: input.origin, mode: input.mode, applied: input.applied, reduced, ...extra,
    outputs: Object.fromEntries(ENGINES.map(e => [e, CROSS.includes(target) ? views[e][target] : { fmt: views[e].fmt, internal: views[e].internal }])),
    signature: signature(target, pattern, reduced), family: family(target, pattern, reduced),
  })
}

while (Date.now() - started < budgetMs && !flag('timing-only')) {
  const batch = Array.from({ length: batchSize }, nextSmallInput)
  const sources = batch.map(b => b.source)
  const crashesBefore = crashes.length
  const views = runInputs(sources)
  stats.inputs += batch.length
  for (const b of batch) stats.byMode[b.mode] = (stats.byMode[b.mode] ?? 0) + 1
  for (const c of crashes.slice(crashesBefore)) {
    const input = batch.find(b => b.source === c.case.input) ?? { source: c.case.input, origin: 'unknown', mode: 'unknown', applied: [] }
    c.origin = input.origin
    // A hang costs the full timeout per candidate, so only crashes are reduced.
    const reducedSource = c.kind === 'hang' ? input.source
      : reduce(input.source, cands => firstCrashing(c.engine, c.kind, c.case.kind, cands), { budget: 150, chunk: 1 }).source
    c.reduced = reducedSource
    console.log(`fuzz-nightly: ${c.kind} in ${c.engine} (${c.case.kind}) from ${input.origin}: ${JSON.stringify(reducedSource.slice(0, 200))}`)
  }
  const self = selfChecks(sources, views)
  views.forEach((v, i) => {
    for (const e of ENGINES) {
      if (v[e].ms > 2000) stats.slow.push({ engine: e, ms: Math.round(v[e].ms), origin: batch[i].origin, bytes: sources[i].length })
      if (v[e].internal.length) { stats.internal += 1; record('internal', e, batch[i], { message: v[e].internal[0] }) }
    }
    for (const target of CROSS) {
      const pattern = crossPattern(v, target)
      if (!pattern.includes('|')) continue
      stats.disagreements[target] = (stats.disagreements[target] ?? 0) + 1
      record(target, pattern, batch[i])
    }
    for (const target of ['stable', 'roundtrip']) {
      const failing = ENGINES.filter(e => self[i][e] && !self[i][e][target])
      if (!failing.length) continue
      stats.selfFailures[target] = (stats.selfFailures[target] ?? 0) + 1
      record(target, failing.join(','), batch[i])
    }
  })
  // Import the HTML the engines agree on, so an import split is the importers' own.
  const htmls = views.map(v => v.js.html).filter((h, i) => typeof h === 'string' && !h.startsWith('ERR:') && crossPattern(views[i], 'html') === 'js,php,rs')
  const imported = importChecks(htmls.slice(0, 40))
  imported.forEach((iv, i) => {
    const pattern = agreementPattern(iv)
    if (!pattern.includes('|')) return
    stats.importDisagreements += 1
    const key = `import ${pattern}`
    if ((perKey.get(key) ?? 0) >= maxPerPattern || findings.length >= maxReductions) return
    perKey.set(key, (perKey.get(key) ?? 0) + 1)
    findings.push({ target: 'import', pattern, html: htmls[i], outputs: iv, signature: signature('import', pattern, htmls[i]), family: family('import', pattern, htmls[i]) })
  })
  if (reportPath) writeFileSync(reportPath, JSON.stringify(buildReport(), null, 2) + '\n')
  console.log(`fuzz-nightly: ${stats.inputs} inputs, ${findings.length} reduced, ${crashes.length} crash/hang, ${Math.round((Date.now() - started) / 1000)} s`)
}

function buildReport() {
// One group per signature, then per shape family, keeping the shortest reproduction.
const groups = new Map()
for (const f of findings) {
  const key = f.family
  const g = groups.get(key)
  if (!g) groups.set(key, { ...f, hits: 1, variants: [] })
  else {
    g.hits += 1
    if ((f.reduced ?? f.html).length < (g.reduced ?? g.html).length) Object.assign(g, { ...f, hits: g.hits, variants: [...g.variants, g.signature] })
    else g.variants.push(f.signature)
  }
}
const crashGroups = new Map()
for (const c of crashes) {
  const key = `${c.engine} ${c.kind} ${signature('crash', c.engine, c.reduced ?? c.case.input)}`
  if (!crashGroups.has(key)) crashGroups.set(key, { ...c, hits: 1, signature: signature(c.kind, c.engine, c.reduced ?? c.case.input) })
  else crashGroups.get(key).hits += 1
}
const report = {
  schema: 2, seed, budgetMinutes: budgetMs / 60_000, elapsedSeconds: Math.round((Date.now() - started) / 1000),
  engines, enginesLine, stats, groups: [...groups.values()].sort((a, b) => b.hits - a.hits),
  crashes: [...crashGroups.values()], timing: timingRows,
  ...(timingRows ? { timingSizes: option('timing-sizes', '2000,8000,32000,128000') } : {}),
}
return report
}
const report = buildReport()
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
for (const g of report.groups) {
  console.log(`\n=== ${g.target} ${g.pattern} (${g.hits} hit(s), ${g.origin ?? 'import'})`)
  const lines = (g.reduced ?? g.html).replace(/\n$/, '').split('\n')
  console.log(lines.slice(0, 8).map(l => `    ${JSON.stringify(l.slice(0, 160))}`).join('\n') + (lines.length > 8 ? `\n    ... ${lines.length} lines` : ''))
}
console.log(`\nfuzz-nightly: seed=${seed} inputs=${stats.inputs} groups=${report.groups.length} crashes=${report.crashes.length} ${JSON.stringify(stats.disagreements)} ${JSON.stringify(stats.selfFailures)}`)
if (!stats.inputs && !flag('timing-only')) fail('compared no inputs')
process.exit(0)
