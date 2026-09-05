/*
 * THE PER-PR AUDIT IS LENIENT ABOUT ONE THING, AND ONLY WHILE SOMETHING ELSE
 * IS STRICT ABOUT IT.
 *
 * `scripts/declaration-audit.mjs --mode=per-pr` passes a DECLARED row in the
 * two ENGINE-LAG ledgers, because they exist to describe the window between a
 * spec rule landing and an engine shipping it - "normal", in
 * resources/engine-pin-drift.txt's own words, and "DECLARED rather than
 * tolerated" (carve#1811). resources/engine-fmt-drift.txt describes the same
 * window from the WRITER side and got the same verdict once a ruling actually
 * opened a writer-half window; until then it held zero rows, which is why the
 * asymmetry sat here unnoticed. What makes the leniency safe rather than a
 * hole is the OTHER half of each ledger's contract, which lives in a different
 * check, and which fails in BOTH directions - on a slug the pin does not
 * reproduce and nobody wrote down (the carve#533 state) and on a listed slug
 * the pin has caught up on. For the pin ledger that is
 * `npm run engine:report -- --check`; for the fmt ledger it is
 * tests/corpus-fmt-roundtrip.test.mjs, which runs per-PR under `npm test`.
 *
 * So the leniency has a precondition, and a precondition nobody checks is the
 * carve#755 shape: delete that step from the per-PR workflow and undeclared
 * drift becomes invisible in both directions, silently, with every gate green.
 * This file pins the precondition, once per relaxed ledger.
 *
 * It also pins the two things about the lenient mode that are easy to get
 * wrong in the direction of a check that cannot fail:
 *
 *   - a row that is not a declaration at all still FAILS per-PR. Both spellings
 *     of that: a bare slug with no reason, and a key listed twice, where both
 *     lines parse and the reason a human wrote first is discarded unread.
 *   - the relaxation is one manifest entry, not a mode that softens `owed`.
 *
 * Every assertion is paired with its opposite, so a rule that refused
 * everything - or accepted everything - would fail here too.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals } = await import('../scripts/declaration-audit.mjs')
const { undeclaredLedgerRows, MANIFEST, perPrPolicy } = __internals

const workflow = readFileSync(join(repo, '.github/workflows/ci.yml'), 'utf8')
const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'))

test('the per-PR workflow runs the per-PR verdict, and that script asks for it', () => {
  assert.match(workflow, /npm run declarations:pr\b/, 'ci.yml no longer runs the per-PR declaration verdict')
  assert.match(
    pkg.scripts['declarations:pr'] ?? '',
    /--mode=per-pr\b/,
    'the declarations:pr script no longer selects per-PR mode',
  )
  // The strict verdict stays reachable by hand: it is what the release cut runs.
  assert.equal(pkg.scripts['declarations:check'], 'node scripts/declaration-audit.mjs')
})

test('the per-PR workflow still gates undeclared drift, which is what the leniency leans on', () => {
  // The whole workflow triggers on pull_request, so any step in it runs per-PR.
  assert.match(workflow, /^on:\n(?:.*\n)*?\s{2}pull_request:/m, 'ci.yml no longer runs on pull_request')
  assert.match(
    workflow,
    /npm run engine:report -- --check/,
    'ci.yml no longer gates undeclared engine-pin drift, so --mode=per-pr passing a declared window is now a hole',
  )
  // The fmt ledger's live half. It is not a workflow step of its own: the
  // roundtrip test reports undeclared writer drift and ratchets the ledger
  // against staleness, and it runs under `npm test`. Both halves are asserted,
  // because either one leaving would reopen the hole from one side.
  assert.match(workflow, /run: npm test\b/, 'ci.yml no longer runs npm test per-PR')
  const roundtrip = readFileSync(join(repo, 'tests/corpus-fmt-roundtrip.test.mjs'), 'utf8')
  assert.match(
    roundtrip,
    /loadDeclaredFmtDrift/,
    'the roundtrip test no longer reads the drift ledgers, so undeclared writer drift is ungated',
  )
  assert.match(
    roundtrip,
    /loadWriterOnlyDrift/,
    'the roundtrip test no longer ratchets engine-fmt-drift.txt, so a stale line there excuses nothing forever',
  )
})

test('per-PR relaxes exactly the two engine-lag ledgers and the siblings own lag, nothing else', () => {
  // The SPEC entries whose per-PR policy differs from their release policy are
  // the two engine-lag ledgers, via the manifest `prPolicy` they opted into.
  const specRelaxed = MANIFEST.filter(
    (e) => e.repo === 'spec' && perPrPolicy(e) !== e.policy,
  )
  assert.deepEqual(
    specRelaxed.map((e) => [e.path, e.policy, perPrPolicy(e)]).sort(),
    [
      ['resources/engine-fmt-drift.txt', 'owed', 'declared'],
      ['resources/engine-pin-drift.txt', 'owed', 'declared'],
    ],
    'a spec ledger other than the two engine-lag ones now reads differently per-PR',
  )

  // Every SIBLING repo's OWED lag reads as `manual` per-PR and stays `owed` for
  // release - carve#1908: a sibling's declared gap never gates a spec PR, but a
  // tag still requires the whole fleet clean. Paired both directions so a rule
  // that relaxed nothing, or that relaxed release too, would fail here.
  const siblingOwed = MANIFEST.filter((e) => e.repo !== 'spec' && e.policy === 'owed')
  assert.ok(siblingOwed.length > 0, 'expected sibling owed entries; the manifest shape changed')
  for (const e of siblingOwed) {
    assert.equal(perPrPolicy(e), 'manual', `${e.repo} ${e.path} :: ${e.name} still gates a spec PR per-PR`)
    assert.equal(e.policy, 'owed', `${e.repo} ${e.path} :: ${e.name} stopped being owed for release`)
  }

  // A sibling's NON-owed entry (e.g. an explicit `manual`) is untouched, so the
  // relaxation is about the `owed` lag and not a blanket sibling pass.
  for (const e of MANIFEST.filter((x) => x.repo !== 'spec' && x.policy !== 'owed')) {
    assert.equal(perPrPolicy(e), e.policy, `${e.repo} ${e.path} :: ${e.name} was relaxed but was not owed`)
  }

  // The spec's own AST divergence ledgers and the UNDECLARED sweep stay owed in
  // BOTH modes - the leniency is for siblings and the two declared windows, not
  // for the spec's own debt.
  for (const path of [
    'resources/ast-span-divergence.txt',
    'resources/ast-value-divergence.txt',
    'resources/ast-extent-findings.txt',
    'resources/converter-drift.txt',
    'resources/oracle-divergence.txt',
  ]) {
    const e = MANIFEST.find((x) => x.repo === 'spec' && x.path === path)
    assert.ok(e, `${path} left the manifest`)
    assert.equal(perPrPolicy(e), 'owed', `${path} is no longer owed per-PR`)
  }
})

test('a declared window is declared, and a row that declares nothing is not', () => {
  const declared = ['430-a-slug  the pin has not shipped carve#1800 yet (markup-carve/carve-js#1550)']
  assert.deepEqual(undeclaredLedgerRows(declared), [], 'a well-formed row was reported as undeclared')

  // A bare slug is a window TOLERATED rather than declared: nothing was said
  // about it, so nothing was declared.
  const bare = undeclaredLedgerRows(['430-a-slug'])
  assert.equal(bare.length, 1)
  assert.match(bare[0], /no reason given/)

  // A single space is not the separator: the format is two or more, and a
  // one-space line would otherwise read as a slug with a reason.
  assert.equal(undeclaredLedgerRows(['430-a-slug reason']).length, 1)
  assert.equal(undeclaredLedgerRows(['430-a-slug  reason']).length, 0)
})

test('a key listed twice is undeclared, because one of its two reasons is discarded unread', () => {
  const twice = undeclaredLedgerRows([
    '430-a-slug  the first reason, naming carve#1459',
    '430-a-slug  the second reason, naming carve#1259',
  ])
  assert.equal(twice.length, 1)
  assert.match(twice[0], /listed twice/)
  // The paired direction: two DIFFERENT slugs are two declarations, not a
  // duplicate. A guard that refused every repeated prefix would fail here.
  assert.deepEqual(
    undeclaredLedgerRows(['430-a-slug  a reason', '430-a-slug-2  another reason']),
    [],
  )
})

/**
 * Run the audit as a subprocess with the engine checkouts pointed at a path
 * that does not exist, so no sibling clone on the machine can answer for them.
 */
function auditWithoutEngines(mode) {
  const nowhere = join(repo, 'tests', '__no_such_engine_checkout__')
  const run = spawnSync(process.execPath, ['scripts/declaration-audit.mjs', `--mode=${mode}`, '--no-fetch'], {
    cwd: repo,
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...process.env,
      CARVE_DECL_AUDIT_LIB: '',
      CARVE_JS_DIR: join(nowhere, 'carve-js'),
      CARVE_PHP_DIR: join(nowhere, 'carve-php'),
      CARVE_RS_DIR: join(nowhere, 'carve-rs'),
    },
  })
  assert.equal(run.error, undefined, String(run.error))
  return { status: run.status, out: `${run.stdout}${run.stderr}` }
}

test('without sibling engine checkouts the per-PR verdict skips them and the release verdict does not', () => {
  // 25 of the 26 manifest rows live in an engine. Reporting them as 25 findings
  // per-PR names nothing anyone changed, and a contributor with no clones
  // cannot act on any of it - so per-PR SKIPS and says it was incomplete.
  const pr = auditWithoutEngines('per-pr')
  assert.equal(pr.status, 0, pr.out)
  assert.match(pr.out, /SKIPPED/)
  assert.match(pr.out, /carve-js, carve-php, carve-rs not checked out/)
  assert.match(pr.out, /INCOMPLETE, not clean/)

  // A release verdict computed from three engines it could not read is
  // worthless, so the same run fails before a tag.
  const release = auditWithoutEngines('release')
  assert.equal(release.status, 1, release.out)
  assert.match(release.out, /UNREACHABLE/)
  assert.doesNotMatch(release.out, /SKIPPED/)
})

test('both modes name themselves, in the banner and in the verdict', () => {
  // A run that does not say which verdict it computed is the ambiguity that
  // produced carve#1811 in the first place.
  const pr = auditWithoutEngines('per-pr')
  assert.match(pr.out, /^Declaration audit - mode PER-PR$/m)
  assert.match(pr.out, /DECLARATION AUDIT PASSED \(mode: per-pr\)/)

  const release = auditWithoutEngines('release')
  assert.match(release.out, /^Declaration audit - mode RELEASE$/m)
  assert.match(release.out, /DECLARATION AUDIT FAILED \(mode: release\)/)
  assert.match(release.out, /Not clear to tag\./)
})

test('an unknown mode is refused rather than silently treated as one of them', () => {
  const run = spawnSync(process.execPath, ['scripts/declaration-audit.mjs', '--mode=lenient', '--no-fetch'], {
    cwd: repo,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, CARVE_DECL_AUDIT_LIB: '' },
  })
  assert.equal(run.status, 2, `${run.stdout}${run.stderr}`)
  assert.match(`${run.stdout}${run.stderr}`, /unknown --mode=lenient/)
})
