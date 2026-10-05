/*
 * THE CHANGELOG GATE MUST READ THE SECTION SOMEBODY IS WRITING.
 *
 * With no version argument it used to read package.json's version - the release
 * that already SHIPPED - as of that release's own tag, where the gate had passed
 * on cut day. So `npm run changelog:check` was green by construction, and the
 * section being written covered 30 of 63 merges with nothing objecting
 * (carve#2238). Worse than useless: the answer also swung on whether the tag was
 * in the checkout at all. Measured on the same tree, `0.1.6` as of the tag found
 * 0 gaps and `0.1.6 --at HEAD` found 48.
 *
 * The default is now every heading above the first one a tag carries, and the
 * resolution is asserted here rather than by running the gate, because a run
 * needs an authenticated `gh` and this repository's whole history.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

process.env.CARVE_CHANGELOG_LIB = '1'
const { __internals } = await import('../scripts/changelog-completeness.mjs')
const { unreleasedSections, sectionHeadings, parseExemptions, verdict, exemptionForCommit } = __internals

const changelog = (...headings) =>
  ['# Changelog', '', ...headings.flatMap((h) => [`## ${h}`, '', '- a note (#1)', ''])].join('\n')

test('the unreleased sections are the ones above the first tagged heading', () => {
  // The shape this repository was in when carve#2238 was filed: notes for the
  // imminent release under a dated but untagged heading, later work under
  // [Unreleased] above it, and the last shipped release below both.
  assert.deepEqual(
    unreleasedSections(
      changelog('[Unreleased]', '[0.1.7] - 2026-09-25', '[0.1.6] - 2026-09-18'),
      ['0.1.5', '0.1.6'],
    ),
    ['Unreleased', '0.1.7'],
  )
})

test('a file with nothing pending has no unreleased section', () => {
  // The state right after a tag. There is nothing to be behind on, and the gate
  // must not invent a section to fail about.
  assert.deepEqual(
    unreleasedSections(changelog('[0.1.6] - 2026-09-18', '[0.1.5] - 2026-09-07'), ['0.1.5', '0.1.6']),
    [],
  )
})

test('the set STOPS at the first shipped heading rather than skipping it', () => {
  // A heading below a shipped one that carries no tag - a version whose tag was
  // never pushed, or was deleted and re-cut under another number - is history,
  // not pending work. A reader that merely SKIPPED tagged headings would count
  // that old section's citations as current and excuse a merge it documents.
  assert.deepEqual(
    unreleasedSections(changelog('[Unreleased]', '[0.1.6]', '[0.1.4]'), ['0.1.5', '0.1.6']),
    ['Unreleased'],
  )
})

test('an Unreleased heading alone is the pending section', () => {
  assert.deepEqual(
    unreleasedSections(changelog('[Unreleased]', '[0.1.6]'), ['0.1.6']),
    ['Unreleased'],
  )
})

test('a v-prefixed tag still ships its section', () => {
  // Tags here are bare, and three sibling repositories write `v`. A reader that
  // matched only one spelling would call a shipped section pending.
  assert.deepEqual(unreleasedSections(changelog('[0.1.6]'), ['v0.1.6']), [])
  assert.deepEqual(sectionHeadings(changelog('[Unreleased]', '[0.1.6]')), ['Unreleased', '0.1.6'])
})

/*
 * The other half of carve#2238: the gate needs a consumer between a merge and a
 * tag. Read as text, like every other workflow assertion in this suite, so
 * nothing here depends on a YAML parser.
 */
const workflow = readFileSync(resolve(repo, '.github/workflows/changelog-drift.yml'), 'utf8')

test('the drift workflow runs the gate with no version, so it reads the pending section', () => {
  assert.match(
    workflow,
    /node scripts\/changelog-completeness\.mjs 2>&1/,
    'the drift workflow must invoke the gate with NO version argument: a version names a ' +
      'release, and the section this workflow exists to measure is the one still being written.',
  )
  assert.doesNotMatch(
    workflow,
    /changelog-completeness\.mjs\s+["'$]?v?\d+\.\d+/,
    'the drift workflow passes a version to the gate, which pins it to one release again.',
  )
})

test('the drift workflow checks out the tags the gate resolves against', () => {
  // Without full history the gate sees no tags, reads the whole log as the
  // range, and answers about every merge since the root commit. On this tree
  // that is the difference between 0 findings and 48.
  assert.match(
    workflow,
    /fetch-depth: 0/,
    'the drift workflow needs fetch-depth: 0. The gate resolves the pending section and the ' +
      'range from the tags, and a shallow checkout has none.',
  )
})

test('a red measurement still reaches the reporter', () => {
  // The verdict step is the only consumer of a scheduled run. Under the default
  // `if: success()` a failing measurement would skip it, which is the
  // check-with-no-reader shape the workflow exists to avoid.
  const step = workflow.slice(workflow.indexOf('- name: File the verdict'))
  assert.notEqual(step, '', 'the verdict step is gone, or was renamed away from this guard')
  assert.match(step.split('run:')[0], /if: \$\{\{ !cancelled\(\) \}\}/)
  assert.match(workflow, /echo "status=\$status" >> "\$GITHUB_OUTPUT"/)
})

/*
 * ONE RANGE, ONE SHIPPED-SOURCE COUNT.
 *
 * The two summary lines used to divide the same range differently: the failing
 * one printed `len(shipping)` and the passing one `len(shipping)` minus the
 * exempt entries. Measured on this repository since 0.1.7, that is 21 against
 * 11 for one unchanged tree, so a red run and the green run that cleared it
 * disagreed about how much work the range held (carve#2723).
 */

const countIn = (line) => Number(line.match(/(?:all |of )(\d+) (?:shipped-source )?pull request/)[1])

test('the failing and passing lines report the same shipped-source total', () => {
  const one = {
    shipped: 21,
    exempt: 10,
    missing: 3,
    unattributed: 1,
    sections: ['Unreleased', '0.1.8'],
    from: 'since 0.1.7',
  }
  const { failure, pass } = verdict(one)
  assert.equal(
    countIn(pass),
    countIn(failure),
    'the two summary lines divide one range differently, so a reader comparing a red run ' +
      'with the green run that cleared it sees two different denominators.',
  )
  assert.equal(countIn(failure), 21)
})

test('the exempt entries are reported beside the total, not subtracted from it', () => {
  // The count has to stay the size of the range. Exempt entries are a
  // disposition of members of that range, so they are named separately.
  const { pass } = verdict({
    shipped: 21, exempt: 10, missing: 0, unattributed: 0,
    sections: ['Unreleased'], from: 'since 0.1.7',
  })
  assert.match(pass, /all 21 shipped-source pull request\(s\) since 0\.1\.7, 10 exempt/)
})

/*
 * AN UNATTRIBUTED COMMIT CAN BE EXEMPTED.
 *
 * `0512ccfd` ("docs: say documents and the web") moved shipped source with no
 * pull request to cite, because it was pushed straight to `main`. The exempt
 * file was keyed by pull request only, so the notice had no way to be closed
 * out and recurred on every run until the next cut (carve#2723).
 */

test('the exempt file accepts a commit sha as a key', () => {
  const { pullRequests, commits, malformed } = parseExemptions(
    '0512ccfd: pushed straight to main, docs prose\n2521: a ledger merge\n',
  )
  assert.deepEqual(malformed, [], 'a sha-keyed line is refused as malformed')
  assert.equal(commits.get('0512ccfd'), 'pushed straight to main, docs prose')
  assert.equal(pullRequests.get('2521'), 'a ledger merge')
  assert.equal(pullRequests.has('0512ccfd'), false, 'a sha must not be read as a pull request number')
})

test('a sha key matches the full sha it abbreviates', () => {
  const { commits } = parseExemptions('0512ccfd: pushed straight to main\n')
  assert.equal(
    exemptionForCommit(commits, '0512ccfdf28f1c8b68e6503b80f0ea34f18424a3'),
    'pushed straight to main',
  )
  assert.equal(exemptionForCommit(commits, 'f00dcafef28f1c8b68e6503b80f0ea34f18424a3'), undefined)
})

test('a key too short to identify a commit is still refused', () => {
  // Six hex characters collide across a tree this size; the reason text would
  // then exempt a commit nobody meant to name.
  const { malformed } = parseExemptions('0512cc: too short to name a commit\n')
  assert.equal(malformed.length, 1)
  assert.match(malformed[0], /expected/)
})

test('the exempt file closes out the commit the gate reports', () => {
  // The acceptance of carve#2723: the notice can be answered now rather than
  // waiting for the next cut.
  const { commits, malformed } = parseExemptions(
    readFileSync(resolve(repo, '.changelog-exempt'), 'utf8'),
  )
  assert.deepEqual(malformed, [])
  assert.equal(
    typeof exemptionForCommit(commits, '0512ccfdf28f1c8b68e6503b80f0ea34f18424a3'),
    'string',
    '.changelog-exempt does not cover 0512ccfd, so the gate still reports it as an open question.',
  )
})
