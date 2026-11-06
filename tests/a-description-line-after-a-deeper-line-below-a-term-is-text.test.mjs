import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#5289: a term holds no body, so a deeper line after it ends the entry
// and a `: ` line after that is paragraph text. Its code run opens no fence,
// and the column-0 line folds into the paragraph (PART 0 S4).
const html = source => renderDoc(parse(source)).trim()

test('the reported document folds the last line into the paragraph', () => {
  assert.equal(html('- - :: t\n     a\n    : ```\nz\n'), [
    '<ul>', '  <li>', '    <ul>', '      <li>', '        <dl>', '          <dt>t</dt>', '        </dl>',
    '        a', ': <code>', 'z</code>', '      </li>', '    </ul>', '  </li>', '</ul>',
  ].join('\n'))
})

for (const [name, source] of Object.entries({
  'in one item': '- :: t\n   a\n  : ```\nz\n',
  'in two items': '- - :: t\n     a\n    : ```\nz\n',
  'with a tilde run': '- :: t\n   a\n  : ~~~\nz\n',
  'with a list marker': '- :: t\n   a\n  : - ```\nz\n',
})) {
  test(`the line after a description-shaped text line folds ${name}`, () => {
    const out = html(source)
    assert.doesNotMatch(out, /<p>z<\/p>/)
    assert.match(out, /\nz(?:<\/code>)?\n *<\/li>/)
  })
}

test('a description after an earlier description body still opens its fence', () => {
  assert.match(html('- :: t\n  : d\n    m\n  : ```\nz\n'), /<dd>\n *<pre><code><\/code><\/pre>\n *<\/dd>\n *<\/dl>\n *<\/li>\n<\/ul>\n<p>z<\/p>/)
})
