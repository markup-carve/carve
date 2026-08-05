/*
 * docs/extensions.md names extensions; the reference engine either exports them
 * or it does not.
 *
 * That page is where a processor author goes to find out what there is to
 * register, and nothing measured it. Two entries were wrong when this was
 * written, in different ways:
 *
 *   - `SemanticSpan` sat in the Tier-3 row with no qualifier. It exists in
 *     carve-php alone - carve-js and carve-rs have no mention of it in `src` at
 *     all - and the very same row annotates ColorSwatch with all three engine
 *     names, so the omission read as "available everywhere".
 *   - `Bibliography` sat in the same row as though it were a registration. It is
 *     an OPTION on the Citations extension (`bibliography?: CslEntry[]`), so a
 *     reader looking for a `bibliography` export finds nothing.
 *
 * An engine-specific extension is legitimate - engines may differ, and §3 of the
 * page is about exactly that. What is not legitimate is a catalog that does not
 * say so, which is why the check below accepts either an export in the reference
 * engine OR an explicit note, and nothing else.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as lib from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = readFileSync(resolve(root, 'docs/extensions.md'), 'utf8')

/*
 * Names on the tier rows that the reference engine does NOT export, each with
 * what the page must say about it instead. Gated below: when the reference gains
 * the export, the entry has to go, so this cannot quietly outlive its reason.
 */
const NOT_A_REFERENCE_EXPORT = {
  SemanticSpan: 'carve-php only',
  Bibliography: 'option on Citations',
}

/** Prose words the row text carries that are not extension names. */
const NOT_A_NAME = new Set([
  'Badge', 'Mermaid', 'Mention', 'Never', 'Not', 'Off', 'Optional', 'SHOULD',
  'SVG', 'Spec', 'URL', 'CSL', 'JSON', 'Citations', 'Tier', 'LevelShift',
  'Lowercase', 'AsciiHeadingIds', 'ImgFence',
])

/** Extension names as the tier rows present them. */
function namedExtensions() {
  const rows = page.split('\n').filter((line) => /Badge type="warning"/.test(line))
  const names = new Set()
  for (const row of rows) {
    for (const match of row.matchAll(/\b([A-Z][A-Za-z]{3,})\b/g)) {
      if (!NOT_A_NAME.has(match[1])) names.add(match[1])
    }
  }

  return [...names].sort()
}

const exported = new Set(Object.keys(lib))
const asExport = (name) => name[0].toLowerCase() + name.slice(1)

test('the rows were actually read', () => {
  // A row-matching regex that stops matching turns every assertion below into a
  // statement about an empty list.
  assert.ok(
    namedExtensions().length > 8,
    `found only ${namedExtensions().length} extension name(s) on the tier rows`,
  )
})

test('every extension the page names is exported, or explained', () => {
  const unexplained = namedExtensions().filter(
    (name) =>
      !exported.has(asExport(name)) &&
      !exported.has(name) &&
      !(name in NOT_A_REFERENCE_EXPORT),
  )
  assert.deepEqual(
    unexplained,
    [],
    `the page names extension(s) the reference engine does not export: ${unexplained.join(', ')}. ` +
      'Either it is not an extension, or it belongs to one engine - say which on the row, ' +
      'and add it to NOT_A_REFERENCE_EXPORT here with the reason.',
  )
})

test('each exception says on the page what it says here', () => {
  // The reason is free text, so what is checkable is that the page carries the
  // same qualifier the exception claims. Without this the entry could excuse a
  // row that still reads as "available everywhere" - the defect itself.
  for (const [name, reason] of Object.entries(NOT_A_REFERENCE_EXPORT)) {
    const row = page.split('\n').find((line) => line.includes(name) && /Badge/.test(line))
    assert.ok(row, `${name} is no longer on a tier row; drop it from NOT_A_REFERENCE_EXPORT`)
    const qualified = /carve-php only/.test(row) || /option on Citations/i.test(row)
    assert.ok(
      qualified,
      `the row naming ${name} does not say it is ${reason}: ${row}`,
    )
  }
})

test('no exception outlives the reference engine gaining it', () => {
  const stale = Object.keys(NOT_A_REFERENCE_EXPORT)
    .filter((name) => exported.has(asExport(name)) || exported.has(name))
    .sort()
  assert.deepEqual(
    stale,
    [],
    `the reference engine now exports ${stale.join(', ')} - delete the exception and ` +
      'the qualifier on the page.',
  )
})
