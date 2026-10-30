import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (src) => renderDoc(parse(src)).trim()
const attached = '<blockquote>\n  <ul>\n    <li>a\n      <blockquote><p>r</p></blockquote>\n    </li>\n  </ul>\n</blockquote>'

test('padding after a quoted follower\'s marker does not refuse the + (carve#4171)', () => {
  assert.equal(html('> - a\n> +\n> >  r\n'), attached)
  assert.equal(html('> - a\n> +\n> >   r\n'), attached)
})

test('one space after the follower\'s marker still attaches', () => {
  assert.equal(html('> - a\n> +\n> > r\n'), attached)
})

test('the unquoted twin attaches the same way', () => {
  assert.equal(html('- a\n+\n>  r\n'), '<ul>\n  <li>a\n    <blockquote><p>r</p></blockquote>\n  </li>\n</ul>')
})
