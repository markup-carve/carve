import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/*
 * EVERY CORPUS CASE THE GRAMMAR CITES MUST EXIST.
 *
 * The grammar backs its clauses with sentences like "Pinned by corpus
 * 81-paragraph-interruption-20". That citation is the reader's route from a
 * rule to the case that proves it, and nothing checked that the route led
 * anywhere.
 *
 * It had rotted. The corpus categories were renumbered more than once, and 21
 * citations were left pointing at their old numbers. That is worse than a dead
 * link in the cases where the old number is still IN USE by something else:
 * the grammar said "corpus 97-table-cell-attributes" while 97 had become
 * `boolean-attributes`, so a reader following it landed on a real case that
 * proves a different rule.
 *
 * A citation is satisfied by an exact case OR by a category - "corpus
 * 41-line-blocks" is answered by `41-line-blocks.crv` or by
 * `41-line-blocks-2.crv`, since categories are numbered per family and the
 * grammar cites the family when any member will do.
 *
 * THE CONVERTER CORPUS IS A SECOND DESTINATION, and citations to it were
 * unroutable rather than unchecked: "converter corpus NN-slug" matched the
 * pattern below and then looked for a `.crv` in tests/corpus, where a
 * converter case never lives. So the only way to cite one was to phrase it so
 * the checker could not see it, which is the same as not checking it. A
 * citation carrying the word CONVERTER resolves against the case directories
 * in tests/corpus-convert instead (carve#1514).
 */

const here = dirname(fileURLToPath(import.meta.url))
const grammar = readFileSync(resolve(here, '../resources/grammar.ebnf'), 'utf8')
const cases = readdirSync(resolve(here, 'corpus'))
  .filter((f) => f.endsWith('.crv'))
  .map((f) => f.slice(0, -4))
const convertCases = readdirSync(resolve(here, 'corpus-convert'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

/**
 * Every `corpus NNN-slug` the grammar names, de-duplicated, each tagged with
 * the corpus it belongs to. `converter corpus 33-x` is the converter corpus;
 * everything else is the conformance corpus.
 */
function citations() {
  const found = grammar.match(/([Cc]onverter\s+)?corpus\s+\d+-[a-z0-9-]+/g) ?? []
  const seen = new Map()
  for (const m of found) {
    const converter = /^[Cc]onverter/.test(m)
    const cite = m.replace(/^([Cc]onverter\s+)?corpus\s+/, '')
    // Keyed by DESTINATION as well as slug. The two corpora number
    // independently, so one slug can name a real case in each, and a map keyed
    // by the slug alone would let the later citation overwrite the earlier
    // one's destination - checking one route and silently passing the other.
    seen.set(`${converter ? 'converter' : 'core'}|${cite}`, { cite, converter })
  }
  return [...seen.values()]
}

const resolvesTo = ({ cite, converter }) =>
  (converter ? convertCases : cases).some((c) => c === cite || c.startsWith(`${cite}-`))

test('every corpus case the grammar cites exists', () => {
  const cited = citations()
  // A count floor, so a regex that stops matching cannot pass this file by
  // finding nothing. The grammar carried 37 citations when this was written.
  assert.ok(
    cited.length >= 30,
    `only ${cited.length} citations matched; the pattern probably stopped matching rather than the grammar losing them`,
  )
  const missing = cited.filter((c) => !resolvesTo(c)).map(({ cite, converter }) => (converter ? `converter ${cite}` : cite))
  assert.deepEqual(
    missing,
    [],
    `the grammar cites corpus cases that do not exist:\n  ${missing.join('\n  ')}\n` +
      'A renumbered category leaves the old number pointing at whatever now holds it, ' +
      'so this is a wrong route rather than only a broken one.',
  )
})
