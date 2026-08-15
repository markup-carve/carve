/*
 * The escaper corpus is the byte-exact half of carve#1130: text in, Carve
 * source out, one string per profile. This repo cannot RUN an engine's escaper
 * (carve-js does not export it), so what it can gate is that no case states
 * something impossible - which is what would let a fabricated expectation sit
 * here unnoticed until an engine adopted it and reported the corpus as broken.
 *
 * The load-bearing check is the last one: escaping only ever INSERTS
 * backslashes, so an expected string with every backslash removed is the input
 * again, character for character. A transcription slip, a smart quote, a
 * dropped word - anything that edits the TEXT rather than the escaping - fails
 * it. The other checks are shape.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const corpus = JSON.parse(
  await readFile(new URL('./corpus-escape/cases.json', import.meta.url), 'utf8'),
)

// The handled-delimiter sets, taken from the converters' own call sites. A
// change here is a change to what the fixtures mean, so it is spelled out
// rather than read from the file it is checking.
const PROFILES = {
  plain: {},
  markdown: { braced: '*_', bare: '*_~' },
  djot: { braced: '=+-*_^~', bare: '~*_' },
}

test('the corpus declares the profiles the converters actually pass', () => {
  assert.equal(corpus.version, 1)
  assert.deepEqual(corpus.profiles, PROFILES)
})

test('every case is one line of backslash-free input', () => {
  assert.ok(corpus.cases.length > 0)
  const names = new Set()
  for (const c of corpus.cases) {
    assert.match(c.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, c.name)
    assert.ok(!names.has(c.name), `duplicate case name: ${c.name}`)
    names.add(c.name)
    assert.equal(typeof c.input, 'string')
    assert.ok(c.input.length > 0, c.name)
    // One line: both implementations take a line and return a line.
    assert.ok(!c.input.includes('\n'), c.name)
    // A literal backslash is a separate stage this function does not have.
    assert.ok(!c.input.includes('\\'), `${c.name}: input carries a backslash`)
  }
})

test('every case answers every profile', () => {
  for (const c of corpus.cases) {
    assert.deepEqual(Object.keys(c.expected).sort(), Object.keys(PROFILES).sort(), c.name)
    for (const [profile, expected] of Object.entries(c.expected)) {
      assert.equal(typeof expected, 'string', `${c.name}/${profile}`)
      assert.ok(!expected.includes('\n'), `${c.name}/${profile}`)
    }
  }
})

test('an expectation differs from its input by inserted backslashes only', () => {
  for (const c of corpus.cases) {
    for (const [profile, expected] of Object.entries(c.expected)) {
      assert.equal(
        expected.replaceAll('\\', ''),
        c.input,
        `${c.name}/${profile}: the expectation edits the text, not the escaping`,
      )
    }
  }
})

test('the profile axis is exercised, not just carried', () => {
  // A corpus whose expectations never differ by profile would pass every check
  // above while pinning nothing about the handled-delimiter set - the parameter
  // the whole function turns on.
  const differs = corpus.cases.filter(
    (c) => new Set(Object.values(c.expected)).size > 1,
  )
  assert.ok(differs.length >= 5, `only ${differs.length} cases distinguish the profiles`)
})
