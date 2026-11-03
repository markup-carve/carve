import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// An unresolved reference is literal source even when a cross-reference clones
// a heading containing it. The same rule applies to every heading level and
// quote ownership, with text on either side of the reference.
test('cross-reference clones discharge unresolved references', () => {
  const forms = ['[l][]', '[l][missing]', '![l][missing]', '[l][MISSING]']
  const prefixes = ['', 'a ', 'before ', 'x: ', 'left ']
  const suffixes = ['', ' t', ' after', ' end', ' right']
  let count = 0
  for (const quoted of [false, true]) {
    for (let level = 1; level <= 6; level++) {
      for (const form of forms) {
        for (const prefix of prefixes) {
          for (const suffix of suffixes) {
            if (!prefix && !suffix) continue // [l][] finds the heading named l.
            const heading = `${'#'.repeat(level)} ${prefix}${form}${suffix}`
            const source = `${quoted ? '> ' : ''}{#target}\n${quoted ? '> ' : ''}${heading}\n</#target>\n`
            const html = renderDoc(parse(source))
            const headingText = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/s)?.[1]
            const clonedText = html.match(/<a href="#target">(.*?)<\/a>/s)?.[1]
            assert.notEqual(headingText, undefined, source)
            assert.equal(clonedText, headingText, source)
            assert.doesNotMatch(html, /\uE000|\uE001/, source)
            count++
          }
        }
      }
    }
  }
  assert.equal(count, 1152)
})
