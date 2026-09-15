/*
 * WHERE DOES `{{ … }}` END? PART 6's closer clause (carve#2000, merged as
 * #2013) rules it: the first `}}` OUTSIDE any quoted run, so a quoted include
 * path and a quoted option value MAY both contain the pair, and an unterminated
 * quote opens no run at all.
 *
 * Nothing could observe that. The core never reaches `include_directive`, so
 * with no resolver both readings render the same inline text and a
 * `resources/examples` pair would pin the rendering of two strings rather than
 * the closer - the check-that-cannot-fail class of carve#755. The one corpus
 * that CAN see a closer, tests/include-conformance, takes its goldens from a
 * built carve-js, and carve-js reads the closer the other way today
 * (carve-js#1698, carve-php#1964, carve-rs#1607), so generating a golden now
 * would bake in the reading the ruling overturned.
 *
 * So the arbiter is the engine-free oracle, which is what the goldens lost:
 * scripts/spec/include-directive.mjs recognizes the directive and nothing else.
 * The two inputs below are READ OUT OF the normative clause rather than copied,
 * so an example that moves in the grammar moves the test with it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findCloser, scanDirective, findDirectives } from '../scripts/spec/include-directive.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const clause = readFileSync(resolve(repo, 'resources/spec/10-includes.ebnf'), 'utf8')

/* The clause's own worked examples, in the order it writes them. */
const examples = clause
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('{{ ') && line.endsWith('}} end'))

test('the clause still carries both worked spellings', () => {
  // If this goes red the examples were edited; read the clause before touching
  // anything below, because the expectations are about THOSE two strings.
  assert.deepEqual(examples, [
    '{{ "a }} more" @k:v }} end',
    '{{ ch.crv @label:"a }} more" }} end',
  ])
})

test('a quoted PATH may hold the pair, and the directive closes after the quote', () => {
  const source = examples[0]
  const directive = scanDirective(source, 0)
  assert.ok(directive, `no directive recognized in ${source}`)
  assert.equal(directive.path, 'a }} more')
  assert.equal(directive.quoted, true)
  assert.deepEqual(directive.options, [['k', 'v']])
  // The closer is the SECOND pair. Reading the first one ends the directive at
  // index 8 with the path `"a`, which is the divergence the clause settles.
  assert.equal(directive.closer, source.lastIndexOf('}}'))
  assert.equal(source.slice(directive.end), ' end')
})

test('a quoted option VALUE may hold the pair, and the directive closes after the quote', () => {
  const source = examples[1]
  const directive = scanDirective(source, 0)
  assert.ok(directive, `no directive recognized in ${source}`)
  assert.equal(directive.path, 'ch.crv')
  assert.deepEqual(directive.options, [['label', 'a }} more']])
  assert.equal(directive.closer, source.lastIndexOf('}}'))
  assert.equal(source.slice(directive.end), ' end')
})

test('either quote style opens a run in an option value', () => {
  const single = scanDirective("{{ ch.crv @label:'a }} b' }} end", 0)
  assert.deepEqual(single?.options, [['label', 'a }} b']])
  const double = scanDirective('{{ ch.crv @label:"a }} b" }} end', 0)
  assert.deepEqual(double?.options, [['label', 'a }} b']])
})

test('an escaped quote does not end the run, so the pair after it is still inside', () => {
  // The control for the run-end branch: without escape handling the run ends at
  // the inner quote and the `}}` that follows closes the directive early.
  const directive = scanDirective('{{ "a\\" }} b" }} end', 0)
  assert.equal(directive?.path, 'a" }} b')
  assert.equal(directive?.quoted, true)
})

test('an UNTERMINATED quote opens no run, so the first pair is the closer', () => {
  // The other direction: a scanner that let an unterminated quote run to the
  // end of the line would find no closer here at all. The first pair closes,
  // and what it encloses is not an include_directive, so §19 leaves the text
  // literal - which is what `scanDirective` returning null says.
  const source = '{{ "a b }} more }} end'
  assert.equal(findCloser(source, 2), source.indexOf('}}'))
  assert.equal(scanDirective(source, 0), null)
  assert.deepEqual(findDirectives(source), [])
})

test('an unquoted directive is untouched by any of this', () => {
  // THE NAMED CONTROL. No quote, nothing to track, so every reading of the
  // closer agrees here. It must stay green under a mutation that breaks the
  // two rows above, or those rows are measuring something else.
  const source = '{{ ch.crv }} end'
  const directive = scanDirective(source, 0)
  assert.equal(directive?.path, 'ch.crv')
  assert.equal(directive?.closer, source.indexOf('}}'))
  assert.equal(source.slice(directive.end), ' end')

  assert.equal(scanDirective('{{ ch.crv #intro @shift:2 }}', 0)?.section, 'intro')
  assert.equal(scanDirective('{{c.crv}}', 0), null, 'padding is required on both sides')
  assert.equal(scanDirective('{{ c.crv}}', 0), null, 'padding is required on both sides')
})

test('a quoted run does not reach across a line break', () => {
  // `quoted_include_path` and `quoted_value` both exclude the newline, so an
  // opener on one line cannot pair with a quote on the next and swallow it.
  assert.equal(findCloser('{{ "a\nb" }} end', 2), -1)
})
