import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const normalize = (h) => h.split('\n').map(line => line.trim()).filter(Boolean).join('\n')
const cases = [
  [
    "a marker at the item column opens a list under a nested description",
    "- :: t\n  : para\n  - li\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<ul>\n<li>li</li>\n</ul>\n</li>\n</ul>"
  ],
  [
    "a marked quote continuation keeps its claim in an item",
    "- > para\n  > more\n%% c\nx\n",
    "<ul>\n<li>\n<blockquote><p>para\nmore</p></blockquote>\nx\n</li>\n</ul>"
  ],
  [
    "a lazy line keeps the quoted paragraph open for the next line",
    "- > a\n  > b\n [r]: /u\nx\n",
    "<ul>\n<li>\n<blockquote><p>a\nb\n[r]: /u\nx</p></blockquote>\n</li>\n</ul>"
  ],
  [
    "a footnote body in a quote takes no lazy line",
    "- > para\n  > [^f]: n\n  >   - sub\ntail[^f]\n",
    "<ul>\n<li>\n<blockquote><p>para</p></blockquote>\n</li>\n</ul>\n<p>tail<a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n<hr>\n<ol>\n<li id=\"fn1\">\n<p>n\n- sub<a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n</li>\n</ol>\n</section>"
  ],
  [
    "a note on a description marker line keeps its body column",
    "x[^c]\n\n:: t\n: [^c]: para\n    # H\n",
    "<p>x<a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<dl>\n<dt>t</dt>\n<dd></dd>\n</dl>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n<hr>\n<ol>\n<li id=\"fn1\">\n<p>para</p>\n<h1 id=\"H\">H</h1>\n<p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n</li>\n</ol>\n</section>"
  ],
  [
    "a column-0 line leaves a dd after a closed nested block",
    ":: t\n: - para\n    [^p]: n\nx\n",
    "<dl>\n<dt>t</dt>\n<dd>\n<ul>\n<li>para</li>\n</ul>\n</dd>\n</dl>\n<p>x</p>"
  ],
  [
    "a marker below a dd-hosted list folds as item text",
    ":: t\n: - para\n - li\n",
    "<dl>\n<dt>t</dt>\n<dd>\n<ul>\n<li>para\n- li</li>\n</ul>\n</dd>\n</dl>"
  ],
  [
    "an opener past a note body column opens in the note",
    "[r][] [^p] [^c]\n[^c]: - para\n   # H\n",
    "<p>[r][] [^p] <a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n<hr>\n<ol>\n<li id=\"fn1\">\n<ul>\n<li>para</li>\n</ul>\n<h1 id=\"H\">H</h1>\n<p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n</li>\n</ol>\n</section>"
  ],
  [
    "an unclosed fence line folds into a quoted term",
    "> :: t\n```\n",
    "<blockquote>\n<dl>\n<dt>t\n<code></code></dt>\n</dl>\n</blockquote>"
  ],
  [
    "a retained unclosed fence opens a code block in a nested dd",
    "- :: t\n  : para\n %% c\n```\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>\n<p>para</p>\n<pre><code></code></pre>\n</dd>\n</dl>\n</li>\n</ul>"
  ],
  [
    "control: unchanged",
    "- :: t\n  : para\n   - li\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para\n- li</dd>\n</dl>\n</li>\n</ul>"
  ],
  [
    "control: unchanged",
    "- > a\n  b\n [r]: /u\n",
    "<ul>\n<li>\n<blockquote><p>a\nb\n[r]: /u</p></blockquote>\n</li>\n</ul>"
  ]
]

for (const [cluster, source, expected] of cases) {
  test(`${cluster}: ${JSON.stringify(source)}`, () => {
    assert.equal(normalize(renderDoc(parse(source))), expected)
  })
}
