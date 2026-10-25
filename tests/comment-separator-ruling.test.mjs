import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { commentLineContent } from '../scripts/spec/layout.mjs'

const cases = JSON.parse(readFileSync(new URL('../resources/spec/comment-separator-cases.json', import.meta.url), 'utf8'))
for (const { source, content } of cases.cases) {
  test(`comment separator: ${JSON.stringify(source)}`, () => {
    assert.equal(commentLineContent(source), content)
  })
}
