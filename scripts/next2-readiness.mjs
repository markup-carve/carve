#!/usr/bin/env node
// Replay the 0.2 corpus against the live next2 engine checkouts, including unsupported operations.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = resolve(root, 'spec/0.2')
const args = new Set(process.argv.slice(2))
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.slice(8) ?? Infinity)
const jsonPath = resolve(root, process.argv.find(a => a.startsWith('--json='))?.slice(7) ?? '_readiness.json')
const mdPath = resolve(root, process.argv.find(a => a.startsWith('--markdown='))?.slice(11) ?? '_readiness.md')
const baselinePath = resolve(root, 'scripts/next2-readiness-baseline.json')
const read = path => JSON.parse(readFileSync(resolve(spec, path), 'utf8'))
const clauses = read('conformance/clause-cases.json').cases
const examples = read('conformance/examples.json').examples
const rules = read('data/lint-rules.json').rules
const ruleById = new Map(rules.map(r => [r.id, r]))
const treeFiles = readdirSync(resolve(spec, 'trees')).filter(name => name.endsWith('.json') && name.startsWith('examples-')).sort()
const cases = [
  ...clauses.map(c => ({ ...c, area: 'clauses', kind: c.kind ?? 'render' })),
  ...examples.map(c => ({ ...c, area: 'examples', kind: c.kind === 'write' ? 'write-example' : c.kind })),
  ...treeFiles.flatMap(file => read(`trees/${file}`).trees.map(c => ({ ...c, area: 'trees', kind: 'tree-fixture', input: c.source, expected: { tree: c.tree, accepted: true } }))),
  ...read('trees/nodes.json').trees.map(c => ({ ...c, area: 'trees', kind: 'supplied-tree', expected: { accepted: true } })),
  ...read('trees/refused.json').trees.map(c => ({ ...c, area: 'trees', kind: 'refused-tree', expected: { accepted: false } })),
  ...read('trees/layouts.json').layouts.map(c => ({ ...c, area: 'trees', kind: 'layout-fixture', expected: c.refused ? { accepted: false } : { layout: c.layout, accepted: true } })),
]
const work = Number.isFinite(limit) ? cases.slice(0, limit) : cases
const expectedFields = new Set(['html', 'htmlIncludes', 'children', 'refusal', 'layout', 'layoutAbsent', 'carve', 'diagnostics', 'notReported', 'accepted', 'tree', 'diagnosticsComplete', 'status', 'stdout', 'stderrCategory', 'stdoutJson', 'stdoutDiagnostics', 'stderrDiagnostics', 'filesAfter', 'suppressed'])
const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v)]))
  return value
}
const same = (a, b) => isDeepStrictEqual(normalize(a), normalize(b))
const noPositions = value => {
  if (Array.isArray(value)) return value.map(noPositions)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !['pos', 'segments'].includes(k)).map(([k, v]) => [k, noPositions(v)]))
  return value
}
const matchTree = (actual, expected) => same(JSON.stringify(expected).includes('"pos"') ? actual : noPositions(actual), expected)
function sourceOf(c) { return c.inputBytes ? Buffer.from(c.inputBytes.replaceAll(' ', ''), 'hex') : c.input ?? '' }
function resolver(files) {
  return request => {
    const file = files[request.path]
    return file ? { text: typeof file === 'string' ? file : file.text ?? Buffer.from(file.bytes.replaceAll(' ', ''), 'hex'), id: request.path } : { error: 'not_found' }
  }
}
function point(source, offset) {
  const prefix = Buffer.from(source).subarray(0, offset).toString('utf8')
  const lines = prefix.split('\n')
  return { line: lines.length, column: [...(lines.at(-1) ?? '')].length + 1 }
}
function diagPlace(d, source) {
  if (d.range && source !== undefined) return { ...point(source, d.range.startOffset), endLine: point(source, d.range.endOffset).line, endColumn: point(source, d.range.endOffset).column }
  return d
}
function templateMatches(template, actual) {
  const escaped = template.split(/\$\{[^}]+\}/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*?')
  return new RegExp(`^${escaped}$`, 'u').test(actual) && !actual.includes('${')
}
function messageMatches(d, wanted) {
  const rule = ruleById.get(d.code)
  if (!rule) return false
  if (!rule.messages) return true
  const variants = rule.messages.filter(v => wanted.messageWhen === undefined || (typeof v === 'object' && v.when === wanted.messageWhen))
  return variants.some(v => templateMatches(typeof v === 'string' ? v : v.text, d.message ?? ''))
}
function diagMatches(d, wanted, c) {
  if (d.code !== wanted.code) return false
  for (const key of ['channel', 'severity', 'path', 'file']) if (wanted[key] !== undefined && d[key] !== wanted[key]) return false
  const source = d.file ? c.files?.[d.file]?.text : (c.html ?? sourceOf(c))
  const place = diagPlace(d, source)
  for (const key of ['line', 'column', 'endLine', 'endColumn']) if (wanted[key] !== undefined && place[key] !== wanted[key]) return false
  return messageMatches(d, wanted)
}
function compare(c, actual) {
  if (actual?.unsupported) return { status: 'unsupported', fields: [actual.unsupported] }
  const expected = c.expected ?? {}
  const unhandled = Object.keys(expected).filter(key => !expectedFields.has(key))
  if (unhandled.length) return { status: 'fail', fields: unhandled.map(key => `unhandledExpected:${key}`) }
  if (actual?.error && !expected.refusal && expected.accepted !== false) return { status: 'fail', fields: [`error:${actual.error}`] }
  const fields = []
  if (expected.refusal) {
    if (!actual?.error) fields.push('refusal')
    else {
      const short = String(actual.error).split('\\').at(-1)
      const contract = ['TreeError', 'OptionError', 'LayoutError', 'InputError', 'RenderError', 'WriteError'].includes(short) ? `Carve${short}` : short
      if (contract !== expected.refusal.error) fields.push('refusalType')
    }
    if (expected.refusal.path && !actual.path?.startsWith(expected.refusal.path)) fields.push('refusalPath')
    return { status: fields.length ? 'fail' : 'pass', fields }
  }
  if (c.kind === 'cli') {
    if (actual.status !== expected.status) fields.push('status')
    if (expected.stdout !== undefined && actual.stdout !== expected.stdout) fields.push('stdout')
    if (expected.stdoutJson !== undefined && !same(actual.stdoutJson, expected.stdoutJson)) fields.push('stdoutJson')
    if (expected.stderrCategory !== undefined && actual.stderrCategory !== expected.stderrCategory) fields.push('stderrCategory')
    for (const key of ['stdoutDiagnostics', 'stderrDiagnostics']) if (expected[key] && !expected[key].every(w => actual[key]?.some(d => Object.entries(w).every(([name, value]) => same(d[name], value))))) fields.push(key)
    for (const [name, value] of Object.entries(expected.filesAfter ?? {})) if (!same(actual.filesAfter?.[name], value)) fields.push(`filesAfter:${name}`)
    return { status: fields.length ? 'fail' : 'pass', fields }
  }
  if (expected.accepted !== undefined && actual.accepted !== expected.accepted) fields.push('accepted')
  if (expected.suppressed !== undefined && actual.suppressed !== expected.suppressed) fields.push('suppressed')
  if (c.kind === 'refused-tree' && actual.accepted === false && !String(actual.error).includes('TreeError')) fields.push('refusalType')
  if (c.kind === 'layout-fixture' && c.refused && actual.accepted === false && !String(actual.error).includes('LayoutError')) fields.push('refusalType')
  if (expected.html !== undefined && actual.html !== expected.html) fields.push('html')
  if (expected.htmlIncludes !== undefined && !actual.html?.includes(expected.htmlIncludes)) fields.push('htmlIncludes')
  if (expected.carve !== undefined && actual.carve !== expected.carve) fields.push('carve')
  if (expected.children !== undefined && !matchTree(actual.tree?.children, expected.children)) fields.push('children')
  if (expected.tree !== undefined && !matchTree(actual.tree, expected.tree)) fields.push('tree')
  if (expected.layout !== undefined && !layoutMatches(actual.layout, expected.layout)) fields.push('layout')
  if (expected.layoutAbsent !== undefined) for (const [path, names] of Object.entries(expected.layoutAbsent)) {
    const node = actual.layout?.nodes?.find(n => n.path === path)
    if (names.some(name => node && name in node)) fields.push('layoutAbsent')
  }
  if (expected.diagnostics || expected.notReported || expected.diagnosticsComplete) {
    const diagnostics = actual.diagnostics ?? []
    for (const item of expected.diagnostics ?? []) {
      const wanted = typeof item === 'string' ? { code: item } : item
      if (!diagnostics.some(d => diagMatches(d, wanted, c))) fields.push(`diagnostic:${wanted.code}`)
    }
    for (const code of expected.notReported ?? []) if (diagnostics.some(d => d.code === code)) fields.push(`notReported:${code}`)
    if (expected.diagnosticsComplete && diagnostics.length !== (expected.diagnostics ?? []).length) fields.push('diagnosticsComplete')
  }
  if (c.kind === 'lint' && c.area === 'examples') {
    const wanted = (expected.diagnostics ?? []).map(d => typeof d === 'string' ? d : d.code).sort()
    if (!same((actual.diagnostics ?? []).map(d => d.code).sort(), wanted)) fields.push('lintComplete')
  }
  return { status: fields.length ? 'fail' : 'pass', fields: [...new Set(fields)] }
}
function holdsFacts(actual, stated) {
  if (Array.isArray(stated)) return Array.isArray(actual) && stated.every((v, i) => holdsFacts(actual[i], v))
  if (stated && typeof stated === 'object') return actual && typeof actual === 'object' && Object.entries(stated).every(([k, v]) => holdsFacts(actual[k], v))
  return same(actual, stated)
}
function layoutMatches(actual, expected) {
  if (!actual || typeof actual !== 'object') return false
  for (const [key, value] of Object.entries(expected)) {
    if (key !== 'nodes') { if (!holdsFacts(actual[key], value)) return false; continue }
    if (!Array.isArray(actual.nodes)) return false
    for (const node of value) {
      const found = actual.nodes.find(entry => entry.path === node.path)
      if (!found || !holdsFacts(found, node)) return false
    }
  }
  return true
}
const jsDir = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'engines/carve-js'))
const phpDir = resolve(process.env.CARVE_PHP_DIR ?? resolve(root, 'engines/carve-php'))
const rsDir = resolve(process.env.CARVE_RS_DIR ?? resolve(root, 'engines/carve-rs'))
const revision = dir => {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 30_000 })
  if (result.status !== 0) throw new Error(`Cannot read engine revision in ${dir}: ${result.stderr}`)
  return result.stdout.trim()
}
const engineHeads = { js: revision(jsDir), php: revision(phpDir), rs: revision(rsDir) }
const js = await import(pathToFileURL(resolve(jsDir, 'v2/src/index.ts')))
const importer = await import(pathToFileURL(resolve(jsDir, 'import/src/index.ts')))
function jsOptions(c) {
  const options = { ...(c.options ?? {}) }
  if (c.files) options.includes = { ...(options.includes ?? {}), resolver: resolver(c.files) }
  if (options.extensions?.includes('carve.tabs')) options.extensions = js.tabsExtensions
  if (options.renderers?.['carve.tabs'] === 'standard') options.renderers = { 'carve.tabs': js.tabsRenderer }
  return options
}
const parseOptions = options => Object.fromEntries(Object.entries(options).filter(([key]) => ['includes', 'extensions', 'headingIds', 'positions'].includes(key)))
const lintOptions = options => Object.fromEntries(Object.entries(options).filter(([key]) => ['includes', 'extensions', 'rules', 'platforms'].includes(key)))
function jsRun(c) {
  const input = sourceOf(c), options = jsOptions(c)
  const kind = c.kind
  try {
    if (kind === 'refused-tree' || kind === 'supplied-tree' || kind === 'tree') {
      const tree = js.decodeTree(c.json ?? JSON.stringify(c.tree))
      return { accepted: true, tree }
    }
    if (kind === 'layout-fixture') {
      try {
        js.validateLayout(c.layout)
        const source = c.input ? Buffer.from(c.input.replaceAll(' ', ''), 'hex') : c.layout.source
        return { accepted: true, layout: js.parseWithLayout(source).layout }
      }
      catch (e) { return { accepted: false, error: e.name, path: e.path } }
    }
    if (kind === 'cli') return { unsupported: 'CLI replay is measured separately from the library runner' }
    if (kind === 'migrate') { const r = js.migrateTree(c.tree, options); return { tree: r.document, diagnostics: r.diagnostics } }
    if (kind === 'import') { const r = importer.importDocument(c.html, { from: 'html', ...options }); return { tree: r.document, carve: r.source, diagnostics: r.diagnostics } }
    if (kind === 'tree-fixture') return { tree: js.parse(input, parseOptions(options)), accepted: true }
    if (kind === 'write') { const r = js.writeWithDiagnostics(c.tree, { ...options, ...(c.layout ? { layout: c.layout } : {}) }); return { carve: r.source, diagnostics: r.diagnostics } }
    if (kind === 'format' || kind === 'write-example') {
      const r = js.formatWithDiagnostics(typeof input === 'string' ? input : new TextDecoder().decode(input), options)
      return { carve: r.source, diagnostics: r.diagnostics, ...(kind === 'write-example' ? { ...(c.expected.html !== undefined ? { html: js.render(input, parseOptions(options)) } : {}), tree: js.parse(input, parseOptions(options)) } : {}) }
    }
    if (kind === 'layout') { const r = js.parseWithLayout(input, options); return { tree: r.document, layout: r.layout, diagnostics: r.diagnostics } }
    if (kind === 'parse') { const r = js.parseWithDiagnostics(input, options); return { tree: r.document, diagnostics: r.diagnostics, suppressed: r.suppressedDiagnostics } }
    if (kind === 'lint') return { diagnostics: js.lint(typeof input === 'string' ? input : input.toString('utf8'), options), ...(c.area === 'examples' ? { tree: js.parse(input, parseOptions(options)) } : {}) }
    if (kind === 'render' || kind === 'include') {
      const r = js.renderWithDiagnostics(c.tree ?? input, options)
      const diagnostics = c.area === 'examples' && c.expected?.diagnostics ? [...r.diagnostics, ...js.lint(input, lintOptions(options))] : r.diagnostics
      return { html: r.html, diagnostics, ...(c.tree ? {} : { tree: js.parse(input, parseOptions(options)) }) }
    }
    return { unsupported: `unknown kind ${kind}` }
  } catch (e) { return { accepted: false, error: e.name, message: e.message, path: e.path } }
}
function cliRun(c, engine) {
  const command = c.args?.[0] ?? 'render'
  if (engine === 'rs' && command !== 'lint') return { unsupported: `Rust carve2 CLI has no ${command} command` }
  const dir = mkdtempSync(join(tmpdir(), `carve-next2-${engine}-`))
  for (const [name, content] of Object.entries(c.files ?? {})) {
    const path = resolve(dir, name)
    if (!path.startsWith(dir + '/')) throw new Error(`unsafe fixture path: ${name}`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content.text ?? Buffer.from(content.bytes.replaceAll(' ', ''), 'hex'))
  }
  const commands = {
    js: [process.execPath, resolve(jsDir, 'dist/cli2.js')],
    php: ['php', resolve(phpDir, 'v2/bin/carve2')],
    rs: [resolve(process.env.CARVE_RS_02_BIN ?? resolve(root, 'target/debug/carve2'))],
  }
  const [file, ...prefix] = commands[engine]
  if (!existsSync(file) && file !== 'php') return { unsupported: `${engine} 0.2 CLI is not built` }
  const run = spawnSync(file, [...prefix, ...(c.args ?? [])], { cwd: dir, input: c.stdin ?? '', encoding: 'utf8', timeout: 15_000, maxBuffer: 20_000_000 })
  if (run.error) return { error: String(run.error) }
  const diagnostics = stream => stream.split('\n').flatMap(line => {
    const match = /^(.+):(\d+):(\d+): (error|warning|hint) ([\w/-]+) /.exec(line)
    if (match) return [{ file: match[1], line: Number(match[2]), column: Number(match[3]), severity: match[4], code: match[5] }]
    const unplaced = /^(.+): (error|warning|hint) ([\w/-]+) /.exec(line)
    return unplaced ? [{ file: unplaced[1], severity: unplaced[2], code: unplaced[3] }] : []
  })
  const filesAfter = {}
  for (const name of Object.keys(c.expected?.filesAfter ?? {})) {
    const path = resolve(dir, name)
    if (!path.startsWith(dir + '/')) throw new Error(`unsafe fixture path: ${name}`)
    if (!existsSync(path)) filesAfter[name] = null
    else if (c.expected.filesAfter[name]?.json !== undefined) {
      try { filesAfter[name] = { json: JSON.parse(readFileSync(path, 'utf8')) } } catch { filesAfter[name] = { text: readFileSync(path, 'utf8') } }
    } else filesAfter[name] = { text: readFileSync(path, 'utf8') }
  }
  let stdoutJson
  try { stdoutJson = JSON.parse(run.stdout) } catch { /* a non-JSON command */ }
  return { status: run.status, stdout: run.stdout, stdoutJson, stderrCategory: run.stderr.match(/^carve\[([^\]]+)\]:/)?.[1] ?? null, stdoutDiagnostics: diagnostics(run.stdout), stderrDiagnostics: diagnostics(run.stderr), filesAfter }
}
function batch(command, cmdArgs, env) {
  const run = spawnSync(command, cmdArgs, { input: JSON.stringify(work), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 18 * 60_000, env: { ...process.env, ...env } })
  if (run.error || run.status !== 0) throw new Error(`${command} failed: ${run.error ?? run.stderr.slice(0, 3000)}`)
  const output = JSON.parse(run.stdout)
  if (!Array.isArray(output) || output.length !== work.length) throw new Error(`${command}: expected ${work.length} records, got ${output.length}`)
  return output
}
const started = Date.now()
const outputs = {}
outputs.js = work.map(jsRun)
outputs.php = batch('php', [resolve(root, 'scripts/next2-readiness-php.php')], { CARVE_PHP_DIR: phpDir })
outputs.rs = batch(resolve(process.env.CARVE_RS_READINESS_BIN ?? resolve(root, 'target/debug/carve-next2-readiness')), [], {})
for (const [engine, output] of Object.entries(outputs)) work.forEach((c, i) => { if (c.kind === 'cli') output[i] = cliRun(c, engine) })
const results = {}
for (const [engine, output] of Object.entries(outputs)) results[engine] = work.map((c, i) => ({ area: c.area, kind: c.kind, id: c.id, ...compare(c, output[i]) }))

// Every catalog row is accounted for. Cases with no stated trigger are unsupported evidence, not a silent pass.
const catalog = {}
const lintAgreement = {}
for (const [engine, rows] of Object.entries(results)) catalog[engine] = rules.map(rule => {
  const uses = work.flatMap((c, i) => (c.expected?.diagnostics ?? []).filter(d => (typeof d === 'string' ? d : d.code) === rule.id).map(d => ({ c, actual: outputs[engine][i], wanted: typeof d === 'string' ? { code: d } : d })))
  const unsupported = uses.filter(u => u.actual?.unsupported).length
  const failed = uses.filter(u => !u.actual?.unsupported && !u.actual?.diagnostics?.some(d => diagMatches(d, u.wanted, u.c))).length
  const percent = (passed, total) => total ? Number((passed / total * 100).toFixed(2)) : 0
  const rangeUses = uses.filter(u => ['line', 'column', 'endLine', 'endColumn'].some(k => u.wanted[k] !== undefined))
  const matchingRange = u => u.actual?.diagnostics?.some(d => {
    if (d.code !== u.wanted.code) return false
    const source = d.file ? u.c.files?.[d.file]?.text : (u.c.html ?? sourceOf(u.c))
    const place = diagPlace(d, source)
    return ['line', 'column', 'endLine', 'endColumn'].every(k => u.wanted[k] === undefined || place[k] === u.wanted[k])
  })
  return {
    id: rule.id, status: uses.length === 0 || unsupported === uses.length ? 'unsupported' : failed > 0 ? 'fail' : 'pass',
    cases: uses.length, messageTemplate: !!rule.messages,
    idPercent: percent(uses.filter(u => u.actual?.diagnostics?.some(d => d.code === rule.id)).length, uses.length),
    rangePercent: percent(rangeUses.filter(matchingRange).length, rangeUses.length),
    messagePercent: rule.messages ? percent(uses.filter(u => u.actual?.diagnostics?.some(d => d.code === rule.id && messageMatches(d, u.wanted))).length, uses.length) : null,
    agreement: percent(uses.length - unsupported - failed, uses.length),
  }
})
for (const engine of Object.keys(outputs)) {
  const probes = work.flatMap((c, i) => (c.expected?.diagnostics ?? []).map(d => ({ c, actual: outputs[engine][i], wanted: typeof d === 'string' ? { code: d } : d })))
  const ranges = probes.filter(p => ['line', 'column', 'endLine', 'endColumn'].some(k => p.wanted[k] !== undefined))
  const messages = probes.filter(p => ruleById.get(p.wanted.code)?.messages)
  const percent = (ok, total) => total ? Number((ok / total * 100).toFixed(2)) : 0
  lintAgreement[engine] = {
    idPercent: percent(probes.filter(p => p.actual?.diagnostics?.some(d => d.code === p.wanted.code)).length, probes.length),
    rangePercent: percent(ranges.filter(p => p.actual?.diagnostics?.some(d => {
      if (d.code !== p.wanted.code) return false
      const source = d.file ? p.c.files?.[d.file]?.text : (p.c.html ?? sourceOf(p.c))
      const place = diagPlace(d, source)
      return ['line', 'column', 'endLine', 'endColumn'].every(k => p.wanted[k] === undefined || place[k] === p.wanted[k])
    })).length, ranges.length),
    messagePercent: percent(messages.filter(p => p.actual?.diagnostics?.some(d => d.code === p.wanted.code && messageMatches(d, p.wanted))).length, messages.length),
    probes: probes.length, rangeProbes: ranges.length, messageProbes: messages.length,
  }
}

async function replay() {
  const { upgrade, canWriteUpgrade } = await import(pathToFileURL(resolve(jsDir, 'upgrade/src/index.ts')))
  const sources = new Map()
  for (const name of readdirSync(resolve(root, 'resources/conformance-pack')).filter(n => n.endsWith('.json') && !['index.json', 'seeds.json'].includes(n))) {
    const rows = JSON.parse(readFileSync(resolve(root, 'resources/conformance-pack', name), 'utf8'))
    for (const row of rows) if (typeof row.source === 'string') sources.set(`pack/${name}/${row.id}`, row.source)
  }
  function exampleFiles(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) exampleFiles(path)
      else if (entry.name.endsWith('.md')) {
        const text = readFileSync(path, 'utf8')
        let n = 0
        for (const match of text.matchAll(/^```(?:carve|crv)\s*\n([\s\S]*?)^```\s*$/gm)) sources.set(`example/${path.slice(root.length + 1)}/${++n}`, match[1])
      }
    }
  }
  exampleFiles(resolve(root, 'resources/examples'))
  const all = [...sources]
  const selected = Number.isFinite(limit) ? all.slice(0, limit) : all
  const out = { total: selected.length, pass: 0, explained: 0, blocked: 0, mismatches: 0, noMappedRow: 0, samples: [] }
  for (const [id, source] of selected) {
    try {
      const r = upgrade(source)
      if (r.check === 'pass' || r.check === 'explained') out[r.check]++
      if (r.check === 'mismatch') {
        out.mismatches++
        const noMapped = r.records.some(rec => rec.entry === 'upgrade-mismatch' && /no mapped row/i.test(rec.message ?? ''))
        if (noMapped) out.noMappedRow++
        if (out.samples.length < 15) out.samples.push({ id, records: r.records.filter(rec => rec.class === 'mismatch').slice(0, 2) })
      }
      if (!canWriteUpgrade(r)) out.blocked++
    } catch (error) {
      out.mismatches++; out.blocked++
      if (out.samples.length < 15) out.samples.push({ id, error: String(error) })
    }
  }
  out.noMappedShare = out.mismatches ? Number((out.noMappedRow / out.mismatches * 100).toFixed(2)) : 0
  return out
}
const upgrade = await replay()
function tally(rows) { return { pass: rows.filter(x => x.status === 'pass').length, fail: rows.filter(x => x.status === 'fail').length, unsupported: rows.filter(x => x.status === 'unsupported').length } }
const counts = {}
for (const engine of ['js', 'php', 'rs']) {
  counts[engine] = {}
  for (const area of ['clauses', 'examples', 'trees']) counts[engine][area] = tally(results[engine].filter(r => r.area === area))
  counts[engine].catalog = tally(catalog[engine])
}
counts.js.upgrade = { pass: upgrade.total - upgrade.blocked, fail: upgrade.blocked, unsupported: 0 }
const report = { schema: 1, generatedAt: new Date().toISOString(), durationSeconds: Math.round((Date.now() - started) / 1000), engineHeads, counts, lintAgreement, upgrade, failures: Object.fromEntries(Object.entries(results).map(([k,v]) => [k, v.filter(r => r.status !== 'pass')])), catalog }
const lines = ['# Carve 0.2 engine readiness', '', '| Engine | Area | Pass | Fail | Unsupported | Agreement | Ready |', '|---|---|---:|---:|---:|---:|---|']
for (const [engine, areas] of Object.entries(counts)) for (const [area, row] of Object.entries(areas)) {
  const total = row.pass + row.fail + row.unsupported
  lines.push(`| ${engine} | ${area} | ${row.pass} | ${row.fail} | ${row.unsupported} | ${total ? (row.pass / total * 100).toFixed(1) : '0.0'}% | ${row.fail + row.unsupported === 0 ? 'yes' : 'no'} |`)
}
lines.push('', `Engine ready: ${Object.entries(counts).map(([engine, areas]) => `${engine} ${Object.values(areas).every(row => row.fail + row.unsupported === 0) ? 'yes' : 'no'}`).join(', ')}.`)
lines.push('', '| Engine | Unsupported kind | Cases |', '|---|---|---:|')
for (const [engine, rows] of Object.entries(results)) {
  const kinds = new Map()
  for (const row of rows.filter(r => r.status === 'unsupported')) kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + 1)
  for (const [kind, count] of [...kinds].sort(([a], [b]) => a.localeCompare(b))) lines.push(`| ${engine} | ${kind} | ${count} |`)
}
lines.push('', `Upgrade replay: ${upgrade.total} sources, ${upgrade.mismatches} mismatches, ${upgrade.noMappedRow} with no mapped row (${upgrade.noMappedShare}%), ${upgrade.blocked} blocked.`, '', `Runner wall time: ${report.durationSeconds} seconds.`)
lines.push('', '| Engine | Lint ID | Range | Message |', '|---|---:|---:|---:|')
for (const [engine, item] of Object.entries(lintAgreement)) lines.push(`| ${engine} | ${item.idPercent}% | ${item.rangePercent}% | ${item.messagePercent}% |`)
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n')
writeFileSync(mdPath, lines.join('\n') + '\n')
console.log(lines.join('\n'))
if (args.has('--write-baseline')) {
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
    for (const engine of ['js', 'php', 'rs']) for (const [area, now] of Object.entries(counts[engine])) {
      const old = baseline.counts[engine][area]
      if (old && (now.pass < old.pass || now.fail > old.fail || now.unsupported > old.unsupported)) throw new Error(`Cannot lower readiness baseline: ${engine}/${area}`)
    }
    for (const engine of ['js', 'php', 'rs']) for (const key of ['idPercent', 'rangePercent', 'messagePercent']) {
      if (lintAgreement[engine][key] < baseline.lintAgreement[engine][key]) throw new Error(`Cannot lower readiness baseline: ${engine}/${key}`)
    }
    if (upgrade.total < baseline.upgrade.total || upgrade.blocked > baseline.upgrade.blocked || upgrade.mismatches > baseline.upgrade.mismatches || upgrade.noMappedRow > baseline.upgrade.noMappedRow) throw new Error('Cannot lower upgrade baseline')
  }
  writeFileSync(baselinePath, JSON.stringify({ schema: 1, engineHeads, counts, lintAgreement, upgrade: { total: upgrade.total, blocked: upgrade.blocked, mismatches: upgrade.mismatches, noMappedRow: upgrade.noMappedRow } }, null, 2) + '\n')
} else if (Number.isFinite(limit)) {
  console.log('Sampled run; baseline comparison skipped.')
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const drops = []
  for (const engine of ['js', 'php', 'rs']) for (const area of Object.keys(counts[engine])) {
    const now = counts[engine][area], old = baseline.counts[engine][area]
    if (!old) { drops.push(`${engine}/${area}: absent from baseline`); continue }
    if (now.pass < old.pass || now.fail > old.fail || now.unsupported > old.unsupported) drops.push(`${engine}/${area}: ${JSON.stringify(now)} below ${JSON.stringify(old)}`)
  }
  for (const engine of ['js', 'php', 'rs']) for (const key of ['idPercent', 'rangePercent', 'messagePercent']) {
    if (lintAgreement[engine][key] < baseline.lintAgreement[engine][key]) drops.push(`${engine} lint ${key} fell below baseline`)
  }
  if (upgrade.total < baseline.upgrade.total || upgrade.blocked > baseline.upgrade.blocked || upgrade.mismatches > baseline.upgrade.mismatches || upgrade.noMappedRow > baseline.upgrade.noMappedRow) drops.push('upgrade replay dropped below baseline')
  if (drops.length) { console.error(drops.join('\n')); process.exitCode = 1 }
}
