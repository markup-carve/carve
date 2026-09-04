/*
 * THE DECLARATION AUDIT MUST BE ABLE TO REPORT A ROW IT CANNOT SEE.
 *
 * `scripts/declaration-audit.mjs` reads every declaration list in this repo AND
 * the vendored constants in the three engines, and its whole value is the
 * COUNT. A counter that reports 0 for a list it failed to parse is the
 * carve#755 shape exactly: green, confident, and blind - and it would be green
 * on the one run that matters, the pre-tag sweep.
 *
 * Three parser defects were found by writing this file, and each one read as a
 * clean result rather than as an error:
 *
 *   1. `[...src]` splits by code POINT while `src[i]` indexes code UNITS, so a
 *      file holding one emoji desynced the comment blanker, blanked live code,
 *      and reported the constant DELETED.
 *   2. Rust spells the element type between the name and the `=`, so a scan
 *      from the name counted `&[(&str, &str, &str)]` as one live row - every
 *      EMPTY Rust list read as 1.
 *   3. TypeScript spells it in the constructor's type arguments, so
 *      `new Map<string, { reason: string; html: string }>([])` counted the
 *      type's two fields - every empty TS collection read as 1 or 2.
 *
 * Each is pinned below, in both directions: the empty spelling counts 0 and the
 * populated one counts its rows.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals } = await import('../scripts/declaration-audit.mjs')
const { liveRows, blankComments, classifyPinDistance, gitPinStatus, isDeclarationName, undeclaredLedgerRows, MANIFEST } = __internals

const rows = (kind, name, src) => {
  const out = liveRows({ kind, name }, src)
  assert.ok(!(out instanceof Error), out instanceof Error ? out.message : '')
  return out
}

test('an empty list counts zero in every language this repo declares one in', () => {
  assert.deepEqual(rows('js', 'A', 'const A = new Map([])'), [])
  assert.deepEqual(rows('js', 'A', 'const A = new Set([])'), [])
  assert.deepEqual(rows('js', 'A', 'const A = {}'), [])
  assert.deepEqual(rows('js', 'A', 'const A = []'), [])
  assert.deepEqual(rows('php', 'A', 'protected const A = [];'), [])
  assert.deepEqual(rows('rust', 'A', 'const A: &[&str] = &[];'), [])
})

test('a populated list counts its rows, not its punctuation', () => {
  assert.equal(rows('js', 'A', "const A = new Map([['x', 'r'], ['y', 'r']])").length, 2)
  assert.equal(rows('js', 'A', "const A = new Set(['x', 'y', 'z'])").length, 3)
  assert.equal(rows('php', 'A', "const A = ['x' => 'r', 'y' => 'r'];").length, 2)
  assert.equal(rows('rust', 'A', 'const A: &[(&str, &str)] = &[("x", "r")];').length, 1)
})

test('a trailing comma is punctuation, not a row', () => {
  assert.equal(rows('js', 'A', "const A = ['x', 'y',]").length, 2)
  assert.equal(rows('php', 'A', "const A = ['x', 'y',];").length, 2)
})

test('a comment is not a row, and an all-comment list is empty', () => {
  // Every empty list in this org carries the reason its last entry left, which
  // is precisely the shape that would count as one row if comments survived.
  assert.deepEqual(rows('js', 'A', 'const A = new Map([\n  // Empty: the pin moved past its one entry.\n])'), [])
  assert.deepEqual(rows('php', 'A', 'const A = [\n    // EMPTY, and that is the state to expect.\n];'), [])
  assert.deepEqual(rows('rust', 'A', 'const A: &[&str] = &[\n    // Empty: the pin moved past it.\n];'), [])
  assert.equal(rows('js', 'A', "const A = [\n  // a reason\n  'x',\n]").length, 1)
})

test("REGRESSION 1: an astral character before the constant does not delete it", () => {
  // `[...src]` shortened the array by one slot per astral char and every later
  // write landed early, blanking `co` out of `const`.
  // The comment AFTER the astral characters is load-bearing: the desync only
  // shows once the blanker writes, and it writes one slot early per astral
  // char, so the blanks land on `const A` instead of on the comment.
  const src =
    "const SYMBOLS = { rocket: '\u{1F680}', tada: '\u{1F389}', up: '\u{2B06}\u{FE0F}' }\n" +
    '// a reason the entry left\n' +
    "const A = new Map([['x', 'r']])\n"
  assert.equal(rows('js', 'A', src).length, 1)
  const clean = blankComments(src, 'js')
  assert.equal(clean.length, src.length, 'the blanker must preserve length, or every offset after it is wrong')
  assert.ok(clean.includes('const A'), 'the declaration must survive the blanker')
})

test('REGRESSION 2: a Rust element type is not a row', () => {
  assert.deepEqual(rows('rust', 'A', 'const A: &[(&str, &str, Option<&str>)] = &[];'), [])
})

test('REGRESSION 3: a TypeScript constructor type argument is not a row', () => {
  assert.deepEqual(rows('js', 'A', 'const A = new Map<string, { reason: string; html: string }>([])'), [])
  assert.equal(rows('js', 'A', "const A = new Map<string, { reason: string }>([['x', { reason: 'r' }]])").length, 1)
})

test('a string inside a comment does not run the blanker off the end of the line', () => {
  // `//` inside a URL literal is not a comment; blanking from there would eat
  // the closing bracket and report the list unparseable.
  assert.equal(rows('js', 'A', "const A = ['https://example.com/x', 'y']").length, 2)
  // And an apostrophe inside a line comment must not open a string.
  assert.equal(rows('js', 'A', "// the writer's caret\nconst A = ['x']").length, 1)
})

test('a txt ledger counts neither blank lines nor `#` headers', () => {
  assert.deepEqual(rows('txt', undefined, '# a header\n#\n\n'), [])
  assert.equal(rows('txt', undefined, '# a header\n\nslug  reason\nother  reason\n').length, 2)
})

test('a json pointer counts its array members, and a missing one is an ERROR', () => {
  const src = JSON.stringify({ a: { b: ['x', 'y'] } })
  assert.deepEqual(rows('json', 'a.b', src), ['x', 'y'])
  assert.deepEqual(rows('json', 'a.b', JSON.stringify({ a: { b: [] } })), [])
  const gone = liveRows({ kind: 'json', name: 'a.missing' }, src)
  assert.ok(gone instanceof Error, 'an absent pointer must not count as zero rows')
})

test('a missing declaration is an ERROR, never zero', () => {
  // The failure this whole file exists for: a renamed or moved constant must
  // fail loudly rather than read as a cleared list.
  const out = liveRows({ kind: 'js', name: 'RENAMED' }, 'const A = []')
  assert.ok(out instanceof Error, 'an absent constant must not count as zero rows')
  assert.match(out.message, /no declaration of RENAMED/)
})

test('every manifest entry names a policy and a guard the reporter understands', () => {
  // `declared` belongs here as much as the rest: the reporter has always
  // implemented it, and leaving it out of this set meant an entry could only
  // reach it through `prPolicy`, which nothing validated at all (carve#1939).
  const policies = new Set(['owed', 'permitted', 'split', 'manual', 'declared'])
  const guards = new Set(['two-way', 'one-way', 'none'])
  for (const entry of MANIFEST) {
    assert.ok(policies.has(entry.policy), `${entry.path} :: ${entry.name} has policy ${entry.policy}`)
    if (entry.prPolicy !== undefined) {
      assert.ok(policies.has(entry.prPolicy), `${entry.path} :: ${entry.name} has prPolicy ${entry.prPolicy}`)
    }
    assert.ok(guards.has(entry.guard), `${entry.path} :: ${entry.name} has guard ${entry.guard}`)
    assert.ok(entry.owner, `${entry.path} :: ${entry.name} names no owner - an entry nobody owns cannot be retired`)
  }
})

test('the `declared` policy can pass, and fail, on a source-derived list', () => {
  // It could do NEITHER until carve#1939. `liveRows` collapsed every whitespace
  // run in a row read from source, which removed the two-space separator that
  // `undeclaredLedgerRows` searches for - so `declared` reported every row
  // undeclared on `js`, `php` and `rust` alike, whatever the source said. A
  // policy that is selectable, documented and unreachable is the carve#755
  // shape, and it went unnoticed because only `txt` entries had used it.
  //
  // Both directions are asserted per kind. Passing alone would be satisfied by
  // a check that cannot fail, which is the failure being retired here.
  const declared = {
    js: "const D = [\n  'alpha.crv 1  a reason a human wrote',\n]",
    php: "const D = [\n    'alpha.crv 1  a reason a human wrote',\n];",
    rust: 'const D: &[&str] = &[\n    "alpha.crv 1  a reason a human wrote",\n];',
  }
  const bare = {
    js: "const D = [\n  'alpha.crv 1',\n]",
    php: "const D = [\n    'alpha.crv 1',\n];",
    rust: 'const D: &[&str] = &[\n    "alpha.crv 1",\n];',
  }
  for (const kind of ['js', 'php', 'rust']) {
    assert.deepEqual(
      undeclaredLedgerRows(rows(kind, 'D', declared[kind])),
      [],
      `a ${kind} row carrying a reason must count as declared`,
    )
    assert.equal(
      undeclaredLedgerRows(rows(kind, 'D', bare[kind])).length,
      1,
      `a ${kind} row with no reason must still be reported`,
    )
  }
})

test('a multi-line row does not read its own indentation as a separator', () => {
  // The mirror defect, and the one that would be harder to see: preserving
  // every two-space run rather than only what is inside a literal would let the
  // layout of a row spanning several source lines stand in for a reason, so a
  // list declaring nothing would pass. The collapse runs BETWEEN literals only.
  // The first entry spans two source lines, and there are two entries so the
  // `new Map([...])` unwrap does not flatten them. Its indentation is therefore
  // INSIDE the row, which is the only place a phantom separator can come from.
  const src = "const D = [\n  ['alpha.crv',\n    1],\n  ['beta.crv', 2],\n]"
  const live = rows('js', 'D', src)
  assert.equal(live[0], "['alpha.crv', 1]", 'layout between literals collapses to a single space')
  const faults = undeclaredLedgerRows(live)
  assert.equal(faults.length, 2, 'neither bare row may be rescued by its own layout')
  for (const fault of faults) assert.match(fault, /no reason given/)
})

test('a staleness anchor belongs only to a guard that claims to be two-directional', () => {
  // The field VERIFIES the `two-way` claim, so naming one beside `one-way` or
  // `none` would read as evidence for a claim the same row denies.
  for (const entry of MANIFEST) {
    if (entry.staleness === undefined) continue
    assert.equal(
      entry.guard,
      'two-way',
      `${entry.path} :: ${entry.name} names a staleness anchor but declares guard ${entry.guard}`,
    )
    assert.ok(
      entry.staleness.length > 12,
      `${entry.path} :: ${entry.name} has an anchor too short to identify one assertion`,
    )
  }
})

test('at least one guard is verified rather than merely claimed', () => {
  // The non-vacuity guard on the verification itself. If every entry lost its
  // anchor the run would report "0 verified, N claimed" and still pass every
  // other assertion here - a check that cannot fail, which is the whole
  // subject of this file.
  const anchored = MANIFEST.filter((entry) => entry.staleness !== undefined)
  assert.ok(anchored.length > 0, 'no manifest entry verifies its guard claim against the file')
})

test('pin distance distinguishes every relation that must not read as current', () => {
  assert.equal(classifyPinDistance(0, 0), 'current')
  assert.equal(classifyPinDistance(0, 3), 'behind')
  assert.equal(classifyPinDistance(2, 0), 'ahead')
  assert.equal(classifyPinDistance(2, 3), 'diverged')
  assert.equal(classifyPinDistance(-1, 0), 'unverifiable')
  assert.equal(classifyPinDistance(Number.NaN, 0), 'unverifiable')
})

test('the git-backed pin gate observes current, behind, ahead, diverged and unverifiable histories', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-pin-audit-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
  git('init', '-q')
  git('config', 'user.email', 'audit@example.invalid')
  git('config', 'user.name', 'Declaration audit')
  writeFileSync(join(dir, 'state'), 'base\n')
  git('add', 'state')
  git('commit', '-qm', 'base')
  const base = git('rev-parse', 'HEAD')
  git('branch', 'side', base)
  writeFileSync(join(dir, 'state'), 'main\n')
  git('commit', '-qam', 'main')
  const main = git('rev-parse', 'HEAD')
  git('switch', '-q', 'side')
  writeFileSync(join(dir, 'state'), 'side\n')
  git('commit', '-qam', 'side')
  const side = git('rev-parse', 'HEAD')

  assert.equal(gitPinStatus(dir, main, 'master').relation, 'current')
  assert.equal(gitPinStatus(dir, base, 'master').relation, 'behind')
  assert.equal(gitPinStatus(dir, main, base).relation, 'ahead')
  assert.equal(gitPinStatus(dir, side, 'master').relation, 'diverged')
  assert.ok(gitPinStatus(dir, '0'.repeat(40), 'master') instanceof Error)
})

test('a decorated declaration name is swept and explicitly manifested', () => {
  assert.equal(isDeclarationName('TOTALLY_NEW_AHEAD_OF_PIN'), true)
  assert.equal(isDeclarationName('CANONICAL_AHEAD_OF_PIN'), true)
  assert.equal(isDeclarationName('ORDINARY_TEST_FIXTURES'), false)
  const entry = MANIFEST.find(
    ({ repo, path, name }) => repo === 'carve-js' && path === 'test/canonical-ahead-of-pin.ts' && name === 'CANONICAL_AHEAD_OF_PIN',
  )
  assert.ok(entry, 'the canonical writer declaration is invisible to the manifest')
  assert.equal(entry.policy, 'owed')
  assert.equal(entry.guard, 'two-way')
})
