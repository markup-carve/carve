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
 * PIN LAG IS DECLARED, never tolerated - the same rule as
 * resources/engine-pin-drift.txt and the PIN_LAG string in
 * tests/a-default-marker-is-not-recorded.test.mjs, and it fails in BOTH
 * directions. No engine has shipped the clause; when one does, the assertions
 * below go red and the declaration goes out with the pin bump.
 *
 * NO OPTION SPELLING IS PROBED. Whether the mode is a CLI flag, an API option
 * or both is not ruled, so these cases assert what the pinned build CANNOT
 * produce by any means rather than naming a parameter the clause does not fix.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carveToMarkdown, migrateMarkdown } from '@markup-carve/carve'

// Declared lag against the `@markup-carve/carve` build package.json pins.
// EMPTY IS THE GOAL: it goes out in the commit that moves the pin past the
// first engine to ship CARVE-P11-063 (markup-carve/carve#2810).
const PIN_LAG = 'carve#2810  just landed: no engine writes or reads the carrier comment yet'

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
    carrier: '<!-- carve: ::: note -->\nAn admonition body.\n<!-- carve: ::: -->\n',
  },
  {
    name: 'a named div, which drops its name AND its attributes',
    carve: '::: wrapper {.fancy}\nA generic div.\n:::\n',
    carrier: '<!-- carve: ::: wrapper {.fancy} -->\nA generic div.\n<!-- carve: ::: -->\n',
  },
  {
    // THE ESCAPE, which is the only spelling in the payload that is not
    // Carve source read back verbatim.
    name: 'a payload carrying `-->`',
    carve: '::: wrapper {title="a --> b"}\nBody.\n:::\n',
    carrier: '<!-- carve: ::: wrapper {title="a --\\> b"} -->\nBody.\n<!-- carve: ::: -->\n',
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
  // The control. Not guarded by PIN_LAG: it has to hold on every build.
  assert.equal(carveToMarkdown(CARRIED[0].carve), '**Overview**\n\nFirst panel.\n\n**Install**\n\nSecond panel.\n')
  assert.equal(carveToMarkdown(CARRIED[1].carve), 'An admonition body.\n')
  assert.equal(carveToMarkdown(CARRIED[2].carve), 'A generic div.\n')
})

test('a document with no element-less container gains no comment either way', () => {
  const plain = '# Head\n\nA paragraph with *bold* text.\n\n- one\n- two\n'
  const out = carveToMarkdown(plain)
  assert.ok(!out.includes('<!-- carve:'), 'a document with nothing to carry gained a marker')
  assert.equal(out, '# Head\n\nA paragraph with **bold** text.\n\n- one\n- two\n')
})

for (const { name, carve, carrier } of CARRIED) {
  test(`the carrier mode brackets ${name}`, () => {
    if (PIN_LAG) {
      // Red proof: today's output holds no marker at all, so the bytes the
      // clause requires are not reachable on this build by any option.
      assert.ok(
        !carveToMarkdown(carve).includes('<!-- carve:'),
        `pin lag is declared and the engine now writes a marker - delete PIN_LAG: ${PIN_LAG}`,
      )
      return
    }
    assert.equal(carveToMarkdown(carve, { carrier: true }), carrier)
  })

  test(`the carrier mode round-trips ${name}`, () => {
    if (PIN_LAG) {
      // The import half: the markers come back as raw HTML blocks, not as the
      // container they name.
      const { value } = migrateMarkdown(carrier)
      assert.match(
        value,
        /```=html/,
        `pin lag is declared and the import now reads the marker - delete PIN_LAG: ${PIN_LAG}`,
      )
      return
    }
    assert.equal(migrateMarkdown(carrier).value, carve)
  })
}

for (const [shape, source] of Object.entries(DAMAGED)) {
  test(`${shape} imports as plain Markdown plus one diagnostic, never a guess`, () => {
    const { report } = migrateMarkdown(source)
    const damaged = report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged')
    if (PIN_LAG) {
      assert.equal(
        damaged.length,
        0,
        `pin lag is declared and the engine now reports the damage - delete PIN_LAG: ${PIN_LAG}`,
      )
      return
    }
    assert.equal(damaged.length, 1, 'a damaged marker set owes exactly one diagnostic')
    assert.equal(damaged[0].fidelity, 'degraded')
    assert.equal(damaged[0].confidence, 'fallback')
  })
}
