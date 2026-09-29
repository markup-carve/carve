import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const cases = JSON.parse(readFileSync(new URL('./fixtures/container-ownership.json', import.meta.url), 'utf8'))
const boundaries = JSON.parse(readFileSync(new URL('./fixtures/container-ownership-boundaries.json', import.meta.url), 'utf8'))
for (const { source, html } of [...cases, ...boundaries]) {
  test(`container ownership: ${JSON.stringify(source)}`, () => {
    assert.equal(renderDoc(parse(source)).trim(), html)
  })
}
