/*
 * An unused `converter-drift.txt` declaration says WHICH of four things
 * happened, not one sentence that covers all of them.
 *
 * The symptom is single: the entry was never matched. The causes are four -
 * the engine passed, the case is gone, a sliced run never reached it, or the
 * conversion errored - and the message used to read "the engine now matches
 * (or the case is gone)" for every one. That sends a reader to delete a line
 * in the three states where deleting is wrong, and it makes an ERRORED engine
 * indistinguishable from a fixed one, which is the reading that must never be
 * silent (carve#2175).
 *
 * Each case below is paired against the passing state with the same key, so a
 * classifier that answered the same way every time fails here rather than
 * passing four assertions on one string.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unusedConverterDeclaration } from '../scripts/lib/drift-ledger.mjs'

const base = {
  activeNames: new Set(['rust', 'js', 'php']),
  corpusSlugs: new Set(['47-markdown-table-body-rows-are-written-unpadded']),
  measuredSlugs: new Set(['47-markdown-table-body-rows-are-written-unpadded']),
  unscored: new Map(),
}
const key = 'php/47-markdown-table-body-rows-are-written-unpadded'
const passing = unusedConverterDeclaration(key, base)

test('a passing engine is the only state that says STALE', () => {
  assert.match(passing, /the engine now matches - delete the STALE line/)
})

test('an engine that was not measured does not read as fixed', () => {
  const said = unusedConverterDeclaration(key, {
    ...base,
    activeNames: new Set(['rust', 'js']),
  })
  assert.notEqual(said, passing)
  assert.doesNotMatch(said, /STALE/)
  assert.match(said, /was not measured in this run/)
})

test('a case the corpus no longer holds names itself', () => {
  const said = unusedConverterDeclaration(key, { ...base, corpusSlugs: new Set() })
  assert.notEqual(said, passing)
  assert.doesNotMatch(said, /STALE/)
  assert.match(said, /the corpus has no case/)
})

test('a case a sliced run never reached is not stale', () => {
  const said = unusedConverterDeclaration(key, { ...base, measuredSlugs: new Set() })
  assert.notEqual(said, passing)
  assert.doesNotMatch(said, /STALE/)
  assert.match(said, /--limit cut it/)
})

test('an errored conversion is not a fixed engine', () => {
  const said = unusedConverterDeclaration(key, {
    ...base,
    unscored: new Map([[key, 'the conversion errored']]),
  })
  assert.notEqual(said, passing)
  assert.doesNotMatch(said, /STALE/)
  assert.match(said, /could not score it: the conversion errored/)
})

test('a slug holding a slash keeps its whole name', () => {
  const nested = 'php/html-import--a/b'
  const said = unusedConverterDeclaration(nested, {
    ...base,
    corpusSlugs: new Set(['html-import--a/b']),
    measuredSlugs: new Set(['html-import--a/b']),
  })
  assert.match(said, /declares php\/html-import--a\/b and the engine now matches/)
})
