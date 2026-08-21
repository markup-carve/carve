/*
 * A key declared twice in a drift ledger is refused, in every spelling of a
 * ledger this repo has.
 *
 * carve#1479: `resources/engine-pin-drift.txt` held 220 lines while
 * `npm run engine:report -- --check` printed `declared drift: 215`. Five slugs
 * were listed twice, each with a DIFFERENT reason - one naming carve#1459, one
 * naming carve#1259 - and the Map the file was read into kept whichever came
 * last. The first reason was not merged, not reported and not counted; it was
 * simply gone, and the only trace was a number nobody had reason to check
 * against the file.
 *
 * That made the report a check that could not report what it claimed to, which
 * is the failure this repo has caught in eleven other places (carve#755). So
 * the guard is pinned rather than trusted, and pinned in the direction that
 * matters: each assertion below is paired with the same input minus the
 * duplicate, so a guard that refused EVERYTHING would fail here too.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  declaredObjectLedgers,
  duplicateKeys,
  parseConverterLedger,
  parseDriftLedger,
} from '../scripts/lib/drift-ledger.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const resources = join(root, 'resources')

const ledgerFile = (contents) => {
  const path = join(mkdtempSync(join(tmpdir(), 'carve-drift-')), 'engine-pin-drift.txt')
  writeFileSync(path, contents)
  return path
}

test('a slug listed twice is refused, and the same file without it is not', () => {
  const twice = ledgerFile(
    '# a comment\n' +
      'some-case  pinned build predates carve#1459\n' +
      'other-case  pinned build predates carve#1259\n' +
      'some-case  pinned build predates carve#1259\n',
  )
  assert.throws(
    () => parseDriftLedger(twice),
    (error) =>
      /duplicate key on line 4: some-case/.test(error.message) &&
      // Both reasons are named: the point is that one of them was being
      // discarded, so a message that showed only the survivor would describe
      // the wrong half of the mistake.
      /carve#1459/.test(error.message) &&
      /carve#1259/.test(error.message),
  )

  const once = ledgerFile(
    '# a comment\n' +
      'some-case  pinned build predates carve#1459\n' +
      'other-case  pinned build predates carve#1259\n',
  )
  assert.deepEqual([...parseDriftLedger(once).keys()], ['some-case', 'other-case'])
})

test('a line with no reason is still refused', () => {
  assert.throws(() => parseDriftLedger(ledgerFile('lonely-slug\n')), /no reason on line: lonely-slug/)
})

test('the real ledgers parse, so a duplicate landing in one of them fails here', () => {
  for (const name of ['engine-pin-drift.txt', 'engine-fmt-drift.txt']) {
    assert.doesNotThrow(() => parseDriftLedger(join(resources, name)), name)
  }
  assert.deepEqual(parseConverterLedger(join(resources, 'converter-drift.txt')).failures, [])
})

test('the converter ledger reports a duplicate pair rather than collapsing it', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'carve-drift-')), 'converter-drift.txt')
  const line = (reason) => `js/some-case  ${reason}\n`
  writeFileSync(path, line('reads a glued marker as a marker') + line('writes a thead on its own line'))
  const { entries, failures } = parseConverterLedger(path)
  assert.equal(entries.size, 1)
  assert.equal(failures.length, 1)
  assert.match(failures[0], /duplicate entry: js\/some-case/)
  assert.match(failures[0], /glued marker/)

  writeFileSync(path, line('reads a glued marker as a marker'))
  assert.deepEqual(parseConverterLedger(path).failures, [])
})

/*
 * The object-literal ledgers - `PINNED_DRIFT`, `AHEAD_OF_PIN`,
 * `PINNED_UNIMPLEMENTED` and every sibling - cannot be checked at runtime: a
 * repeated key is legal JavaScript, and by the time the object exists the
 * duplicate has already resolved to its last value. So the declaration is read
 * out of the source instead.
 *
 * Every `const ALL_CAPS = {` in `scripts/` and `tests/` is scanned rather than
 * a hand-written list of the two the issue named, so the next ledger spelled
 * this way is covered without anybody remembering this file exists.
 */
const modules = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')))
    .map((entry) => join(entry.parentPath, entry.name))

test('no declared object ledger repeats a key', () => {
  let scanned = 0
  for (const file of [...modules(join(root, 'scripts')), ...modules(join(root, 'tests'))]) {
    for (const ledger of declaredObjectLedgers(readFileSync(file, 'utf8'))) {
      scanned += 1
      assert.deepEqual(
        duplicateKeys(ledger.keys),
        [],
        `${file}: ${ledger.name} declares a key twice - the second value wins and the first reason is lost`,
      )
    }
  }
  // The scan is the check, so a scan that found nothing to look at would pass
  // for the wrong reason. There were 41 the day this landed.
  assert.ok(scanned >= 30, `expected the ledger scan to reach dozens of declarations, reached ${scanned}`)
})

test('the object-ledger scanner sees a duplicate key, and sees a distinct one is not', () => {
  const ledger = (second) =>
    `const PINNED_DRIFT = {\n  'a-case': 'predates carve#1459',\n  '${second}': 'predates carve#1259',\n}\n`
  assert.deepEqual(duplicateKeys(declaredObjectLedgers(ledger('a-case'))[0].keys), ['a-case'])
  assert.deepEqual(duplicateKeys(declaredObjectLedgers(ledger('b-case'))[0].keys), [])

  // A nested object is not a sibling: repeating a key one level down is a
  // different declaration and must not read as a duplicate.
  const nested =
    "const NESTED = {\n  outer: { same: 1 },\n  other: { same: 2 },\n}\n"
  assert.deepEqual(duplicateKeys(declaredObjectLedgers(nested)[0].keys), [])
})
