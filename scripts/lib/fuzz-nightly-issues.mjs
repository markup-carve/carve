// The issue half of the 0.2 nightly fuzz: titles, bodies and the plan of what to file. Nothing here calls gh.
import { fence, signature } from './fuzz-nightly-gen.mjs'

export const SIGNATURE_MARKER = 'fuzz-signature:'
// Lint and parse-diagnostic splits are the lint parity harness's ground (scripts/lint-parity.mjs).
export const UNFILED_TARGETS = new Set(['lint', 'parsediag'])

const WHAT = {
  tree: 'the tree (AST JSON)', html: 'the HTML', fmt: 'the fmt output', stable: 'fmt(fmt(x)) == fmt(x) (C2-W-003)',
  roundtrip: 'parse(fmt(x)) == parse(x) (C2-W-002)', internal: 'an error that is not a Carve refusal', import: 'the Carve the HTML importer writes',
  crash: 'a crash', hang: 'a hang (no answer within the time limit)',
  superlinear: 'time that grows faster than linear (4x the input, more than 8x the time)',
}

/** The groups and crashes of a report as one list of filable findings. */
export function findingsOf(report) {
  const crashes = (report.crashes ?? []).map(c => ({
    target: c.kind, pattern: c.engine, reduced: c.reduced ?? c.case.input, signature: c.signature, hits: c.hits,
    origin: c.origin, detail: c.stderr, call: c.case.kind,
  }))
  const slow = (report.timing ?? []).filter(row => row.superlinear?.length).map(row => ({
    target: 'superlinear', pattern: row.superlinear.join(' '), reduced: `LONG.${row.name} of scripts/lib/fuzz-nightly-gen.mjs`,
    signature: signature('superlinear', row.superlinear.join(' '), row.name), hits: 1, origin: `LONG.${row.name}`,
    detail: JSON.stringify(row.sizes, null, 1), call: 'one call per size',
  }))
  return [...crashes, ...slow, ...(report.groups ?? []).filter(g => !UNFILED_TARGETS.has(g.target))]
}

const sample = text => {
  const line = (text ?? '').split('\n').find(l => l.trim()) ?? ''
  return (line.length > 40 ? `${line.slice(0, 40)}...` : line).replaceAll('`', "'")
}

export function issueTitle(f) {
  return `fuzz (0.2): ${f.target} ${f.pattern} on \`${sample(f.reduced ?? f.html)}\``
}

export function issueBody(f, run) {
  const input = f.reduced ?? f.html
  const outputs = f.outputs && typeof f.outputs === 'object'
    ? Object.entries(groupOutputs(f.outputs)).map(([names, value]) => `**${names}**:\n\n${fence(typeof value === 'string' ? value : JSON.stringify(value, null, 1), '')}`).join('\n\n')
    : `**${f.pattern}** (${f.call ?? 'any call'}):\n\n${fence(String(f.detail ?? '').slice(-1500), '')}`
  return [
    `The 0.2 nightly fuzz differential (\`.github/workflows/nightly-fuzz.yml\` on \`next2\`) found ${WHAT[f.target] ?? f.target} split as \`${f.pattern}\`. There is no spec model on next2: a 2-of-3 split is a lead, and triage decides which reading the clauses support and adds the Expected section.`,
    '',
    fence(input, f.target === 'import' ? 'html' : 'carve'),
    '',
    outputs,
    '',
    `From \`${f.origin ?? 'import'}\`, ${f.hits} hit(s) in this run.`,
    `Reproduce: \`node scripts/fuzz-nightly.mjs --seed=${run.seed}\` (${run.engines}).`,
    '',
    `${SIGNATURE_MARKER} \`${f.signature}\``,
    ...(f.variants ?? []).map(v => `${SIGNATURE_MARKER} \`${v}\``),
  ].join('\n')
}

function groupOutputs(outputs) {
  const groups = new Map()
  for (const [name, value] of Object.entries(outputs)) {
    const key = JSON.stringify(value)
    if (!groups.has(key)) groups.set(key, { names: [], value })
    groups.get(key).names.push(name)
  }
  return Object.fromEntries([...groups.values()].map(g => [g.names.join(', '), g.value]))
}

export function issueComment(f, run) {
  return [
    `Seen again by the 0.2 nightly fuzz, seed \`${run.seed}\` (${run.engines}), ${f.hits} hit(s). Reduced input:`,
    '',
    fence(f.reduced ?? f.html, f.target === 'import' ? 'html' : 'carve'),
  ].join('\n')
}

/** Signature -> issues carrying it, from `gh issue list --json number,state,body` rows. */
export function signaturesIn(issues) {
  const found = new Map()
  const marker = new RegExp(`${SIGNATURE_MARKER} \`([0-9a-f]{16})\``, 'g')
  for (const issue of issues) {
    for (const [, sig] of (issue.body ?? '').matchAll(marker)) {
      if (!found.has(sig)) found.set(sig, [])
      found.get(sig).push({ number: issue.number, state: issue.state })
    }
  }
  return found
}

/**
 * What to do per finding: a comment on an open issue with its signature, nothing for a closed one, a new issue up
 * to `cap` (crashes and hangs first, at most `perKey` per target and pattern), and the rest held back.
 */
export function plan(findings, existing, cap = 5, perKey = 2) {
  const actions = []
  let created = 0
  const perPattern = new Map()
  const rank = f => (['crash', 'hang', 'superlinear'].includes(f.target) ? 0 : 1)
  for (const f of [...findings].sort((a, b) => rank(a) - rank(b))) {
    const hits = [f.signature, ...(f.variants ?? [])].flatMap(s => existing.get(s) ?? [])
    const open = hits.find(i => i.state === 'OPEN')
    const key = `${f.target} ${f.pattern}`
    if (open) actions.push({ kind: 'comment', issue: open.number, finding: f })
    else if (hits.length) actions.push({ kind: 'known-closed', issue: hits[0].number, finding: f })
    else if (created < cap && (perPattern.get(key) ?? 0) < perKey) {
      actions.push({ kind: 'create', finding: f })
      created += 1
      perPattern.set(key, (perPattern.get(key) ?? 0) + 1)
    } else actions.push({ kind: 'over-cap', finding: f })
  }
  return actions
}
