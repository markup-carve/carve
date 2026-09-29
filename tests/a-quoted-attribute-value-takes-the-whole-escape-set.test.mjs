/*
 * carve#2581. Two places where resources/carve-core.ohm admitted or produced
 * something its normative production does not.
 *
 * `quoted_value` reads `escaped_char`, a backslash plus ASCII punctuation. The
 * ohm's `qEsc`/`sqEsc` handled the closing quote alone, and both readers in
 * render.mjs then stripped a leading backslash from every character node - two
 * errors that cancel only on the shapes the corpus happened to hold. So
 * `{k="a\}b"}` kept a backslash the production resolves and `{k='a\b'}` lost
 * one it keeps, while all three engines read the production. The escape now
 * forks the way the newline forked in carve#2566: the title pair keeps the
 * closing quote, the value pair takes `punctChar`.
 *
 * The second was the tab in `link_title`'s padding slot. The production says
 * `space`, the ohm says `space`, and the ohm's note said the three engines
 * accept a tab and diverge. They do not, measured at carve-js e5ff631b0,
 * carve-php 650e65499 and carve-rs b4c4f5a08: each renders the line as prose.
 * Nothing moved there; corpus 527 pins the agreement and the note now records
 * the measurement instead of the claim.
 *
 * THE MUTATION CONTROL IS THE POINT. A behavioral assertion alone passes for an
 * ohm file nothing consults. So the last test narrows `qEsc` back to the quote
 * in memory and asserts the escaped brace stops parsing as one node.
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

test('the production puts the whole escape set in a quoted value', () => {
  const value = ebnf.match(/^quoted_value = ([\s\S]*?);$/m)
  assert.ok(value, 'resources/grammar.ebnf declares no `quoted_value`')
  assert.match(value[1], /escaped_char/)
  assert.match(ebnf, /^escaped_char = '\\', ascii_punctuation ;$/m)

  // The title's escape is the closing quote alone, which is what the two slots
  // disagree about.
  const title = ebnf.match(/^link_title = ([\s\S]*?);$/m)
  assert.ok(title, 'resources/grammar.ebnf declares no `link_title`')
  assert.doesNotMatch(title[1], /escaped_char/)
  assert.match(title[1], /\('\\', '"'\)/)
})

test('the ohm grammar spells the two escape sets apart', () => {
  assert.equal(ohmRule('qEsc'), '"\\\\" punctChar')
  assert.equal(ohmRule('sqEsc'), '"\\\\" punctChar')
  assert.equal(ohmRule('titleQEsc'), '"\\\\" "\\""')
  assert.equal(ohmRule('titleSqEsc'), '"\\\\" "\'"')

  // `punctChar` is `ascii_punctuation`, so the value slot and the production
  // name the same set rather than two lists that drift.
  const punct = ohmSource.match(/^\s*punctChar\s*=\s*([\s\S]*?)\n\s*\/\//m)
  assert.ok(punct, 'resources/carve-core.ohm declares no `punctChar`')
  const chars = [...punct[1].matchAll(/"((?:\\.|[^"])*)"/g)].map((m) => m[1].replace(/\\(.)/g, '$1'))
  const spec = ebnf.match(/^ascii_punctuation = ([\s\S]*?);$/m)
  assert.ok(spec, 'resources/grammar.ebnf declares no `ascii_punctuation`')
  const wanted = [...spec[1].matchAll(/'(\\|[^'])'|"([^"])"/g)].map((m) => m[1] ?? m[2])
  assert.deepEqual(new Set(chars), new Set(wanted))
})

test('the tab stays out of the title padding slot', () => {
  assert.equal(ohmRule('titleSp'), '" "')
  const title = ebnf.match(/^link_title = ([\s\S]*?);$/m)
  assert.match(title[1], /^space,/)
  // The note under `destTitle` used to claim the engines accept a tab here.
  assert.doesNotMatch(ohmSource, /The three engines accept a tab here/)
})

// Every row corpus 526 and 527 pin, read back through the oracle AND the pinned
// engine. The last two are the controls the fork must not have moved.
const CASES = [
  ['an escaped brace', '[x]{k="a\\}b"}\n', '<p><span k="a}b">x</span></p>'],
  ['an escaped brace, single-quoted', "[x]{k='a\\}b'}\n", '<p><span k="a}b">x</span></p>'],
  ['an escaped backslash', '[x]{k="a\\\\b"}\n', '<p><span k="a\\b">x</span></p>'],
  ['an escaped backslash, single-quoted', "[x]{k='a\\\\b'}\n", '<p><span k="a\\b">x</span></p>'],
  ['the other quote glyph escaped', '[x]{k="a\\\'b"}\n', '<p><span k="a&apos;b">x</span></p>'],
  ['an escaped pipe', '[x]{title="a\\|b"}\n', '<p><span title="a|b">x</span></p>'],
  ['a block attribute line reads the same value', '{k="a\\}b"}\np\n', '<p k="a}b">p</p>'],
  ['a tab-padded title is prose', '[a](/u\t"t")\n', '<p>[a](/u\t“t”)</p>'],
  ['a tab-padded image title is prose', '![a](/i\t"t")\n', '<p>![a](/i\t“t”)</p>'],
  ['a single space still opens the title', '[a](/u "t")\n', '<p><a href="/u" title="t">a</a></p>'],
  ['an escaped closing quote is unchanged', '[x]{title="a\\"b"}\n', '<p><span title="a&quot;b">x</span></p>'],
  ['a title escapes its own quote and nothing widens', '[a](/u "t\\"u")\n', '<p><a href="/u" title="t&quot;u">a</a></p>'],
]

for (const [name, src, want] of CASES) {
  test(`oracle: ${name}`, () => {
    assert.equal(renderDoc(parse(src)).trim(), want)
  })
  test(`pinned engine: ${name}`, () => {
    assert.equal(carveToHtml(src).trim(), want)
  })
}

test('a backslash before a non-punctuation character is itself', () => {
  // All four readers keep it. The production admits no bare backslash in a
  // quoted value at all, so it would refuse the whole value and leave the line
  // literal - a narrower reading than any engine takes. That disagreement is
  // recorded rather than settled here; this asserts only what the readers do,
  // so a change of answer shows up as a failure and not as silence.
  assert.equal(renderDoc(parse('[x]{k="a\\zb"}\n')).trim(), '<p><span k="a\\zb">x</span></p>')
  assert.equal(carveToHtml('[x]{k="a\\zb"}\n').trim(), '<p><span k="a\\zb">x</span></p>')
  assert.equal(renderDoc(parse("[x]{k='a\\zb'}\n")).trim(), '<p><span k="a\\zb">x</span></p>')
  assert.equal(carveToHtml("[x]{k='a\\zb'}\n").trim(), '<p><span k="a\\zb">x</span></p>')
})

test('narrowing the value escape back to the quote stops the escape parsing', () => {
  const narrowed = ohmSource
    .replace(/^(\s*qEsc\s*=\s*"\\\\") punctChar$/m, '$1 "\\""')
    .replace(/^(\s*sqEsc\s*=\s*"\\\\") punctChar$/m, '$1 "\'"')
  assert.notEqual(narrowed, ohmSource, 'the mutation matched nothing - this control is dead')

  const mutant = ohm.grammar(narrowed)
  const live = ohm.grammar(ohmSource)

  // `quoted` matches either way, because the fallback character class accepts a
  // backslash. What differs is the PARSE: one `qEsc` node against two ordinary
  // ones, which is what decides the value. So assert on the rule the escape is.
  for (const [g, ok] of [[live, true], [mutant, false]]) {
    assert.equal(g.match('\\}', 'qEsc').succeeded(), ok)
    assert.equal(g.match("\\}", 'sqEsc').succeeded(), ok)
  }

  // The closing-quote spelling is what both answers share, so a mutant that
  // refuses every escape would pass the lines above and say nothing.
  assert.ok(mutant.match('\\"', 'qEsc').succeeded())
  assert.ok(live.match('\\"', 'qEsc').succeeded())
})
