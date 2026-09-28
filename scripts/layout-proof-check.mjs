import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { carveToHtml, parse as parseEngine } from '@markup-carve/carve'
import { parse, ownershipTransition } from './spec/layout.mjs'
import { renderDoc } from './spec/html.mjs'
import { cases } from '../proofs/layout/cases.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path) => readFileSync(join(root, path), 'utf8')
const constructors = [
  'ordinary', 'blank', 'line_comment', 'fenced_comment', 'definition', 'heading',
  'quote', 'code_fence', 'raw_fence', 'colon_fence', 'table',
  'nested_list', 'continuation', 'end',
]
const bool = (value) => value ? 'true' : 'false'
const boundaryConstructor = (name) => name === 'end' ? 'end_input' : name

export function validateProofSource(source) {
  // This prototype uses explicit theorem binders instead of section variables.
  assert.doesNotMatch(source, /\b(?:Axiom|Axioms|Parameter|Parameters|Hypothesis|Hypotheses|Variable|Variables|Conjecture|Context|Admitted|admit|Admit)\b/,
    'Local assumptions and admitted proofs are forbidden in the prototype.')
  assert.doesNotMatch(source, /Unset\s+(?:Guard|Positivity|Universe)\s+Checking/,
    'Kernel checks must remain enabled.')
  assert.doesNotMatch(source, /Print\s+Assumptions/,
    'The runner generates assumption reports; the model must not print its own.')
  // Remove nested comments before enumerating declarations.
  let code = '', depth = 0
  for (let i = 0; i < source.length; i++) {
    const pair = source.slice(i, i + 2)
    if (pair === '(*') { depth++; i++; code += ' '; continue }
    if (pair === '*)') { assert.ok(depth > 0, 'Unmatched comment closer'); depth--; i++; continue }
    if (depth === 0) code += source[i]
    else if (source[i] === '\n') code += '\n'
  }
  assert.equal(depth, 0, 'Unclosed model comment')
  const names = [...code.matchAll(/\b(?:Theorem|Lemma|Corollary|Fact|Remark|Proposition|Example)\s+([A-Za-z_][\w']*)/g)]
    .map(match => match[1])
  assert.ok(names.length > 0, 'No theorem declarations found')
  assert.equal(new Set(names).size, names.length, 'Duplicate theorem name')
  return names
}

export function validateAssumptions(output, names) {
  const reports = output.split(/^CARVE_ASSUMPTIONS:/m).slice(1)
  assert.equal(reports.length, names.length, 'Missing or duplicate theorem assumption report')
  for (const [i, report] of reports.entries()) {
    const [name, ...body] = report.trim().split('\n')
    assert.equal(name, names[i], 'Assumption report names the wrong theorem')
    assert.equal(body.join('\n').trim(), 'Closed under the global context',
      `${name}: theorem depends on assumptions or disabled kernel checks`)
  }
}

function validateTrace(entry) {
  assert.deepEqual(entry.frame,
    { kind: 'ListItem', base: 0, content: 2, open: true, paragraph: true },
    `${entry.name}: unsupported frame geometry`)
  assert.match(entry.source, /^- \S/, `${entry.name}: expected a column-zero '- ' item`)
  const follower = entry.source.trimEnd().split('\n').at(-1)
  assert.equal(follower.match(/^ */)[0].length, entry.column, `${entry.name}: follower column changed`)
}

function containsText(node, target) {
  if (!node || typeof node !== 'object') return false
  if (node.type === 'text' && node.value === target) return true
  if (node.t === 'para' && node.lines.includes(target)) return true
  if (node.t === 'heading' && node.text === target) return true
  return Object.values(node).some(value => Array.isArray(value)
    ? value.some(child => containsText(child, target)) : containsText(value, target))
}

export function generateChecks(source = read('proofs/layout/Ownership.v')) {
  const names = validateProofSource(source)
  const table = JSON.parse(read('resources/spec/layout-transitions.json'))
  assert.equal(table.version, 1)
  assert.equal(table.rule, 'CARVE-P0-003')
  assert.deepEqual(Object.keys(table.boundaries).sort(), [...constructors].sort())
  const lines = ['From Coq Require Import List.', 'Import ListNotations.', 'Require Import Ownership.']
  lines.push('Definition boundary_coverage (b : boundary) : bool := match b with',
    ...constructors.map(name => `| ${boundaryConstructor(name)} => true`), 'end.')
  for (const name of constructors) {
    for (const deepest of [false, true]) {
      const row = table.boundaries[name]
      assert.equal(typeof row.containerOpen, 'boolean')
      assert.ok(typeof row.paragraphOpen === 'boolean' || row.paragraphOpen === 'deepest')
      const p = row.paragraphOpen === 'deepest' ? deepest : row.paragraphOpen
      assert.deepEqual(ownershipTransition(name, deepest), {
        containerOpen: row.containerOpen, paragraphOpen: p,
      })
      lines.push(`Example table_${name}_${deepest} : boundary_state ${boundaryConstructor(name)} ${bool(deepest)} = (${bool(row.containerOpen)}, ${bool(p)}).`,
        'Proof. reflexivity. Qed.')
    }
  }
  for (const [i, entry] of cases.entries()) {
    validateTrace(entry)
    assert.ok(constructors.includes(entry.boundary))
    assert.ok(Number.isSafeInteger(entry.column) && entry.column >= 0)
    const f = entry.frame
    const frame = `(step (Frame ${f.kind} ${f.base} ${f.content} ${bool(f.open)} ${bool(f.paragraph)}) (${boundaryConstructor(entry.boundary)}, false))`
    lines.push(`Example trace_${i} : column_owner ${entry.column} [(0, ${frame})] = ${entry.modelOwner ? 'Some 0' : 'None'}.`,
      'Proof. reflexivity. Qed.')
  }
  for (const name of names) {
    lines.push(`Goal True. idtac "CARVE_ASSUMPTIONS:${name}". exact I. Qed.`,
      `Print Assumptions ${name}.`)
  }
  return lines.join('\n') + '\n'
}

export function compareReaders(entries = cases) {
  const findings = []
  assert.equal(entries.length, 6, 'Reassess the prototype population when changing its traces.')
  for (const entry of entries) {
    validateTrace(entry)
    const oracle = parse(entry.source)
    const engine = parseEngine(entry.source)
    for (const [reader, blocks, isList] of [
      ['oracle', oracle.blocks, b => b.t === 'list'],
      ['js', engine.children, b => b.type === 'list'],
    ]) {
      const lists = blocks.filter(isList)
      assert.equal(lists.length, 1, `${entry.name}: ${reader} expected one top-level list`)
      assert.equal(lists[0].items.length, 1, `${entry.name}: ${reader} expected one top-level item`)
      const enclosing = blocks.filter(block => containsText(block, entry.target))
      assert.equal(enclosing.length, 1, `${entry.name}: ${reader} must find exactly one target block`)
      const owned = isList(enclosing[0])
      assert.equal(owned, entry.observedOwner, `${entry.name}: ${reader} changed; reassess the trace/discrepancy`)
    }
    if (entry.corpus) {
      assert.equal(read(`tests/corpus/${entry.corpus}.crv`), entry.source, `${entry.name}: corpus trace changed`)
      const expected = read(`tests/corpus/${entry.corpus}.html`).trim()
      assert.equal(renderDoc(oracle).trim(), expected, `${entry.name}: oracle HTML`)
      assert.equal(carveToHtml(entry.source).trim(), expected, `${entry.name}: JS HTML`)
    }
    if (entry.modelOwner !== entry.observedOwner) {
      assert.ok(entry.discrepancy, `${entry.name}: undeclared discrepancy`)
      findings.push({ name: entry.name, reason: entry.discrepancy })
    } else {
      assert.equal(entry.discrepancy, undefined, `${entry.name}: stale discrepancy`)
    }
  }
  return findings
}

function main(args) {
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--evidence-only'),
    'Usage: node scripts/layout-proof-check.mjs [--evidence-only]')
  const source = read('proofs/layout/Ownership.v')
  const names = validateProofSource(source)
  const checks = generateChecks(source)
  const findings = compareReaders()
  console.log(`Compared ${cases.length} ownership traces with the executable spec and pinned JS engine.`)
  for (const finding of findings) console.log(`DISCREPANCY ${finding.name}: ${finding.reason}`)
  if (args[0] === '--evidence-only') {
    console.log('Proofs NOT checked. JavaScript evidence includes the discrepancies above.')
    return
  }
  const candidates = [['rocq', ['compile']], ['coqc', []]]
  const compiler = candidates.find(([command, prefix]) => {
    const probe = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8', timeout: 10_000 })
    return !probe.error && probe.status === 0
  })
  if (!compiler) throw new Error('Rocq/Coq compiler missing. Install Rocq or Coq; no proof verification took place.')
  const dir = mkdtempSync(join(tmpdir(), 'carve-layout-proof-'))
  try {
    copyFileSync(join(root, 'proofs/layout/Ownership.v'), join(dir, 'Ownership.v'))
    writeFileSync(join(dir, 'CorpusChecks.v'), checks)
    for (const file of ['Ownership.v', 'CorpusChecks.v']) {
      const result = spawnSync(compiler[0], [...compiler[1], '-q', file], {
        cwd: dir, encoding: 'utf8', timeout: 120_000,
      })
      process.stdout.write(result.stdout ?? '')
      process.stderr.write(result.stderr ?? '')
      if (result.error) throw new Error(`${file}: ${result.error.message}`)
      assert.equal(result.status, 0, `${file}: proof compilation failed`)
      if (file === 'CorpusChecks.v') validateAssumptions(result.stdout, names)
    }
    console.log('Model theorems and table/trace examples checked. Reader discrepancies remain as reported.')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { main(process.argv.slice(2)) } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
