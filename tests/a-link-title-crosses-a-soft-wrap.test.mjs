/*
 * A LINK TITLE CROSSES A SOFT WRAP AND AN ATTRIBUTE VALUE DOES NOT (carve#2566).
 *
 * `link_title` subtracts the closing quote alone and `character` is any
 * Unicode character, so a newline sits inside the run. `quoted_value`
 * subtracts `newline` and CARVE-P4-006 says so. Two productions, two answers.
 *
 * resources/carve-core.ohm spelled both through ONE pair of helpers, `quoted`
 * and `squoted`, whose `qChar`/`sqChar` carried the attribute rule's
 * `~newline`. Two callers, `destTitle` and `attrVal`, so the narrower slot
 * decided the wider one and a wrapped title declined - while carve-js,
 * carve-php and carve-rs all read it. The fork is now two named pairs, and
 * this file is what keeps them apart: a later edit that points `destTitle`
 * back at `quoted`, or drops `~newline` from `qChar`, fails here.
 *
 * THE MUTATION CONTROL IS THE POINT. A behavioral assertion alone passes for
 * an ohm file that has stopped being consulted, which is the carve#916 shape.
 * So the last test puts `~newline` BACK into the title class, in memory, and
 * asserts the wrapped title stops matching. A check that cannot fail states
 * nothing.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ohm from 'ohm-js'
import { carveToHtml } from '@markup-carve/carve'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const ebnf = readFileSync(resolve(repo, 'resources/grammar.ebnf'), 'utf8')
const ohmSource = readFileSync(resolve(repo, 'resources/carve-core.ohm'), 'utf8')

const ohmRule = (name) => {
  const m = ohmSource.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))
  assert.ok(m, `resources/carve-core.ohm declares no rule \`${name}\``)
  return m[1].trim()
}

test('the normative productions disagree about the newline, on purpose', () => {
  // `link_title` subtracts the quote and nothing else. Read the whole
  // production, both quote forms, so a later narrowing cannot hide in the
  // alternative this file does not quote.
  const title = ebnf.match(/^link_title = ([\s\S]*?);$/m)
  assert.ok(title, 'resources/grammar.ebnf declares no `link_title`')
  assert.match(title[1], /character - '"'/)
  assert.match(title[1], /character - "'"/)
  assert.doesNotMatch(title[1], /newline/)

  const value = ebnf.match(/^quoted_value = ([\s\S]*?);$/m)
  assert.ok(value, 'resources/grammar.ebnf declares no `quoted_value`')
  assert.match(value[1], /character - '"' - '\\' - newline/)
  assert.match(value[1], /character - "'" - '\\' - newline/)
  assert.match(ebnf, /A QUOTED VALUE STOPS AT THE NEWLINE -- NORMATIVE \[CARVE-P4-006]/)

  // `character` is the whole repertoire, which is what puts the newline inside
  // the title run rather than merely absent from its exclusions.
  assert.match(ebnf, /^character = \(\* any Unicode character \*\) ;$/m)
})

test('the ohm grammar forks the two slots and keeps the newline on one side', () => {
  // The two callers reach two different pairs. Either line changing to the
  // other pair is the defect carve#2566 reported.
  assert.equal(ohmRule('destTitle'), 'titleSp (titleQuoted | titleSquoted)')
  assert.equal(ohmRule('attrVal'), 'quoted | squoted | bareVal')

  // A title admits the newline; an attribute value subtracts it.
  assert.doesNotMatch(ohmRule('titleQChar'), /~newline/)
  assert.doesNotMatch(ohmRule('titleSqChar'), /~newline/)
  assert.match(ohmRule('qChar'), /~newline/)
  assert.match(ohmRule('sqChar'), /~newline/)

  // The character rules keep separate newline bounds and share escapes.
  assert.match(ohmRule('titleQChar'), /^titleQEsc \|/)
  assert.match(ohmRule('titleSqChar'), /^titleSqEsc \|/)
  assert.equal(ohmRule('titleQEsc'), ohmRule('qEsc'))
  assert.equal(ohmRule('titleSqEsc'), ohmRule('sqEsc'))
  assert.equal(ohmRule('qEsc'), '"\\\\" punctChar')
  assert.equal(ohmRule('sqEsc'), '"\\\\" punctChar')
})

// Every row the corpus pins for this rule, read back through the oracle AND
// the pinned engine. The attribute-value row is the control: it is the slot
// that must NOT have moved.
const CASES = [
  ['a wrapped title', '[a](/u "t\nu")\n', '<p><a href="/u" title="t\nu">a</a></p>'],
  ['a wrapped single-quoted title', "[a](/u 't\nu')\n", '<p><a href="/u" title="t\nu">a</a></p>'],
  ['a wrapped image title', '![a](/i "t\nu")\n', '<img src="/i" alt="a" title="t\nu">'],
  ['an escaped quote inside a wrapped title', '[a](/u "t\\"\nu")\n', '<p><a href="/u" title="t&quot;\nu">a</a></p>'],
  ['an attribute value still stops at the newline', '[a]{k="t\nu"}\n', '<p>[a]{k=\u201ct\nu\u201d}</p>'],
  ['a blank line ends the paragraph and the title with it', '[a](/u "t\n\nu")\n', '<p>[a](/u \u201ct</p>\n<p>u\u201d)</p>'],
]

for (const [name, src, want] of CASES) {
  test(`oracle: ${name}`, () => {
    assert.equal(renderDoc(parse(src)).trim(), want)
  })
  test(`pinned engine: ${name}`, () => {
    assert.equal(carveToHtml(src).trim(), want)
  })
}

test('putting the newline back into the title class stops the match', () => {
  const restored = ohmSource
    .replace(/^(\s*titleQChar\s*=\s*titleQEsc \| \(~"\\""\s*)(any\))$/m, '$1~newline $2')
    .replace(/^(\s*titleSqChar\s*=\s*titleSqEsc \| \(~"'"\s*)(any\))$/m, '$1~newline $2')
  assert.notEqual(restored, ohmSource, 'the mutation matched nothing - this control is dead')

  const mutated = ohm.grammar(restored)
  const live = ohm.grammar(ohmSource)

  // `inlines` is the wrong rule to assert on: a declining title degrades to
  // literal text, so the whole run matches either way and the difference is
  // invisible there. The title slot itself is where the two answers differ.
  for (const slot of [' "t\nu"', " 't\nu'"]) {
    assert.ok(live.match(slot, 'destTitle').succeeded(), `the live grammar reads ${JSON.stringify(slot)}`)
    assert.ok(mutated.match(slot, 'destTitle').failed(), `the mutant must refuse ${JSON.stringify(slot)}`)
  }

  // The single-line spelling is what both answers share, so a mutant that
  // refuses every title would pass the two lines above and say nothing.
  assert.ok(mutated.match(' "t u"', 'destTitle').succeeded())
})
