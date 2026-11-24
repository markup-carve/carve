#!/usr/bin/env node
// Check the Expected results of tickets before they are filed (carve#6569, #6557, #6561 conflicted with
// C2-B-138, C2-W-075 and CC-1568). Run with --help for the case file format.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const HELP = `Usage: npm run expected:check -- <cases.crv> [--js <carve-js dir>] [--top <n>] [--clause-cases <file>]

Checks the Expected results a lane is about to file against the 0.2 reference
model, carve-js next2 (src/index.ts of a checkout: --js, else CARVE_JS_DIR, else
engines/carve-js), and against the pinned clause cases of
spec/0.2/conformance/clause-cases.json.

The case file is Carve 0.1 (a 0.2 "==" heading works too). Each case is a level-2 heading (its id, usually
the ticket number and a few words), a list of fields, then two fenced blocks:
the first is the input, the second the expected output.

  ## 6569 editorial comment across a comment line

  - operation: ast
  - clauses: C2-B-138
  - options: {"profile":"strict"}

  \`\`\`crv
  {#a
  %% b#}
  \`\`\`

  \`\`\`json
  [{"type":"paragraph","children":[{"type":"critic_comment","value":"a\\n%% b"}]}]
  \`\`\`

Fields: operation (required) is one of
  fmt   expected is the canonical source formatWithDiagnostics writes
  html  expected is the HTML renderWithDiagnostics writes
  ast   expected is the JSON children of the document, without positions
  lint  expected is one rule code per line, optionally followed by line:column
clauses (optional) names the clause ids the Expected section cites; clause cases
citing them win ties. options (optional) is a JSON object of options.
The input and a fmt expected are the block text with a final line feed. A
fence needs more backticks than any fence line inside it.

For each case the check reports:
  1. model differs: carve-js gives another output than the expected one;
  2. clause cases at risk, when the expected output asks the model to change:
     a clause case with the same input and another expected output, and the
     clause cases whose constructs (node kinds of the model's tree; for fmt
     the kinds the unescaped text would form) overlap the disputed ones, with
     whether the model passes them now and the clause ids they cite.

--top caps the clause cases listed per case (8). --clause-cases reads another
clause-cases.json than spec/0.2/conformance/clause-cases.json.

Exit status: 0 every case agrees with the model, 1 a conflict, 2 a tool error.`

export class CaseFileError extends Error {}

const FENCE = /^(`{3,}|~{3,})\s*([^`\s]*)\s*$/
const OPERATIONS = new Set(['fmt', 'html', 'ast', 'lint'])

export function parseCaseFile(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const cases = []
  let current = null
  const finish = () => {
    if (!current) return
    const at = `case "${current.id}" (line ${current.line})`
    if (!current.operation) throw new CaseFileError(`${at}: no "- operation:" field`)
    if (!OPERATIONS.has(current.operation)) throw new CaseFileError(`${at}: unknown operation "${current.operation}"`)
    if (current.blocks.length !== 2) throw new CaseFileError(`${at}: needs two fenced blocks, input and expected, found ${current.blocks.length}`)
    const [input, expected] = current.blocks
    cases.push({ id: current.id, line: current.line, operation: current.operation, clauses: current.clauses,
      options: current.options, input: `${input}\n`, expected: expectedValue(current.operation, expected, at) })
    current = null
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // `##` in Carve 0.1, `==` in 0.2.
    const heading = /^(?:##|==)\s+(.+?)\s*$/.exec(line)
    if (heading) { finish(); current = { id: heading[1], line: i + 1, clauses: [], options: {}, blocks: [] }; continue }
    const fence = FENCE.exec(line)
    if (fence) {
      const opener = fence[1]
      const body = []
      let j = i + 1
      for (; j < lines.length; j++) {
        const close = /^(`{3,}|~{3,})\s*$/.exec(lines[j])
        if (close && close[1][0] === opener[0] && close[1].length >= opener.length) break
        body.push(lines[j])
      }
      if (j === lines.length) throw new CaseFileError(`line ${i + 1}: fence opened and never closed`)
      if (!current) throw new CaseFileError(`line ${i + 1}: fenced block before the first "## " case heading`)
      current.blocks.push(body.join('\n'))
      i = j
      continue
    }
    const field = /^-\s+(operation|clauses|options):\s*(.*?)\s*$/.exec(line)
    if (field && current) {
      const [, name, value] = field
      if (name === 'operation') current.operation = value
      if (name === 'clauses') current.clauses = value.split(/[\s,]+/).filter(Boolean)
      if (name === 'options') {
        try { current.options = JSON.parse(value) } catch (e) { throw new CaseFileError(`line ${i + 1}: options is not JSON: ${e.message}`) }
      }
    }
  }
  finish()
  if (!cases.length) throw new CaseFileError('no cases: each case starts with a "## " heading')
  return cases
}

function expectedValue(operation, block, at) {
  if (operation === 'fmt') return `${block}\n`
  if (operation === 'html') return block
  if (operation === 'lint') return block.split('\n').map(s => s.trim()).filter(Boolean).map(entry => {
    const m = /^([\w/-]+)(?:\s+(\d+):(\d+))?$/.exec(entry)
    if (!m) throw new CaseFileError(`${at}: lint expected "${entry}" is not "code" or "code line:column"`)
    return m[2] ? { code: m[1], line: Number(m[2]), column: Number(m[3]) } : { code: m[1] }
  })
  try {
    const value = JSON.parse(block)
    return Array.isArray(value) ? value : value.type === 'document' ? value.children : [value]
  } catch (e) { throw new CaseFileError(`${at}: ast expected is not JSON: ${e.message}`) }
}

// --- comparison -----------------------------------------------------------------------------------------------

const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key, v]) => v !== undefined && !['pos', 'segments', 'srcByteLength'].includes(key))
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v)]))
  return value
}
const sameTree = (a, b) => isDeepStrictEqual(normalize(a), normalize(b))

function point(source, offset) {
  const lines = Buffer.from(source).subarray(0, offset).toString('utf8').split('\n')
  return { line: lines.length, column: [...lines.at(-1)].length + 1 }
}
const lintEntries = (diagnostics, source) => diagnostics.map(d => {
  if (!d.range) return { code: d.code, severity: d.severity, channel: d.channel }
  const start = point(source, d.range.startOffset)
  const end = point(source, d.range.endOffset)
  return { code: d.code, severity: d.severity, channel: d.channel, ...start, endLine: end.line, endColumn: end.column }
})
const lintText = entries => entries.map(e => e.line ? `${e.code} ${e.line}:${e.column}` : e.code).join('\n')
const PLACE = ['line', 'column', 'endLine', 'endColumn', 'severity', 'channel']
const fits = (found, wanted) => found.code === wanted.code && PLACE.every(key => wanted[key] === undefined || found[key] === wanted[key])
// Each expected entry takes its own finding (augmenting paths), so two expectations never share one finding.
export function matchDiagnostics(found, wanted) {
  const owner = new Array(found.length).fill(-1)
  const assign = (w, seen) => found.some((f, i) => {
    if (seen.has(i) || !fits(f, wanted[w])) return false
    seen.add(i)
    if (owner[i] === -1 || assign(owner[i], seen)) { owner[i] = w; return true }
    return false
  })
  return wanted.every((_, w) => assign(w, new Set()))
}

export function agrees(operation, actual, expected) {
  if (actual.error) return false
  if (operation === 'fmt') return actual.output === expected
  if (operation === 'html') return actual.output.replace(/\n$/, '') === expected.replace(/\n$/, '')
  if (operation === 'ast') return sameTree(actual.output, expected)
  return actual.output.length === expected.length && matchDiagnostics(actual.output, expected)
}

export function show(operation, value) {
  if (operation === 'ast') return JSON.stringify(normalize(value))
  if (operation === 'lint') return lintText(value) || '(no diagnostics)'
  return value.replace(/\n$/, '')
}

// --- the model ----------------------------------------------------------------------------------------------

export async function loadModel(dir) {
  const entry = [resolve(dir, 'src/index.ts'), resolve(dir, 'v2/src/index.ts')].find(path => existsSync(path))
  if (!entry) throw new Error(`no carve-js next2 checkout at ${dir} (src/index.ts); pass --js or set CARVE_JS_DIR`)
  const js = await import(pathToFileURL(entry))
  const run = (operation, input, options = {}) => {
    try {
      if (operation === 'fmt') { const r = js.formatWithDiagnostics(input, options); return { output: r.source, diagnostics: lintEntries(r.diagnostics, input) } }
      if (operation === 'html') { const r = js.renderWithDiagnostics(input, options); return { output: r.html, diagnostics: lintEntries(r.diagnostics, input) } }
      if (operation === 'ast') return { output: js.parse(input, { ...options, positions: false }).children }
      return { output: lintEntries(js.lint(input, options), input) }
    } catch (e) { return { error: `${e.name}: ${e.message}` } }
  }
  const parse = input => { try { return js.parse(input, { positions: false }) } catch { return null } }
  const write = (tree, options = {}) => { try { return { output: js.writeWithDiagnostics(tree, options).source } } catch (e) { return { error: `${e.name}: ${e.message}` } } }
  return { run, parse, write, dir }
}

// --- constructs -------------------------------------------------------------------------------------------

// The fields whose values the AST schema enumerates (form, refForm, ...) are part of a node's kind.
export function enumFields(schema) {
  const names = new Set()
  const walk = value => {
    if (Array.isArray(value)) { value.forEach(walk); return }
    if (!value || typeof value !== 'object') return
    for (const [name, property] of Object.entries(value.properties ?? {})) {
      if (name !== 'type' && property && (property.enum || property.const !== undefined)) names.add(name)
    }
    Object.values(value).forEach(walk)
  }
  walk(schema.$defs ?? schema)
  return names
}

export function constructs(tree, fields) {
  const found = new Set()
  const label = node => node.type + Object.keys(node).filter(k => fields.has(k) && typeof node[k] !== 'object').sort()
    .map(k => `[${k}=${node[k]}]`).join('')
  const visit = (value, parent) => {
    if (Array.isArray(value)) { value.forEach(item => visit(item, parent)); return }
    if (!value || typeof value !== 'object') return
    if (typeof value.type !== 'string') { Object.values(value).forEach(item => visit(item, parent)); return }
    const own = label(value)
    if (own !== 'document') found.add(own)
    if (parent && parent !== 'document') found.add(`${parent}>${own}`)
    if (Array.isArray(value.children)) {
      const kinds = value.children.filter(child => typeof child?.type === 'string').map(label)
      for (let i = 1; i < kinds.length; i++) found.add(`${kinds[i - 1]}+${kinds[i]}`)
    }
    for (const [key, item] of Object.entries(value)) if (key !== 'pos' && typeof item === 'object') visit(item, own)
  }
  visit(tree, null)
  return found
}

// The text with every backslash escape of ASCII punctuation dropped: what a writer round parses (C2-W-088).
export const bare = source => source.replace(/\\([!-/:-@[-`{-~])/g, '$1')

const difference = (a, b) => new Set([...a].filter(x => !b.has(x)))
const union = (...sets) => new Set(sets.flatMap(set => [...set]))
const symmetric = (a, b) => union(difference(a, b), difference(b, a))

const familyOf = c => {
  const kind = c.kind ?? 'render'
  const families = new Set()
  if (kind === 'format' || kind === 'write') families.add('fmt')
  if (kind === 'lint' || (c.expected?.diagnostics && kind !== 'format' && kind !== 'write')) families.add('lint')
  if (kind === 'render' && c.expected?.html !== undefined) families.add('html')
  if ((kind === 'render' || kind === 'parse') && (c.expected?.children || c.expected?.tree)) families.add('ast')
  return families
}

function caseConstructs(model, c, fields) {
  const tree = c.input !== undefined ? model.parse(c.input) : c.tree
  if (!tree) return null
  const own = constructs(tree, fields)
  const source = c.input ?? c.expected?.carve
  const bareTree = source === undefined ? null : model.parse(bare(source))
  const escaped = bareTree ? difference(constructs(bareTree, fields), own) : new Set()
  return union(own, escaped)
}

export function indexClauseCases(model, clauseCases, fields) {
  const entries = []
  for (const c of clauseCases) {
    const families = familyOf(c)
    if (!families.size || c.inputBytes || c.files) continue
    const found = caseConstructs(model, c, fields)
    if (found?.size) entries.push({ case: c, families, constructs: found })
  }
  const counts = new Map()
  for (const entry of entries) for (const x of entry.constructs) counts.set(x, (counts.get(x) ?? 0) + 1)
  const weight = x => Math.log((entries.length + 1) / ((counts.get(x) ?? 0) + 1))
  return { entries, weight }
}

// The constructs a proposal disputes: where its expected tree and the model's differ, or, for the writer, what
// the unescaped text would form.
export function disputed(model, c, actual, fields) {
  const tree = constructs(model.parse(c.input) ?? {}, fields)
  if (c.operation === 'ast' && !actual.error) {
    const changed = symmetric(constructs(actual.output, fields), constructs(c.expected, fields))
    return changed.size ? changed : union(tree, constructs(c.expected, fields))
  }
  if (c.operation === 'fmt') {
    const sides = [c.input, c.expected, ...(actual.error ? [] : [actual.output])].map(s => model.parse(bare(s)))
    const escaped = union(...sides.filter(Boolean).map(t => difference(constructs(t, fields), tree)))
    const written = !actual.error && model.parse(c.expected) && model.parse(actual.output)
      ? symmetric(constructs(model.parse(c.expected), fields), constructs(model.parse(actual.output), fields)) : new Set()
    const focus = union(escaped, written)
    return focus.size ? focus : tree
  }
  return union(tree, difference(constructs(model.parse(bare(c.input)) ?? {}, fields), tree))
}

const same = (a, b) => isDeepStrictEqual(normalize(a), normalize(b))
function clauseCasePasses(model, c) {
  const kind = c.kind ?? 'render'
  if (kind === 'write') {
    const r = model.write(c.tree, c.layout ? { ...c.options, layout: c.layout } : c.options)
    return r.error ? !!c.expected.refusal : r.output === c.expected.carve
  }
  const operation = kind === 'format' ? 'fmt' : kind === 'lint' ? 'lint' : c.expected.html !== undefined ? 'html' : 'ast'
  const r = model.run(operation, c.input, c.options)
  if (r.error) return !!c.expected.refusal
  if (!diagnosticsHold(operation === 'lint' ? r.output : r.diagnostics, c.expected)) return false
  if (operation === 'fmt') return c.expected.carve === undefined || r.output === c.expected.carve
  if (operation === 'html') {
    if (r.output !== c.expected.html) return false
    if (!c.expected.children) return true
    return same(model.run('ast', c.input, c.options).output, c.expected.children)
  }
  if (operation === 'ast') return same(r.output, c.expected.children ?? c.expected.tree?.children)
  return true
}

// The conformance README's diagnostics: stated fields compared, complete only where the case says so.
function diagnosticsHold(found = [], expected) {
  if (!expected.diagnostics && !expected.notReported) return true
  const wanted = (expected.diagnostics ?? []).map(d => typeof d === 'string' ? { code: d } : d)
  if (expected.diagnosticsComplete && found.length !== wanted.length) return false
  if (expected.diagnosticsOrdered && !wanted.every((w, i) => found[i] && fits(found[i], w))) return false
  return matchDiagnostics(found, wanted) && (expected.notReported ?? []).every(code => !found.some(d => d.code === code))
}

function expectedOf(c, operation) {
  if (operation === 'fmt') return c.expected.carve
  if (operation === 'html') return c.expected.html
  if (operation === 'ast') return c.expected.children ?? c.expected.tree?.children
  return c.expected.diagnostics
}

export function checkCase(model, index, fields, c, { top = 8 } = {}) {
  const actual = model.run(c.operation, c.input, c.options)
  const result = { case: c, actual, agrees: agrees(c.operation, actual, c.expected), sameInput: [], atRisk: [] }
  if (result.agrees) return result
  // A clause case on the same input states the answer outright.
  for (const { case: other, families } of index.entries) {
    if (!families.has(c.operation) || other.input?.replace(/\n$/, '') !== c.input.replace(/\n$/, '')) continue
    if (!same(other.options ?? {}, c.options ?? {})) continue
    const theirs = expectedOf(other, c.operation)
    if (theirs !== undefined && !agrees(c.operation, { output: theirs }, c.expected)) result.sameInput.push(other)
  }
  const focus = disputed(model, c, actual, fields)
  const total = [...focus].reduce((sum, x) => sum + index.weight(x), 0) || 1
  const cited = new Set(c.clauses)
  result.atRisk = index.entries
    .filter(entry => entry.families.has(c.operation) && !result.sameInput.includes(entry.case))
    .map(entry => {
      const shared = [...focus].filter(x => entry.constructs.has(x))
      const score = shared.reduce((sum, x) => sum + index.weight(x), 0) / total
      // A clause the proposal cites only breaks ties: the lane's own reading must not hide the clause it misses.
      return { case: entry.case, shared, score: score + (entry.case.clauses.some(id => cited.has(id)) ? 0.05 : 0) }
    })
    .filter(hit => hit.score >= 0.25)
    .sort((a, b) => (b.score - a.score) || a.case.id.localeCompare(b.case.id))
    .slice(0, top)
    .map(hit => ({ ...hit, modelPasses: clauseCasePasses(model, hit.case) }))
  return result
}

export function report(results) {
  const out = []
  let conflicts = 0
  for (const r of results) {
    const c = r.case
    if (r.agrees) { out.push(`ok    ${c.id} (${c.operation}, line ${c.line}): the model gives the expected output`); continue }
    conflicts++
    out.push(`CONFLICT ${c.id} (${c.operation}, line ${c.line})`)
    out.push('  model differs: carve-js gives')
    out.push(...indent(r.actual.error ? `refusal ${r.actual.error}` : show(c.operation, r.actual.output)))
    out.push('  expected')
    out.push(...indent(show(c.operation, c.expected)))
    for (const other of r.sameInput) {
      out.push(`  ${other.id} has this input and states another result (${other.clauses.join(', ')}):`)
      out.push(...indent(show(c.operation, expectedOf(other, c.operation))))
    }
    if (r.atRisk.length) {
      out.push('  clause cases on the disputed constructs (pinned = the model passes it now, so the change must keep it):')
      for (const hit of r.atRisk) {
        out.push(`    ${hit.case.id} ${hit.modelPasses ? 'pinned ' : 'failing'} ${hit.case.clauses.join(', ')}: ${hit.case.summary ?? ''}`)
      }
      const clauseCounts = new Map()
      for (const hit of r.atRisk) for (const id of hit.case.clauses) clauseCounts.set(id, (clauseCounts.get(id) ?? 0) + 1)
      out.push(`  clauses they cite: ${[...clauseCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, n]) => `${id} (${n})`).join(', ')}`)
    }
  }
  out.push('', conflicts ? `${conflicts} of ${results.length} cases conflict: read the clauses above before filing; a conflict with a clause or a pinned clause case is filed as needs-decision with both readings.` : `${results.length} cases agree with the model.`)
  return { text: out.join('\n'), conflicts }
}
const indent = text => String(text).split('\n').map(line => `    ${line}`)

export async function run(argv, { log = console.log, error = console.error } = {}) {
  const args = [...argv]
  if (!args.length || args.includes('--help') || args.includes('-h')) { log(HELP); return args.length ? 0 : 2 }
  const take = flag => { const i = args.indexOf(flag); if (i < 0) return undefined; const [, value] = args.splice(i, 2); return value }
  const jsDir = resolve(take('--js') ?? process.env.CARVE_JS_DIR ?? resolve(root, 'engines/carve-js'))
  const top = Number(take('--top') ?? 8)
  const clauseFile = resolve(take('--clause-cases') ?? resolve(root, 'spec/0.2/conformance/clause-cases.json'))
  if (args.length !== 1) { error('expected:check: give exactly one case file (see --help)'); return 2 }
  try {
    const cases = parseCaseFile(readFileSync(args[0], 'utf8'))
    const model = await loadModel(jsDir)
    const fields = enumFields(JSON.parse(readFileSync(resolve(root, 'spec/0.2/data/ast-schema.json'), 'utf8')))
    const index = indexClauseCases(model, JSON.parse(readFileSync(clauseFile, 'utf8')).cases, fields)
    const { text, conflicts } = report(cases.map(c => checkCase(model, index, fields, c, { top })))
    log(text)
    return conflicts ? 1 : 0
  } catch (e) {
    error(`expected:check: ${e instanceof CaseFileError ? e.message : e.stack ?? e}`)
    return 2
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await run(process.argv.slice(2))
