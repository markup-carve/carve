import test from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { carveToHtml } from '@markup-carve/carve'
import { renderDoc } from '../scripts/spec/html.mjs'

// Declared lag: the pinned carve-js keeps an item tight across a blank before a
// sub-block, which PART 9 §17 L1 now loosens (carve#5015, carve-js line open).
// Structure is still compared; only the <p> wrapper is excused. Goes with the pin bump.
const L1_LAG = true
const lagging = (source) => L1_LAG && /\n[> ]*\n/.test(source)
const unwrapped = (html) => html.replace(/<\/?p>/g, '')
const engineAgrees = (source, html) => lagging(source)
  ? assert.equal(unwrapped(carveToHtml(source)), unwrapped(html), source)
  : assert.equal(carveToHtml(source), html, source)

test('a zero-line matching raw block keeps its list-item placement slot', () => {
  for (const blank of ['', '\n']) {
    const source = '- a\n' + blank + '  ```=html\n  ```\n'
    engineAgrees(source, renderDoc(parse(source)))
    // A raw block is a block, so a blank before it loosens the item (PART 9 §17 L1).
    assert.equal(renderDoc(parse(source)), blank ? '<ul>\n  <li><p>a</p>\n    \n  </li>\n</ul>' : '<ul>\n  <li>a\n    \n  </li>\n</ul>')
  }
})

test('an invisible block provides no placement slot or second paragraph', () => {
  assert.equal(renderDoc(parse('- a\n\n  %% n\n')), '<ul>\n  <li>a</li>\n</ul>')
  // A raw block for another target renders nothing here but is still the item's block (PART 9 §17 L1).
  assert.equal(renderDoc(parse('- a\n\n  ```=markdown\n  ```\n')), '<ul>\n  <li><p>a</p></li>\n</ul>')
})

// Declared lag against the `@markup-carve/carve` build package.json pins.
// EMPTY IS THE GOAL: it goes out in the commit that moves the pin past the
// engine that writes the `task-list` class (markup-carve/carve#2887).
const PIN_LAG = ''
const TASK_CASE = '- [ ] ```=html\n  ```\n'

test('matching, dropped and visible blocks retain placement across 108 shapes', () => {
  const cases = JSON.parse(readFileSync(new URL('./fixtures/empty-raw-list-placement.json', import.meta.url), 'utf8'))
  assert.equal(cases.length, 108)
  for (const { source, html } of cases) {
    assert.equal(renderDoc(parse(source)), html, source)
    if (PIN_LAG && source === TASK_CASE) {
      // The detector is the missing class itself, so the first engine to write
      // it fails here and takes the declaration with it.
      assert.equal(
        carveToHtml(source),
        html.replace(' class="task-list"', ''),
        `pin lag is declared and the class is no longer missing - delete PIN_LAG: ${PIN_LAG}`,
      )
      continue
    }
    engineAgrees(source, html)
  }
})
