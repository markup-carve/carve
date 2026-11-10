/*
 * A quote's content is re-parsed with its own columns (PART 9 §24 C5), so a
 * tab in a quoted line's leading run reaches the same frame as it does
 * without the quote, and the HTML follows the decision trace (carve#5754).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const flat = (html) => html.replace(/\s+/g, '')
const oracle = (src) => flat(renderDoc(parse(src)))

test('a quoted opener on a tab run stays in the item the trace names', () => {
  assert.equal(oracle('> - a\n> \t- a\n> \t  - b\n>    \t> z\n>    \t::: |\n'),
    flat('<blockquote><ul><li>a<ul><li>a<ul><li>b</li></ul><blockquote><p>z</p></blockquote>' +
      '<div class="line-block"></div></li></ul></li></ul></blockquote>'))
})

test('a doubly quoted marker on a tab run is a sibling, as the trace says', () => {
  assert.equal(oracle('> > - a\n> > \t- a\n> >       - b\n> >    \t- b\n> >     \t{.x}\n> >     ::: |\n'),
    flat('<blockquote><blockquote><ul><li>a<ul><li>a<ul><li>b</li><li>b</li></ul></li></ul>' +
      '<div class="line-block"></div></li></ul></blockquote></blockquote>'))
})

// Mixed space and tab leads under every quote depth render as the unquoted text does.
test('quoted tab leads render as their unquoted text', () => {
  let seed = 5754
  const rnd = (n) => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) % n
  }
  const lead = () => Array.from({ length: rnd(9) }, () => (rnd(3) === 0 ? '\t' : ' ')).join('')
  const bodies = ['- b', '- c', '> z', '::: |', '{.x}', 'text', '1. o', ': d', ':: t', '```', '|= a |']
  for (let c = 0; c < 300; c++) {
    const depth = 1 + rnd(3)
    const lines = ['- a']
    for (let k = 0, items = 1 + rnd(3); k < items; k++) lines.push(lead() + '- ' + 'abc'[k])
    for (let k = 0, n = 1 + rnd(4); k < n; k++) lines.push(lead() + bodies[rnd(bodies.length)])
    const bare = lines.join('\n') + '\n'
    const quoted = lines.map((line) => '> '.repeat(depth) + line).join('\n') + '\n'
    assert.equal(oracle(quoted), '<blockquote>'.repeat(depth) + oracle(bare) + '</blockquote>'.repeat(depth), JSON.stringify(quoted))
  }
})
