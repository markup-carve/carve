/*
 * Node-type vocabulary checks.
 *
 * docs/profiles.md is the single place the normative vocabulary is written
 * down, and implementations copy those strings verbatim. A typo or an
 * inconsistent spelling there propagates into every implementation and is only
 * caught when two of them disagree at runtime - which is how carve-php ended up
 * emitting `citation-group` while spelling every other type with underscores.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const profiles = readFileSync(resolve(here, '../docs/profiles.md'), 'utf8')

/** Pulls the backticked identifiers out of one labelled vocabulary paragraph. */
function vocabulary(label) {
  const section = profiles.match(
    new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)\\n\\n`),
  )
  assert.ok(section, `no ${label} vocabulary paragraph in docs/profiles.md`)

  // Deliberately permissive: a malformed identifier must be captured so the
  // snake_case assertion can fail on it, rather than skipped and passing.
  return [...section[1].matchAll(/`([A-Za-z0-9_-]+)`/g)].map((m) => m[1])
}

const block = vocabulary('Block')
const inline = vocabulary('Inline')

test('the vocabulary paragraphs are found and non-trivial', () => {
  assert.ok(block.length > 15, `block vocabulary looks truncated: ${block.length}`)
  assert.ok(inline.length > 20, `inline vocabulary looks truncated: ${inline.length}`)
})

test('every type identifier is snake_case', () => {
  for (const type of [...block, ...inline]) {
    assert.match(
      type,
      /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
      `"${type}" is not snake_case; the spec states there is no alternate spelling`,
    )
  }
})

test('no type is listed twice, or on both axes', () => {
  const all = [...block, ...inline]
  const duplicates = all.filter((type, i) => all.indexOf(type) !== i)
  assert.deepEqual(duplicates, [], `duplicated type identifiers: ${duplicates.join(', ')}`)
})

test('tag stays folded into mention, and says so', () => {
  // The parsers emit a distinct `tag` node, so its ABSENCE here has to be a
  // stated decision rather than a missing word - that ambiguity is what
  // carve#373 was. All three engines classify `#tag` as `mention`, and a host
  // naming `tag` in a profile gets silence, so the fold is documented next to
  // the vocabulary and pinned here.
  assert.ok(
    ![...block, ...inline].includes('tag'),
    '`tag` is classified as `mention`; listing it would promise a denial that no engine honors',
  )
  assert.match(
    profiles,
    /A \*\*`tag`\*\* node[\s\S]{0,400}?classified as \*\*`mention`\*\*/,
    'profiles.md must state that `tag` is classified as `mention`, or its absence reads as an oversight',
  )
})

test('formatter-internal nodes stay out of the vocabulary', () => {
  // A profile naming these could break `fmt` while saying nothing about the
  // document's content, so the spec excludes them by name.
  for (const internal of ['raw_text']) {
    assert.ok(
      ![...block, ...inline].includes(internal),
      `"${internal}" is formatter-internal and must not be profile-addressable`,
    )
  }
})

test('types the implementations emit are all covered', () => {
  // Regression guard for the specific gaps that let nodes degrade unchecked in
  // every chat target at once before anyone noticed.
  for (const type of [
    'autolink',
    'admonition',
    'heading_ref',
    'citation_group',
    'caption_number',
    'substitution',
  ]) {
    assert.ok(
      [...block, ...inline].includes(type),
      `"${type}" is emitted by an implementation but absent from the vocabulary`,
    )
  }
})
