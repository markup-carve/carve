import test from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { carveToHtml } from '@markup-carve/carve'
import { renderDoc } from '../scripts/spec/html.mjs'

test('a zero-line matching raw block keeps its list-item placement slot', () => {
  for (const blank of ['', '\n']) {
    const source = '- a\n' + blank + '  ```=html\n  ```\n'
    assert.equal(carveToHtml(source), renderDoc(parse(source)))
    assert.equal(renderDoc(parse(source)), '<ul>\n  <li>a\n    \n  </li>\n</ul>')
  }
})

test('an invisible block provides no placement slot or second paragraph', () => {
  for (const block of ['%% n', '```=markdown\n  ```']) {
    assert.equal(renderDoc(parse('- a\n\n  ' + block + '\n')), '<ul>\n  <li>a</li>\n</ul>')
  }
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
    assert.equal(carveToHtml(source), html, source)
  }
})
