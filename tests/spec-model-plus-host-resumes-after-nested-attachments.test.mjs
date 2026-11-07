import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// A `+` host resumes after its attached block ends, and a caption at its content
// column captions an attached quote (CARVE-P0-024, PART 0 S4; carve#5432, carve#5433, carve#5434).
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><')
const render = (src) => norm(renderDoc(parse(src)))
const owner = (src, line) => modelTrace(src).find((r) => r.line === line).owner
const FENCE = '```'

for (const [kind, block] of [
  ['fence', `${FENCE}\n  x\n\n  y\n  ${FENCE}`],
  ['tilde fence', '~~~\n  x\n\n  ~~~'],
  ['colon div', '::: w\n  x\n\n  y\n  :::'],
]) {
  test(`a nested item resumes after its attached ${kind} with an empty line`, () => {
    const src = `- a\n  - +\n  ${block}\n\n    # g\n`
    assert.match(render(src), /<\/(pre|div)><h1 id="g">g<\/h1><\/li><\/ul><\/li><\/ul>$/)
    assert.equal(owner(src, src.split('\n').length - 1), 'doc/item:1/item:2')
  })
}

test('a nested item measures an indented attached fence through its closer', () => {
  assert.match(render(`- a\n  - +\n  ${FENCE}\n  x\n\n  y\n  ${FENCE}\n    # g\n`), /<h1 id="g">g<\/h1><\/li><\/ul><\/li><\/ul>$/)
})

for (const [name, host, close, tail] of [
  ['item', '- +', '</li>', ''],
  ['footnote', '[^1]: +', '</li>', '\n[^1]\n'],
  ['description', ':: t\n: +', '</dd>', ''],
]) {
  test(`the outer ${name} resumes after an attached quote that holds a plus host`, () => {
    const html = render(`${host}\n> - +\n> ${FENCE}\n> ${FENCE}\n\n  # outer\n${tail}`)
    const quoteEnd = html.lastIndexOf('</blockquote>')
    const heading = html.indexOf('<h1 id="outer">')
    assert.ok(heading > quoteEnd && heading < html.indexOf(close, quoteEnd), html)
  })

  test(`a caption at the ${name}'s content column captions its attached quote`, () => {
    const src = `${host}\n> q\n  ^ cap\n${tail}`
    assert.match(render(src), /<figure><blockquote><p>q<\/p><\/blockquote><figcaption>cap<\/figcaption><\/figure>/)
    assert.doesNotMatch(owner(src, host.split('\n').length + 2), /quote/)
  })
}

test('the outer item keeps a sublist after an attached quote that holds a plus host', () => {
  assert.match(render(`- +\n> - +\n> ${FENCE}\n> ${FENCE}\n\n  - y\n`), /<\/blockquote><ul><li>y<\/li><\/ul><\/li><\/ul>$/)
})

test('a caption past the host column still folds into the attached quote', () => {
  assert.match(render('- +\n> q\n   ^ cap\n'), /<blockquote><p>q \^ cap<\/p><\/blockquote>/)
})
