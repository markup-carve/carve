/*
 * PART 9 §17 L7's WRITER half: the decision procedure, not just the criterion
 * (markup-carve/carve-rs#1305).
 *
 * L7 said the canonical writer emits `{loose}` "only where the blank-line
 * spelling cannot" say it, which is a criterion over a decision nobody wrote
 * down - so every engine gets to pick one, and there is an obvious wrong pick.
 * carve-rs implemented the writer half, measured it, and backed it out: keying
 * on the ITEM COUNT rewrites corpus `05-lists-11`, a one-item ordered list whose
 * ITEM holds two paragraphs. It is already loose on the page, the blank line
 * spelled it, and decorating it breaks `parse(fmt(x)) == parse(x)` on a document
 * that was never lossy.
 *
 * WHY THE EXISTING GATES CANNOT SEE THIS, which is the whole reason it needs a
 * file of its own. The key is a documented NO-OP on a container the blank lines
 * already loosened, so:
 *
 *   - `toHtml(fmt(x)) == toHtml(x)` HOLDS under the wrong writer - the HTML is
 *     byte-identical with the key and without it.
 *   - `fmt(fmt(x)) == fmt(x)` holds too - the wrong writer settles immediately.
 *
 * Those are the two properties tests/corpus-fmt-roundtrip.test.mjs checks over
 * the whole corpus. The only thing that can see the difference is a BYTE
 * expectation, which is what the `.fmt` sidecars beside corpus 408 and 408-2
 * are, and what this file explains and keeps honest.
 *
 * THE ASSERTIONS ARE ABOUT THE TWO CANDIDATE PROCEDURES, not about the answer.
 * A test that only asserted "the one-item document keeps no key" would pass
 * under a writer that emits no key anywhere, which is the other wrong
 * implementation. So the two procedures are both computed here and shown to
 * disagree, which is what makes the clause's counterexample load-bearing rather
 * than decorative.
 *
 * AND THE COUNT IS WRONG IN BOTH DIRECTIONS, which writing this file is what
 * found. It ADDS a key to the one-item list that already spells its looseness,
 * and it OMITS the key from a definition list, whose entries it counts as two
 * or more and whose looseness a blank line cannot spell at any entry count.
 * Either failure alone would be enough; the pair is why the count is not a
 * shortcut to be repaired but a different rule.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const corpusDir = resolve(here, 'corpus')

/*
 * Resolved by SLUG rather than written with its number. Corpus numbering is
 * append-only so `407-` and `408-` are stable today, but a hardcoded number
 * turns a renumber into a confusing failure in a file about something else -
 * and the slug is what names the subject.
 */
const numbered = (() => {
  const bySlug = new Map()
  for (const name of readdirSync(corpusDir)) {
    const m = /^(\d+)-(.*)\.crv$/.exec(name)
    if (m) bySlug.set(m[2], `${m[1]}-${m[2]}`)
  }
  return (slug) => {
    const found = bySlug.get(slug)
    assert.ok(found, `no corpus document named ${slug}`)
    return found
  }
})()
const corpus = (slug, ext = 'crv') => readFileSync(resolve(corpusDir, `${numbered(slug)}.${ext}`), 'utf8')

const L7 = 'one-consumed-boolean-spells-the-looseness-no-blank-line-can'
const WRITER = 'the-writer-spells-looseness-only-where-a-blank-line-cannot'

/** The one loose container at the top of a document, as the oracle reads it. */
const container = (source) => {
  const blocks = parse(source).blocks.filter((block) => block && block.items)
  assert.equal(blocks.length, 1, `expected exactly one container in ${JSON.stringify(source)}`)
  return blocks[0]
}

/** Loose under either field: a list carries `tight`, a definition list `loose`. */
const isLoose = (node) => node.tight === false || node.loose === true

/*
 * THE RULE, as L7 now states it: write the body without the key, read it back,
 * and emit the key only where the looseness did not survive the trip. The
 * corpus documents already carry the key or not, so the body is what is left
 * after dropping a leading `{loose}` line.
 */
const bodyOf = (source) => source.replace(/^\{loose\}\n/, '')
const reParseSaysWriteTheKey = (source) => isLoose(container(source)) && !isLoose(container(bodyOf(source)))

/** The wrong procedure carve-rs measured and backed out. */
const itemCountSaysWriteTheKey = (source) => {
  const node = container(source)
  return isLoose(node) && node.items.length < 2
}

test('every document in the two L7 families is loose, so the question applies to all of them', () => {
  for (const slug of [L7, `${L7}-2`, WRITER, `${WRITER}-2`]) {
    assert.ok(isLoose(container(corpus(slug))), `${slug} is not loose, so it says nothing about L7`)
  }
})

test('the re-parse test predicts which documents carry the key', () => {
  for (const slug of [L7, `${L7}-2`, WRITER, `${WRITER}-2`]) {
    const source = corpus(slug)
    assert.equal(
      reParseSaysWriteTheKey(source),
      source.startsWith('{loose}\n'),
      `${slug}: the re-parse test disagrees with the source the corpus records. ` +
        `PART 9 section 17 L7, "THE TEST IS A RE-PARSE".`,
    )
  }
})

test('the item-count test disagrees, and it fails in both directions', () => {
  const disagree = [L7, `${L7}-2`, WRITER, `${WRITER}-2`].filter(
    (slug) => itemCountSaysWriteTheKey(corpus(slug)) !== reParseSaysWriteTheKey(corpus(slug)),
  )
  assert.deepEqual(
    disagree.sort(),
    [`${L7}-2`, `${WRITER}-2`].sort(),
    'the two candidate procedures no longer disagree where they did, so this family ' +
      'has stopped discriminating between them',
  )

  // ADDS a key: a one-item list whose blank line sits inside the item is already
  // loose, and the count cannot see that.
  assert.equal(itemCountSaysWriteTheKey(corpus(`${WRITER}-2`)), true)
  assert.equal(reParseSaysWriteTheKey(corpus(`${WRITER}-2`)), false)

  // OMITS a key: a definition list's entries count as two or more, and a blank
  // line between entries does not loosen a <dl> at any count.
  assert.equal(itemCountSaysWriteTheKey(corpus(`${L7}-2`)), false)
  assert.equal(reParseSaysWriteTheKey(corpus(`${L7}-2`)), true)
})

test('05-lists-11 is tight now that its over-indented quote is structural', () => {
  const source = readFileSync(resolve(corpusDir, '05-lists-11.crv'), 'utf8')
  const node = container(source)
  assert.equal(isLoose(node), false)
  assert.equal(node.items.length, 1)
  assert.equal(itemCountSaysWriteTheKey(source), false)
  assert.equal(reParseSaysWriteTheKey(source), false)
})

/*
 * THE BYTE EXPECTATION IS WHAT ENFORCES ANY OF THIS, so its presence is asserted
 * rather than assumed - a `.fmt` sidecar that quietly went missing would take
 * the only check on the writer with it, and every property above would still
 * pass.
 */
test('both writer-half documents keep a .fmt sidecar, and neither carries the key', () => {
  for (const slug of [WRITER, `${WRITER}-2`]) {
    const path = resolve(corpusDir, `${numbered(slug)}.fmt`)
    assert.ok(existsSync(path), `${slug} has no .fmt sidecar, so nothing pins what the writer emits`)
    const written = readFileSync(path, 'utf8')
    assert.ok(!written.includes('{loose}'), `${slug}.fmt carries the key on a container that already spells it`)
    // Faithful, not merely key-free: the sidecar has to say what the case says.
    assert.equal(renderDoc(parse(written)), renderDoc(parse(corpus(slug))))
  }
})

/*
 * THE DEFINITION LIST IS UNCONDITIONAL, and it is a different answer reached by
 * the same test rather than a carve-out. `definition_list.loose` is published
 * only where the looseness was SPELLED (PART 12 §8), so a body written without
 * the key can never read back with the field set - including the one shape that
 * looks like it should be exempt, a description already holding two blocks,
 * where the key is redundant in the RENDER and not in the tree.
 */
test('a definition list always needs the key, two-block description included', () => {
  const twoBlocks = ':: T\n:  D\n\n   E\n'
  assert.equal(renderDoc(parse(twoBlocks)), renderDoc(parse(`{loose}\n${twoBlocks}`)), 'the render is the same')
  assert.equal(container(twoBlocks).loose, undefined, 'the derivation does not set the spelled field')
  assert.equal(reParseSaysWriteTheKey(`{loose}\n${twoBlocks}`), true, 'so the tree differs and the key is written')
})
