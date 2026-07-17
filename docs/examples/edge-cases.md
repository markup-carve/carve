---
title: "Examples: Edge Cases"
description: Corner cases and robustness guarantees, side by side with the HTML they produce.
---

# Edge Cases examples

The corner cases: precise boundary rules, table alignment variants, lazy continuation, paragraph interruption, security hardening, and other robustness guarantees. These pin behavior that is easy to get subtly wrong.

## Table column alignment

::: compare

```carve
|= Name |=> Age |=~ City |
| Alice  | 28     | NYC     |
| Bob    | 34     | London  |
```

```html
<table>
  <thead><tr><th>Name</th><th style="text-align: right;">Age</th><th style="text-align: center;">City</th></tr></thead>
  <tbody>
    <tr><td>Alice</td><td style="text-align: right;">28</td><td style="text-align: center;">NYC</td></tr>
    <tr><td>Bob</td><td style="text-align: right;">34</td><td style="text-align: center;">London</td></tr>
  </tbody>
</table>
```

:::

## Table per-cell alignment override

::: compare

```carve
|= Item     |=> Qty |
| Apple      | 12     |
| Subtotal   |< 12    |
```

```html
<table>
  <thead><tr><th>Item</th><th style="text-align: right;">Qty</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td style="text-align: right;">12</td></tr>
    <tr><td>Subtotal</td><td style="text-align: left;">12</td></tr>
  </tbody>
</table>
```

:::

## Headerless table alignment

::: compare

```carve
| a |> 9  |
| b |> 10 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td style="text-align: right;">9</td></tr>
    <tr><td>b</td><td style="text-align: right;">10</td></tr>
  </tbody>
</table>
```

:::

## Table without alignment

::: compare

```carve
|= Name     |= Age |
| Alice     |   28 |
| Bob       |   34 |
```

```html
<table>
  <thead><tr><th>Name</th><th>Age</th></tr></thead>
  <tbody>
    <tr><td>Alice</td><td>28</td></tr>
    <tr><td>Bob</td><td>34</td></tr>
  </tbody>
</table>
```

:::

## Table alignment with colspan

::: compare

```carve
|=> Category |= Item   |= Price |
| Fruit       | Apple    | $1      |
| Total       | <        | $1.50   |
```

```html
<table>
  <thead><tr><th style="text-align: right;">Category</th><th>Item</th><th>Price</th></tr></thead>
  <tbody>
    <tr><td style="text-align: right;">Fruit</td><td>Apple</td><td>$1</td></tr>
    <tr><td colspan="2" style="text-align: right;">Total</td><td>$1.50</td></tr>
  </tbody>
</table>
```

:::

## Table doubled alignment marker

Per the disambiguation rule, a `<`/`>`/`~` immediately after `|` or
`|=` is an alignment marker, and exactly one is recognized — so in
`|=<<` the first `<` aligns the column left and the *repeated* second
`<` is ordinary content. The marker is never doubled and never escapes
the header `=`.

::: compare

```carve
|=<< Note |= Plain |
| a         | b       |
```

```html
<table>
  <thead><tr><th style="text-align: left;">&lt; Note</th><th>Plain</th></tr></thead>
  <tbody>
    <tr><td style="text-align: left;">a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

## Fenced code shorter inner fence

A code-fence closer must use the same character and be at least as
long as the opener — a shorter run inside is literal content.

::: compare

````carve
```
line
``
still code
```
````

````html
<pre><code>line
``
still code
</code></pre>
````

:::

## Blockquote caption after a blank line

One blank line is allowed between a block and its `^` caption; the
quote becomes a `<figure>` with a `<figcaption>`.

::: compare

```carve
> quote text

^ Source: Someone
```

```html
<figure>
  <blockquote><p>quote text</p></blockquote>
  <figcaption>Source: Someone</figcaption>
</figure>
```

:::

## Table cell escaped pipe

A backslash-escaped pipe is literal content and does not split the
cell.

::: compare

```carve
|= A |= B |
| x \| y | z |
```

```html
<table>
  <thead><tr><th>A</th><th>B</th></tr></thead>
  <tbody>
    <tr><td>x | y</td><td>z</td></tr>
  </tbody>
</table>
```

:::

## Table cell pipe inside code span

A pipe inside a code span is protected and does not split the cell.

::: compare

```carve
|= A |= B |
| `a|b` | z |
```

```html
<table>
  <thead><tr><th>A</th><th>B</th></tr></thead>
  <tbody>
    <tr><td><code>a|b</code></td><td>z</td></tr>
  </tbody>
</table>
```

:::

## Abbreviation matches on word boundaries only

A defined abbreviation is expanded only as a whole word — it is not
substituted inside a longer word.

::: compare

```carve
*[HTML]: HyperText Markup Language

HTML and XHTMLish.
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> and XHTMLish.</p>
```

:::

## Mention ignores email addresses

`@` starts a mention only at a word boundary, so an email address is
left untouched.

::: compare

```carve
Write me@example.com or ping @markus.
```

```html
<p>Write me@example.com or ping <span class="mention"><strong>@markus</strong></span>.</p>
```

:::

## Tag requires a word boundary

`#` starts a tag only at a word boundary; `foo#bar` is literal text.

::: compare

```carve
A #tag here, but not in foo#bar.
```

```html
<p>A <span class="tag"><strong>#tag</strong></span> here, but not in foo#bar.</p>
```

:::

A tag name may be all digits, so `#123` is a tag (not literal) — `Issue #123` tags the number. Only a leading word boundary is required, not a leading letter.

::: compare

```carve
Issue #123 and #v2 here.
```

```html
<p>Issue <span class="tag"><strong>#123</strong></span> and <span class="tag"><strong>#v2</strong></span> here.</p>
```

:::

## Table stacked rowspan

Consecutive `^` cells extend the same origin cell; two stacked `^`
markers produce `rowspan="3"`.

::: compare

```carve
|= Tier |= User |
| Gold   | Ann  |
| ^      | Bo   |
| ^      | Cy   |
```

```html
<table>
  <thead><tr><th>Tier</th><th>User</th></tr></thead>
  <tbody>
    <tr><td rowspan="3">Gold</td><td>Ann</td></tr>
    <tr><td>Bo</td></tr>
    <tr><td>Cy</td></tr>
  </tbody>
</table>
```

:::

## Smart typography escapes and code

A backslash keeps the literal sequence; code spans and blocks are
never transformed.

::: compare

```carve
Escaped \-> and \... stay; code `a -- b ...` stays.
```

```html
<p>Escaped -&gt; and ... stay; code <code>a -- b ...</code> stays.</p>
```

:::

## Table multi-line cell continuation

A `+` line continues the previous row's cells, so a logical cell can
span several source lines.

::: compare

```carve
|= Feature |= Description        |
| Complex  | A long description |
+          | that continues     |
+          | across lines.      |
| Simple   | Single line.       |
```

```html
<table>
  <thead><tr><th>Feature</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>Complex</td><td>A long description that continues across lines.</td></tr>
    <tr><td>Simple</td><td>Single line.</td></tr>
  </tbody>
</table>
```

:::

## Table rowspan with multi-line content

A `+` continuation before a `^` rowspan extends the spanned cell.

::: compare

```carve
|= Category       |= Item   |
| Fresh Fruits    | Apple   |
+ from local      |         |
+ farms           |         |
| ^               | Banana  |
```

```html
<table>
  <thead><tr><th>Category</th><th>Item</th></tr></thead>
  <tbody>
    <tr><td rowspan="2">Fresh Fruits from local farms</td><td>Apple</td></tr>
    <tr><td>Banana</td></tr>
  </tbody>
</table>
```

:::

## Ordered marker vs prose

Letter and roman markers are ambiguous: a lone `a.` in running prose stays
text (it would need a blank line before, a sibling marker, or indentation
to start a list). Decimal markers always start a list.

::: compare

```carve
Pick option a. it is the best one here.
```

```html
<p>Pick option a. it is the best one here.</p>
```

:::

## Footnote with multiple blocks

A footnote definition's body is parsed as full block content — multiple
paragraphs (or lists, etc.) indented under the definition. The backlink
is appended to the last block.

::: compare

```carve
See the note.[^n]

[^n]: First paragraph of the note.

    Second paragraph, indented under the definition.
```

```html
<p>See the note.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>First paragraph of the note.</p>
      <p>Second paragraph, indented under the definition.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The continuation marker `+` also works here: a lone `+` attaches the following
flush-left block to the note, so a second block needs no indentation.

::: compare

```carve
See the note.[^n]

[^n]: First paragraph of the note.
+
A second paragraph, joined with +.
```

```html
<p>See the note.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>First paragraph of the note.</p>
      <p>A second paragraph, joined with +.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Empty delimiters

A delimiter pair with no content is literal text, not emphasis.

::: compare

```carve
** and // and ^^
```

```html
<p>** and // and ^^</p>
```

:::

## Nested containers

A longer colon fence nests: `::::` contains `:::` blocks, and only a bare
closer of equal-or-greater length closes a block.

::::: compare

```carve
:::: note
Outer.

::: tip
Nested.
:::
::::
```

```html
<aside class="admonition note">
  <p>Outer.</p>
  <aside class="admonition tip">
    <p>Nested.</p>
  </aside>
</aside>
```

:::::

## Attribute edge cases

Classes accumulate; `#id` and `key=value` (bare or quoted) attach in
source order on the `<span>`.

::: compare

```carve
[note]{.a .b #n key=val}
```

```html
<p><span class="a b" id="n" key="val">note</span></p>
```

:::

A quoted value keeps its spaces.

::: compare

```carve
[x]{title="a b"}
```

```html
<p><span title="a b">x</span></p>
```

:::

A `}` inside a quoted value is part of the value — the closing `}` is the
first one outside quotes.

::: compare

```carve
[x]{data-x="{y}"}
```

```html
<p><span data-x="{y}">x</span></p>
```

:::

The same quoted-`}` rule holds for every attribute-bearing construct, not
just spans. On an inline link:

::: compare

```carve
[t](u){k="{y}"}
```

```html
<p><a href="u" k="{y}">t</a></p>
```

:::

On an image:

::: compare

```carve
![a](u){k="{y}"}
```

```html
<img src="u" alt="a" k="{y}">
```

:::

On a heading (via a preceding block-attribute line; the attributes attach
to the `<h1>`):

::: compare

```carve
{k="{y}"}
# H
```

```html
<section id="H">
  <h1 k="{y}">H</h1>
</section>
```

:::

On a generic div (via a preceding block-attribute line; the `:::` fence
itself takes no inline attributes):

:::: compare

```carve
{k="{y}"}
:::
body
:::
```

```html
<div k="{y}">
  <p>body</p>
</div>
```

::::

On an inline extension (the attributes attach to its output element):

::: compare

```carve
:kbd[x]{k="{y}"}
```

```html
<p><kbd k="{y}">x</kbd></p>
```

:::

A value may be single-quoted as well as double-quoted; either form strips
its delimiters (grammar `quoted_value`).

::: compare

```carve
[x]{k='{y}'}
```

```html
<p><span k="{y}">x</span></p>
```

:::

Author attributes on an inline extension attach to its rendered element —
a class on a semantic shorthand lands on its tag.

::: compare

```carve
:kbd[x]{.foo}
```

```html
<p><kbd class="foo">x</kbd></p>
```

:::

A backslash escapes ASCII punctuation inside a quoted value, so the value
can contain a literal quote.

::: compare

```carve
[x]{title="a\"b"}
```

```html
<p><span title="a&quot;b">x</span></p>
```

:::

The same escape applies on a heading's attribute block (a preceding
block-attribute line, §15).

::: compare

```carve
{title="a\"b"}
# H
```

```html
<section id="H">
  <h1 title="a&quot;b">H</h1>
</section>
```

:::

A trailing brace block that yields no attribute is not an attribute block —
on a heading it stays part of the heading text rather than being dropped.

::: compare

```carve
# H {???}
```

```html
<section id="H">
  <h1>H {???}</h1>
</section>
```

:::

An attribute name (id, class, or key) is a grammar `identifier`, so it may
not start with a digit. A name that violates this makes the whole `{…}` not
an attribute block, so it stays literal. (A deliberate divergence from djot,
which accepts digit-first identifiers and `class="123"`; see jgm/djot issue
399.)

::: compare

```carve
[x]{.123} and [y]{12=v}
```

```html
<p>[x]{.123} and [y]{12=v}</p>
```

:::

A non-identifier character anywhere in the name is just as invalid, and one
bad name leaves the whole block literal even alongside a valid class.

::: compare

```carve
[x]{.a!b}
```

```html
<p>[x]{.a!b}</p>
```

:::

::: compare

```carve
[x]{.ok .1}
```

```html
<p>[x]{.ok .1}</p>
```

:::

A digit, hyphen, or underscore after the first identifier character is fine.

::: compare

```carve
[x]{.a1 #b2 k3=v}
```

```html
<p><span class="a1" id="b2" k3="v">x</span></p>
```

:::

## Escape coverage

A backslash escapes any ASCII punctuation character to its literal form. This
pins the full `ascii_punctuation` matrix (`&`, `:`, `;`, `?` included); `<`,
`>`, `&` are then HTML-escaped in the output.

::: compare

```carve
\!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~ done
```

```html
<p>!"#$%&amp;'()*+,-./:;&lt;=&gt;?@[\]^_`{|}~ done</p>
```

:::

A backslash before a non-ASCII character or a letter is literal; `\\` is a
single backslash.

::: compare

```carve
\a and \« and a\\b
```

```html
<p>\a and \« and a\b</p>
```

:::

## Parenthesized ordered marker

Carve's ordered markers use the `.` and `)` delimiters only; a
parenthesized `(1)` is **not** a list marker (it is too easily confused
with a prose parenthetical), so it stays literal text.

::: compare

```carve
(1) First
(2) Second
```

```html
<p>(1) First
(2) Second</p>
```

:::

## Emphasis edge cases

Two emphasis spans of the same kind sit side by side without merging.

::: compare

```carve
*a* and *b*
```

```html
<p><strong>a</strong> and <strong>b</strong></p>
```

:::

A code span inside emphasis is preserved.

::: compare

```carve
*a `x` b*
```

```html
<p><strong>a <code>x</code> b</strong></p>
```

:::

Different-kind delimiters sit adjacent without interfering.

::: compare

```carve
~old~ =new=
```

```html
<p><s>old</s> <mark>new</mark></p>
```

:::

Trailing punctuation after a closer is literal.

::: compare

```carve
*a, b*!
```

```html
<p><strong>a, b</strong>!</p>
```

:::

## List nesting and looseness

A more-indented marker nests a sublist inside the item.

::: compare

```carve
- a
  - b
  - c
- d
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
  <li>d</li>
</ul>
```

:::

A blank line between items makes the list loose (each item wraps in `<p>`).

::: compare

```carve
- a

- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

An item with a second paragraph is loose; the continuation is indented
under the marker.

::: compare

```carve
- a

  more
- b
```

```html
<ul>
  <li><p>a</p>
    <p>more</p>
  </li>
  <li><p>b</p></li>
</ul>
```

:::

## Doubled emphasis delimiters

A bare single-character emphasis delimiter immediately adjacent to the same
delimiter does not open a span, so a doubled delimiter is literal text. This
"no nesting of same type" rule is uniform across all seven single-character
delimiters: `**`, `~~`, `^^`, `==`, and `,,` stay literal exactly like `//` and
`__`.

::: compare

```carve
**a** ~~b~~ ^^c^^
```

```html
<p>**a** ~~b~~ ^^c^^</p>
```

:::

## Nested brackets in link text

Link, image, and span text may contain balanced nested brackets; the closing
`]` is found by balance, not at the first inner `]`.

::: compare

```carve
[a [b] c](/u)
```

```html
<p><a href="/u">a [b] c</a></p>
```

:::

## Reference labels are case-sensitive

Reference labels are matched case-sensitively (no case normalization). A
label whose case does not match its definition stays unresolved and renders
literally, like any other unresolved reference.

::: compare

```carve
[Text][REF]

[ref]: /u
```

```html
<p>[Text][REF]</p>
```

:::

## Two-char delimiter runs

Every bare delimiter is single-char. A doubled (or longer) run of any delimiter
is literal by the same-delimiter-adjacency rule, so `==x==` and `~~y~~` are
doubled `=` / `~` and render literal, while the single-char `=z=` and `~w~`
mark.

::: compare

```carve
==x== ~~y~~ =z= ~w~
```

```html
<p>==x== ~~y~~ <mark>z</mark> <s>w</s></p>
```

:::

## Trailing attribute block edge cases

A trailing attribute block applies to an emphasis span, like any other inline
node.

::: compare

```carve
*x*{.real}
```

```html
<p><strong class="real">x</strong></p>
```

:::

A line-leading image is a standalone block image only when a trailing `{…}`
yields real attributes. An empty/whitespace or invalid block falls through to
a paragraph and stays literal.

::: compare

```carve
![a](/i){???}
```

```html
<p><img src="/i" alt="a">{???}</p>
```

:::

::: compare

```carve
![a](/i){ }
```

```html
<p><img src="/i" alt="a">{ }</p>
```

:::

## Paragraph interruption

A paragraph ends at a blank line — or at a line that begins an interrupting
block. Under the Markdown-like rule (§10) a **visible** block interrupts an open
paragraph with no blank line before it, at the top level and inside nested
content. Three carve-outs keep common prose safe: **list markers never
interrupt** — neither a bullet (`- `/`* `) nor an ordered marker, in any dialect
or value, so a list always needs a blank line before it (symmetric, Djot-like);
a fence or `:::` interrupts only when it has a matching closer ahead; and a bare
image is never a block. Invisible constructs (reference definitions, comments,
block-attribute lines) interrupt as they always have.

A heading marker after a prose line interrupts.

::: compare

```carve
text
# H
```

```html
<p>text</p>
<section id="H">
  <h1>H</h1>
</section>
```

:::

A fenced code block with a closer interrupts (an inline span no longer).

::: compare

````carve
text
```
code
```
````

```html
<p>text</p>
<pre><code>code
</code></pre>
```

:::

A thematic break interrupts; the line after it parses fresh (not a smart
em-dash any more).

::: compare

```carve
text
---
more
```

```html
<p>text</p>
<hr>
<p>more</p>
```

:::

A block quote marker interrupts.

::: compare

```carve
text
> q
```

```html
<p>text</p>
<blockquote><p>q</p></blockquote>
```

:::

An unordered list does **not** interrupt — like an ordered marker it needs a
blank line, so the bullet lines fold into the paragraph.

::: compare

```carve
text
- a
- b
```

```html
<p>text
- a
- b</p>
```

:::

An ordered-list marker does **not** interrupt either — the bullet and the
ordered marker behave identically at the paragraph boundary.

::: compare

```carve
text
1. x
2. y
```

```html
<p>text
1. x
2. y</p>
```

:::

A valid table row interrupts.

::: compare

```carve
text
| a | b |
```

```html
<p>text</p>
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

An admonition (or generic div) with a closer interrupts.

:::: compare

```carve
text
:::note
body
:::
```

```html
<p>text</p>
<aside class="admonition note">
  <p>body</p>
</aside>
```

::::

**Carve-out — list markers never interrupt.** Neither a bullet nor an ordered
marker interrupts a paragraph; both need a blank line. An ordered marker is too
common in prose ("see step 2.", "version 1985.", "upgrade to 1. today") to
interrupt, and making the bullet match removes the asymmetry (and the residual
false positive where a hard-wrapped prose line beginning with a bullet became a
list). So no ordered value — `1.`, `2.`, a year — and no bullet interrupts; all
stay paragraph text.

::: compare

```carve
text
2. y
3. z
```

```html
<p>text
2. y
3. z</p>
```

:::

::: compare

```carve
text
1985. was the year
```

```html
<p>text
1985. was the year</p>
```

:::

**Carve-out — closer lookahead.** A `:::` block (or a fence) with no matching
closer ahead does not interrupt; it stays paragraph text, so a stray marker
never swallows the rest of the block.

:::: compare

```carve
text
:::note
body
```

```html
<p>text
:::note
body</p>
```

::::

**Carve-out — image excluded.** A bare image is inline content, so it renders
in the same paragraph, never as its own block.

::: compare

```carve
text
![a](u)
```

```html
<p>text
<img src="u" alt="a"></p>
```

:::

**Nested content.** The rule applies inside a block quote too: a list marker
after a prose line does not interrupt within the quote — it folds into the
quoted paragraph (a blank line is needed to start the list).

::: compare

```carve
> p one
> - item
```

```html
<blockquote><p>p one
- item</p></blockquote>
```

:::

An indented sublist still nests with no blank line (unchanged).

::: compare

```carve
- a
   - b
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

**Invisible constructs** still interrupt with no blank line: a comment line is
consumed,

::: compare

```carve
para
%% c
```

```html
<p>para</p>
```

:::

and a reference definition is collected, leaving only the paragraph.

::: compare

```carve
a[r]
[r]: http://x
```

```html
<p>a[r]</p>
```

:::

A blank line still ends the paragraph and the block parses fresh, exactly as
before.

::: compare

```carve
text

# H
```

```html
<p>text</p>
<section id="H">
  <h1>H</h1>
</section>
```

:::

An **unterminated** fence opener does not interrupt a paragraph (§10 closer
lookahead): with no matching closer ahead, the ` ``` ` line stays paragraph
text. It is then an unclosed inline verbatim run, which renders as a `<code>`
span to the end of the block (matching the `code_span` maximal-run rule).

::: compare

````carve
Text
```
code
````

```html
<p>Text
<code>
code</code></p>
```

:::

Likewise an unterminated `:::` opener does not interrupt: with no matching
closer ahead it is literal text, so a stray `:::` in prose never swallows the
rest of the block.

:::: compare

```carve
Text
:::
stuff
```

```html
<p>Text
:::
stuff</p>
```

::::

## Blockquote lazy continuation

A line that follows a `>` line, is not blank, and does not begin its own block continues the blockquote — the `>` may be omitted on continuation lines (CommonMark-style). A blank line ends the quote.

::: compare

```carve
> quoted
continued
```

```html
<blockquote><p>quoted
continued</p></blockquote>
```

:::

A block-opener is not a lazy continuation: it ends the quote and starts that block outside it. A **list marker — bullet or ordered — folds in**, though: a quoted line ends in an open paragraph, and a list marker folds into an open paragraph (§10), exactly as at the top level. So `> quoted` then `- item` is one quote whose paragraph is `quoted` + `- item`, not a quote plus a sibling list. (A heading, a bounded title, is still ended by a list marker; to put a real list in a quote, `>`-prefix it or use the `+` continuation marker.)

::: compare

```carve
> quoted
- item
```

```html
<blockquote><p>quoted
- item</p></blockquote>
```

:::

The fold needs an open paragraph to fold into. When the last quoted line is a heading (or any block that is not an open paragraph), there is nothing to fold into, so the list marker ends the quote and starts a top-level list — exactly as `# h` then `- item` does at the top level.

::: compare

```carve
> # h
- item
```

```html
<blockquote>
  <h1 id="h">h</h1>
</blockquote>
<ul>
  <li>item</li>
</ul>
```

:::

## Fenced code language with punctuation

A language tag may contain punctuation (`c++`, `c#`, `f#`, `asp.net`). The info string is still a single token, so a multiword or quoted info (e.g. `js title="x"`) is not a fence.

::: compare

````carve
```c++
int main() {}
```
````

```html
<pre><code class="language-c++">int main() {}
</code></pre>
```

:::

## Multi-line headings

A heading spills onto following lines until a blank line. Three heading-specific rules: a continuation line carries the **same** number of `#` (stripped) or **none** (djot); a line with a **different** `#` count — more *or* fewer — starts a new heading; and a blank line or a caption (`^ …`, which attaches via §4) ends it. Everything else that ends a heading is *general block structure*, not a heading rule: a heading is a bounded title, so any block-opener (quote, table, fenced code, `:::` div, thematic break, `%%%` comment) ends it and starts that block, and a list marker — with no open paragraph in a title to fold into (§10) — starts a sibling list, exactly as at the top level. The heading id is built from the full folded text. (Setext underline headings remain intentionally excluded.)

::: compare

```carve
# Title
outside
```

```html
<section id="Title-outside">
  <h1>Title
outside</h1>
</section>
```

:::

A continuation line must carry the **same** number of `#` as the opener (or none). A line with a different count starts a new heading: `## still A` folds in, but `# B` (fewer `#`) is a new heading.

::: compare

```carve
## A
## still A
# B
```

```html
<section id="A-still-A">
  <h2>A
still A</h2>
</section>
<section id="B">
  <h1>B</h1>
</section>
```

:::

A list marker — bullet or ordered — ends the heading and starts a sibling list.

::: compare

```carve
# Title
- item
```

```html
<section id="Title">
  <h1>Title</h1>
  <ul>
    <li>item</li>
  </ul>
</section>
```

:::

An ordered marker ends the heading the same way (symmetric with the bullet).

::: compare

```carve
# Title
1. one
```

```html
<section id="Title">
  <h1>Title</h1>
  <ol>
    <li>one</li>
  </ol>
</section>
```

:::

## Blockquote lazy continuation stops at a fenced block

Lazy continuation only extends an open paragraph. A non-`>` line that lands inside an open fenced code block ends the quote instead of being swallowed into the code. After the quote ends, `b` starts a paragraph and the trailing `> c` interrupts it into a fresh block quote (§10 — a `>` marker interrupts a paragraph). In the second example the mid-paragraph ` ``` ` has no closer, so it does not interrupt (§10 closer lookahead); it is then an unclosed inline verbatim run that renders as a `<code>` span to the end of the block (matching djot and carve-php), and the lazy line still folds in.

::: compare

````carve
> ```
> a
b
> c
````

```html
<blockquote>
  <pre><code>a
</code></pre>
</blockquote>
<p>b</p>
<blockquote><p>c</p></blockquote>
```

:::

::: compare

````carve
> text
> ```
lazy
````

````html
<blockquote><p>text
<code>
lazy</code></p></blockquote>
````

:::

When the fence opener is immediately followed by a non-`>` line — with no
marked content line in between — the fence is never closed (an empty code
block), and the non-`>` line ends the quote. The trailing `> still` then opens
a fresh block quote.

::: compare

````carve
> ```
code no marker
> still
````

```html
<blockquote>
  <pre><code>
</code></pre>
</blockquote>
<p>code no marker</p>
<blockquote><p>still</p></blockquote>
```

:::

## List lazy continuation

A non-indented line that follows a list item folds into the item's lead paragraph when it is plain paragraph text and has no blank line before it. A blank line, or a line that starts a block (heading, blockquote, fenced code, thematic break, table, div, a definition), ends the list instead.

::: compare

```carve
- item
lazy
```

```html
<ul>
  <li>item
lazy</li>
</ul>
```

:::

::: compare

```carve
- a
# H
```

```html
<ul>
  <li>a</li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

An under-indented continuation line after a *nested* sublist still folds into the **deepest** open paragraph (CommonMark lazy continuation); its indentation does not place it at an intermediate level. A blank line before it makes it a fresh paragraph instead.

::: compare

```carve
- a
  - b
 c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
c</li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - b
    - c
   d
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
d</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

```carve
- a
  - b

 c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>c</p>
```

:::

Lazy continuation only ever extends an **open paragraph**. After a block inside an item, a dedented line therefore folds in only when that block leaves a paragraph open. A blockquote's trailing paragraph is open, so the line folds into the quote:

::: compare

```carve
- item
  > q
tail
```

```html
<ul>
  <li>item
    <blockquote><p>q
tail</p></blockquote>
  </li>
</ul>
```

:::

A fenced code block leaves no open paragraph, so a dedented line ends the item and starts a top-level block instead of joining the item:

::: compare

````carve
- item
  ```
  c
  ```
tail
````

```html
<ul>
  <li>item
    <pre><code>c
</code></pre>
  </li>
</ul>
<p>tail</p>
```

:::

A table is the same — no open paragraph, so the dedented line is a fresh top-level paragraph:

::: compare

```carve
- item
  | a | b |
tail
```

```html
<ul>
  <li>item
    <table>
      <tbody>
        <tr><td>a</td><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A closed `:::` div or admonition is a complete block with no open paragraph either, so the dedented line ends the item too (only a blockquote, whose trailing paragraph stays open, folds the line in):

::::: compare

```carve
- item
  :::note
  body
  :::
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note">
      <p>body</p>
    </aside>
  </li>
</ul>
<p>tail</p>
```

:::::

## Compact list blocks

A blank line is still required to start a block inside a list item, but it no longer makes the list *loose* when the indented content opens a block (sub-list, block quote, fenced code, fenced div, heading, table). The item stays **tight** — lead text inline, the block attached — so a checklist with notes or steps with code stay compact. (A Carve deviation: canonical djot renders these loose. Only the tight/loose rendering changes, not the block structure.)

::: compare

```carve
- item

  > note
- next
```

```html
<ul>
  <li>item
    <blockquote><p>note</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

A genuine second prose paragraph still makes the list loose (and so does a blank line between items).

::: compare

```carve
- item

  second para
- next
```

```html
<ul>
  <li><p>item</p>
    <p>second para</p>
  </li>
  <li><p>next</p></li>
</ul>
```

:::

## List continuation marker

A lone `+` at the list marker column attaches the following flush-left block to the current item, with no blank line, keeping the list tight — useful for code blocks or tables you would rather not indent.

Carve's bullet markers are `-` and `*` only. Unlike Markdown and Djot, `+` is **not** a bullet in Carve and never has been — it is reserved as the list-continuation marker. This is what makes a lone `+` unambiguous: there is no `+` list it could belong to. A `+ x` line is therefore ordinary paragraph text, not a list item.

::: compare

````carve
- Build the image
+
```sh
docker build -t app .
```
- Push it
````

```html
<ul>
  <li>Build the image
    <pre><code class="language-sh">docker build -t app .
</code></pre>
  </li>
  <li>Push it</li>
</ul>
```

:::

A quote or table attaches the same way.

::: compare

```carve
- item
+
> note
- next
```

```html
<ul>
  <li>item
    <blockquote><p>note</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

### Equivalent to the blank-line form

The continuation marker and the compact blank-line form (above) produce **identical** output — they are two spellings of the same thing. These are equivalent:

```carve
- One

  > Quote
```

```carve
- One
+
> Quote
```

Both render:

```html
<ul>
  <li>One
    <blockquote><p>Quote</p></blockquote>
  </li>
</ul>
```

Pick whichever reads better. The blank-line form indents the block under the item; the `+` form marks the attach point with a flush-left marker and keeps the block flush-left — handy for wide code or tables you would rather not indent. The marker must be a lone `+` at the list marker column with the block flush-left; an indented `+` is ordinary text, not a continuation marker.

### First block of an item

Put the marker and a lone `+` on the same line — `- +` — to start an item directly with a block, with the block body flush-left (no indentation). The item has no lead text; its whole content is the following block.

::: compare

````carve
- +
| a | b |
| c | d |
- next
````

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td><td>b</td></tr>
        <tr><td>c</td><td>d</td></tr>
      </tbody>
    </table>
  </li>
  <li>next</li>
</ul>
```

:::

A lone `+` after the marker is the continuation marker, not text. `- + text` (with content after the `+`) keeps `+ text` as literal item text — only a *bare* `+` triggers the first-block form.

Since `+` is not a Carve bullet (use `-` or `*`), the lines below are a single paragraph, not a two-item list — the same input is a bullet list in Markdown and Djot, but not in Carve.

::: compare

```carve
+ one
+ two
```

```html
<p>+ one
+ two</p>
```

:::

## Block attribute lines

A `{...}` attribute block on its own line attaches to the **next** block
element and floats forward across intervening blank lines (§15 — reach).

::: compare

```carve
{#id}

Text
```

```html
<p id="id">Text</p>
```

:::

Consecutive attribute blocks targeting the same element accumulate in source
order: the last `id` wins, the last value for a given key wins, and classes
accumulate with no de-duplication (§15 — accumulation; the djot canonical
case).

::: compare

```carve
{#id}
{key=val}
{.foo .bar}
{key=val2}
{.baz}
{#id2}
Okay
```

```html
<p id="id2" key="val2" class="foo bar baz">Okay</p>
```

:::

A single attribute block may wrap across lines — the closing `}` need not sit
on the opening line (§15 — multi-line block).

::: compare

```carve
{#id
 .foo}
Text
```

```html
<p id="id" class="foo">Text</p>
```

:::

The next block can be any container, not just a paragraph. A block-attribute
line before a table attaches to the `<table>`:

::: compare

```carve
{.data}
|= A |= B |
| 1  | 2  |
```

```html
<table class="data">
  <thead><tr><th>A</th><th>B</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

…and before a blockquote it attaches to the `<blockquote>`:

::: compare

```carve
{.epigraph}
> To be or not to be.
```

```html
<blockquote class="epigraph"><p>To be or not to be.</p></blockquote>
```

:::

A `{...}` line that directly *trails* a paragraph (no blank line) is still a leading block-attribute line: it interrupts the paragraph and floats forward. With no following block it is dropped:

::: compare

```carve
Para
{.class}
```

```html
<p>Para</p>
```

:::

…and it floats across the blank line to the next block, never attaching backward to the paragraph it follows:

::: compare

```carve
Para
{.class}

Next
```

```html
<p>Para</p>
<p class="class">Next</p>
```

:::

## List item attributes

An attribute block that *abuts* a list marker (no space between the marker and `{`) attaches its attributes to the `<li>` itself. The marker's required space follows the block (grammar `item_attributes`, PART 9 §15). This works for bullet and ordered markers alike:

::: compare

```carve
-{.c} A classed item.
-{#intro} An item with an id.
```

```html
<ul>
  <li class="c">A classed item.</li>
  <li id="intro">An item with an id.</li>
</ul>
```

:::

Ordered markers carry the abutting block the same way, before the required space, in every dialect:

::: compare

```carve
3.{#x k=v} A numbered item with id and key-value.
```

```html
<ol start="3">
  <li id="x" k="v">A numbered item with id and key-value.</li>
</ol>
```

:::

::: compare

```carve
a.{.c} An alpha item.
```

```html
<ol type="a">
  <li class="c">An alpha item.</li>
</ol>
```

:::

For a task item the block abuts the marker, before the task marker:

::: compare

```carve
-{.c} [ ] A classed task item.
```

```html
<ul>
  <li class="c"><input type="checkbox" disabled> A classed task item.</li>
</ul>
```

:::

The empty block `{}` is a blessed exception: it yields a bare `<li>` (so a default-attribute processor can target the item):

::: compare

```carve
-{} A bare item via the empty block.
```

```html
<ul>
  <li>A bare item via the empty block.</li>
</ul>
```

:::

The abutting block is consumed as list-item attributes only when it yields at least one attribute or is the blessed empty block. A block that is not an attribute block (for example a forced `{+…+}` emphasis span) leaves the `-{` as ordinary text, so no list opens:

::: compare

```carve
-{+a+} text
```

```html
<p>-<ins>a</ins> text</p>
```

:::

A **space** before the brace makes the block ordinary item content, not a list-item attribute. Because no inline element abuts it, the block is not an attribute block at all: the braces stay literal (grammar PART 9 §14, `inline_span` requires a `[...]` host):

::: compare

```carve
- {.c} text
```

```html
<ul>
  <li>{.c} text</li>
</ul>
```

:::

The same rule holds anywhere in inline content: a `{...}` block with no abutting host (at the start of the content, or after whitespace) is literal text, never silently dropped:

::: compare

```carve
para {.c} more
```

```html
<p>para {.c} more</p>
```

:::

## Mention and tag name boundaries

A mention or tag name runs over letters, digits, `_`, `-`, and *interior* dots (a dot followed by another name character, as in `@john.doe` or `#release-1.0`). A dot at the end of the run is sentence punctuation, not part of the name; other punctuation ends the name and stays literal (an apostrophe becomes a typographic quote).

::: compare

```carve
Ping @john-doe, @john_doe and @john.doe about #release-1.0 today.

Reach @john. That is @john's idea, @john!
```

```html
<p>Ping <span class="mention"><strong>@john-doe</strong></span>, <span class="mention"><strong>@john_doe</strong></span> and <span class="mention"><strong>@john.doe</strong></span> about <span class="tag"><strong>#release-1.0</strong></span> today.</p>
<p>Reach <span class="mention"><strong>@john</strong></span>. That is <span class="mention"><strong>@john</strong></span>’s idea, <span class="mention"><strong>@john</strong></span>!</p>
```

:::

## Superscript in a table cell

Superscript in a cell uses the braced form `{^…^}`. A *lone* `^` as the sole
cell content is a rowspan marker; any other bare `^` in a cell is literal text.

::: compare

```carve
| Value |
| {^2^} |
```

```html
<table>
  <tbody>
    <tr><td>Value</td></tr>
    <tr><td><sup>2</sup></td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| Value |
| ^2^   |
```

```html
<table>
  <tbody>
    <tr><td>Value</td></tr>
    <tr><td>^2^</td></tr>
  </tbody>
</table>
```

:::

## Nested comment fences

A longer comment fence may contain a shorter one as content - the block ends only at a fence of the opener's length.

::: compare

```carve
before

%%%%
hidden %%% inner fence stays hidden
%%%%

after
```

```html
<p>before</p>
<p>after</p>
```

:::

## Strong emphasis starting with a link

A `*[` at an emphasis-opening position is a bold span whose content begins with a link - only a line-start `*[` followed by `term]:` is an abbreviation definition.

::: compare

```carve
See *[the docs](url) for more* info.
```

```html
<p>See <strong><a href="url">the docs</a> for more</strong> info.</p>
```

:::

## Abbreviation definition interrupts a paragraph

An abbreviation definition is an invisible construct (§10): on the line directly after prose it is consumed and applied, with no blank line needed.

::: compare

```carve
The HTML spec is long.
*[HTML]: HyperText Markup Language
```

```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec is long.</p>
```

:::

## Literal less-than in prose

A `<` that is neither an autolink, a crossref, nor a smart-typography arrow stays literal text (HTML-escaped on output).

::: compare

```carve
Check if (x < 5) holds, and 3<4 too.
```

```html
<p>Check if (x &lt; 5) holds, and 3&lt;4 too.</p>
```

:::

## Boolean attributes

A bare word in a `{…}` block (no `#` / `.` / `=`) is a value-less (boolean)
attribute, rendered `name=""`. It works in any attribute position and mixes
with id / class / key=value. A carve extension beyond canonical djot, matching
djot-php.

::: compare

```carve
Press [Tab]{kbd} to indent.
```

```html
<p>Press <span kbd="">Tab</span> to indent.</p>
```

:::

A leading block-attribute line carries booleans too (here onto a paragraph),
alongside a class:

::: compare

```carve
{.callout open}
Details here.
```

```html
<p class="callout" open="">Details here.</p>
```

:::

## Table span marker in first column

A span marker (`^` rowspan / `<` colspan) must be the whole cell. In the first
column a `<` (or in the first row a `^`) has nothing to merge into, so it
renders as an empty cell rather than being dropped.

::: compare

```carve
| < | b |
|---|---|
| c | d |
```

```html
<table>
  <thead><tr><th></th><th>b</th></tr></thead>
  <tbody>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::

## Table cell attributes

A `{…}` attribute block glued to a cell's opening `|` (no space) sets that
cell's attributes; the rest, after optional whitespace, is the cell content. A
space before the brace keeps it literal, and a cell carrying attributes is never
a bare span marker.

::: compare

```carve
|{.highlight} Total | 99 |
|---|---|
| a | b |
```

```html
<table>
  <thead><tr><th class="highlight">Total</th><th>99</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

## Table row attributes

An attribute block glued to a row's closing `|` sets that row's `<tr>`
attributes - the row-level twin of a cell's opening-pipe attribute block. It
applies to a header or a body row and composes with the GFM delimiter row.

::: compare

```carve
| Name | Score |{.head}
|------|-------|
| Ann  | 9     |{.win}
```

```html
<table>
  <thead><tr class="head"><th>Name</th><th>Score</th></tr></thead>
  <tbody>
    <tr class="win"><td>Ann</td><td>9</td></tr>
  </tbody>
</table>
```

:::

## Table header cell rowspan

A `^` rowspan marker extends the cell above it even across the header/body
boundary: a header cell can span into the body rows below, rendering as
`<th rowspan="N">`.

::: compare

```carve
|= H |= G |
| ^ | b |
| ^ | c |
```

```html
<table>
  <thead><tr><th rowspan="3">H</th><th>G</th></tr></thead>
  <tbody>
    <tr><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

:::

## Block-quote continuation marker

The continuation marker generalizes to block quotes (grammar PART 9 §17): a lone `+` at column 0 immediately after a quoted line attaches the following flush-left block to the quote — the un-prefixed analogue of the list-item form, so a real block joins the quote without repeating `>` on every line.

::: compare

```carve
> quoted
+
- item
```

```html
<blockquote>
  <p>quoted</p>
  <ul>
    <li>item</li>
  </ul>
</blockquote>
```

:::

It only attaches: a blank line still ends the quote and starts a sibling, and a `+` outside any container is literal text. A `>` line after the attached block resumes the quote.

::: compare

```carve
> quoted
+
- item
> more
```

```html
<blockquote>
  <p>quoted</p>
  <ul>
    <li>item</li>
  </ul>
  <p>more</p>
</blockquote>
```

:::

## Heading marker column zero

A heading marker must sit at column 0; an indented `#`-line is paragraph text — carve does not accept CommonMark's 0-3 space indent. (Within a container the column is measured after the container markers, so `> # H` is still a quoted heading.)

::: compare

```carve
   # H
```

```html
<p># H</p>
```

:::

An indented marker with more hashes is likewise paragraph text, not a heading.

::: compare

```carve
  ## H
```

```html
<p>## H</p>
```

:::

## Paragraph trailing whitespace

Whitespace at the end of a paragraph's final line is stripped before rendering (CommonMark / Djot): `abc ` renders without the trailing space. An interior two-space hard break is unaffected.

::: compare

```carve
abc 
```

```html
<p>abc</p>
```

:::

## Marker-line nested lists

A sub-list opened on a parent item's marker line (`- - A`) is an ordinary persistent nested list, exactly as if the sub-marker sat on its own indented line. It is not a one-off lone item. This matches reference djot.js (`@djot/djot`) and CommonMark; carve previously inherited a narrower reading from djot-php that did not persist the nested list.

Following markers at the sub-list's indent merge into the same nested list, so `- - A` then `  - B` and `  - C` yields one list with three items.

::: compare

```carve
- - A
  - B
  - C
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
      <li>B</li>
      <li>C</li>
    </ul>
  </li>
</ul>
```

:::

A blank line followed by a block indented to the sub-list's content column is absorbed into the open nested item, just like any list item's lazy continuation. Here the first sub-item gains a second paragraph and the list is loose.

::: compare

```carve
- - A

    second
  - B
```

```html
<ul>
  <li>
    <ul>
      <li><p>A</p>
        <p>second</p>
      </li>
      <li><p>B</p></li>
    </ul>
  </li>
</ul>
```

:::

## Blocked span marker renders as empty cell

A span marker merges into the nearest still-available origin: a `^` walks up its
column, a `<` walks left along its row, skipping cells already consumed by another
span. When the walk reaches no available cell at all - it runs off the edge of the
table - the marker is neither dropped nor left literal: it renders as an EMPTY cell
(`<td></td>`) carrying no content and no span. The first-row `^` / first-column `<`
orphan is one instance (see "Table span marker in first column"); the same rule
covers a marker BLOCKED when every cell back to the edge is already consumed.

Here the second body row leads with `^`, so the `x` above it gains `rowspan="2"`.
The next cell is `<`; its only left neighbor (the first column) is now occupied by
that rowspan, so the leftward walk runs off the edge with nothing to merge and the
`<` becomes an empty cell. The trailing `d` follows as usual.

::: compare

```carve
| A | B | C |
|---|---|---|
| x | y | z |
| ^ | < | d |
```

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>C</th></tr></thead>
  <tbody>
    <tr><td rowspan="2">x</td><td>y</td><td>z</td></tr>
    <tr><td></td><td>d</td></tr>
  </tbody>
</table>
```

:::

## Colspan marker scans left past a consumed cell

The same leftward walk SUCCEEDS when an available cell sits beyond the consumed
columns: a `<` skips every column already taken by another span and merges into
the nearest cell that is still free, only falling back to an empty cell when the
walk reaches the table edge with nothing to merge.

Here the second body row is `| p | ^ | < | e |`. The `^` (column 2) continues the
rowspan of `b` directly above it, so column 2 is consumed and `b` gains
`rowspan="2"`. The `<` (column 3) then walks left, skips that consumed column, and
merges into `p` (column 1), so `p` gains `colspan="2"`. The trailing `e` follows
as a plain cell.

The walk counts the consumed column toward the span it grows, so the resulting
`colspan` can visually overlap the cell occupying that column (here `p`'s
`colspan="2"` covers the column `b`'s rowspan still holds). That overlap is the
defined result of the walk-and-merge model, not an error: span markers only ever
grow an existing cell or, when blocked at the edge, become an empty cell - the
author chooses the layout by where they place the markers.

::: compare

```carve
| p | q | r | s |
|---|---|---|---|
| a | b | c | d |
| p | ^ | < | e |
```

```html
<table>
  <thead><tr><th>p</th><th>q</th><th>r</th><th>s</th></tr></thead>
  <tbody>
    <tr><td>a</td><td rowspan="2">b</td><td>c</td><td>d</td></tr>
    <tr><td colspan="2">p</td><td>e</td></tr>
  </tbody>
</table>
```

:::

## Security hardening

Carve is safe by default: when it emits HTML for untrusted input, dangerous URL
schemes, event-handler attributes, and script-bearing CSS are neutralized
before serialization. These pairs pin that behavior (normative: grammar PART 9
§25). The HTML renderer is the primary untrusted-output path; the rules below
are always on and identical across implementations.

A `javascript:` link destination is rejected, leaving an empty `href` (the link
text is preserved):

::: compare no-render

```carve
[click here](javascript:stealCookies)
```

```html
<p><a href="">click here</a></p>
```

:::

An autolink with a dangerous scheme is blanked the same way:

::: compare no-render

```carve
<vbscript:msgbox>
```

```html
<p><a href="">vbscript:msgbox</a></p>
```

:::

The denylist also covers OS protocol-handler and command-execution schemes
(CVE-2026-20841 class). These route to an operating-system handler that can
launch a binary or open a macro-bearing document. A Windows document handler
such as `ms-office:` is blanked, even when it embeds an inner URL:

::: compare no-render

```carve
[a](ms-office:ofe|u|http://evil/x.docm)
```

```html
<p><a href="">a</a></p>
```

:::

The Follina-class `ms-msdt:` handler is blanked:

::: compare no-render

```carve
[b](ms-msdt:/id)
```

```html
<p><a href="">b</a></p>
```

:::

The `shell:` scheme (and an `ms-msdt:` autolink) are blanked the same way:

::: compare no-render

```carve
[c](shell:Startup)

<ms-msdt:/id>
```

```html
<p><a href="">c</a></p>
<p><a href="">ms-msdt:/id</a></p>
```

:::

Ordinary web and contact schemes remain allowed -- only the dangerous classes
are neutralized. An `https:` link and a `tel:` link are kept intact:

::: compare no-render

```carve
[d](https://ok.com)

[e](tel:+15551234)
```

```html
<p><a href="https://ok.com">d</a></p>
<p><a href="tel:+15551234">e</a></p>
```

:::

An image whose source uses a dangerous scheme keeps its `alt` but drops the
`src` value:

::: compare no-render

```carve
![logo](javascript:stealCookies)
```

```html
<img src="" alt="logo">
```

:::

An event-handler attribute (any `on*` name) is dropped entirely:

::: compare no-render

```carve
A [danger]{onclick="steal()"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

A `style` value containing a CSS `expression(` (or `url(`, `@import`,
`behavior:`, `-moz-binding`) is blanked, keeping the harmless `style` slot:

::: compare no-render

```carve
A [danger]{style="x:expression(steal())"} span.
```

```html
<p>A <span style="">danger</span> span.</p>
```

:::

The `srcdoc` and `formaction` attribute names are dropped:

::: compare no-render

```carve
A [danger]{srcdoc="<script>"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

An attribute-block `href`/`src` override cannot reintroduce a dangerous scheme;
the safe destination is kept and the override is ignored:

::: compare no-render

```carve
[safe](https://example.com){href="javascript:steal"}
```

```html
<p><a href="https://example.com">safe</a></p>
```

:::

## Link destination stops at the first parenthesis

A `(...)` link destination ends at the **first** `)` -- there is no
balanced-parenthesis rule (this matches the grammar's `link_destination` and is
identical across all three implementations). A `)` that must live inside a URL
is supplied via a reference definition instead, where the destination runs to
the end of the line.

::: compare

```carve
[x](http://a/b(c))
```

```html
<p><a href="http://a/b(c">x</a>)</p>
```

:::

A newline counts as whitespace, so it ends the destination too: an unclosed `(`
whose run reaches the end of the line is not a link. The `(` and the following
text stay literal across the line break (grammar `link_destination`).

::: compare

```carve
[t](url
more)
```

```html
<p>[t](url
more)</p>
```

:::

## Empty link and image titles are preserved

An explicit empty title (`""`) is kept as `title=""` rather than dropped -- the
grammar permits an empty `link_title`, and all three implementations emit it
identically.

::: compare

```carve
[x](u "")
```

```html
<p><a href="u" title="">x</a></p>
```

:::

## Cross-references resolve inside footnote bodies

A footnote definition is full block content, so a `</#id>` cross-reference (and
reference links) inside a footnote body resolve against document-level targets.

::: compare

```carve
# H

Body[^n]

[^n]: see </#h>
```

```html
<section id="H">
  <h1>H</h1>
  <p>Body<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="#H">H</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Unquoted attribute values may contain dots and colons

An unquoted attribute value admits `.` and `:` (besides letters, digits, `-`,
`_`) so version strings, paths, and namespaced tokens need no quoting.

::: compare

```carve
[a]{k=v.w}
```

```html
<p><span k="v.w">a</span></p>
```

:::

## A pipe pair with no cell is not a table

`||` has no cell between the pipes, so it is ordinary paragraph text, not a
one-cell table.

::: compare

```carve
||
```

```html
<p>||</p>
```

:::

## Adjacent attribute blocks on one line merge

Two (or more) `{...}` blocks written back-to-back on a block-attribute line
combine into one attribute set, exactly like a single space-separated block.

::: compare

```carve
{.c}{#i}
# H
```

```html
<section id="i">
  <h1 class="c">H</h1>
</section>
```

:::

## A continuation row needs a body row

A `+` continuation row joins the row above it. After a GFM header plus its
delimiter row there is no body row yet, so a following `+` line is not a
continuation -- it stays an ordinary paragraph.

::: compare

```carve
| a | b |
| - | - |
+ cont |
```

```html
<table>
  <thead><tr><th>a</th><th>b</th></tr></thead>
</table>
<p>+ cont |</p>
```

:::

## Fence opener with a nested-list body inside a list item

A `:::` opener inside a list item opens its block even when its body is a
nested list, provided the matching closer sits at the item content column
(PART 9 §12). A bullet (`-`) or ordered marker (`1.`) on the next line is part
of the admonition body, not a sibling list that swallows the opener as literal
text. The closer must align with the opener's content column; a `:::` at column
zero (outside the item) does not close it.

A nested unordered list body is wrapped by the admonition:

:::: compare

```carve
- ::: note
  - para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

A nested ordered list body is wrapped the same way:

:::: compare

```carve
- ::: note
  1. para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note">
      <ol>
        <li>para text</li>
      </ol>
    </aside>
  </li>
</ul>
```

::::

A two-item nested list is wrapped whole:

:::: compare

```carve
- ::: note
  - one
  - two
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note">
      <ul>
        <li>one</li>
        <li>two</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

A blank line between the opener and the nested list still opens the block:

:::: compare

```carve
- ::: note

  - para text
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
```

::::

NEGATIVE: with no closer, the opener stays literal text and the bullet starts an
ordinary nested list:

:::: compare

```carve
- ::: note
  - para text
```

```html
<ul>
  <li>::: note
    <ul>
      <li>para text</li>
    </ul>
  </li>
</ul>
```

::::

NEGATIVE: a closer at column zero is outside the item, so it does not close the
opener; the opener stays literal and the stray `:::` becomes a top-level
paragraph:

:::: compare

```carve
- ::: note
  - para text
:::
```

```html
<ul>
  <li>::: note
    <ul>
      <li>para text</li>
    </ul>
  </li>
</ul>
<p>:::</p>
```

::::

GUARD: an empty body (opener immediately followed by its closer) still opens:

:::: compare

```carve
- ::: note
  :::
```

```html
<ul>
  <li>
    <aside class="admonition note">

    </aside>
  </li>
</ul>
```

::::

## Footnote definition inside a container is collected

A footnote definition is document-level metadata: it is collected and resolved
even when it sits inside a blockquote or a list item (PART 9 §16). The reference
resolves to an endnote and the container that held the definition is left empty.

Definition inside a blockquote:

::: compare

```carve
See [^a].

> [^a]: note body
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<blockquote>

</blockquote>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note body<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Definition inside a list item:

::: compare

```carve
See [^a].

- [^a]: note body
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<ul>
  <li></li>
</ul>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note body<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Cyclic cross-reference resolves to one level

A `</#id>` cross-reference resolves to ONE level: it links to the target and
adopts the target's text, flattening any nested cross-reference in that text
(PART 9 §19). This makes a self-reference or a mutual cycle safe -- no infinite
expansion.

A self-reference resolves once:

::: compare

```carve
# A </#a>
```

```html
<section id="A">
  <h1>A <a href="#A">A </a></h1>
</section>
```

:::

A mutual cycle resolves to one level on each side:

::: compare

```carve
# A </#b>

# B </#a>
```

```html
<section id="A">
  <h1>A <a href="#B">B </a></h1>
</section>
<section id="B">
  <h1>B <a href="#A">A </a></h1>
</section>
```

:::

A normal (non-cyclic) cross-reference still resolves:

::: compare

```carve
# Intro

See </#intro>.
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="#Intro">Intro</a>.</p>
</section>
```

:::

## Trojan-Source: heading ids are NFC-normalized and strip invisible controls

A heading id is NFC-normalized and stripped of bidi-override / isolate controls
and zero-width characters (PART 9 §26), so visually identical source cannot
produce diverging ids and an invisible control cannot smuggle a different
target.

<!-- The carve body holds a precomposed e-acute (U+00E9). -->
A precomposed `é` (U+00E9) yields id `Café`:

::: compare no-render

```carve
# Café
```

```html
<section id="Café">
  <h1>Café</h1>
</section>
```

:::

<!-- The carve body holds a decomposed e (U+0065) + COMBINING ACUTE ACCENT (U+0301). -->
A decomposed `e` + U+0301 yields the SAME id `Café` (NFC), while the rendered
heading text keeps the author's decomposed sequence:

::: compare no-render

```carve
# Café
```

```html
<section id="Café">
  <h1>Café</h1>
</section>
```

:::

<!-- The carve body holds A, RIGHT-TO-LEFT OVERRIDE (U+202E), B, ZERO WIDTH SPACE (U+200B), C. -->
A heading containing U+202E and U+200B yields an id with NEITHER (`ABC`); the
rendered text drops the bidi-override but keeps the zero-width space:

::: compare no-render

```carve
# A‮B​C
```

```html
<section id="ABC">
  <h1>AB​C</h1>
</section>
```

:::

## Trojan-Source: rendered text and code strip bidi-override controls

A bidi-override / isolate control in rendered text or in a code span is dropped
(PART 9 §26): it is DOM-inert, and entity-encoding it would let it decode back
to the raw control downstream, so it is removed rather than escaped.

<!-- The carve body holds a, RIGHT-TO-LEFT OVERRIDE (U+202E), b. -->
In paragraph text the control is stripped:

::: compare no-render

```carve
a‮b
```

```html
<p>ab</p>
```

:::

<!-- The carve body holds a code span: a, RIGHT-TO-LEFT OVERRIDE (U+202E), b. -->
In a code span the control is stripped too (not entity-encoded):

::: compare no-render

```carve
`a‮b`
```

```html
<p><code>ab</code></p>
```

:::

## Scheme probe strips Unicode whitespace

The URL scheme probe strips ALL Unicode whitespace -- including NARROW NO-BREAK
SPACE (U+202F) -- before matching the scheme (PART 9 §25), so an obfuscated
`javascript:` destination cannot slip past the denylist.

<!-- The reference destination is prefixed by NARROW NO-BREAK SPACE (U+202F) before `javascript:`. -->
A reference destination prefixed by U+202F then `javascript:` is rejected,
leaving an empty `href`:

::: compare no-render

```carve
[click][a]

[a]:  javascript:alert(1)
```

```html
<p><a href="">click</a></p>
```

:::

## Footnotes placement

A `::: footnotes` block flushes the endnotes section at that point instead of
at the document end. All footnotes are included, even those referenced after
the marker.

:::: compare

```carve
Intro[^a] and[^b].

::: footnotes
:::

## After

More text.

[^a]: first note

[^b]: second note
```

```html
<p>Intro<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>first note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p>second note<a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
<section id="After">
  <h2>After</h2>
  <p>More text.</p>
</section>
```

::::

## Classes are deduplicated

Repeated class values are merged into a single `class` attribute and
deduplicated, keeping first-occurrence order (PART 9 §15). `class="a a"` and
`class="a"` are equivalent in HTML, so the shorter form is emitted.

::: compare

```carve
[x]{.a .a .b}
```

```html
<p><span class="a b">x</span></p>
```

:::

## Code span and image trailing attributes are strict

A trailing `{...}` on a code span or an image obeys the same strict attribute
rule as any other inline attribute (PART 9 §14): a digit-first or otherwise
invalid payload makes the whole block literal, not a bogus attribute.

::: compare

```carve
`x`{2=v}
```

```html
<p><code>x</code>{2=v}</p>
```

:::

## A bare attribute block on its own line is literal

A `block_attributes` line requires at least one attribute (PART 9 §15); there
is no block-level blessed-empty form (only the inline `[text]{}` span is
blessed). So a bare `{}` line stays a literal paragraph.

::: compare

```carve
{}
```

```html
<p>{}</p>
```

:::

## A backslash in a link destination is a literal character

A link destination has no backslash escapes: `url_char` includes the backslash
as an ordinary URL character, kept verbatim. `[t](a\b)` links to `a\b`.

::: compare

```carve
[t](a\b)
```

```html
<p><a href="a\b">t</a></p>
```

:::

## Autolink display keeps the raw content

An autolink's display text is the raw content between `<` and `>`: a URI
autolink keeps its scheme (`<mailto:a@b>` shows `mailto:a@b`), while an email
autolink (no explicit scheme) shows the address with a `mailto:` href.

::: compare

```carve
<mailto:a@b>
```

```html
<p><a href="mailto:a@b">mailto:a@b</a></p>
```

:::

## Editorial markup takes a trailing attribute

An addition `{+...+}` or deletion `{-...-}` is an ordinary inline node, so a
trailing `{...}` attribute block attaches to its `<ins>` / `<del>`, exactly like
a span, code span, link, or emphasis (PART 9 §22 / §15). The markers are
single-character: the doubled form `{++a++}` is not special — the outer `+` are
the delimiters and `+a+` is literal content, so it yields `<ins>+a+</ins>` (as
the example below shows).

::: compare

```carve
{++a++}{.a}
```

```html
<p><ins class="a">+a+</ins></p>
```

:::

