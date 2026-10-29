import test from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const render = (src) => renderDoc(parse(src))
const F = '\x60'.repeat(3)

// The note's last item holds an open paragraph, so `after [^b]` folds into it
// and the note, referenced only from itself, renders nothing (carve#3918).
test('literal repro 1', () => {
  const source = "- a\n  [^b]: text\n\n    - c2\nafter [^b]\n"
  assert.equal(render(source), "<ul>\n  <li>a</li>\n</ul>")
})

test('literal repro 2', () => {
  assert.equal(render("- a\n  [^b]: text\n\n    - c2\n    ~~~\n    code\n    ~~~\nafter [^b]\n"), "<ul>\n  <li>a</li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <pre><code>code\n</code></pre>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test('literal repro 3', () => {
  assert.equal(render("- a\n\n  [^b]: text\n\n    - c2\n    ~~~\n    code\n    ~~~\nafter [^b]\n"), "<ul>\n  <li>a</li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <pre><code>code\n</code></pre>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test('literal repro 4', () => {
  assert.equal(render("- [^a]: text\n    - child\n    [^b]: text\n\n      - c2\n      ~~~\n      code\n      ~~~\nafter [^a] [^b]\n"), "<ul>\n  <li></li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a> <a id=\"fnref2\" href=\"#fn2\" role=\"doc-noteref\"><sup>2</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text\n- child<a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n    <li id=\"fn2\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <pre><code>code\n</code></pre>\n      <p><a href=\"#fnref2\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test('literal repro 5', () => {
  assert.equal(render("- [^n]: %% c\n    - child\n     ```\n     code\n     ```\nafter [^n]\n"), "<ul>\n  <li></li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <ul>\n        <li>child</li>\n      </ul>\n      <pre><code>code\n</code></pre>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test('unchanged at control', () => {
  assert.equal(render("- [^n]: %% c\n    - child\n      ```\n      code\n      ```\nafter [^n]\n"), "<ul>\n  <li></li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <ul>\n        <li>child\n          <pre><code>code\n</code></pre>\n        </li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

// The child's open paragraph takes the closerless run and `after [^n]` (carve#3885).
test('unchanged unclosed control', () => {
  const source = "- [^n]: %% c\n    - child\n     ```\n     code\nafter [^n]\n"
  assert.equal(render(source), "<ul>\n  <li></li>\n</ul>")
  const child = parse(source).footnoteDefs.get('n')[0].items[0].blocks[0]
  assert.deepEqual(child.lines.map((line) => line.replace(/^\u0000L\u0000/, '')), ['child', '```', 'code', 'after [^n]'])
})

test('unchanged noBlank control', () => {
  assert.equal(render("- [^a]: text\n    - child\n    [^b]: text\n      - c2\n      ~~~\n      code\n      ~~~\nafter [^a] [^b]\n"), "<ul>\n  <li></li>\n</ul>\n<p>after <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a> <a id=\"fnref2\" href=\"#fn2\" role=\"doc-noteref\"><sup>2</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text\n- child<a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n    <li id=\"fn2\">\n      <p>text\n- c2</p>\n      <pre><code>code\n</code></pre>\n      <p><a href=\"#fnref2\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

// Only an open paragraph in the last item takes the line (carve#3918).
test('a note tail list takes a document lazy line only into an open paragraph', () => {
  for (const column of [2, 4]) for (const blank of ['', '\n']) {
    for (const marker of ['-', '*', '1.']) for (const run of ['', F, '~~~']) {
      for (const tailBlank of ['', '\n']) {
        const head = column === 2 ? '- a\n' : '- [^a]: text\n    - child\n'
        const pad = ' '.repeat(column + 2)
        const src = head + blank + ' '.repeat(column) + '[^b]: text\n\n' +
          pad + marker + ' c2\n' + (run ? pad + run + '\n' + pad + 'code\n' + pad + run + '\n' : '') +
          tailBlank + 'after [^b]\n'
        assert.equal(render(src).includes('</ul>\n<p>after'), run !== '' || tailBlank !== '', src)
      }
    }
  }
})

test('a closed fence below the child opens in the note body', () => {
  for (const marker of ['-', '*', '1.', '1)']) for (const shape of ['marker', 'comment', 'text']) {
    const bodyColumn = shape === 'marker' ? 4 : 2
    const head = shape === 'marker' ? '- [^n]: %% c' : shape === 'comment' ? '[^n]: %% c' : '[^n]: text\n'
    for (const run of [F, '~~~']) for (let column = bodyColumn; column < bodyColumn + marker.length + 1; column++) {
      for (const q of ['', '> ', '> > ']) {
        const lines = [head, ' '.repeat(bodyColumn) + marker + ' child',
          ' '.repeat(column) + run, ' '.repeat(column) + 'code', ' '.repeat(column) + run]
        const src = lines.flatMap(line => line.split('\n')).map(line => q + line).join('\n') + '\nafter [^n]\n'
        const note = parse(src).footnoteDefs.get('n')
        assert.ok(note, src)
        const listIndex = note.findIndex(block => block.t === 'list')
        assert.ok(listIndex >= 0, src)
        assert.deepEqual(note[listIndex].items[0].blocks[0].lines, ['child'], src)
        assert.equal(note[listIndex + 1].t, 'code', src)
        assert.equal(note[listIndex + 1].text, 'code\n', src)
      }
    }
  }
})

test('a closed fence below the note body interrupts the child paragraph and opens in the document', () => {
  const doc = parse("[^n]: %% c\n  - child\n ```\n code\n ```\nafter [^n]\n")
  assert.deepEqual(doc.blocks, [
    { t: 'code', lang: '', title: null, text: 'code\n' },
    { t: 'para', lines: ['after [^n]'] },
  ])
  assert.deepEqual(doc.footnoteDefs.get('n')[0].items[0].blocks[0].lines,
    ['child'])
})

test('a run at the marker-line note body column opens in the note', () => {
  const html = render("- [^n]: text\n    ```\n    code\n    ```\nafter [^n]\n")
  assert.match(html, /<li id="fn1">\s*<p>text<\/p>\s*<pre><code>code\n/)
  assert.doesNotMatch(html.slice(0, html.indexOf('<section')), /<pre>/)
})

test("item paragraph after a note list accepts a lazy tail", () => {
  assert.equal(render("- a\n  [^b]: text\n\n    - c2\n\n  more\ntail [^b]\n"), "<ul>\n  <li><p>a</p>\n    <p>more\ntail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n  </li>\n</ul>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test("item sublist after a note list accepts a lazy tail", () => {
  assert.equal(render("- a\n  [^b]: text\n\n    - c2\n\n  - e\ntail [^b]\n"), "<ul>\n  <li>a\n    <ul>\n      <li>e\ntail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></li>\n    </ul>\n  </li>\n</ul>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test("item paragraph after a note accepts a lazy tail", () => {
  assert.equal(render("- a\n  [^b]: text\n\n  more\ntail [^b]\n"), "<ul>\n  <li><p>a</p>\n    <p>more\ntail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n  </li>\n</ul>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text<a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test("item fence after a note list leaves no paragraph for a tail", () => {
  assert.equal(render("- a\n  [^b]: text\n\n    - c2\n\n  ~~~\n  code\n  ~~~\ntail [^b]\n"), "<ul>\n  <li>a\n    <pre><code>code\n</code></pre>\n  </li>\n</ul>\n<p>tail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test("second note after a note list ends before item prose", () => {
  assert.equal(render("- a\n  [^b]: text\n\n    - c2\n\n  [^d]: second\n\n  more\ntail [^b] [^d]\n"), "<ul>\n  <li><p>a</p>\n    <p>more\ntail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a> <a id=\"fnref2\" href=\"#fn2\" role=\"doc-noteref\"><sup>2</sup></a></p>\n  </li>\n</ul>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <p>text</p>\n      <ul>\n        <li>c2</li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n    <li id=\"fn2\">\n      <p>second<a href=\"#fnref2\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})

test("item sublist after a comment-led note list owns its fence and tail", () => {
  assert.equal(render("- [^b]: %% c\n    - c2\n\n  - e\n    ~~~\n    code\n    ~~~\n  more\ntail [^b]\n"), "<ul>\n  <li>\n    <ul>\n      <li>e\n        <pre><code>code\n</code></pre>\n      </li>\n    </ul>\n    more\ntail <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a>\n  </li>\n</ul>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n  <hr>\n  <ol>\n    <li id=\"fn1\">\n      <ul>\n        <li>c2</li>\n      </ul>\n      <p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n    </li>\n  </ol>\n</section>")
})
