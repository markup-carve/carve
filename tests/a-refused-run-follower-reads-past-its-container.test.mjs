import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, layoutWork, resetLayoutWork } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// CARVE-P2-035, carve#5830: a refused opener claims no following line.
const html = source => renderDoc(parse(source))
const oracle = source => html(source.replace('{', '\\{'))

for (const source of [
  '> - {% a\n>  %}\n> +\nz\n',
  '- p\n  - q\n  - {% a\n    %}\n    # h\nplain\n',
]) test('the following line is read normally in its surviving owner', () => {
  assert.equal(html(source), oracle(source))
})

const runs = [['{% a', '%}'], ['{#a', '}'], ['{.x', '}']]
const followers = ['+', '# h', '- z', '---', '```', '> q']
for (const [open, close] of runs) {
  for (const follower of followers) {
    const alone = `- p\n  - ${open}\n    ${close}\n    ${follower}\nplain\n`
    for (const depth of [1, 2]) {
      const q = '> '.repeat(depth)
      const quoted = alone.replace(/^(?!plain)(.+)$/gm, `${q}$1`)
      test('a quoted item reads the refused opener like an escaped brace', () => {
        assert.equal(html(quoted), oracle(quoted))
      })
    }
    for (const lead of ['  - q\n', '  > q\n', '  > q\n\n']) {
      const withSibling = alone.replace('- p\n', '- p\n' + lead)
      test('a sibling does not create a refused-run claim', () => {
        assert.equal(html(withSibling), oracle(withSibling))
      })
    }
  }
  for (const depth of [1, 2]) {
    const q = '> '.repeat(depth)
    const source = `${q}- ${open}\n${q} ${close}\n${q}+\nz\n`
    test('a marker after a refused quoted opener is read normally', () => {
      assert.equal(html(source), oracle(source))
    })
  }
}

test('a run of sibling run items measures a linear number of lines', () => {
  const work = count => {
    resetLayoutWork()
    parse('- p\n' + '  - q\n  - {% a\n    %}\n    # h\nplain\n'.repeat(count))
    return layoutWork.scan + layoutWork.lineVisits + layoutWork.views
  }
  const small = work(200)
  const large = work(800)
  assert.ok(large <= small * 4 * 1.25, `200 units: ${small}, 800 units: ${large}`)
})
