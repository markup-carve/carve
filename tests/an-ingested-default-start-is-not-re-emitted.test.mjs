/*
 * PART 12 §22: an ingested value the schema calls absent is normalized away.
 *
 * `resources/ast-schema.json` describes a list's `start` as "First number of an
 * ordered list, when it is not 1". That pins the PRODUCER, and all three
 * engines comply: a parsed tree never carries the value. It says nothing on its
 * own about a CONSUMER handed the field anyway - which an editor, a patch tool
 * or a hand-built payload can do - and the three engines took three different
 * positions there before carve#1615 ruled it.
 *
 * WHY THIS IS A HAND-BUILT PAYLOAD AND NOT A CORPUS DOCUMENT. The value is
 * unreachable from Carve source: `1. a` produces no `start` at all. So no
 * parse-driven corpus document can reach the shape, whatever it is written to
 * assert - which is exactly why the three drifted apart unnoticed. The fixture
 * has to enter through the ingest.
 *
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt and the PIN_LAG map in
 * tests/html-import-contract.check.mjs, and it fails in BOTH directions. The
 * pinned build re-emits the field; when carve-js#1391 lands and the pin moves
 * past it, the declaration below goes red and the line goes out with the bump.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromAstJson, parse, renderHtml, toAstJson } from '@markup-carve/carve'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(resolve(root, 'resources/ast-schema.json'), 'utf8'))
const grammar = readFileSync(resolve(root, 'resources/grammar.ebnf'), 'utf8')

// Declared lag against the `@markup-carve/carve` build package.json pins.
// Delete this in the commit that moves the pin past markup-carve/carve-js#1391.
const PIN_LAG =
  'the encoder re-emits an ingested `start: 1`, so it publishes a tree that ' +
  'does not match the shape resources/ast-schema.json describes ' +
  '(PART 12 §22; markup-carve/carve-js#1391, markup-carve/carve-rs#1293)'

// A one-item ordered list whose `start` spells out the default. Hand-built,
// with no `pos` anywhere: this is the payload an editor hands back, not
// anything a parser produced.
const payloadWithStart = (start) => ({
  type: 'document',
  srcByteLength: 0,
  children: [
    {
      type: 'list',
      ordered: true,
      tight: true,
      delim: '.',
      start,
      items: [
        {
          type: 'list_item',
          children: [{ type: 'paragraph', children: [{ type: 'text', value: 'a' }] }],
        },
      ],
    },
  ],
})

const roundTripped = (start) =>
  toAstJson(fromAstJson(JSON.parse(JSON.stringify(payloadWithStart(start))))).children[0]

test('the schema still describes `start` as written only when it is not 1', () => {
  // The clause rests on this sentence. If the schema is ever reworded, §22 is
  // resting on nothing and this test is measuring a rule that moved.
  assert.match(
    schema.$defs.list.properties.start.description,
    /when it is not 1/,
    'PART 12 §22 quotes this description; rewording it silently unmoors the clause',
  )
})

test('PART 12 §22 is in the grammar', () => {
  assert.match(grammar, /22\. AN INGESTED VALUE THE SCHEMA CALLS ABSENT IS NORMALIZED AWAY/)
})

test('a parsed ordered list never carries `start: 1` (the producer half)', () => {
  // The half every engine already gets right, asserted so a "fix" that reached
  // the parser instead of the encoder cannot pass unnoticed.
  const list = toAstJson(parse('1. a\n')).children[0]
  assert.equal(list.type, 'list')
  assert.equal(list.ordered, true)
  assert.ok(!('start' in list), 'the parser invented a `start` the schema calls absent')
})

test('an ingested `start: 1` is not re-emitted (PART 12 §22)', () => {
  const list = roundTripped(1)
  if (PIN_LAG) {
    // Fails in the other direction too: when the engine stops re-emitting the
    // field, this assertion goes red and the declaration must go out.
    assert.ok(
      'start' in list && list.start === 1,
      `pin lag is declared and the engine no longer has it - delete PIN_LAG: ${PIN_LAG}`,
    )
    return
  }
  assert.ok(
    !('start' in list),
    'the encoder re-emitted a `start` the schema says is written only when it is not 1',
  )
})

test('a non-default `start` survives the round trip unchanged', () => {
  // The control that separates §22 from "drop `start` always". A fix that
  // deletes the field outright breaks here rather than shipping.
  for (const start of [0, 2, 7]) {
    const list = roundTripped(start)
    assert.equal(list.start, start, `an ingested start of ${start} must survive`)
  }
})

test('neither reading changes the rendered HTML, which is what makes it lossless', () => {
  // §22's deciding asymmetry: `start: 1` and no `start` describe the same
  // document. If they ever rendered differently, normalizing would be a loss.
  const withStart = renderHtml(fromAstJson(JSON.parse(JSON.stringify(payloadWithStart(1)))))
  const without = renderHtml(parse('1. a\n'))
  assert.equal(withStart, without)
  assert.ok(!withStart.includes('start='), `the renderer spelled the HTML default: ${withStart}`)
})
