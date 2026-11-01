import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()

for (const [name, invisible] of [
  ['link definition', '[d]: u'],
  ['comment', '%% hidden'],
  ['abbreviation definition', '*[D]: u'],
]) {
  test(`${name} leaves a term open for a description with a refused first-block plus`, () => {
    assert.equal(html(`:: t\n${invisible}\n:  +\n flush\n`),
      '<dl>\n  <dt>t</dt>\n  <dd>+\nflush</dd>\n</dl>')
    assert.equal(html(`:: t\n${invisible}\n:  +\nflush\n`),
      '<dl>\n  <dt>t</dt>\n  <dd>flush</dd>\n</dl>')
  })
}
