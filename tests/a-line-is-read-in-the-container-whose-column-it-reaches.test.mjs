import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../scripts/spec/layout.mjs'
import { renderDoc } from '../scripts/spec/html.mjs'

const normalize = (h) => h.split('\n').map(line => line.trim()).filter(Boolean).join('\n')
const cases = [
  [
    "a quote in a description marker-line note takes the lazy line",
    "x[^c]\n\n:: t\n: [^c]: para\n     > q\ntail\n",
    "<p>x<a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<dl>\n<dt>t</dt>\n<dd></dd>\n</dl>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n<hr>\n<ol>\n<li id=\"fn1\">\n<p>para</p>\n<blockquote><p>q\ntail</p></blockquote>\n<p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n</li>\n</ol>\n</section>"
  ],
  [
    "a matched comment fence below the item column closes the item",
    "- > para\n  > more\n %%%\n %%%\n```\n",
    "<ul>\n<li>\n<blockquote><p>para\nmore</p></blockquote>\n</li>\n</ul>\n<pre><code></code></pre>"
  ],
  [
    "a comment at column 0 closes the item, so the code block opens in the document",
    "- para\n%% c\n```\n  x\n\n  y\n",
    "<ul>\n<li>para</li>\n</ul>\n<pre><code>  x\ny\n</code></pre>"
  ],
  [
    "after a quoted paragraph, a column-0 comment closes the item and the unclosed fence takes x",
    "- > para\n  > more\n%% c\n```\nx\n",
    "<ul>\n<li>\n<blockquote><p>para\nmore</p></blockquote>\n</li>\n</ul>\n<pre><code>x\n</code></pre>"
  ],
  [
    "a comment below the item column closes the note and item, and the unclosed fence opens in the document",
    "- ::: note\n  more\n %% c\n```\n",
    "<ul>\n<li>\n<aside class=\"admonition note\" aria-label=\"Note\">\n<p>more</p>\n</aside>\n</li>\n</ul>\n<pre><code></code></pre>"
  ],
  [
    "a column-0 comment closes the item, and the unclosed fence takes its payload in the document",
    "- para\n%% c\n```\nx\n",
    "<ul>\n<li>para</li>\n</ul>\n<pre><code>x\n</code></pre>"
  ],
  [
    "a caption line below a description body's column folds into a quoted paragraph there as text, as under a list item",
    ":: t\n: > para\n^ cap\n",
    "<dl>\n<dt>t</dt>\n<dd>\n<blockquote><p>para\n^ cap</p></blockquote>\n</dd>\n</dl>"
  ],
  [
    "a caption line below a description body's column folds into its paragraph as text",
    ":: t\n: para\n^ cap\n",
    "<dl>\n<dt>t</dt>\n<dd>para\n^ cap</dd>\n</dl>"
  ],
  [
    "a plus at the description column attaches its next paragraph",
    "- :: term\n  : body\n  +\n  before\n   > nested\n",
    "<ul>\n<li>\n<dl>\n<dt>term</dt>\n<dd>\n<p>body</p>\n<p>before</p>\n</dd>\n</dl>\n<blockquote><p>nested</p></blockquote>\n</li>\n</ul>"
  ],
  [
    "a table row below a description body's column closes the body",
    ":: t\n: para\n | a |\n",
    "<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<table>\n<tbody>\n<tr><td>a</td></tr>\n</tbody>\n</table>"
  ],
  [
    "a thematic break below a description body's column closes the body",
    ":: t\n: para\n ---\n",
    "<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<hr>"
  ],
  [
    "a heading below a description body's column closes the body, as under a list item",
    ":: t\n: para\n # H\n",
    "<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<section id=\"H\">\n<h1>H</h1>\n</section>"
  ],
  [
    "an opener below a description column closes its quote",
    ":: t\n: > para\n # H\n",
    "<dl>\n<dt>t</dt>\n<dd>\n<blockquote><p>para</p></blockquote>\n</dd>\n</dl>\n<section id=\"H\">\n<h1>H</h1>\n</section>"
  ],
  [
    "a column-0 comment closes the item, and the unclosed fence takes the column-0 line",
    "1. :: t\n   : para\n%% c\n```\nx\n",
    "<ol>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n</li>\n</ol>\n<pre><code>x\n</code></pre>"
  ],
  [
    "a marker at the item column opens a list under a nested description",
    "- :: t\n  : para\n  - li\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<ul>\n<li>li</li>\n</ul>\n</li>\n</ul>"
  ],
  [
    "a column-0 comment closes the item after a marked quote continuation",
    "- > para\n  > more\n%% c\nx\n",
    "<ul>\n<li>\n<blockquote><p>para\nmore</p></blockquote>\n</li>\n</ul>\n<p>x</p>"
  ],
  [
    "a definition below the item column closes the quote and the item",
    "- > a\n  > b\n [r]: /u\nx\n",
    "<ul>\n<li>\n<blockquote><p>a\nb</p></blockquote>\n</li>\n</ul>\n<p>x</p>"
  ],
  [
    "a footnote body in a quote takes the lazy line",
    "- > para\n  > [^f]: n\n  >   - sub\ntail[^f]\n",
    "<ul>\n<li>\n<blockquote><p>para</p></blockquote>\n</li>\n</ul>"
  ],
  [
    "a note on a description marker line keeps its body column",
    "x[^c]\n\n:: t\n: [^c]: para\n    # H\n",
    "<p>x<a id=\"fnref1\" href=\"#fn1\" role=\"doc-noteref\"><sup>1</sup></a></p>\n<dl>\n<dt>t</dt>\n<dd></dd>\n</dl>\n<section role=\"doc-endnotes\" aria-label=\"Footnotes\">\n<hr>\n<ol>\n<li id=\"fn1\">\n<p>para</p>\n<h1 id=\"H\">H</h1>\n<p><a href=\"#fnref1\" role=\"doc-backlink\" aria-label=\"Back to reference\">↩</a></p>\n</li>\n</ol>\n</section>"
  ],
  [
    "a column-0 line folds into the note of a description-hosted item (carve#3919)",
    ":: t\n: - para\n    [^p]: n\nx\n",
    "<dl>\n<dt>t</dt>\n<dd>\n<ul>\n<li>para</li>\n</ul>\n</dd>\n</dl>"
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
    "an unclosed fence line does not fold into a quoted term",
    "> :: t\n```\n",
    "<blockquote>\n<dl>\n<dt>t</dt>\n</dl>\n</blockquote>\n<pre><code></code></pre>"
  ],
  [
    "a comment below the item column closes the nested dd, and the unclosed fence opens in the document",
    "- :: t\n  : para\n %% c\n```\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n</li>\n</ul>\n<pre><code></code></pre>"
  ],
  [
    "a marker past the item column below its description opens a sibling list (CARVE-P2-017)",
    "- :: t\n  : para\n   - li\n",
    "<ul>\n<li>\n<dl>\n<dt>t</dt>\n<dd>para</dd>\n</dl>\n<ul>\n<li>li</li>\n</ul>\n</li>\n</ul>"
  ],
  [
    "control: unchanged",
    "- > a\n  b\n [r]: /u\n",
    "<ul>\n<li>\n<blockquote><p>a\nb</p></blockquote>\n</li>\n</ul>"
  ]
]

for (const [cluster, source, expected] of cases) {
  test(`${cluster}: ${JSON.stringify(source)}`, () => {
    assert.equal(normalize(renderDoc(parse(source))), expected)
  })
}
