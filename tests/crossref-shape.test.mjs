/*
 * A crossref publishes the authored construct and its resolution (PART 12 §3a).
 *
 * The rule was written into the grammar with nothing enforcing it (carve#614),
 * because the reference build was one of the engines that had it wrong: a
 * resolved crossref was a `link`, an unresolved one was not a node at all.
 * carve-js#605 fixed that, and this is the check that keeps it fixed - the
 * clause and the pin now say the same thing, and a regression in either fails
 * here rather than being noticed by someone reading both.
 *
 * The OTHER two engines are checked by `npm run ast:check`, which diffs their
 * trees against this build. What that cannot catch is this build drifting,
 * which is what this file is for.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToAstJson } from '@markup-carve/carve'

const inlines = (source) => {
  const paragraphs = carveToAstJson(source).children.filter((n) => n.type === 'paragraph')
  return paragraphs.at(-1)?.children ?? []
}

test('a resolved crossref keeps the authored id and publishes the destination', () => {
  const [, ref] = inlines('# Intro\n\nSee </#intro>.\n')
  assert.equal(ref.type, 'heading_ref')
  assert.equal(ref.target, 'intro')
  assert.equal(ref.href, '#Intro')
})

test('the authored id is the spelling written, not the id resolved to', () => {
  // Ids resolve case-insensitively, so `href` cannot carry this distinction
  // and a tree without `target` cannot be written back as authored.
  const [, lower] = inlines('# Intro\n\nSee </#intro>.\n')
  const [, upper] = inlines('# Intro\n\nSee </#Intro>.\n')
  assert.equal(lower.href, upper.href)
  assert.notEqual(lower.target, upper.target)
})

test('an unresolved crossref is still a node', () => {
  // Flattening it to text discards the fact that the author wrote a reference,
  // and gives the same document two node counts across engines - §3a's reason
  // for the same rule on `[a][]`.
  const kids = inlines('See </#Nope>.\n')
  assert.deepEqual(
    kids.map((n) => n.type),
    ['text', 'heading_ref', 'text'],
  )
  assert.equal(kids[1].href, undefined)
})

test('the display text is not on the wire', () => {
  // §3a: the heading is in the same document. Copying its inline content into
  // every reference is unbounded where `href` is fixed-size.
  const [, ref] = inlines('# Intro\n\nSee </#intro>.\n')
  assert.equal(ref.children, undefined)
  assert.equal(ref.resolvedText, undefined)
})

test('a crossref inside a link label stays in the tree', () => {
  // "Links never nest" is a rendering rule and must not be paid for out of the
  // tree: dropping the node here would publish `[see H](/outer)` for
  // `[see </#H>](/outer)`.
  const [link] = inlines('# H\n\n[see </#H>](/outer)\n')
  assert.equal(link.type, 'link')
  assert.deepEqual(
    link.children.map((c) => c.type),
    ['text', 'heading_ref'],
  )
  assert.equal(link.children[1].href, '#H')
})
