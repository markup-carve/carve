import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'
import { scanDirective, hasInvalidLineRange } from '../scripts/spec/include-directive.mjs'

const ranges = ['0-2', '01-2', '2-1', '1-02']
const paths = ['data/p2.csv', 'other.crv', 'x.txt', 'chapter.crv']
const options = ['@code:csv @lines:', '@lines:', '@shift:1 @lines:', '@lines:']
const surroundings = [
  (directive) => `before ${directive} after`,
  (directive) => `*before* ${directive} /after/`,
  (directive) => `a ${directive} b`,
  (directive) => `${directive} after`,
]
const hosts = [
  (source) => source,
  (source) => `> ${source}`,
  (source) => `- ${source}`,
  (source) => `::: note\n${source}\n:::`,
]

test('invalid line ranges remain literal through inline hosts and siblings', () => {
  let count = 0
  for (const range of ranges) for (const path of paths) {
    for (const option of options) for (const around of surroundings) {
      for (const host of hosts) {
        const directive = `{{ ${path} ${option}${range} }}`
        assert.equal(hasInvalidLineRange(scanDirective(directive, 0)), true)
        const html = renderDoc(parse(host(around(directive))))
        assert.ok(html.includes(directive), `${count}: ${html}`)
        count++
      }
    }
  }
  assert.equal(count, 1024)
})

test('valid line ranges still use core inline parsing', () => {
  const html = renderDoc(parse('before {{ data/p2.csv @lines:1-2 }} after'))
  assert.match(html, /<span class="mention"><strong>@lines<\/strong><\/span>/)
})

test('an invalid directive stays literal inside spanning inline constructs', () => {
  assert.equal(
    renderDoc(parse('*before {{ a @lines:0-2 }} after*')),
    '<p><strong>before {{ a @lines:0-2 }} after</strong></p>',
  )
  assert.equal(
    renderDoc(parse('[before {{ a @lines:0-2 }} after](https://x.test)')),
    '<p><a href="https://x.test">before {{ a @lines:0-2 }} after</a></p>',
  )
})
