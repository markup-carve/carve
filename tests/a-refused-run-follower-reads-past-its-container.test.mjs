import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035 and PART 0 S4: a refused run's follower is paragraph text in
// every container, and a later lazy line still reaches that paragraph.
const html = (s) => renderDoc(parse(s))
const flat = (h) => h.replace(/\s+/g, ' ').replace(/> </g, '><').trim()

test('a quoted refused run keeps its lone + follower as text (carve#5770)', () => {
  assert.equal(html('> - {% a\n>  %}\n> +\nz\n'),
    '<blockquote>\n  <ul>\n    <li>{% a\n%}\n+\nz</li>\n  </ul>\n</blockquote>')
})

test('a sibling item keeps the lazy line after a refused-run follower (carve#5771)', () => {
  assert.equal(html('- p\n  - q\n  - {% a\n    %}\n    # h\nplain\n'),
    '<ul>\n  <li>p\n    <ul>\n      <li>q</li>\n      <li>{% a\n%}\n# h\nplain</li>\n    </ul>\n  </li>\n</ul>')
})

const runs = [['{% a', '%}'], ['{#a', '}'], ['{.x', '}']]
const followers = ['+', '# h', '- z', '---', '```', '> q']
// The rendered item that holds the run, whatever its siblings.
const runItem = (h) => flat(h).match(/<li>\{[^]*?<\/li>/)?.[0]

for (const [open, close] of runs) {
  for (const follower of followers) {
    const alone = `- p\n  - ${open}\n    ${close}\n    ${follower}\nplain\n`
    for (const depth of [1, 2]) {
      const q = '> '.repeat(depth)
      const quoted = alone.replace(/^(?!plain)(.+)$/gm, `${q}$1`)
      test(`${JSON.stringify(quoted)} renders as its unquoted twin`, () => {
        const inner = flat(html(quoted)).replace(/^(<blockquote>)+/, '').replace(/(<\/blockquote>)+$/, '')
        assert.equal(inner, flat(html(alone)))
      })
    }
    for (const lead of ['  - q\n', '  > q\n', '  > q\n\n']) {
      const withSibling = alone.replace('- p\n', '- p\n' + lead)
      test(`${JSON.stringify(withSibling)} keeps the run item as it reads alone`, () => {
        assert.equal(runItem(html(withSibling)), runItem(html(alone)))
      })
    }
  }
  // A lone `+` follower at the quote's own column (carve#5770).
  for (const depth of [1, 2]) {
    const q = '> '.repeat(depth)
    const src = `${q}- ${open}\n${q} ${close}\n${q}+\nz\n`
    test(`${JSON.stringify(src)} keeps its + follower as text`, () => {
      // Whether the run text itself is inline-parsed is carve#5773's question.
      assert.ok(!html(src).includes('%%'))
      assert.match(flat(html(src)), / \+ z<\/li>/)
    })
  }
}

test('a run of sibling run items measures a linear number of lines', () => {
  const work = (count) => {
    resetLayoutWork()
    parse('- p\n' + '  - q\n  - {% a\n    %}\n    # h\nplain\n'.repeat(count))
    return layoutWork.scan + layoutWork.lineVisits + layoutWork.views
  }
  const small = work(200)
  const large = work(800)
  assert.ok(large <= small * 4 * 1.25, `200 units: ${small}, 800 units: ${large}`)
})
