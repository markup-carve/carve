import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = source => renderDoc(parse(source))
const base = blank => ['- [^n]: text', ...(blank ? [''] : []), '    ```', '    code', '    ```', 'after [^n]'].join('\n') + '\n'
const ref = '<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>'
const back = '<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a>'
const expected = `<ul>\n  <li></li>\n</ul>\n<p>after ${ref}</p>\n<section role="doc-endnotes" aria-label="Footnotes">\n  <hr>\n  <ol>\n    <li id="fn1">\n      <p>text</p>\n      <pre><code>code\n</code></pre>\n      <p>${back}</p>\n    </li>\n  </ol>\n</section>`

for (const blank of [false, true]) {
  test(`marker-line note comment transparency, blank=${blank}`, () => {
    const twin = base(blank)
    assert.equal(render(twin), expected)
    const comments = [
      ['    %% c'],
      ['     %% c'],
      ['      %% c'],
      ['    %%%', '    hidden', '    %%%'],
      ['     %%%', '     hidden', '     %%%'],
      ['      %%%', '      hidden', '      %%%'],
      ...(!blank ? [['    %% c', '    %% d']] : []),
    ]
    for (const lines of comments) {
      const source = ['- [^n]: text', ...(blank ? [''] : []), ...lines, '    ```', '    code', '    ```', 'after [^n]'].join('\n') + '\n'
      assert.equal(render(source), render(twin), source)
    }
  })
}

test('a comment-shaped code payload stays code and leaves the item closed', () => {
  const source = '- [^n]: text\n    ```\n    %% x\n    ```\n    para\nafter [^n]\n'
  // `para` leaves the note's paragraph open, so `after [^n]` folds into it (carve#3885).
  assert.equal(render(source), '<ul>\n  <li></li>\n</ul>')
  const note = parse(source).footnoteDefs.get('n')
  assert.deepEqual(note.map((block) => block.t), ['para', 'code', 'para'])
  assert.equal(note[1].text, '%% x\n')
})
