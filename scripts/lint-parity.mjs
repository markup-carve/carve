#!/usr/bin/env node
// Differential lint harness for the 0.2 engines: lints seeded generated inputs with carve-js, carve-php and
// carve-rs, in core mode and with citations plus glossary, and groups every disagreement by rule and by a
// minimized cause. Usage and environment: see scripts/lint-parity.md.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

let args = {}
const jsDir = resolve(process.env.CARVE_JS_DIR ?? resolve(root, 'engines/carve-js'))
const phpDir = resolve(process.env.CARVE_PHP_DIR ?? resolve(root, 'engines/carve-php'))
const rsDir = resolve(process.env.CARVE_RS_DIR ?? resolve(root, 'engines/carve-rs'))

// ---------------------------------------------------------------- generator

function prng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const r = {
    next,
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
  }
  return r
}

const words = ['a', 'text', 'word', 'x y', 'more text', 'term', 'key']
const inlines = [
  () => '', () => '', () => '', () => ' *strong*', () => ' _em_', () => ' [link](u)', () => ' [ref][]', () => ' [ ]',
  () => ' <b>', () => ' `code`', () => ' [@key]', () => ' [@a; @b]', () => ' [term]{.term}', () => ' {=mark=}',
  () => ' ~sub~', () => ' ^sup^', () => ' [^n]', () => ' $math$', () => ' :: x', () => ' # x',
]
const text = (r) => r.pick(words) + r.pick(inlines)()

// Each leaf returns its lines. Every line shape in spec/0.2/data/line-shapes.json has a producer here.
const leaves = {
  paragraph: (r) => Array.from({ length: 1 + r.int(3) }, () => text(r)),
  heading: (r) => [r.pick(['#', '##', '###', '=', '==']) + r.pick([' ', ' ', '']) + 'H' + r.pick(['', '', ' #', ' ##'])],
  block_image: (r) => ['![' + r.pick(['alt', '']) + '](i.png)' + r.pick(['', '{#img}'])],
  display_math: (r) => [r.pick(['$$x$$', '$$ x $$', '$$x$${#m}'])],
  comment_block: (r) => { const f = '%'.repeat(3 + r.int(2)); return [f, 'c', r.pick([f, f + ' x', '%%%'])] },
  comment_only: (r) => [r.pick(['%% c', '%%', '%%x'])],
  region: (r) => [r.pick(['%% #region r', '%% #endregion', '%%#region r'])],
  abbreviation: (r) => ['*[' + r.pick(['HTML', 'A', 'x1']) + ']: ' + r.pick(['Hyper', 'x'])],
  thematic: (r) => [r.pick(['***', '* * *', '---', '- - -', '___', '----', '-----'])],
  table: (r) => {
    const rows = [r.pick(['|= A |= B |', '|={<} A |={>} B |', '| A | B |', '|=< A |= B |'])]
    if (r.chance(0.2)) rows.push(r.pick(['|---|---|', '|:--|--:|']))
    for (let i = r.int(3); i >= 0; i--) rows.push(r.pick(['| x | y |', '| 1 | 2 |', '| x |', '| x | y | z |']))
    if (r.chance(0.25)) rows.push(r.pick(['+ more |', '+|', '+ x | y |']))
    if (r.chance(0.3)) rows.push(r.pick(['^ Caption', '^Caption']))
    return rows
  },
  caption: (r) => [r.pick(['^ Caption', '^ x', '^x'])],
  code_fence: (r) => { const f = r.pick(['```', '````', '~~~']); return [f + r.pick(['', 'js', ' js', ' "t"', '=html']), 'code', r.pick([f, f, ' ' + f, '```` x'])] },
  attribute: (r) => [r.pick(['{#id}', '{.c}', '{#id .c k=v}', '{ #id }', '{%c%}'])],
  include: (r) => [r.pick(['{{ x.crv }}', '{{  }}', '{{ x.crv#s }}', '{{x.crv}}'])],
  link_definition: (r) => [r.pick(['[a]: u', '[ ]: u', '[a]:', '[a]: <>', '[^n]: note', '[@key]: author'])],
  footnote: (r) => ['[^' + r.pick(['n', 'n', 'm', ' ']) + ']: ' + text(r)],
  definition: (r) => {
    const out = [':: ' + text(r)]
    if (r.chance(0.3)) out.push(r.pick([':: t2', 'more term']))
    out.push(r.pick([': ', ':', ':  ']) + text(r))
    if (r.chance(0.3)) out.push(r.pick(['  > q', '  # H', '  ' + text(r), text(r), ': d2']))
    return out
  },
  term_only: (r) => [':: ' + text(r)],
  description_only: (r) => [': ' + text(r)],
  div_bare: (r) => [r.pick([':::', '::::'])],
  continuation: (r) => [r.pick(['+ x |', '+|'])],
  markdown_like: (r) => [r.pick([': definition', '- [ ] task', '- [x] done', '<div>', '> [!NOTE]', '+ item', 'x\\', '## H ##'])],
  references: (r) => [r.pick(['::: references', '::: bibliography', '::: glossary']), r.pick(['', '[@key]: A', ':: term\n: def']).split('\n'), ':::'].flat().filter((l) => l !== ''),
}
const leafNames = Object.keys(leaves)

// Containers wrap a list of lines; the continuation prefix may be dropped later (lazy lines).
const containers = {
  quote: (r, lines) => lines.map((l) => (l === '' ? r.pick(['>', '']) : r.pick(['> ', '> ', '>']) + l)).map((l, i) => ({ l, lazy: i > 0 && r.chance(0.12) ? l.replace(/^> ?/, '') : null })),
  bullet: (r, lines) => wrapMarker(r, lines, r.pick(['- ', '* ', '- [ ] ', '+ '])),
  ordered: (r, lines) => wrapMarker(r, lines, r.pick(['1. ', '2) ', 'a. ', 'i) ', '10. '])),
  description: (r, lines) => [{ l: ':: ' + r.pick(['term', 't']) }, ...wrapMarker(r, lines, ': ')],
  footnote: (r, lines) => wrapMarker(r, lines, '[^' + r.pick(['n', 'f']) + ']: '),
  div: (r, lines) => {
    const fence = r.pick([':::', ':::', '::::'])
    const name = r.pick([' box', ' note', ' warning', '', ' references', ' glossary', '{.c}'])
    const closer = r.pick([fence, fence, ':::', null])
    return [{ l: fence + name }, ...lines.map((l) => ({ l })), ...(closer === null ? [] : [{ l: closer }])]
  },
}
function wrapMarker(r, lines, marker) {
  const pad = ' '.repeat(marker.length + r.pick([0, 0, 0, -1, 1]))
  return lines.map((l, i) => {
    if (i === 0) return { l: marker + l }
    if (l === '') return { l: '' }
    return { l: pad + l, lazy: r.chance(0.15) ? l : null }
  })
}
const containerNames = Object.keys(containers)

function block(r, depth) {
  if (depth < 3 && r.chance(depth === 0 ? 0.55 : 0.35)) {
    const kind = r.pick(containerNames)
    const inner = []
    const n = 1 + r.int(2)
    for (let i = 0; i < n; i++) {
      if (i > 0 && r.chance(0.6)) inner.push('')
      inner.push(...block(r, depth + 1))
    }
    return containers[kind](r, inner).map((x) => (x.lazy != null ? x.lazy : x.l))
  }
  return leaves[r.pick(leafNames)](r)
}

function mutate(r, lines) {
  return lines.map((l) => {
    if (l === '') return r.chance(0.05) ? r.pick([' ', '\t']) : l
    if (r.chance(0.08)) return ' '.repeat(1 + r.int(4)) + l
    if (r.chance(0.04)) return '\t' + l
    if (r.chance(0.04)) return l.replace(/^( {2,4})/, '\t')
    if (r.chance(0.03)) return l.replace(/^(> |- |: |:: |# )/, (m) => m.trimEnd())
    if (r.chance(0.02)) return l + r.pick([' ', '\t', '  '])
    return l
  })
}

function frontmatter(r) {
  return r.pick([['---', 'title: x', '---'], ['---', 'carve: 0.2', '---'], ['---'], ['---toml', 'a = 1', '---'], ['---', 'k: v'], ['+++', 'a = 1', '+++']])
}

export function generate(seed, count) {
  const r = prng(seed)
  const cases = []
  for (let i = 0; i < count; i++) {
    let lines = []
    if (r.chance(0.08)) lines.push(...frontmatter(r))
    const n = 1 + r.int(4)
    for (let b = 0; b < n; b++) {
      if (lines.length > 0 && r.chance(0.65)) lines.push('')
      lines.push(...block(r, 0))
    }
    lines = mutate(r, lines)
    cases.push(lines.join('\n') + (r.chance(0.9) ? '\n' : ''))
  }
  return cases
}

// ---------------------------------------------------------------- engines

// `data`: carve-js with its internal switch on, so the rules of spec/0.2/data/lint-model.json run from data.
async function jsEngine(data = false) {
  const index = await import(pathToFileURL(resolve(jsDir, 'dist/index.js')))
  const ext = await import(pathToFileURL(resolve(jsDir, 'dist/extensions.js')))
  const extensions = [...ext.citations().extensions, ...ext.glossary().extensions]
  return (cases) => cases.map((c) => {
    const saved = process.env.CARVE_LINT_RULES
    if (data) process.env.CARVE_LINT_RULES = 'data'
    else delete process.env.CARVE_LINT_RULES
    try {
      return index.lint(c.source, c.extensions ? { extensions } : {}).filter((d) => d.channel === 'lint')
        .map((d) => ({ code: d.code, start: d.range?.startOffset ?? null, end: d.range?.endOffset ?? null, message: d.message }))
    } catch (error) {
      return [{ code: 'ERROR:' + (error?.name ?? 'throw'), start: null, end: null, message: String(error?.message ?? error) }]
    } finally {
      if (saved === undefined) delete process.env.CARVE_LINT_RULES
      else process.env.CARVE_LINT_RULES = saved
    }
  })
}

function phpEngine() {
  return (cases) => JSON.parse(execFileSync('php', ['-d', 'memory_limit=2G', resolve(here, 'lint-parity-php.php')], {
    input: JSON.stringify(cases), maxBuffer: 1 << 30, env: { ...process.env, CARVE_PHP_DIR: phpDir },
  }).toString())
}

function rsEngine() {
  let bin = process.env.CARVE_RS_LINT_BIN
  if (!bin) {
    const crate = resolve(tmpdir(), 'carve-lint-parity-' + createHash('sha1').update(rsDir).digest('hex').slice(0, 8))
    mkdirSync(crate, { recursive: true })
    writeFileSync(resolve(crate, 'Cargo.toml'), readFileSync(resolve(here, 'lint-parity-rs/Cargo.toml.in'), 'utf8').replace('@CARVE_RS_DIR@', rsDir.replaceAll('\\', '/')))
    if (!existsSync(resolve(crate, 'src'))) symlinkSync(resolve(here, 'lint-parity-rs/src'), resolve(crate, 'src'))
    execFileSync('cargo', ['build', '--release', '--quiet', '--manifest-path', resolve(crate, 'Cargo.toml')], { stdio: 'inherit' })
    const target = process.env.CARGO_TARGET_DIR ?? resolve(crate, 'target')
    bin = resolve(target, 'release/carve-lint-parity')
  }
  return (cases) => JSON.parse(execFileSync(bin, { input: JSON.stringify(cases), maxBuffer: 1 << 30 }).toString())
}

let engineNames = ['js', 'php', 'rs']
let ruleFilter = null

// ---------------------------------------------------------------- comparison

const key = (d) => `${d.code}@${d.start}-${d.end}`
const tally = (list) => list.reduce((m, d) => m.set(d.code, (m.get(d.code) ?? 0) + 1), new Map())

// Partition of the engines by value, e.g. "js=rs<php"; the value itself is left out so the class survives
// minimization that changes how many times a rule fires.
function pattern(values) {
  const groups = new Map()
  engineNames.forEach((e, i) => groups.set(values[i], [...(groups.get(values[i]) ?? []), e]))
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, es]) => es.join('=')).join('<')
}

// Differences of one case: one record per rule that differs, with the kind of difference.
export function differences(results) {
  const out = []
  const tallies = results.map(tally)
  const codes = new Set(results.flatMap((list) => list.map((d) => d.code)).filter((code) => ruleFilter === null || ruleFilter.has(code) || code.startsWith('ERROR')))
  for (const code of [...codes].sort()) {
    const counts = tallies.map((t) => t.get(code) ?? 0)
    if (new Set(counts).size > 1) { out.push({ rule: code, kind: 'count', pattern: pattern(counts.map((n) => String(n).padStart(4, '0'))) }); continue }
    const starts = results.map((list) => list.filter((d) => d.code === code).map((d) => d.start).sort((a, b) => a - b).join(' '))
    if (new Set(starts).size > 1) { out.push({ rule: code, kind: 'start', pattern: pattern(starts) }); continue }
    const ranges = results.map((list) => list.filter((d) => d.code === code).map(key).sort().join(' '))
    if (new Set(ranges).size > 1) { out.push({ rule: code, kind: 'end', pattern: pattern(ranges) }); continue }
    const messages = results.map((list) => list.filter((d) => d.code === code).map((d) => key(d) + ':' + d.message).sort().join('\n'))
    if (new Set(messages).size > 1) out.push({ rule: code, kind: 'message', pattern: pattern(messages) })
  }
  return out
}
const signature = (d) => `${d.rule}|${d.kind}|${d.pattern}`

async function runAll(engines, cases) {
  return Object.fromEntries(engineNames.map((e) => [e, engines[e](cases)]))
}

// Greedy line deletion, batched across every differing case so each round is one call per engine.
async function minimize(engines, items) {
  let work = items.map((it) => ({ ...it, lines: it.source.replace(/\n$/, '').split('\n') }))
  for (let round = 0; round < 40; round++) {
    const batch = []
    work.forEach((w, wi) => {
      if (w.done) return
      for (let i = 0; i < w.lines.length; i++) {
        if (w.lines.length === 1) break
        batch.push({ wi, lines: w.lines.filter((_, j) => j !== i) })
      }
      // Also try shortening a line's text after its marker, which removes unrelated inline content.
      w.lines.forEach((l, i) => {
        const short = l.replace(/^(\s*(?:[>:\-*+]\s?|\d+[.)]\s|::\s|#+\s)*)(\S+)\s+\S.*$/, '$1$2')
        if (short !== l) batch.push({ wi, lines: w.lines.map((x, j) => (j === i ? short : x)) })
      })
    })
    if (batch.length === 0) break
    const cases = batch.map((b) => ({ source: b.lines.join('\n') + '\n', extensions: work[b.wi].extensions }))
    const results = await runAll(engines, cases)
    const improved = new Set()
    batch.forEach((b, bi) => {
      const w = work[b.wi]
      if (improved.has(b.wi)) return
      const diffs = differences(engineNames.map((e) => results[e][bi]))
      if (diffs.some((d) => signature(d) === w.signature)) {
        w.lines = b.lines
        improved.add(b.wi)
      }
    })
    work.forEach((w, wi) => { if (!improved.has(wi)) w.done = true })
    if (improved.size === 0) break
  }
  return work.map((w) => ({ ...w, minimal: w.lines.join('\n') + '\n' }))
}

// Cause class: the rule, the difference and the minimized input with its words collapsed.
const skeleton = (source) => source.replace(/[A-Za-z][A-Za-z0-9]*/g, 'w').replace(/\d+/g, '1')

// ---------------------------------------------------------------- main

async function main() {
  args = parseArgs({
    options: {
      seed: { type: 'string', default: '1' },
      count: { type: 'string', default: '1000' },
      modes: { type: 'string', default: 'core,ext' },
      out: { type: 'string' },
      cases: { type: 'string' },
      'no-minimize': { type: 'boolean', default: false },
      examples: { type: 'string', default: '2' },
      samples: { type: 'string', default: '6' },
      engines: { type: 'string', default: 'js,php,rs' },
      rules: { type: 'string' },
    },
  }).values
  const seed = Number(args.seed)
  const count = Number(args.count)
  const modes = args.modes.split(',')
  const sources = args.cases ? JSON.parse(readFileSync(args.cases, 'utf8')) : generate(seed, count)
  const cases = modes.flatMap((mode) => sources.map((source, index) => ({ source, extensions: mode === 'ext', mode, index })))
  engineNames = args.engines.split(',')
  if (args.rules) ruleFilter = new Set(args.rules.split(','))
  const makers = { js: () => jsEngine(), 'js-data': () => jsEngine(true), php: phpEngine, rs: rsEngine }
  const engines = {}
  for (const name of engineNames) engines[name] = await makers[name]()
  const results = await runAll(engines, cases.map(({ source, extensions }) => ({ source, extensions })))
  const items = []
  const perRule = {}
  cases.forEach((c, i) => {
    for (const d of differences(engineNames.map((e) => results[e][i]))) {
      items.push({ ...d, source: c.source, extensions: c.extensions, mode: c.mode, index: c.index, signature: signature(d),
        outputs: Object.fromEntries(engineNames.map((e) => [e, results[e][i].filter((x) => x.code === d.rule)])) })
      const row = (perRule[d.rule] ??= { total: 0, core: 0, ext: 0 })
      row.total++
      row[c.mode]++
    }
  })
  // Minimize the shortest few inputs of each signature; a cause class is a signature plus the skeleton of a
  // minimized input, and its count is the share of the signature's differences its samples stand for.
  const bySignature = new Map()
  for (const it of items) bySignature.set(it.signature, [...(bySignature.get(it.signature) ?? []), it])
  const samples = [...bySignature.values()].flatMap((list) => [...list].sort((a, b) => a.source.length - b.source.length).slice(0, Number(args.samples)))
  const minimized = args['no-minimize'] ? samples.map((it) => ({ ...it, minimal: it.source })) : await minimize(engines, samples)
  const classes = new Map()
  for (const it of minimized) {
    const id = it.signature + '|' + skeleton(it.minimal)
    const cls = classes.get(id) ?? { rule: it.rule, kind: it.kind, pattern: it.pattern, skeleton: skeleton(it.minimal), samples: 0, signatureCount: bySignature.get(it.signature).length, modes: new Set(), examples: [] }
    cls.samples++
    cls.modes.add(it.mode)
    if (cls.examples.length < Number(args.examples)) cls.examples.push({ minimal: it.minimal, source: it.source, mode: it.mode, outputs: it.outputs })
    classes.set(id, cls)
  }
  const list = [...classes.values()].map((c) => ({ ...c, modes: [...c.modes] })).sort((a, b) => b.signatureCount - a.signatureCount || b.samples - a.samples)
  const errors = cases.filter((c, i) => engineNames.some((e) => results[e][i].some((d) => d.code.startsWith('ERROR')))).length
  // C2-T-020: messages are not compared, and C2-T-019 places a finding by the start of its range only.
  const blocking = (it) => it.kind === 'count' || it.kind === 'start'
  const blockingSignatures = [...bySignature.entries()].filter(([, list]) => blocking(list[0])).length
  const report = { seed, blockingSignatures, count: sources.length, modes, runs: cases.length, errors, differingRuns: new Set(items.map((it) => it.mode + it.index)).size,
    differences: items.length, signatures: bySignature.size, perRule, classes: list }
  if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n')
  console.log(`seed ${seed}: ${sources.length} inputs x ${modes.length} modes, ${report.differingRuns} runs differ, ${items.length} rule differences, ${bySignature.size} signatures (${blockingSignatures} on count or start), ${list.length} classes, ${errors} errors`)
  for (const [rule, row] of Object.entries(perRule).sort((a, b) => b[1].total - a[1].total)) console.log(`  ${rule}: ${row.total} (core ${row.core}, ext ${row.ext})`)
  for (const c of list) console.log(`\n[${c.signatureCount}/${c.samples}] ${c.rule} ${c.kind} ${c.pattern} (${c.modes.join(',')})\n${c.examples[0].minimal.replace(/^/gm, '    | ')}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
