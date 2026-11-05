/*
 * CARVE-P2-035 keeps the line after a refused brace run in the run's
 * paragraph, so the paragraph is still open below it and a line that misses
 * its container folds in (PART 0 S4, carve#5191). Each host is checked against
 * the same document with the last line written inside the container.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (lines) => renderDoc(parse(lines.join('\n') + '\n')).trim()

const hosts = {
  'list item': (body) => ['- ' + body[0], ...body.slice(1).map((l) => '  ' + l)],
  'nested item': (body) => ['- p', '  - ' + body[0], ...body.slice(1).map((l) => '    ' + l)],
  quote: (body) => body.map((l) => '> ' + l),
  'nested quote': (body) => body.map((l) => '> > ' + l),
  'item in a quote': (body) => ['> - ' + body[0], ...body.slice(1).map((l) => '>   ' + l)],
  'quote in an item': (body) => ['- > ' + body[0], ...body.slice(1).map((l) => '  > ' + l)],
  description: (body) => [':: t', ': ' + body[0], ...body.slice(1).map((l) => '  ' + l)],
  footnote: (body) => ['x[^f]', '', '[^f]: ' + body[0], ...body.slice(1).map((l) => '  ' + l)],
}
const followers = [['# c'], ['> q'], ['- x'], ['```', 'code', '```'], ['::: d'], ['{y}'], ['%% c', '# c']]

for (const [name, host] of Object.entries(hosts)) {
  for (const lead of [[], ['a']]) {
    for (const follower of followers) {
      const body = [...lead, '{x', 'y}', ...follower]
      test(`${name}: a lazy line after ${JSON.stringify(follower[0])} kept by a refused run folds${lead.length ? ' after a lead' : ''}`, () => {
        assert.equal(render([...host(body), 'more']), render(host([...body, 'more'])))
      })
    }
  }
}

test('the three shapes of carve#5191', () => {
  assert.equal(render(['- a', '+', '{x', 'y}', '  # c', 'more']), '<ul>\n  <li>a\n    {x\ny}\n# c\nmore\n  </li>\n</ul>')
  assert.equal(render(['- a', '  {x', '  y}', '  # c', 'more']), '<ul>\n  <li>a\n{x\ny}\n# c\nmore</li>\n</ul>')
  assert.equal(render(['> a', '> {x', '> y}', '> # c', 'more']), '<blockquote><p>a\n{x\ny}\n# c\nmore</p></blockquote>')
})

test('an erased comment line is not the follower: the line after it is', () => {
  assert.equal(render(['{x', 'y}', '%% c', '# d', 'more']), '<p>{x\ny}\n# d\nmore</p>')
})
