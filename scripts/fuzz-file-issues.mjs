#!/usr/bin/env node
/*
 * File what a fuzz-nightly report found: one issue per new cause, a comment on
 * an open issue with the same signature, nothing for a closed one, and at most
 * `--cap` new issues per run.
 *
 *   node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve
 *   node scripts/fuzz-file-issues.mjs --report=/tmp/fuzz.json --repo=markup-carve/carve --dry-run
 *
 * Existing signatures come from ONE search for the marker across open and
 * closed issues, not a search per cause, so the run costs a fixed handful of
 * API calls however many causes the night found.
 *
 * Exit 2 when gh fails: a filer that cannot file is a broken harness.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { issueBody, issueComment, issueTitle, plan, signaturesIn, SIGNATURE_MARKER } from './lib/mutation-fuzz.mjs'

const option = (key, fallback) => {
  const arg = process.argv.find((a) => a.startsWith(`--${key}=`))
  return arg ? arg.slice(key.length + 3) : fallback
}
const reportPath = option('report')
const repo = option('repo')
const cap = Number(option('cap', 10))
const perPattern = Number(option('per-pattern', 3))
const dryRun = process.argv.includes('--dry-run')
if (!reportPath || !repo) {
  console.error('Usage: node scripts/fuzz-file-issues.mjs --report=<fuzz.json> --repo=<owner/name> [--cap=10] [--per-pattern=3] [--dry-run]')
  process.exit(2)
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const run = { seed: report.seed, mutants: report.mutants, engines: report.enginesLine }
const gh = (args, input) => execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] })

const existing = new Map()
try {
  const issues = JSON.parse(gh([
    'issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000',
    '--search', `"${SIGNATURE_MARKER}" in:body`, '--json', 'number,state,body',
  ]))
  for (const [sig, hits] of signaturesIn(issues)) existing.set(sig, hits)
} catch (error) {
  console.error(`fuzz-file-issues: could not list existing issues: ${error.message}`)
  process.exit(2)
}

const lines = []
try {
  for (const action of plan(report.groups, existing, cap, perPattern)) {
    const { group } = action
    if (action.kind === 'create') {
      const title = issueTitle(group)
      const url = dryRun ? '(dry run)' : gh([
        'issue', 'create', '--repo', repo, '--title', title,
        '--label', 'bug', '--label', 'area:corpus', '--body-file', '-',
      ], issueBody(group, run)).trim()
      lines.push(`created ${group.signature} ${group.pattern}: ${url}`)
    } else if (action.kind === 'comment') {
      if (!dryRun) gh(['issue', 'comment', String(action.issue), '--repo', repo, '--body-file', '-'], issueComment(group, run))
      lines.push(`commented ${group.signature} on #${action.issue}`)
    } else if (action.kind === 'known-closed') {
      lines.push(`known ${group.signature}, closed as #${action.issue}; not refiled`)
    } else {
      lines.push(`held back (cap ${cap}, ${perPattern} per pattern): ${group.signature} ${group.pattern}`)
    }
  }
} catch (error) {
  console.error(`fuzz-file-issues: gh failed: ${error.message}`)
  process.exit(2)
}

const summary = [
  `fuzz-nightly seed ${report.seed}: ${report.mutants} mutants, ${report.disagreements} disagreements, ${report.groups.length} cause(s)${dryRun ? ' (dry run)' : ''}`,
  ...lines,
].join('\n')
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${summary}\n\`\`\`\n`)
