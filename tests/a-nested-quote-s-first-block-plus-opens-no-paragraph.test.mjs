import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4993: a quote's first-block `+` reads the same at every quote depth.
const render = source => renderDoc(parse(source)).replace(/\s+/g, ' ')
const quoted = (body, depth) => body.map(line => `${'> '.repeat(depth)}${line}`.trimEnd()).join('\n')
const shell = depth => '<blockquote> '.repeat(depth)

for (const body of [['+', '  - b', '+'], ['+', '- b'], ['+', '  - b'], ['+', '1. b']]) {
  for (const tail of ['- m', '1. m', '  - m']) {
    for (const depth of [1, 2, 3]) {
      test(`${JSON.stringify(body)} at depth ${depth} closes its item at ${JSON.stringify(tail)}`, () => {
        const html = render(`${quoted(body, depth)}\n${tail}\n`)
        assert.ok(html.startsWith(`${shell(depth)}<blockquote> <`), html)
        assert.match(html, /<\/blockquote> <(ul|ol)> <li>m<\/li>/)
      })
    }
  }
}

test('the follower still folds into a paragraph the `+` attached', () => {
  assert.match(render('> > +\n> > b\n- m\n'), /<p>b - m<\/p>/)
})
