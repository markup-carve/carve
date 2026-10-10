/*
 * CARVE-P11-063: under the opt-in carrier mode the Markdown target brackets
 * every ELEMENT-LESS CONTAINER with an HTML comment carrying its Carve opener
 * and closer verbatim, so an export and a re-import return the container.
 *
 * WHY A COMMENT AND NOT A LINK REFERENCE DEFINITION is measured in the clause,
 * not here. What is measured here is the gap: a tab set, an admonition and a
 * named div each leave NOTHING in today's Markdown that says a container was
 * present, so the import cannot return one however good it gets.
 *
 * THE TWO CONTROLS ARE THE POINT. "The mode off emits today's bytes" and "a
 * document with no element-less container gains no comment" run live against
 * the pinned build and must pass today, because a carrier that moved the
 * default output would be a breaking change rather than an opt-in mode.
 *
 * THE ASSERTIONS ARE LIVE. All three engines ship the clause, the pin sits
 * past carve-js#2674, and the declared lag that stood in for them is gone.
 *
 * THE OPTION SPELLING IS THE HOST'S, NOT THE CLAUSE'S. §10s says only that
 * the host turns the mode on and that it is off by default, so `carryMarkers`
 * below is the carve-js parameter and not a conformance requirement. An engine
 * that spells it otherwise is still conformant, and this file would need the
 * other spelling to measure it.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToMarkdown, migrateMarkdown } from '@markup-carve/carve'

// The clause's expected bytes, per element-less container. Measured inputs on
// the left, the carrier-mode output the clause requires on the right.
const CARRIED = [
  {
    name: 'a tab set and each of its panels',
    carve: '::: tabs\n:::: tab [Overview]\nFirst panel.\n::::\n\n:::: tab [Install]\nSecond panel.\n::::\n:::\n',
    carrier:
      '<!-- carve: ::: tabs -->\n<!-- carve: :::: tab [Overview] -->\n**Overview**\n\nFirst panel.\n\n<!-- carve: :::: -->\n' +
      '<!-- carve: :::: tab [Install] -->\n**Install**\n\nSecond panel.\n\n<!-- carve: :::: -->\n<!-- carve: ::: -->\n',
  },
  {
    name: 'an admonition, whose KIND is what today drops',
    carve: '::: note\nAn admonition body.\n:::\n',
    carrier: '<!-- carve: ::: note -->\nAn admonition body.\n\n<!-- carve: ::: -->\n',
  },
  {
    // AN ATTRIBUTED CONTAINER'S ATTRIBUTES LIVE ON THE LINE ABOVE, not on the
    // opener: PART 4 is STRICT that "the opener line carries NO inline
    // `{...}` attributes". An opener written `::: wrapper {.fancy}` loses the
    // `{.fancy}` at PARSE time on a conformant engine, so no writer can carry
    // it and no round trip can return it. The attribute line takes a marker
    // of its own.
    name: 'a named div, which drops its name AND the attribute line above it',
    carve: '{.fancy}\n::: wrapper\nA generic div.\n:::\n',
    carrier:
      '<!-- carve: {.fancy} -->\n<!-- carve: ::: wrapper -->\nA generic div.\n\n<!-- carve: ::: -->\n',
  },
  {
    // THE ESCAPE, which is the only spelling in the payload that is not
    // Carve source read back verbatim. It rides the opener's QUOTED HEADER,
    // which PART 4 does admit, rather than an inline attribute it does not.
    name: 'a payload carrying `-->`',
    carve: '::: note "a --> b"\nBody.\n:::\n',
    carrier:
      '<!-- carve: ::: note "a --\\> b" -->\n**a \u2192 b**\n\nBody.\n\n<!-- carve: ::: -->\n',
  },
]

// A damaged marker set imports as plain Markdown plus one diagnostic. Each of
// these started as the admonition case above.
const DAMAGED = {
  'one marker deleted': 'Body.\n<!-- carve: ::: -->\n',
  'two markers reordered': '<!-- carve: ::: -->\nBody.\n<!-- carve: ::: note -->\n',
  'an unbalanced set': '<!-- carve: ::: note -->\n<!-- carve: ::: wrapper -->\nBody.\n<!-- carve: ::: -->\n',
}

test('the mode OFF emits exactly the bytes this target emits today', () => {
  // The control: it has to hold on every build.
  assert.equal(carveToMarkdown(CARRIED[0].carve), '**Overview**\n\nFirst panel.\n\n**Install**\n\nSecond panel.\n')
  assert.equal(carveToMarkdown(CARRIED[1].carve), 'An admonition body.\n')
  assert.equal(carveToMarkdown(CARRIED[2].carve), 'A generic div.\n')
  assert.equal(carveToMarkdown(CARRIED[3].carve), '**a \u2192 b**\n\nBody.\n')
})

test('a document with no element-less container gains no comment either way', () => {
  const plain = '# Head\n\nA paragraph with *bold* text.\n\n- one\n- two\n'
  const out = carveToMarkdown(plain)
  assert.ok(!out.includes('<!-- carve:'), 'a document with nothing to carry gained a marker')
  assert.equal(out, '# Head\n\nA paragraph with **bold** text.\n\n- one\n- two\n')
})

for (const { name, carve, carrier } of CARRIED) {
  test(`the carrier mode round-trips ${name}`, () => {
    assert.equal(carveToMarkdown(carve, { carryMarkers: true }), carrier)
    assert.equal(migrateMarkdown(carrier).value, carve)
  })
}

for (const [shape, source] of Object.entries(DAMAGED)) {
  test(`${shape} imports as plain Markdown plus one diagnostic, never a guess`, () => {
    const { report } = migrateMarkdown(source)
    const damaged = report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged')
    assert.equal(damaged.length, 1, 'a damaged marker set owes exactly one diagnostic')
    assert.equal(damaged[0].fidelity, 'degraded')
    assert.equal(damaged[0].confidence, 'fallback')
  })
}
