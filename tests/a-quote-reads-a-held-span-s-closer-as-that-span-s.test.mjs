import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const html = (source) => renderDoc(parse(source)).trim()
const lastOwner = (source) => {
  const trace = []
  parse(source, { trace })
  return trace.filter((row) => row.line === source.split('\n').length - 1).at(-1).owner
}

test('a quoted item span closed below its column leaves the next unmarked line at document level (carve#5026)', () => {
  assert.equal(html('> > - %%%\n> > %%%\n> > %%%\n> > x\nt\n'), `<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
  </blockquote>
</blockquote>
<p>t</p>`)
  assert.equal(html('> - %%%\n> %%%\n> %%%\n> x\nt\n'), `<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>t</p>`)
})

test('an unquoted closer ends a span an item or description in the quote holds (carve#5027)', () => {
  assert.equal(html('> - a\n>   %%%\n%%%\nc\n'), `<blockquote>
  <ul>
    <li>a</li>
  </ul>
</blockquote>
<p>c</p>`)
  assert.equal(html('> - %%%\n%%%\nc\n'), `<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>c</p>`)
  assert.equal(html('> :: u\n> : %%%\n%%%\nc\n'), `<blockquote>
  <dl>
    <dt>u</dt>
    <dd></dd>
  </dl>
</blockquote>
<p>c</p>`)
})

// A closer with fewer `>` than its span still closes it, and the quote keeps reading.
test('a closer short of a nested quote prefix ends that level span', () => {
  assert.equal(html('> > %%%\n> > p\n%%%\n> > x\nt\n'), `<blockquote>
  <blockquote><p>x
t</p></blockquote>
</blockquote>`)
  assert.equal(html('> > > %%%\n> > > p\n> > %%%\n> > > x\nt\n'), `<blockquote>
  <blockquote>
    <blockquote><p>x
t</p></blockquote>
  </blockquote>
</blockquote>`)
})

test('the HTML puts the last unmarked line where the trace does', () => {
  const hosts = [['', 0], ['- ', 2], ['1. ', 3], [': ', 2], ['[^n]: ', 2]]
  let checked = 0
  for (let depth = 1; depth <= 3; depth++) for (const [marker, col] of hosts) for (const own of [false, true]) {
    const q = '> '.repeat(depth)
    const pre = marker === ': ' ? [q + ':: u'] : []
    const open = own ? [q + marker + 'a', q + ' '.repeat(col) + '%%%'] : [q + marker + '%%%']
    for (const closer of [q + '%%%', q + ' '.repeat(col) + '%%%', '%%%', ' %%%', q.slice(0, -2) + '%%%']) {
      for (const second of [[], [q + '%%%', q + 'x'], [q + 'x']]) for (const tail of ['t', '- t']) {
        const source = [...pre, ...open, q + ' '.repeat(col) + 'p', closer, ...second, tail].join('\n') + '\n'
        const atDocument = !lastOwner(source).includes('quote')
        const ends = html(source).endsWith(tail === 't' ? '</blockquote>\n<p>t</p>' : '</blockquote>\n<ul>\n  <li>t</li>\n</ul>')
        assert.equal(ends, atDocument, JSON.stringify(source))
        checked++
      }
    }
  }
  assert.equal(checked, 900)
})
