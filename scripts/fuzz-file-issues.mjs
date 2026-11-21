#!/usr/bin/env node
/*
 * File what a 0.2 fuzz-nightly report found: one issue per new signature (crashes and hangs first), a comment on
 * an open issue with the same signature, nothing for a closed one, and at most `--cap` new issues per run. Lint and
 * parse-diagnostic splits are not filed: scripts/lint-parity.mjs owns them. Everything not filed is listed in the
 * run summary.
 *
 *   node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve --dry-run
 *
 * Existing signatures come from one search for the marker across open and closed issues.
 * Exit 2 when gh fails: a filer that cannot file is a broken harness.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { findingsOf, issueBody, issueComment, issueTitle, plan, SIGNATURE_MARKER, signaturesIn } from './lib/fuzz-nightly-issues.mjs'

const option = (key, fallback) => {
  const arg = process.argv.find(a => a.startsWith(`--${key}=`))
  return arg ? arg.slice(key.length + 3) : fallback
}
const reportPath = option('report')
const repo = option('repo')
const cap = Number(option('cap', 5))
const dryRun = process.argv.includes('--dry-run')
if (!reportPath || !repo) {
  console.error('Usage: node scripts/fuzz-file-issues.mjs --report=<fuzz.json> --repo=<owner/name> [--cap=5] [--dry-run]')
  process.exit(2)
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const run = { seed: report.seed, engines: report.enginesLine }
const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] })

let existing
try {
  existing = signaturesIn(JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000',
    '--search', `"${SIGNATURE_MARKER}" in:body`, '--json', 'number,state,body'])))
} catch (error) {
  console.error(`fuzz-file-issues: could not list existing issues: ${error.message}`)
  process.exit(2)
}

const findings = findingsOf(report)
const lines = []
try {
  for (const action of plan(findings, existing, cap)) {
    const f = action.finding
    if (action.kind === 'create') {
      const url = dryRun ? '(dry run)' : gh(['issue', 'create', '--repo', repo, '--title', issueTitle(f),
        '--label', 'bug', '--label', 'area:corpus', '--body-file', '-'], issueBody(f, run)).trim()
      lines.push(`created ${f.signature} ${f.target} ${f.pattern}: ${url}`)
    } else if (action.kind === 'comment') {
      if (!dryRun) gh(['issue', 'comment', String(action.issue), '--repo', repo, '--body-file', '-'], issueComment(f, run))
      lines.push(`commented ${f.signature} on #${action.issue}`)
    } else if (action.kind === 'known-closed') lines.push(`known ${f.signature}, closed as #${action.issue}; not refiled`)
    else lines.push(`held back (cap ${cap}): ${f.signature} ${f.target} ${f.pattern}: ${JSON.stringify((f.reduced ?? f.html ?? '').slice(0, 120))}`)
  }
} catch (error) {
  console.error(`fuzz-file-issues: gh failed: ${error.message}`)
  process.exit(2)
}
const summary = [
  `fuzz-nightly (0.2) seed ${report.seed}: ${report.stats?.inputs ?? 0} inputs, ${findings.length} filable finding(s)${dryRun ? ' (dry run)' : ''}`,
  ...lines,
].join('\n')
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['```', summary, '```', ''].join('\n'))
