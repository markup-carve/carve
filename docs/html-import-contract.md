# HTML import contract

This is an integration map for the normative [Carve 0.2 HTML importer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md). Use the specification when exact element, attribute, whitespace, or diagnostic behavior matters. The 0.1 importer contract is not a substitute for it.

## Input and two outputs

`importDocument` takes HTML text and `from: "html"`. It returns a 2.0 document tree, canonical Carve source, and a diagnostics record. The tree is the semantic result. The source is what the canonical writer can spell; losses identify facts with no faithful Carve spelling. A roundtrip render may carry Carve facts that ordinary HTML cannot express, and the importer reads those carriers. See [scope and input](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#scope-and-input) and [carriers](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#carriers-and-the-two-documents).

## Conversion stages

The importer reads HTML structure, whitespace, block and inline elements, lists, tables, figures, links, images, attributes, footnotes, and raw content under separate rules. These sections give the precedence and the repairs for malformed or unsupported shapes:

- [Content and whitespace](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#how-content-is-read)
- [Blocks and lists](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#block-elements)
- [Tables and figures](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#tables)
- [Inline elements, links, and images](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#inline-elements)
- [Attributes and unsupported elements](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#attributes)
- [Footnotes and raw content](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#footnotes)

Do not infer the Carve source from the original HTML's textual spelling. The importer normalizes whitespace, repairs some structures, and then uses the writer. An unsupported element may contribute its children while losing its element identity. For machine migration, compare the returned tree and diagnostic codes, not HTML strings alone. See [normalization](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#normalization).

## Failure policy

`strictLosses` rejects a result with a non-allowed render loss. Invalid HTML input and an invalid produced tree have distinct CLI failure categories. `rawHtml` is false by default and changes which raw elements can be kept. See [import diagnostics](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#diagnostics), [the guarantee](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md#the-guarantee), and [CLI exits](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#exit-codes).

## Changed in 0.2: legacy fixture index

The directories below are the existing 0.1 HTML import fixtures. The 0.1 migration audit reads this index. They are not a conformance list for the 0.2 importer; use the [0.2 import specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/import-html.md) for current behavior.

| fixture | subject |
| --- | --- |
| `basic` | a heading, emphasis and a link - the shape everything else assumes |
| `security` | an event handler and a `<script>` removed, and said so |
| `semantic-spans-core` | `kbd`, `abbr` and `time`, the three core names |
| `semantic-spans-extension` | `samp`, `var`, `cite` and `dfn`, which need the extension to render as elements |
| `semantic-span-attributes` | a consumed value beside a leftover `id`/`class`, a value that needs quotes, an empty value, and an event handler still stripped |
| `semantic-span-carve-outs` | `<mark>`, inline `<code>` and `<pre><code>`, none of which take the compact form |
| `figure-caption` | a `<figure>` with a `<figcaption>`, which imports as the image and a caption line |
| `blockquote-cite` | a `<blockquote cite>`, whose attribute is kept on a block-attribute line |
| `derived-accessible-name` | a diagram fence's derived `role` and name, dropped, beside an authored name that is kept |
| `derived-endnotes-section` | a reference-less endnotes `<section>`, whose wrapper and both attributes are derived, so nothing is reported - and whose one-item list spells its looseness with `{loose}` |
| `synthesized-wrapper-path` | a bare inline run wrapped in a paragraph the importer added, whose diagnostic is numbered among the body children rather than inside the wrapper |
| `container-round-trip` | a rendered callout and a named container, which come back as the containers they were written from rather than as a body and a `div` |
| `caption-attributes` | an attribute on a `<figcaption>`, dropped because a caption line has no slot for it, and reported rather than dropped in silence |
| `table-caption-attributes` | an attribute on a table's `<caption>`, the other spelling of a caption line, reported by the same rule |
| `traversal-shaped-index` | the three index exemptions on one document - an item, a row and a cell, none of which whitespace can move |
| `table-caption-index` | the same table caption written across lines, where it is the SECOND child and no exemption applies to it |
| `container-nesting` | containers two and three deep, whose fences widen INWARD because that is the form `carve fmt` writes |
| `attribute-less-div` | a bare `<div>` unwrapped to its content beside an id-bearing one that keeps its fence, which is where that boundary sits |
| `unsupported-element-keeps-its-blocks` | unsupported elements around blocks, beside loose text, nested two deep, inside a list item and inside a paragraph, each replaced by its children with one row |
| `container-label-keeps-the-fence` | a `<div>` kept by its grouping label alone, an id-bearing one whose label comes back on the opener, and one whose label the lift refuses so it unwraps after all |
| `diagnostic-order` | two losses in one table, whose rows follow the document and not the order the importer builds them in |
| `destination-less-link` | an explicit empty `href` or `src` becomes a native node; the anchor missing `href` unwraps. The pinned engine's older output is declared in `html-import-pin-drift.txt`. |
| `denied-scheme-destination` | a `javascript:` anchor, a split-scheme anchor that keeps its `id`, and a `data:` image, which come back as their content with one warning each |
| `marker-shaped-cell` | a table cell whose whole payload is a span marker, escaped so the cell survives |
| `symbol-sigil-escape` | a symbol sigil in imported text, escaped so it stays the text the HTML held |
| `extension-sigil-escape` | text ending in `:name` before a span and before a link, whose colon is escaped so the two do not join into an inline extension |
| `detached-caption-caret` | a paragraph that looks like a caption line under an image, escaped so it stays a paragraph |
| `note-reference-in-a-span` | a span whose text opens a note-reference label, escaped beside the unlabeled caret that needs no escape |
| `empty-definition-description` | an empty `<dd>`, dropped with a row that declares it, where the bare colon line would have taken the `<dt>` too |
| `empty-definition-description-not-last` | the same empty `<dd>` with an entry after it, where the list is broken rather than letting the next term inherit the description below |
| `endnotes-section-not-last` | an endnotes section with a paragraph after it, which keeps its position through `::: footnotes` |
| `whitespace-only-block` | a `<p>` holding one no-break space, kept as itself, beside the ASCII-space and tab spellings that carry nothing and are dropped with a row |
| `table-degraded` | a `<thead>` between two `<tbody>` runs, which the row-grouping field cannot describe: the head is a prefix of the rows and the foot a suffix |
| `list-table-for-block-cells` | a table with a list, a code block and two paragraphs in its cells, imported with `options.json` setting `listTableForBlockCells`: spans as `^` and `<`, a `<th>` outside the header rows as `{header}`, a cell class on its item, a hard break kept, a lone `^` escaped, and the row's `id` reported |
| `task-state-is-consumed` | a `data-task-state` read as the item's state beside a ticked box that needs none, and a value outside the enumeration that stays the author's attribute |
| `task-list-class-and-done-state-are-consumed` | a list's `task-list` class consumed beside an authored class that stays, and a done item's `data-task-state="x"` consumed with its ticked box |
| `ordered-delimiter-is-consumed` | a `data-delim` read as the list's delimiter, the bare `<ol>` that stays `.`, the attribute beside `type` and `start`, and a value outside the enumeration that stays the author's attribute |
| `same-kind-strong-nesting` | a strong directly inside a strong, with both levels preserved as braced spans (PART 11 §1c) |
| `same-kind-superscript-nesting` | two superscript levels preserved as nested braced spans |
| `same-kind-indirect-nesting` | an emphasis inside a strong inside an emphasis, kept because the braced strong between them starts its own scope (PART 9 §9 R1, #2091) |
| `table-cell-hard-break` | a `<br>` in a cell written as one space between words, as nothing at the cell's end, and as a space at the edge of a span inside the cell, one row per break (PART 11 §1b) |
| `adjacent-code-spans` | two `<code>` elements with nothing between them, separated by an empty delimited comment so the backtick runs do not merge (PART 11 §10k N3) |
| `link-edge-whitespace` | edge whitespace of a link and a span moved outside, merged at a join and dropped at a block edge, beside a no-break space, a whitespace-only label and an edge image that stay |
| `formatting-around-link` | formatting around a link drops block-edge and redundant padding while keeping the only separator, including asymmetric and nested cases |
| `mathml-without-tex` | presentation-only MathML imported as its text where the tokens are linear, and a fraction dropped where they are not |
| `mathml-fallback-image` | a formula beside its fallback image imported once, including through the image's `alt` when the `<math>` carries no TeX |
| `empty-list` | a `<ul>` and an `<ol>` with no item, attributed inside a container, bare, and nested in an item, each dropped with one row |
| `section-wrapper-id` | a `<section>` around a heading whose authored id comes back on the heading, a derived id that does not, a heading id that wins over the section's, and a section class that is dropped with a row |
| `empty-paragraph` | an attributed empty `<p>` and one holding only an empty `<span>`, each dropped with one row, beside an attributed `<hr>` that keeps its attribute |
| `comment-beside-dropped-element` | a comment beside an empty unknown element and beside a `<noscript>`, written as a block comment because a dropped element leaves no inline run, and beside an unknown element with text, which keeps it inline |
| `authored-role` | an authored `role` on a container, a span and a list item, kept because the renderer derives none of them |
| `url-list-attribute` | a `srcset` on an image, kept because a URL-list attribute is hardened by the renderer rather than refused |
| `adjacent-definition-lists` | two attribute-less `<dl>` elements joined into one list with a row, beside a paragraph and an attributed `<dl>` that each keep a list apart |
| `figure-target-attributes` | a figure around a code block and around a quote, each sharing one attribute line with its target, and an image whose own braces keep its attributes apart |
| `table-cell-multi-line-comment` | a comment holding a line break dropped from a cell with a row, a one-line comment among a cell's blocks written inline, and a multi-line comment outside any cell kept |
| `lone-bracket-in-bracketed-content` | an unpaired `[` or `]` inside a span or link text, escaped in the minimal form as in `[\[]{.b}`, beside balanced pairs that stay bare (PART 11 §5) |
| `paren-after-a-closed-bracket` | a `(` right after a paired bare `]` that would open a closing destination, escaped as `[a]\(b)` at top level, in a span, across code and around nested parentheses, beside `f(x)`, `[a] (b)`, `[a](b c)` and `[a]()` that stay bare (PART 11 §5). Across EMPHASIS the escape moves to the bracket opener, `\[/a](b)/`: PART 8 resolves the bracket run before the emphasis marker (carve#2577), so a bare pair would swallow the closer, and once the opener is escaped the paren escape is idle (PART 11 §2) |
| `auto-text-link` | a link to a heading whose text repeats the heading, written as `[Target](#Target)` and not recovered as the cross-reference `</#Target>` |
| `editorial-comment` | a `critic-comment` span, kept as a classed span and not recovered as the editorial comment `{#note#}` |
| `forced-strike` | an `<s>` inside a word, written in the braced form `a{~b~}c` |
| `forced-strong` | the same intraword case for `<strong>`, written as `a{*b*}c` |
| `forced-underline` | the same intraword case for `<u>`, written as `a{_b_}c` |
| `inline-extension` | a span whose class names an extension, kept as a classed span and not recovered as an inline extension |
| `local-hard-break-block` | a `hardbreaks` div, written as a `::: hardbreaks` container with an explicit backslash break rather than as the local hard-break block |
| `math-block-and-mathml` | a display-math `div` and a block and an inline `<math>` read through `alttext`, all written in the core math form, with an `encoding-assumed` row for each `alttext` |
| `substitution` | a `<del>` followed by an `<ins>`, written as `{-old-}{+new+}` and not merged into the substitution `{~old~>new~}` |
| `code-language-hints` | one code block per recognized language-hint convention, plus a conflicting pair where the `code` child's class wins, the hinting attribute kept on the block as well |
| `attribute-value-pipe` | a pipe in an attribute value on a cell and on a span inside a cell, backslash-escaped so the row does not split |
| `attribute-value-line-break` | an attribute value holding a line break, dropped with a row because a Carve attribute value cannot hold one |
| `definition-description-without-term` | a `<dd>` with no `<dt>` before it, emitted as blocks ahead of the list with a row, including a list holding no entry whose class is dropped |
| `cell-text-align-columns` | cell CSS maps to column markers without unmapped-style rows |
| `cell-text-align-overrides` | explicit body alignment overrides the header default |
| `cell-text-align-declarations` | the last supported declaration wins; unsupported values and priority suffixes remain unmapped |
| `cell-text-align-unmapped` | supported alignment maps while unrelated CSS and unsupported values report loss |
| `heading-multi-line-comment` | an HTML comment holding a line break inside a heading, dropped with a row because a heading is one line |
| `summary-holding-blocks` | a `<summary>` holding blocks flattened into the container title, with a row per unwrapped element and per dropped attribute |
| `container-class-a-fence-word-spells` | a digit-leading class, which `explicit_identifier` admits, consumed as the fence word |
| `empty-heading` | a bare empty heading and an attributed whitespace-only one, each dropped with one row |
| `code-span-holding-blocks` | two blocks flattened into a `<code>`, joined with no separator and the lost boundary reported |
