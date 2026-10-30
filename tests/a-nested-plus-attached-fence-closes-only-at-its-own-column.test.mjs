import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const payload = (source) => /<code[^>]*>([^]*?)<\/code>/.exec(renderDoc(parse(source)))?.[1]
const FENCE = '`'.repeat(3)

// carve#4395: a closer is measured like its opener, at any depth (CARVE-P0-024).
test('an indented fence line is payload of a column-zero fence a nested + attached', () => {
  const hosts = ['- +', '- - +', '- - - +', '1. - +', '- a\n  - +', '- a\n  - b\n    - +', '- > +', '- [ ] - +']
  for (const host of hosts) {
    for (const line of [`  ${FENCE}`, `    ${FENCE}`, '  ~~~', '  x']) {
      const source = `${host}\n${FENCE}\n${line}\nz\n`
      assert.equal(payload(source), `${line}\nz\n`, source)
    }
  }
})

test('a column-zero closer still closes that fence', () => {
  for (const host of ['- - +', '- a\n  - +', '- > +']) {
    const source = `${host}\n${FENCE}\n  ${FENCE}\nz\n${FENCE}\nw\n`
    assert.equal(payload(source), `  ${FENCE}\nz\n`, source)
  }
})

test('a quote-attached fence takes no separator after an indented fence line', () => {
  assert.equal(payload(`- > +\n${FENCE}\n ${FENCE}\n`), ` ${FENCE}\n`)
})

test('a comment or attribute before the fence reads the same in a marker-line chain', () => {
  assert.equal(payload(`- - +\n%% c\n${FENCE}\n  ${FENCE}\nz\n`), `  ${FENCE}\nz\n`)
  assert.equal(payload(`- - +\n{.c}\n${FENCE}\n  ${FENCE}\nz\n`), `  ${FENCE}\nz\n`)
})
