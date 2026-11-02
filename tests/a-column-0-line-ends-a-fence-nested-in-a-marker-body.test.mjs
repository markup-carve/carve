import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

// carve#4968: a lazy line in an item a note or description body nests does not
// hide the item's last block, so the body answers as the item host does (C3).
const html = (source) => renderDoc(parse(source)).trim()

test('a column-0 line ends a fence in a note body item after a lazy line', () => {
  assert.equal(html('x[^a]\n\n[^a]: text\n  - child\n  lazy\n    ~~~\n    code\nafter\n'), [
    '<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>',
    '<p>after</p>',
    '<section role="doc-endnotes" aria-label="Footnotes">',
    '  <hr>',
    '  <ol>',
    '    <li id="fn1">',
    '      <p>text</p>',
    '      <ul>',
    '        <li>child',
    'lazy',
    '          <pre><code>code',
    '</code></pre>',
    '        </li>',
    '      </ul>',
    '      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>',
    '    </li>',
    '  </ol>',
    '</section>',
  ].join('\n'))
})

test('a column-0 line ends a fence in a description body item after a lazy line', () => {
  assert.equal(html(':: t\n: text\n  - child\n  lazy\n    ~~~\n    code\nafter\n'), [
    '<dl>',
    '  <dt>t</dt>',
    '  <dd>',
    '    <p>text</p>',
    '    <ul>',
    '      <li>child',
    'lazy',
    '        <pre><code>code',
    '</code></pre>',
    '      </li>',
    '    </ul>',
    '  </dd>',
    '</dl>',
    '<p>after</p>',
  ].join('\n'))
})

test('a fence-shaped line in a line block still lets a column-0 line fold', () => {
  assert.equal(html(':: t\n: ::: |\n  ~~~\nb\n'), [
    '<dl>',
    '  <dt>t</dt>',
    '  <dd>',
    '    <div class="line-block">',
    '      <p>~~~<br>',
    'b</p>',
    '    </div>',
    '  </dd>',
    '</dl>',
  ].join('\n'))
})

test('a closed fence or a container after the lazy line ends the body too', () => {
  for (const block of ['~~~\n    code\n    ~~~', '::: note']) {
    for (const lazy of ['lazy', ' lazy']) {
      const source = `:: t\n: text\n  - child\n  ${lazy}\n    ${block}\nafter\n`
      assert.match(html(source), /<\/dl>\n<p>after<\/p>$/, source)
    }
  }
})
