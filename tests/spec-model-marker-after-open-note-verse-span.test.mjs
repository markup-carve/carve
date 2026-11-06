import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (source) => renderDoc(parse(source))

test('a list marker after an open span in a note line block closes the note (carve#5278)', () => {
  assert.equal(render('r[^n]\n\n[^n]: ::: |\n  x\n  %%%\n- b\n'),
    '<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>\n<ul>\n  <li>b</li>\n</ul>\n' +
    '<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n' +
    '      <div class="line-block">\n        <p>x</p>\n      </div>\n' +
    '      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>\n    </li>\n  </ol>\n</section>')
  assert.equal(render('r[^n]\n\n[^n]: ::: |\n  x\n  %%%\nb\n'),
    render('r[^n]\n\n[^n]: ::: |\n  x\nb\n'))
})

test('1,000 open-span note verse variants read the marker as without the span (carve#5278)', () => {
  let count = 0
  for (const label of ['n', 'a', 'x1', 'note', 'k'])
    for (const verse of ['x', 'word', 'alpha', 'one line', 'r_s'])
      for (const run of ['%%%', '%%%%'])
        for (const marker of ['-', '*', '1.', 'a)'])
          for (const follower of ['b', 'item', 'text', 'map', 'go']) {
            const head = `r[^${label}]\n\n[^${label}]: ::: |\n  ${verse}\n`
            const tail = `${marker} ${follower}\n`
            const source = `${head}  ${run}\n${tail}`
            const expected = render(head + tail)
            assert.match(expected, new RegExp(`<li>${follower}</li>`), source)
            assert.equal(render(source), expected, source)
            count++
          }
  assert.equal(count, 1000)
})
