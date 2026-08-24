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

process.env.CARVE_DECL_AUDIT_LIB = '1'
const { __internals } = await import('../scripts/declaration-audit.mjs')
const { liveRows, blankComments, MANIFEST } = __internals

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
  const policies = new Set(['owed', 'permitted', 'split', 'manual'])
  const guards = new Set(['two-way', 'one-way', 'none'])
  for (const entry of MANIFEST) {
    assert.ok(policies.has(entry.policy), `${entry.path} :: ${entry.name} has policy ${entry.policy}`)
    assert.ok(guards.has(entry.guard), `${entry.path} :: ${entry.name} has guard ${entry.guard}`)
    assert.ok(entry.owner, `${entry.path} :: ${entry.name} names no owner - an entry nobody owns cannot be retired`)
  }
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
