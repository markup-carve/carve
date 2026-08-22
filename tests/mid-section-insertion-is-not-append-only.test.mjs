/*
 * Inserting a pair MID-SECTION is a renumber, and the guard has to say so.
 *
 * generate-corpus.mjs refuses to renumber a CATEGORY, and that refusal compares
 * `NN-slug` against `NN-slug`. A corpus name has a second half. Adding a pair in
 * the middle of a section leaves every category number alone and shifts the
 * EXAMPLE SUFFIXES after the insertion point by one, so the check could not see
 * the one insertion that reorders documents inside a section (carve#1536).
 *
 * It is not a cosmetic renumber. A hand-written sidecar - `NN-slug-K.fmt`, `.md`
 * - follows its case by SLUG, so a displaced pair takes its byte-exact expected
 * output onto whatever document now holds the old name. `05-lists-25` through
 * `05-lists-28` all carry a `.fmt` today, and carve#1535's pair 28 exists
 * precisely because a trailing space in `> > ` is invisible to HTML, to a
 * whitespace-only-line check and to idempotence. Landing one on the wrong
 * document would pin the wrong bytes with no signal anywhere.
 *
 * carve#1535 hit this for real and worked around it by appending at the end of
 * the section, which is a convention nothing enforced.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { displacedExamples, parseCorpusName } from '../scripts/lib/example-displacement.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// A section of four examples, named the way the generator names them.
const section = (slug, bodies) =>
  bodies.map((hash, i) => ({
    name: `05-${slug}${i === 0 ? '' : `-${i + 1}`}`,
    slug,
    suffix: i + 1,
    hash,
  }))

const lists = section('lists', ['a', 'b', 'c', 'd'])

test('an insertion mid-section names every document it displaces', () => {
  // The new pair takes suffix 3; `c` and `d` move up one. This is carve#1535's
  // shape, scaled down: the inserted pair took `05-lists-24` and the document
  // that owned it moved to 28.
  const after = section('lists', ['a', 'b', 'NEW', 'c', 'd'])
  assert.deepEqual(displacedExamples(lists, after), [
    { from: '05-lists-3', to: '05-lists-4' },
    { from: '05-lists-4', to: '05-lists-5' },
  ])
})

test('a genuine append at the end of the section passes', () => {
  const after = section('lists', ['a', 'b', 'c', 'd', 'NEW'])
  assert.deepEqual(displacedExamples(lists, after), [])
})

test('an unchanged section reports nothing', () => {
  assert.deepEqual(displacedExamples(lists, section('lists', ['a', 'b', 'c', 'd'])), [])
})

test('editing an example in place is not a displacement', () => {
  // The identity is the `.crv` bytes, so a rewritten input simply stops
  // matching. It keeps its number, nothing moved, and nothing is reported -
  // otherwise every content fix would have to be argued past this guard.
  const after = section('lists', ['a', 'b-EDITED', 'c', 'd'])
  assert.deepEqual(displacedExamples(lists, after), [])
})

test('a category renumber is the other guard s to report, not this one', () => {
  // CORPUS_RENUMBER=1 shifts the PREFIX of every name in a section. Suffixes
  // are intact, so this check stays quiet instead of repeating the category
  // guard once per example.
  const after = lists.map((row) => ({ ...row, name: row.name.replace(/^05-/, '07-') }))
  assert.deepEqual(displacedExamples(lists, after), [])
})

test('the comparison never leaves a section', () => {
  // Byte-identical inputs in two DIFFERENT sections are ordinary - the corpus
  // has 13 such pairs today - and moving one must not be read as displacing the
  // other.
  const before = [...section('lists', ['a', 'b']), ...section('tables', ['a', 'z'])]
  const after = [...section('lists', ['a', 'b']), ...section('tables', ['NEW', 'a', 'z'])]
  assert.deepEqual(displacedExamples(before, after), [
    { from: '05-tables', to: '05-tables-2' },
    { from: '05-tables-2', to: '05-tables-3' },
  ])
})

test('two examples with identical bytes in one section are skipped, not guessed', () => {
  // Which of the two moved is undecidable from the bytes, and naming the wrong
  // one is worse than naming neither. The corpus has no such pair today: 398
  // sections, no within-section collision.
  const before = section('lists', ['a', 'same', 'same'])
  const after = section('lists', ['NEW', 'a', 'same', 'same'])
  assert.deepEqual(displacedExamples(before, after), [{ from: '05-lists', to: '05-lists-2' }])
})

test('a section that is new, or gone, belongs to the category guard', () => {
  assert.deepEqual(displacedExamples(lists, []), [])
  assert.deepEqual(displacedExamples([], lists), [])
})

test('a corpus name splits into its section and its example number', () => {
  assert.deepEqual(parseCorpusName('05-lists-24'), {
    name: '05-lists-24', idx: '05', slug: 'lists', suffix: 24,
  })
  // The first example of a section carries no suffix; it is example 1.
  assert.deepEqual(parseCorpusName('08-image-with-caption'), {
    name: '08-image-with-caption', idx: '08', slug: 'image-with-caption', suffix: 1,
  })
  assert.equal(parseCorpusName('no-number-here'), null)
})

test('a section slug that ends in a number is not read as an example suffix', () => {
  // `## Version 2` produces the slug `version-2`, so `05-version-2` is example
  // 1 of that section - not example 2 of a section called `version`. Read the
  // second way, the section is never compared against its previous generation
  // and an insertion inside it is reported by nothing, which is this guard
  // failing exactly the way the one it replaces failed.
  const slugs = new Set(['version-2'])
  assert.deepEqual(parseCorpusName('05-version-2', slugs), {
    name: '05-version-2', idx: '05', slug: 'version-2', suffix: 1,
  })
  assert.deepEqual(parseCorpusName('05-version-2-3', slugs), {
    name: '05-version-2-3', idx: '05', slug: 'version-2', suffix: 3,
  })
  // And an insertion inside such a section is seen.
  const before = [
    parseCorpusName('05-version-2', slugs),
    parseCorpusName('05-version-2-2', slugs),
  ].map((row, i) => ({ ...row, hash: ['a', 'b'][i] }))
  const after = [
    parseCorpusName('05-version-2', slugs),
    parseCorpusName('05-version-2-2', slugs),
    parseCorpusName('05-version-2-3', slugs),
  ].map((row, i) => ({ ...row, hash: ['NEW', 'a', 'b'][i] }))
  assert.deepEqual(displacedExamples(before, after), [
    { from: '05-version-2', to: '05-version-2-2' },
    { from: '05-version-2-2', to: '05-version-2-3' },
  ])
})

test('the generator fails on what the check reports', () => {
  // The function above can be right and unreachable, which is the carve#755
  // shape this ticket exists to avoid repeating. The end-to-end run is in the
  // commit message; this pins the two joints that run holds - the check is
  // called with the previous generation's bytes, and its result is part of the
  // condition that exits non-zero.
  const src = readFileSync(resolve(repoRoot, 'scripts/generate-corpus.mjs'), 'utf8')
  assert.match(src, /import \{ displacedExamples, parseCorpusName \} from '\.\/lib\/example-displacement\.mjs'/)
  assert.match(src, /const displaced = displacedExamples\(\s*existingExamples,/)
  assert.match(src, /if \(moved\.size \|\| addedTooLow\.size \|\| removed\.length \|\| displaced\.length\) \{/)
})
