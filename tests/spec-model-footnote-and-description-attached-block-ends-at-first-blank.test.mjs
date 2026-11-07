import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { modelTrace } from '../scripts/spec/decision-trace.mjs'

// An unclosed fence or colon body a marker-line `+` takes ends at its first blank in
// every host, so a footnote or definition body resumes as an item does (carve#5404).
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').replace(/<\/?p>/g, '')
const between = (html, open, close) => html.slice(html.indexOf(open) + open.length, html.lastIndexOf(close))
const itemBody = (rest) => between(norm(renderDoc(parse(`- +\n${rest}`))), '<ul><li>', '</li></ul>')
const noteBody = (rest) => between(norm(renderDoc(parse(`[^1]: +\n${rest}\n[^1]\n`))), '<li id="fn1">', '</li></ol>').replace(/<a href="#fnref1"[^>]*>↩<\/a>/, '')
const descriptionBody = (rest) => between(norm(renderDoc(parse(`:: t\n: +\n${rest}`))), '<dd>', '</dd>')

for (const opener of ['```', '~~~', '::: note']) {
  for (const next of ['tail', '- q', '> q', '# h', '| a |']) {
    for (const pad of ['  ', '   ']) {
      const rest = `${opener}\n\n${pad}${next}\n`
      test(`a footnote body resumes after ${opener} and a blank before ${JSON.stringify(pad + next)}`, () => {
        assert.equal(noteBody(rest), itemBody(rest))
      })
      test(`a definition body resumes after ${opener} and a blank before ${JSON.stringify(pad + next)}`, () => {
        assert.equal(descriptionBody(rest), itemBody(rest))
      })
    }
  }
}

test('an indented fence line past the blank opens a second fence', () => {
  assert.match(renderDoc(parse('[^f]: +\n```\na\n\n  ```\n  c\n\nx[^f]\n')), /<pre><code>a\n<\/code><\/pre>\s*<pre><code>c\n\n<\/code><\/pre>/)
})

test('an own-line plus in a definition body keeps its fence open', () => {
  assert.match(renderDoc(parse(':: t\n: a\n+\n```\n\n  tail\n')), /<pre><code>\ntail\n<\/code><\/pre>/)
})

test('the trace keeps the footnote as the owner of the attached block and what follows', () => {
  const owners = modelTrace('[^1]: +\n```\n\n  tail\n\n[^1]\n').slice(0, 4).map((r) => [r.line, r.owner, r.closed])
  assert.deepEqual(owners, [
    [1, 'doc/footnote:1', undefined],
    [2, 'doc/footnote:1/code:2', undefined],
    [3, 'doc/footnote:1', undefined],
    [4, 'doc/footnote:1', undefined],
  ])
})
