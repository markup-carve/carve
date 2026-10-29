// Each round-trip exception list is a directory with one empty file per corpus
// id, so two PRs that list different ids add different files and cannot conflict.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { readExceptions, writeExceptions } from '../scripts/lib/exception-list.mjs'

const lists = fileURLToPath(new URL('../resources/roundtrip/', import.meta.url))

test('every round-trip exception list is a directory, none a text file', () => {
  const entries = readdirSync(lists)
  assert.ok(entries.length >= 17, `found ${entries.length} lists`)
  for (const name of entries) {
    assert.ok(statSync(join(lists, name)).isDirectory(), `resources/roundtrip/${name} is not a directory; lists hold one file per id`)
    assert.ok(existsSync(join(lists, name, '.keep')), `resources/roundtrip/${name}/.keep is missing`)
    for (const id of readExceptions(join(lists, name))) {
      assert.equal(readFileSync(join(lists, name, id), 'utf8'), '', `resources/roundtrip/${name}/${id} is not empty`)
    }
  }
})

test('writing a list adds and removes id files and keeps an empty list present', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'carve-test-exceptions-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const list = join(dir, 'measure')
  assert.equal(readExceptions(list), null)
  writeExceptions(list, ['b', 'a', 'b'])
  assert.deepEqual(readExceptions(list), ['a', 'b'])
  writeExceptions(list, ['a', 'c'])
  assert.deepEqual(readExceptions(list), ['a', 'c'])
  writeExceptions(list, [])
  assert.deepEqual(readExceptions(list), [])
  assert.throws(() => writeExceptions(list, ['../escape']), /not a file-safe corpus id/)
  assert.throws(() => writeExceptions(list, ['.hidden']), /not a file-safe corpus id/)
})

test('the declaration audit counts a directory ledger through its owner', async () => {
  process.env.CARVE_DECL_AUDIT_LIB = '1'
  const { __internals } = await import('../scripts/declaration-audit.mjs')
  const ledgers = __internals.MANIFEST.filter((entry) => entry.kind === 'dir')
  assert.ok(ledgers.length >= 1)
  for (const entry of ledgers) {
    const name = entry.path.slice(entry.path.lastIndexOf('/') + 1)
    const owner = readFileSync(fileURLToPath(new URL(`../${entry.owner}`, import.meta.url)), 'utf8')
    assert.ok(owner.includes(`'${name}'`), `${entry.owner} never names ${name}`)
    assert.ok(existsSync(fileURLToPath(new URL(`../${entry.path}`, import.meta.url))), `${entry.path} is missing`)
  }
  assert.deepEqual(__internals.liveRows({ kind: 'dir' }, 'a\nb'), ['a', 'b'])
})
