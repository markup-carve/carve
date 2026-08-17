/*
 * PART 9 §25 names the attributes whose value is a LIST of URLs, and the whole
 * point of the rule is that a dangerous scheme is caught at a NON-LEADING
 * position. So the set is read FROM THE CLAUSE rather than copied here.
 *
 * The failure this exists for is the one the sibling check
 * (denylist-follows-the-clause) was written for: a normative list that grows in
 * the grammar and nowhere else. Three names are pinned by corpus documents
 * today. A fourth added to the clause would be normative on arrival and
 * exercised by nothing, and the leading-scheme reading it replaces is exactly
 * the kind of thing an implementation reaches for by default - which is how
 * carve#1320 happened in all three engines at once.
 *
 * THE ORACLE IS THE EXECUTABLE SPEC, not an engine build, for the reason
 * tests/corpus.test.mjs gives: the corpus states what the spec requires, and
 * the spec repo proves its own fixtures are self-consistent without waiting for
 * an implementation to ship the rule. Each engine measures itself against the
 * corpus through its own spec submodule, which is where an engine-versus-corpus
 * disagreement belongs.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { shortfall } from '../scripts/spec/participants.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

const render = (src) => renderDoc(parse(src))

const SPELLED = { Two: 2, Three: 3, Four: 4, Five: 5, Six: 6, Seven: 7, Eight: 8, Nine: 9 }

/** The clause's own enumeration sentence, so a name written elsewhere cannot drift in. */
function enumeration() {
  const m = /(\w+) attributes carry a LIST of URLs: (.+?)\./s.exec(grammar)
  assert.ok(m, '§25 no longer enumerates the URL-list attributes in the expected phrasing')

  return { spelled: m[1], names: [...new Set([...m[2].matchAll(/`([a-z-]+)`/g)].map((x) => x[1]))] }
}

const urlListAttrs = () => enumeration().names

/** The value attribute `name` carries in the rendered HTML, or undefined when dropped. */
const valueOf = (html, name) => new RegExp(`${name}="([^"]*)"`).exec(html)?.[1]

test('the clause still parses into a set of names', () => {
  // A floor, because a regex that stopped matching would turn every assertion
  // below into a statement about an empty list, and each of them would pass.
  const { spelled, names } = enumeration()
  const problems = [
    shortfall({ label: '§25 URL-list', actual: names.length, atLeast: 4, of: 'attribute(s)' }),
  ].filter(Boolean)
  assert.deepEqual(problems, [], problems.join('\n'))
  // The sentence counts its own list out loud, and a name appended without
  // touching the count leaves the clause saying two different things.
  assert.equal(
    SPELLED[spelled],
    names.length,
    `§25 says "${spelled} attributes carry a LIST of URLs" and then names ${names.length}: ${names.join(', ')}`,
  )
})

test('every named attribute is probed at a NON-LEADING position', () => {
  const leaked = []
  for (const name of urlListAttrs()) {
    // Space-separated, which is a token boundary under BOTH separator sets, so
    // this case does not depend on which one the attribute gets.
    const html = render(`[x](safe.html){${name}="safe.html javascript:alert(1)"}\n`)
    if (valueOf(html, name) !== '') leaked.push(`${name} -> ${JSON.stringify(valueOf(html, name))}`)
  }
  assert.deepEqual(
    leaked,
    [],
    `§25 requires a token-wise probe on these and the value survived: ${leaked.join(', ')}`,
  )
})

test('every named attribute is pinned by a corpus document', () => {
  // The check above is this file's own; the corpus is what the three engines
  // measure themselves against. A name covered here and nowhere in tests/corpus
  // is normative for the spec repo and invisible to every implementation.
  const corpus = readdirSync(resolve(root, 'tests/corpus'))
    .filter((f) => f.endsWith('.crv'))
    .map((f) => readFileSync(resolve(root, 'tests/corpus', f), 'utf8'))
  // At an identifier boundary, or `imagesrcset=` would report `srcset` as
  // pinned and every dedicated srcset case could be deleted unnoticed.
  const written = (doc, name) => new RegExp(`(^|[^A-Za-z0-9_-])${name}=`).test(doc)
  const unpinned = urlListAttrs().filter((name) => !corpus.some((doc) => written(doc, name)))
  assert.deepEqual(
    unpinned,
    [],
    `§25 names these as URL-list attributes and no corpus document writes one: ${unpinned.join(', ')}`,
  )
})

test('a clean list survives, and so does a colon in prose', () => {
  // The other direction. A rule that blanked everything would satisfy the
  // checks above, and the false-positive cost on prose is what decided the
  // rule's shape in the first place.
  const blocked = []
  for (const name of urlListAttrs()) {
    const value = 'https://example.com/a https://example.com/b'
    const html = render(`[x](safe.html){${name}="${value}"}\n`)
    if (valueOf(html, name) !== value) blocked.push(`${name} -> ${JSON.stringify(valueOf(html, name))}`)
  }
  for (const name of ['title', 'alt', 'aria-label']) {
    const value = 'See: RFC 3986, http://example.com'
    const html = render(`[x](safe.html){${name}="${value}"}\n`)
    if (valueOf(html, name) !== value) blocked.push(`${name} -> ${JSON.stringify(valueOf(html, name))}`)
  }
  assert.deepEqual(blocked, [], `these are not dangerous and the probe took them: ${blocked.join(', ')}`)
})
