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
 * THE CAPTION ROWS CARRY A DECLARATION OF THEIR OWN, scoped to carve#2851 and
 * not to the clause as a whole. A composite figure's caption line takes a
 * marker of its own; the pinned build ships §10s without it, so those rows are
 * declared while every other row here is live. The declaration fires - see
 * CAPTION_LAG below for the detector and what retires it.
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

// The pin includes the caption carrier rule (carve-js#2684).
const CAPTION_LAG = ''

// A composite figure's caption line, which the marker pair cannot enclose
// because its slot hangs BELOW the closing fence. `live` marks a row the
// pinned build already satisfies, so the declaration does not cover it.
const CAPTIONS = [
  {
    name: "a composite figure's caption line",
    carve: '::: figure\n:::: panel\n![a](x.png)\n::::\n:::\n^ Group caption\n',
    carrier:
      '<!-- carve: ::: figure -->\n<!-- carve: :::: panel -->\n![a](x.png)\n\n'
      + '<!-- carve: :::: -->\n<!-- carve: ::: -->\n<!-- carve: ^ Group caption -->\n'
      + '**Group caption**\n',
  },
  {
    // THE CAPTION'S ESCAPE is the payload escape, nothing new.
    name: 'a caption carrying the comment terminator',
    carve: '::: figure\n:::: panel\n![a](x.png)\n::::\n:::\n^ A --> B\n',
    carrier:
      '<!-- carve: ::: figure -->\n<!-- carve: :::: panel -->\n![a](x.png)\n\n'
      + '<!-- carve: :::: -->\n<!-- carve: ::: -->\n<!-- carve: ^ A --\\> B -->\n'
      + '**A \u2192 B**\n',
  },
  {
    // THE CAPTION TEXT APPEARING AS ORDINARY BODY TEXT TOO must not be
    // consumed: the paragraph the import replaces is the one the marker stands
    // directly above and no other.
    name: 'a caption whose text is also ordinary body text',
    carve: '::: figure\n:::: panel\n![a](x.png)\n::::\n:::\n^ Group caption\n\n*Group caption*\n',
    carrier:
      '<!-- carve: ::: figure -->\n<!-- carve: :::: panel -->\n![a](x.png)\n\n'
      + '<!-- carve: :::: -->\n<!-- carve: ::: -->\n<!-- carve: ^ Group caption -->\n'
      + '**Group caption**\n\n**Group caption**\n',
  },
  {
    // GAINS NOTHING, and it is LIVE: a figure with no caption takes no third
    // marker, which the pinned build already gets right in both directions.
    // It is the control on the writer half - a caption marker appearing where
    // there is no caption would fail here rather than anywhere else.
    name: 'a composite figure with no caption',
    live: true,
    carve: '::: figure\n:::: panel\n![a](x.png)\n::::\n:::\n',
    carrier:
      '<!-- carve: ::: figure -->\n<!-- carve: :::: panel -->\n![a](x.png)\n\n'
      + '<!-- carve: :::: -->\n<!-- carve: ::: -->\n',
  },
]

// A damaged marker set imports as plain Markdown plus one diagnostic. Each of
// these started as the admonition case above.
const DAMAGED = {
  'one marker deleted': 'Body.\n<!-- carve: ::: -->\n',
  'two markers reordered': '<!-- carve: ::: -->\nBody.\n<!-- carve: ::: note -->\n',
  'an unbalanced set': '<!-- carve: ::: note -->\n<!-- carve: ::: wrapper -->\nBody.\n<!-- carve: ::: -->\n',
  // A CAPTION MARKER BELONGS TO THE CONTAINER THE MARKER BEFORE IT CLOSED. One
  // with no closer before it does not balance on ANY build, pinned or current,
  // so it needs no declaration.
  'a caption marker with no closer before it': '<!-- carve: ^ Group caption -->\n**Group caption**\n',
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

for (const { name, carve, carrier, live } of CAPTIONS) {
  test(`the carrier mode round-trips ${name}`, () => {
    if (CAPTION_LAG && live !== true) {
      // THE LIVE DETECTOR IS THE IMPORT HALF, deliberately, and the writer
      // half is NOT asserted under lag. "The output holds no caption marker"
      // would pass forever, because a build that never writes one satisfies it
      // as well as a build that cannot - the dead-check shape this repo keeps
      // finding. The import has no such out: at the pin the caption marker
      // does not balance the set, so the whole set imports as raw HTML with
      // one `carrier-markers-damaged` row. An engine that carries the caption
      // reports NO damage, fails this, and takes the declaration with it.
      const { report } = migrateMarkdown(carrier)
      assert.equal(
        report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged').length,
        1,
        `the declared lag is over and the caption marker reads back - delete CAPTION_LAG: ${CAPTION_LAG}`,
      )
      return
    }
    assert.equal(carveToMarkdown(carve, { carryMarkers: true }), carrier)
    assert.equal(migrateMarkdown(carrier).value, carve)
  })

  test(`the mode off leaves ${name} unmarked`, () => {
    // Not covered by the declaration: the mode-off bytes must hold on every
    // build, which is what makes the carrier an opt-in mode rather than a
    // breaking change.
    assert.ok(!carveToMarkdown(carve).includes('<!-- carve:'), 'the mode off wrote a marker')
  })
}

test('a caption marker above an opener is damaged, never read as an attribute line', () => {
  // The shape the ruling has to exclude: an attribute line above an opener is
  // ALSO a width-0 payload, so a build that does not know the caption rule
  // reads `^ Group caption` as one and reconstructs a container with a caret
  // line on top of it. That is a guess, and the clause forbids it.
  const source =
    '<!-- carve: ^ Group caption -->\n<!-- carve: ::: figure -->\n![a](x.png)\n\n<!-- carve: ::: -->\n'
  const { value, report } = migrateMarkdown(source)
  const damaged = report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged')
  if (CAPTION_LAG) {
    // THE DETECTOR, and it is the opposite direction from the rows above: the
    // pinned build reports NOTHING here and reconstructs the container, so an
    // engine that knows the caption rule reports one row and fails this.
    assert.equal(
      damaged.length,
      0,
      `the declared lag is over and the caption rule is enforced - delete CAPTION_LAG: ${CAPTION_LAG}`,
    )
    assert.match(value, /^:{3,}/m, 'the pinned build no longer reconstructs, so the detector moved')

    return
  }
  assert.equal(damaged.length, 1, 'a caption marker off its closer owes exactly one diagnostic')
  assert.equal(damaged[0].fidelity, 'degraded')
  assert.equal(damaged[0].confidence, 'fallback')
  assert.ok(!/^\s*:{3,}/m.test(value), 'a damaged set reconstructed a container')
})

test('a caption line INSIDE the container is literal text and stays literal', () => {
  // LIVE, and the control on the caption SPELLING: only the line after the
  // closing fence is the caption slot. One inside the container renders as a
  // paragraph, so it is not a caption and takes no marker.
  const carve = '::: figure\n:::: panel\n![a](x.png)\n::::\n^ Group caption\n:::\n'
  const out = carveToMarkdown(carve, { carryMarkers: true })
  assert.ok(!out.includes('<!-- carve: ^'), 'a literal caret line gained a caption marker')
  assert.ok(out.includes('^ Group caption'), `the literal caret line was rewritten: ${out}`)
})

test('a table cell is the one host that carries nothing', () => {
  // LIVE, and it measures the REASON rather than the promise: this target
  // flattens a cell to a single line, so there is no line for a marker to
  // stand on and the container's own body is flattened with it.
  const carve = '::: list-table\n- - cell one\n  - ::: note\n    Body.\n    :::\n:::\n'
  const out = carveToMarkdown(carve, { carryMarkers: true })
  assert.ok(!out.includes('<!-- carve:'), 'a table cell gained a marker')
  assert.ok(out.includes('| cell one | Body. |'), `a cell was not flattened to one line: ${out}`)
})

test('a marker-shaped line in verbatim content is not a marker', () => {
  // LIVE, and it is why a LINE-PREFIXING HOST carries nothing: a marker is
  // read at a line's own start and never inside verbatim content, and at a
  // list item's content column those two are not distinguishable without the
  // block structure around them (carve#2850).
  for (
    const source of [
      'Prose.\n\n```markdown\n<!-- carve: ::: note -->\nBody.\n<!-- carve: ::: -->\n```\n',
      'Prose.\n\n    <!-- carve: ::: note -->\n    body\n',
      '- item\n\n  ```\n  <!-- carve: ::: note -->\n  Body.\n  <!-- carve: ::: -->\n  ```\n',
      '- item\n\n      <!-- carve: ::: note -->\n      body\n',
    ]
  ) {
    const { value, report } = migrateMarkdown(source)
    assert.ok(
      value.includes('<!-- carve: ::: note -->'),
      `a verbatim marker-shaped line was rewritten: ${value}`,
    )
    assert.ok(!/^\s*:{3,}/m.test(value), `verbatim content was read as a container: ${value}`)
    assert.equal(
      report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged').length,
      0,
      'a verbatim marker-shaped line was counted as part of a set',
    )
  }
})

for (const [shape, source] of Object.entries(DAMAGED)) {
  test(`${shape} imports as plain Markdown plus one diagnostic, never a guess`, () => {
    const { report } = migrateMarkdown(source)
    const damaged = report.diagnostics.filter((d) => d.code === 'carrier-markers-damaged')
    assert.equal(damaged.length, 1, 'a damaged marker set owes exactly one diagnostic')
    assert.equal(damaged[0].fidelity, 'degraded')
    assert.equal(damaged[0].confidence, 'fallback')
  })
}
