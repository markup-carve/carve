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

A bare colon fence closes a container only when it is EXACTLY as long as that
container's opener. Nesting therefore needs the two fences to differ, and the
canonical direction is one colon wider per level inward. A longer-outer
document like the one below parses too - exact matching does not care which
way the lengths run.

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

Equal-length fences nest. `::: tip` is not a closer - a closer is bare - so it
opens a container inside the note, and the two bare fences close them
innermost-first.

:::: compare

```carve
::: note
::: tip
Inner.
:::
:::
```

```html
<aside class="admonition note">
  <aside class="admonition tip">
    <p>Inner.</p>
  </aside>
</aside>
```

::::

Widening the fence for the deeper level is the canonical direction. A bare
`::::` does not match the open `:::`, so it is not a closer; it opens a child.
This is the form `carve fmt` emits.

::::: compare

```carve
:::
Outer

::::
Inner
::::
:::
```

```html
<div>
  <p>Outer</p>
  <div>
    <p>Inner</p>
  </div>
</div>
```

:::::

An opener always opens. A container still open at the end of the input closes
there, so a forgotten closer costs you the container's extent, not the rest of
the document. Lint and the language server flag it.

:::: compare

```carve
::: note
X
```

```html
<aside class="admonition note">
  <p>X</p>
</aside>
```

::::

One closer closes one container, not every container open above it. Here the
`:::` closes `c`; `a` and `b` have no closer of their own and close at the end
of the input by the rule above. Djot's bare closer instead closes every open
container of equal-or-lesser length in one go.

:::::: compare

```carve
::::: a
:::: b
::: c
X
:::
```

```html
<div class="a">
  <div class="b">
    <div class="c">
      <p>X</p>
    </div>
  </div>
</div>
```

::::::

## Opaque spans inside a container

A container collects its body by scanning for its closer. A code fence, a raw
block and a comment block are opaque: their contents are content, not markup,
so a colon fence written inside one closes nothing. This is what lets a
document about Carve show a container fence at all - under exact-length
closers the code fence is the only structural way to quote one.

:::::: compare

````carve
::: note
```
:::
```
body
:::
after
````

```html
<aside class="admonition note">
  <pre><code>:::
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

The opener carrying no info string is the case that hides the bug: the opener
line is closer-shaped itself, so an implementation that tests it before
consuming it ends the span where it began (carve#450). A tilde fence behaves
the same.

:::::: compare

````carve
::: note
~~~
:::
~~~
body
:::
after
````

```html
<aside class="admonition note">
  <pre><code>:::
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

A container opener inside the span is content too. Under exact-length closers
this one is load-bearing: read as markup it would push a nesting level and put
every following closer one level off.

:::::: compare

````carve
::: note
```text
::: tip
```
body
:::
after
````

```html
<aside class="admonition note">
  <pre><code class="language-text">::: tip
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

A comment block is opaque in the same way. It renders nothing at all, so what
this pins is where the container ends.

:::: compare

```carve
::: note
%%%
:::
%%%
body
:::
after
```

```html
<aside class="admonition note">
  <p>body</p>
</aside>
<p>after</p>
```

::::

## Blocks that render to nothing

A comment, a comment block, an abbreviation definition and a non-HTML raw
block produce no output. Inside a container they contribute no line either -
the container's body is what remains.

:::: compare

```carve
> q
> %%%
> x
> %%%
> body
```

```html
<blockquote>
  <p>q</p>
  <p>body</p>
</blockquote>
```

::::

A definition body that renders to nothing closes on its own line, like the
single-paragraph form.

::: compare

```carve
:: t
:  %%%
   x
   %%%
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
```

:::

An abbreviation definition inside a div is the same case: the definition is
collected for the document's abbreviation table and leaves nothing behind.

:::: compare

```carve
:::
*[HTML]: HyperText Markup Language

body
:::
```

```html
<div>
  <p>body</p>
</div>
```

::::

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

A flush-left line after a heading stays inside the item the heading belongs to,
at any nesting depth — even when the heading opens on a deeper sub-list item's
marker line. What it does *not* do is fold into the heading: a heading ends at
the newline (§18), so the line is the item's own content, which a tight list
renders unwrapped. Ownership is the rule here; the heading's id is built from
the heading line alone.

::: compare

```carve
- a
  - b
    # N
lazy
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <h1 id="N">N</h1>
        lazy
      </li>
    </ul>
  </li>
</ul>
```

:::

A blank line inside a fenced code block is verbatim content, not an interior
block separator, so it does not loosen the list — a sibling item after such a
fence stays tight because no blank line actually separates the two items.

::: compare

````carve
- ```
  a

  b
  ```
- c
````

````html
<ul>
  <li>
    <pre><code>a

b
</code></pre>
  </li>
  <li>c</li>
</ul>
````

:::

Plain text on the line after a fenced code block closes is the item's own
trailing text. With no blank line anywhere the item stays tight, so that text
is not wrapped in a paragraph.

::: compare

````carve
- ```
  x
  ```
  after
````

````html
<ul>
  <li>
    <pre><code>x
</code></pre>
    after
  </li>
</ul>
````

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
<p>text
:::note
body
:::</p>
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

An **unterminated** code fence opener does not interrupt a paragraph (§10
closer lookahead): with no matching closer ahead, the ` ``` ` line stays
paragraph text. It is then an unclosed inline verbatim run, which renders as a `<code>`
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

A `:::` opener goes the other way: its closer is optional (PART 9 §12), so
there is nothing to look ahead for. The opener interrupts, and the container it
opens closes at the end of the input. That is the counterweight to the exact
closer - a mistyped closer costs the container's extent, not the rest of the
document.

:::: compare

```carve
Text
:::
stuff
```

```html
<p>Text</p>
<div>
  <p>stuff</p>
</div>
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

## Single-line headings

A heading **ends at the newline**. Nothing folds into it: the next line begins whatever block it begins, exactly as after any other closed block. This diverges from djot deliberately — djot folds a following plain line into the heading, which is a silent corruption for anyone arriving from Markdown, and `divergence-from-djot` §7 already broke from djot on the mirror case. A caption (`^ …`) still attaches via §4, because attachment is not continuation. The heading id is built from the single line. (Setext underline headings remain intentionally excluded.)

::: compare

```carve
# Title
outside
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>outside</p>
</section>
```

:::

Repeated headings are simply separate headings — the `#` count no longer decides whether one folds into another.

::: compare

```carve
## A
## still A
# B
```

```html
<section id="A">
  <h2>A</h2>
</section>
<section id="still-A">
  <h2>still A</h2>
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

A marker followed by whitespace only is not a heading — the content after the
required space must carry at least one non-whitespace character, so the trailing
spaces leave the line as paragraph text.

::: compare

```carve
#  
```

```html
<p>#</p>
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
:::note
body
:::</li>
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

A **sub-list** is one of those blocks, and the rule holds when a sibling item follows it: the blank belongs to the sub-list, not to the gap between items, so the whole list stays tight.

::: compare

```carve
- fruit

  - apples
- vegetables
```

```html
<ul>
  <li>fruit
    <ul>
      <li>apples</li>
    </ul>
  </li>
  <li>vegetables</li>
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

## Link destination parentheses balance

A `(` inside a `(...)` destination is matched against a later `)`, so the
destination ends at the first `)` that has **no opener left to pair with**.
URLs carrying parentheses -- Wikipedia and MDN produce them constantly -- are
therefore written plainly, with no escape and no second spelling. Djot and
CommonMark both balance destination parentheses the same way.

::: compare

```carve
[x](http://a/b(c))
```

```html
<p><a href="http://a/b(c)">x</a></p>
```

:::

Nesting is tracked to any depth, and a `)` with nothing to close ends the
destination -- the rest stays literal text.

::: compare

```carve
[x](a(b(c))d) and [y](e)f)
```

```html
<p><a href="a(b(c))d">x</a> and <a href="e">y</a>f)</p>
```

:::

An unbalanced parenthesis that belongs *inside* the URL is backslash-escaped.
Only `\(`, `\)` and `\\` are escapes here, so a backslash in front of anything
else is an ordinary character and URLs full of backslashes are unaffected.

::: compare

```carve
[x](http://a/b\)c) and [y](a\\b) and [z](a\qb)
```

```html
<p><a href="http://a/b)c">x</a> and <a href="a\b">y</a> and <a href="a\qb">z</a></p>
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
  <li>
    <aside class="admonition note">
      <ul>
        <li>para text</li>
      </ul>
    </aside>
  </li>
</ul>
<div>
</div>
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

## Emphasis opener slash-adjacency

A `/` immediately before a bare delimiter suppresses an italic `/` or underline
`_` opener there: `/` never opens after `/` (same-delimiter adjacency) and `_`
never opens after `/` (the extra cross-delimiter guard, path protection). So the
underscore in `a_/_a_` stays literal.

::: compare

```carve
a_/_a_
```

```html
<p>a_/_a_</p>
```

:::

An underline opener directly after a slash is literal on its own, too.

::: compare

```carve
a/_y_
```

```html
<p>a/_y_</p>
```

:::

A path-like `/a/` opens italic; the following `_b_` does not open, because its
opening `_` sits immediately after the closing `/`.

::: compare

```carve
/a/_b_
```

```html
<p><em>a</em>_b_</p>
```

:::

The guard is specific to `/` and `_`: the other delimiters `*`, `~`, `=` DO open
after a `/`, so a preceding slash does not suppress them.

::: compare

```carve
a/~y~ a/=y=
```

```html
<p>a/<s>y</s> a/<mark>y</mark></p>
```

:::

## Bold-italic delimiter needs content

A bold-italic run `/*...*/` collapses to `<strong><em>...</em></strong>` only when
it wraps content. With nothing between the delimiters, the inner `**` is literal
and only the outer `/.../ ` italic applies -- so `/**/` is an emphasized `**`, not
empty bold-italic.

::: compare

```carve
/**/
```

```html
<p><em>**</em></p>
```

:::

A single space is content for the outer italic but not for the bold pair, so the
`* *` stays literal inside one `<em>`.

::: compare

```carve
/* */
```

```html
<p><em>* *</em></p>
```

:::

With real content, the full bold-italic collapse still applies.

::: compare

```carve
/*x*/
```

```html
<p><strong><em>x</em></strong></p>
```

:::

The bold-italic pair `/*...*/` has no word-boundary condition on its outer `/`:
the combined two-character opener wins over the bare `/`-then-`*` parse even when
a word character sits directly before `/*` or directly after the closing `*/`, so
it opens and closes intraword.

::: compare

```carve
a/*y*/b
```

```html
<p>a<strong><em>y</em></strong>b</p>
```

:::

## Emphasis span closes before a following delimiter

A completed emphasis span closes at its valid closer regardless of what follows,
per the §9 close-first rule: a valid closer closes the nearest matching open
entry. So `_z_` closes into `<u>z</u>` even when more bare delimiters come right
after it. The trailing `/y/` stays literal, because a `/` opener is suppressed
immediately after the closing `_` (the slash-adjacency guard above).

::: compare

```carve
_z_/y/
```

```html
<p><u>z</u>/y/</p>
```

:::

## Thematic break requires contiguous markers

A thematic break is three or more of the same marker (`-`, `*`, `_`) contiguous
at column zero. Spacing the markers apart, or indenting the run, disqualifies it:
the line is parsed as ordinary block content instead.

Spaced `*` markers are a bullet list, not a break.

::: compare

```carve
* * *
```

```html
<ul>
  <li>
    <ul>
      <li>*</li>
    </ul>
  </li>
</ul>
```

:::

Spaced `_` markers are a plain paragraph.

::: compare

```carve
_ _ _
```

```html
<p>_ _ _</p>
```

:::

An indented `***` run is a paragraph, not a break.

::: compare

```carve
 ***
```

```html
<p>***</p>
```

:::

A contiguous run at column zero is still a thematic break.

::: compare

```carve
***
```

```html
<hr>
```

:::


## Sublist marker interrupts a continuation paragraph

A list marker reaching a list item's **content column** always starts a sublist, even when the item holds an open continuation paragraph (PART 0 S3, PART 9 §24 C3). The general rule that list markers never interrupt a paragraph applies to markers *below* the content column (lazy continuation) and at the top level — not to a correctly indented sublist marker.

::: compare

```carve
- first

  second
  - nested
```

```html
<ul>
  <li><p>first</p>
    <p>second</p>
    <ul>
      <li>nested</li>
    </ul>
  </li>
</ul>
```

:::

Ordered markers behave identically (the symmetric list rule): an ordered marker at the content column nests.

::: compare

```carve
- first

  second
  1. nested
```

```html
<ul>
  <li><p>first</p>
    <p>second</p>
    <ol>
      <li>nested</li>
    </ol>
  </li>
</ul>
```

:::

## Footnote definition requires an inline body

A footnote definition carries its body on the marker line: `[^label]:` followed by a space and inline content (PART 9 §16). A bare `[^label]:` with nothing after the colon is **not** a definition — it stays an ordinary paragraph, and a following indented line folds into it as paragraph text. Continuation lines extend a definition only when the marker line itself opened one.

::: compare

```carve
Use [^a].

[^a]:
  First
```

```html
<p>Use [^a].</p>
<p>[^a]:
First</p>
```

:::

## Footnote definition separator must be a space

The separator after a footnote-definition marker must be a literal space (U+0020). A tab after `[^label]:` does **not** open a definition; the line stays an ordinary paragraph and the tab is preserved as text. This aligns with heading, list, and task markers, which already reject a tab, and with the grammar 's `space` production.

::: compare

```carve
Use [^a].

[^a]:	Tabbed
```

```html
<p>Use [^a].</p>
<p>[^a]:	Tabbed</p>
```

:::

## Link reference definition separator must be a space

The same rule applies to link reference definitions: `[label]:` must be followed by a literal space. A tab leaves the line as a paragraph, so the later `[a][]` has no target to resolve.

::: compare

```carve
[a]:	/url

[a][]
```

```html
<p>[a]:	/url</p>
<p>[a][]</p>
```

:::

## Abbreviation definition separator must be a space

Abbreviation definitions follow the rule too: `*[label]:` must be followed by a literal space. A tab keeps the line as a paragraph and no abbreviation is registered.

::: compare

```carve
*[HTML]:	Hyper

The HTML
```

```html
<p>*[HTML]:	Hyper</p>
<p>The HTML</p>
```

:::

## Unclaimed openers stay literal

Two forms that were proposed and then not adopted have no meaning in Carve, and
both are pinned here so no engine can quietly start claiming them.

`[>content]` was the proposed sidenote form. It was dismissed, not deferred: a
margin note is footnote content positioned by CSS, so it needs no syntax. The
`[>` opener is unclaimed and the whole thing is literal text.

`{:name:}` was a proposed braced symbol form for intraword use. The brace is
not part of any construct: it merely satisfies the symbol boundary guard, and
the braces themselves stay literal. The name inside is a normal symbol, so with
no `symbols` map configured it falls back to the literal `:name:` and the line
renders exactly as written. See [dismissed syntax](../dismissed-syntax).

::: compare

```carve
[>foo]

{:tada:}
```

```html
<p>[&gt;foo]</p>
<p>{:tada:}</p>
```

:::

## Inline literal

A `!` prefix on a verbatim span is an *inline literal* (PART 9 §27): the content is captured verbatim like a code span, but it renders as ordinary prose — no `<code>` wrapper — and is HTML-escaped and emitted by every renderer. It mirrors the `$`-math prefix, and exists so notation that collides with the bare emphasis delimiters (phonemic transcription `/kaet/`, glob patterns, paths) can be written without escaping each character.

::: compare

```carve
The word cat is !`/kaet/` in IPA.
```

```html
<p>The word cat is /kaet/ in IPA.</p>
```

:::

A trailing `{…}` is the ordinary inline attribute block, so an attributed literal renders a `<span>` carrying it. The content is HTML-escaped, and no inline construct inside it is parsed.

::: compare

```carve
!`/kaet/`{.ipa} and !`a<b>` and !`*not bold*`
```

```html
<p><span class="ipa">/kaet/</span> and a&lt;b&gt; and *not bold*</p>
```

:::

`!` still opens an image before `[`, and stays literal text everywhere else. A literal `!` immediately before a backtick span is written `\!`.

::: compare

```carve
\!`x` is a bang before code.
```

```html
<p>!<code>x</code> is a bang before code.</p>
```

:::

## All-space verbatim content

The single-space strip on a verbatim span (PART 3 `code_span`) drops one leading and one trailing space, but *not* when the content consists entirely of space characters - those spans keep every space. Without this guard a formatter round-trip loses the content, since a span stripped to empty has no writable source spelling.

::: compare

```carve
A single space ` ` and two spaces `  ` are preserved.
```

```html
<p>A single space <code> </code> and two spaces <code>  </code> are preserved.</p>
```

:::

Ordinary content still strips one space from each side, so the guard is narrow.

::: compare

```carve
But ` a ` strips one space from each side.
```

```html
<p>But <code>a</code> strips one space from each side.</p>
```

:::

The sigil-prefixed verbatim forms - the inline literal (section 27) and math (section 18) - share the same strip rule, so they keep all-space content too.

::: compare

```carve
Literal !`  ` and math $`  ` keep their spaces.
```

```html
<p>Literal    and math <span class="math inline">\(  \)</span> keep their spaces.</p>
```

:::

## Trailing whitespace boundaries

The trailing-whitespace strip (paragraph, NORMATIVE) removes whitespace at the end of the paragraph's SOURCE line before rendering. It does not touch spaces a construct produces during rendering, so a paragraph whose entire content is an all-space verbatim span keeps those spaces.

::: compare

```carve
!`  `
```

```html
<p>  </p>
```

:::

The same holds for a lone all-space code span, which keeps its `<code>` wrapper.

::: compare

```carve
`  `
```

```html
<p><code>  </code></p>
```

:::

... and for lone all-space math.

::: compare

```carve
$`  `
```

```html
<p><span class="math inline">\(  \)</span></p>
```

:::

A trailing NO-BREAK SPACE is content, not trailing whitespace: it is left in place and rendered as a character entity. Only ASCII whitespace is stripped.

::: compare

```carve
A trailing no-break space 
```

```html
<p>A trailing no-break space&nbsp;</p>
```

:::

## Table row closing pipe

A table row must close with a pipe. A line that starts with `|` but has content dangling after its last pipe is prose, wherever it appears - it neither opens a table at a block start nor interrupts an open paragraph.

::: compare

```carve
| a | b
```

```html
<p>| a | b</p>
```

:::

The rule applies to every row, not only the first: once a line fails to close, the table ends and that line is a paragraph.

::: compare

```carve
| a | b |
| c | d
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p>| c | d</p>
```

:::

And an unclosed line does not swallow a following well-formed row: the row still opens its own table.

::: compare

```carve
| a
| b |
```

```html
<p>| a</p>
<table>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::

## Post-blank list continuation (content-column model)

A block opener or sublist marker attaches to a list item only when it reaches the item's *content column* (§24 C3): `- ` -> column 2, `1. ` -> column 3. One rule, blank line or not - the blank only decides tight vs loose. Below the content column a line lazily continues the item paragraph (no blank) or, after a blank, ends the item and parses at document level; above the content column the residual indent means it is no longer a block opener, so it folds in as lazy paragraph text. This is an intentional divergence from djot, which attaches at any indent past the marker (see #295).

Below the content column, after a blank line, the block opener ends the item and parses at the document level.

::: compare

```carve
- one

 > q
```

```html
<ul>
  <li>one</li>
</ul>
<p>&gt; q</p>
```

:::

At the content column, it nests into the item.

::: compare

```carve
- one

  > q
```

```html
<ul>
  <li>one
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

Above the content column, the residual indent makes it lazy paragraph text inside the item, not a block opener.

::: compare

```carve
- one

   # h
```

```html
<ul>
  <li><p>one</p>
    <p># h</p>
  </li>
</ul>
```

:::

With no blank line, a line below the content column lazily continues the open item paragraph.

::: compare

```carve
- one
 > q
```

```html
<ul>
  <li>one
&gt; q</li>
</ul>
```

:::

A block opener at column 0 is a document-level block: it interrupts and ends the list, exactly as a quote or heading there would.

::: compare

````carve
- one
```
c
```
````

````html
<ul>
  <li>one</li>
</ul>
<pre><code>c
</code></pre>
````

:::

## Nested item looseness does not propagate to the outer item

A post-blank block attached to a nested (inner) item loosens only that inner item; the outer item stays tight (§17). Looseness is decided per level - a descendant's blank never counts toward an ancestor.

::: compare

```carve
- a
  - b

    > q
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

The sibling-blank invariant: a blank between the inner items loosens the inner list but leaves the outer item tight - the same non-propagation.

::: compare

```carve
- a
  - b

  - c
```

```html
<ul>
  <li>a
    <ul>
      <li><p>b</p></li>
      <li><p>c</p></li>
    </ul>
  </li>
</ul>
```

:::

The content-column threshold follows the marker, so a task item's nested block behaves the same.

::: compare

```carve
- [ ] a
  - b

    > q
```

```html
<ul>
  <li><input type="checkbox" disabled> a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

An item's own second paragraph after a blank still loosens it - non-propagation removes only the upward leak, not legitimate same-level looseness.

::: compare

```carve
- a

  b
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
  </li>
</ul>
```

:::

## Definition list as a first-class block opener

A `:: term` definition-list opener is a block opener like every other (quote, heading, fence, table) under the content-column rule (PART 9 §24 C3): it *interrupts* an open list item at column 0, and *nests* at the item's content column. The two-line `:: `/`:  ` marker is recognized by look-ahead; only the `:: ` term line opens the block.

At the content column, the definition list nests inside the item.

::: compare

```carve
- one
  :: term
  :  def
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
      <dd>def</dd>
    </dl>
  </li>
</ul>
```

:::

At column 0 (below the content column), it interrupts: the list ends and the definition list parses at document level.

::: compare

```carve
- one
:: term
:  def
```

```html
<ul>
  <li>one</li>
</ul>
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
```

:::

Below the content column but not at column 0, it folds in as lazy item text.

::: compare

```carve
- one
 :: term
 :  def
```

```html
<ul>
  <li>one
:: term
:  def</li>
</ul>
```

:::

A blank line before a nested definition list keeps the outer item tight (§17), like any other nested sub-block.

::: compare

```carve
- one

  :: t
  :  d
```

```html
<ul>
  <li>one
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
  </li>
</ul>
```

:::

## Table as a block opener in a list item

A `|`-delimited table row is a block opener under the same content-column rule: it nests at the content column and folds as lazy text below it.

::: compare

```carve
- one
  |= H |
  | x |
```

```html
<ul>
  <li>one
    <table>
      <thead><tr><th>H</th></tr></thead>
      <tbody>
        <tr><td>x</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

::: compare

```carve
- one
 |= H |
 | x |
```

```html
<ul>
  <li>one
|= H |
| x |</li>
</ul>
```

:::

## Adjacent slash and underscore emphasis nest

`/` and `_` open immediately after each other when the preceding delimiter is a true opener, so adjacent pairs nest (they only stay literal as path protection when the preceding delimiter is a closer, e.g. `/a/_b_`).

::: compare

```carve
/_x_/ and _/x/_
```

```html
<p><em><u>x</u></em> and <u><em>x</em></u></p>
```

:::

## Colon-fence as a block opener in a list item

A `:::` colon-fence (admonition / div) is a block opener like every other (§24 C3): it nests only when it reaches the item's content column, and folds as lazy text below or above it.

:::: compare

```carve
- one
 ::: note
 b
 :::
```

```html
<ul>
  <li>one
::: note
b
:::</li>
</ul>
```

::::

:::: compare

```carve
- one
  ::: note
  b
  :::
```

```html
<ul>
  <li>one
    <aside class="admonition note">
      <p>b</p>
    </aside>
  </li>
</ul>
```

::::

:::: compare

```carve
- one
   ::: note
   b
   :::
```

```html
<ul>
  <li>one
::: note
b
:::</li>
</ul>
```

::::

## Fence folds as lazy inline code above the content column

A fenced code block indented past the content column is no longer a block opener; its lines fold as lazy paragraph text, so the backtick run becomes an inline code span (with its content's leading indentation stripped like any inline verbatim span).

:::: compare

````carve
- one

   ```
   c
   ```
````

```html
<ul>
  <li><p>one</p>
    <p><code>
c
</code></p>
  </li>
</ul>
```

::::

## Abbreviation title escapes its markup characters

An abbreviation's expansion becomes the `title` attribute, so `&`, `<`, `>` and `"` in it are entity-escaped like any attribute value.

::: compare

```carve
*[HTML]: Hyper & Text < Markup > "quoted"

The HTML spec.
```

```html
<p>The <abbr title="Hyper &amp; Text &lt; Markup &gt; &quot;quoted&quot;">HTML</abbr> spec.</p>
```

:::

## Indented ordered marker content column includes the marker indent

The content column of a list item includes the marker's own leading indentation (PART 9 §24 C3): `    1. ` is base column 4 plus marker width 3, so its content column is 7. A block opener dedented below that column but not to column 0 is *lazy* text, not a new block. A `| x |` table row at column 2 therefore folds into the item as lazy paragraph text instead of ending the item and escaping the row to a document-level table.

::: compare

```carve
    1. y
  | x |
```

```html
<ol>
  <li>y
| x |</li>
</ol>
```

:::

## Leading attribute brace before an inline span stays literal

An unattached `{…}` attribute block that opens a line has nothing to its left to attach to, so it stays literal text; a following inline span still parses normally. The line is not consumed or dropped.

::: compare

```carve
{k=v}{+i+}
```

```html
<p>{k=v}<ins>i</ins></p>
```

:::

## Attribute block after a mention stays literal

Mentions and tags are inert stable spans that do not take attributes (they share the soft-break / hard-break / plain-text class in this respect). A `{…}` glued after one stays literal text rather than attaching or vanishing.

::: compare

```carve
@u{k=v.w}
```

```html
<p><span class="mention"><strong>@u</strong></span>{k=v.w}</p>
```

:::

## Under-indented definition attaches, over-indented definition folds

A `:  def` line is a lenient definition-list entry (PART 9 §24 C3): it attaches as a fresh `<dd>` to its open `:: term` when its column is at or below the term's, even under the item's content column. Only a definition line indented *above* the term folds into the term text as a lazy continuation.

Under-indented (below the content column, still above column 0): the definition attaches.

::: compare

```carve
- one
  :: term
 :  def
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
      <dd>def</dd>
    </dl>
  </li>
</ul>
```

:::

At column 0, the definition still attaches: the `:  ` marker is a lenient exception to the column-0 interrupt rule, so it does not end the item and orphan the definition.

::: compare

```carve
- one
  :: term
:  def
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
      <dd>def</dd>
    </dl>
  </li>
</ul>
```

:::

Over-indented (above the term): the line folds into the term, preserving its over-indent whitespace.

::: compare

```carve
- one
  :: term
   :  def
```

```html
<ul>
  <li>one
    <dl>
      <dt>term
 :  def</dt>
    </dl>
  </li>
</ul>
```

:::

## Image trailing attribute is strict about the glue

A trailing `{…}` attaches to a sole image only when glued directly to the closing paren. A space between the image and the block breaks the glue, so the `{…}` stays literal text alongside the image.

Glued: the attributes attach to the image.

::: compare

```carve
![alt](img.png){.x}
```

```html
<img src="img.png" alt="alt" class="x">
```

:::

Spaced: the block stays literal.

::: compare

```carve
![alt](img.png) {.x}
```

```html
<p><img src="img.png" alt="alt"> {.x}</p>
```

:::

## Wrapped definition term continuation below the content column strips leading whitespace

A `:: term` line inside a list item may be continued by a wrapped line. When that continuation sits *below* the item content column it is a lazy continuation, so - like a lazy paragraph or blockquote continuation - its leading whitespace is stripped before it folds into the `<dt>`. (A continuation *above* the content column instead folds with its residual indent preserved; a continuation at or above the content column is dedented rather than stripped.)

At column 1, one below the content column 2: the leading space is stripped before the fold.

::: compare

```carve
- one
  :: term
 wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term
wrapped</dt>
    </dl>
  </li>
</ul>
```

:::

At column 0, flush left: the continuation still folds into the term, byte-identically.

::: compare

```carve
- one
  :: term
wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term
wrapped</dt>
    </dl>
  </li>
</ul>
```

:::

## Indented attribute line stays literal

A top-level block opener only fires at column 0. An attribute brace indented by
even a single space is not a floating attribute block, so it does not attach to
what follows: the brace and the block below it fold together as one literal
paragraph (the newline shows as a space when the two lines join).

An indented `{…}` above a paragraph stays literal.

::: compare

```carve
 {.note}
 This paragraph.
```

```html
<p>{.note}
This paragraph.</p>
```

:::

An indented `{…}` above a list does not attach to the list either; the whole run
is one literal paragraph and the bullet lines never open a list.

::: compare

```carve
 {.todo}
 - one
 - two
```

```html
<p>{.todo}
- one
- two</p>
```

:::

Control - flush left at column 0 the same brace is a floating attribute block and
attaches to the paragraph below it.

::: compare

```carve
{.note}
Para
```

```html
<p class="note">Para</p>
```

:::

## Indented image and caption stay literal

A lone image on its own line at column 0 becomes a `<figure>` when a `^ ` caption
line follows. Indented by a space, neither the image line nor the caption is a
top-level opener, so the pair folds into a literal paragraph with the raw `^ `
still in the text.

::: compare

```carve
 ![Apollo](a.jpg)
 ^ Figure 1: moon
```

```html
<p><img src="a.jpg" alt="Apollo">
^ Figure 1: moon</p>
```

:::

An indented attribute brace above the indented image and caption is likewise
literal; all three lines join as one paragraph.

::: compare

```carve
 {.gallery}
 ![Apollo](a.jpg)
 ^ Figure 1: moon
```

```html
<p>{.gallery}
<img src="a.jpg" alt="Apollo">
^ Figure 1: moon</p>
```

:::

Control - flush left at column 0 the same image and caption form the `<figure>`.

::: compare

```carve
![Apollo](a.jpg)
^ Figure 1: moon
```

```html
<figure>
  <img src="a.jpg" alt="Apollo">
  <figcaption>Figure 1: moon</figcaption>
</figure>
```

:::

## Indented reference and footnote definitions stay literal

A reference-link definition and a footnote definition are top-level block
constructs that register at column 0. Indented by a space the definition line is
an ordinary paragraph: it registers nothing, so the reference or footnote that
used it never resolves and both render as literal text.

An indented reference definition does not register; the link stays unresolved.

::: compare

```carve
 Read [intro][x].

 [x]: /intro "T"
```

```html
<p>Read [intro][x].</p>
<p>[x]: /intro “T”</p>
```

:::

An indented footnote definition does not register; the footnote reference stays
literal.

::: compare

```carve
 Note[^fn].

 [^fn]: body.
```

```html
<p>Note[^fn].</p>
<p>[^fn]: body.</p>
```

:::

## Indented colon-fence blocks stay literal

A `:::` line opens a container only at column 0. Indented by a space it is not a
fence opener, so the marker, the body, and the closing marker all fold into one
literal paragraph. This holds for a bare div, a `::: |` line block, and a named
admonition alike.

An indented bare `:::` div stays literal.

:::: compare

```carve
 :::
 A box.
 :::
```

```html
<p>:::
A box.
:::</p>
```

::::

An indented `::: |` line block stays literal.

:::: compare

```carve
 ::: |
 Roses,
 Violets.
 :::
```

```html
<p>::: |
Roses,
Violets.
:::</p>
```

::::

An indented `::: note` admonition stays literal.

:::: compare

```carve
 ::: note
 Body.
 :::
```

```html
<p>::: note
Body.
:::</p>
```

::::

Control - flush left at column 0 the same `:::` opens a div.

:::: compare

```carve
:::
A box.
:::
```

```html
<div>
  <p>A box.</p>
</div>
```

::::

## Below-content-column div body in a list item stays literal

Inside a list item the block openers key on the item content column, not column
0. A `::: note` sitting at the marker on the item's first line opens no
container when its body and closing marker sit *below* the content column: they
are lazy paragraph continuations, so the whole run - including the `::: note`
opener line - folds into the item as literal text rather than an admonition.

:::: compare

```carve
- ::: note
 - para text
 :::
```

```html
<ul>
  <li>::: note
- para text
:::</li>
</ul>
```

::::

## Outer item with an internal blank before an attached block is loose

An outer list item that contains its own blank line before a block attached
below its nested list is loose: the item's leading text is wrapped in a `<p>`.
The blank line separates the item's own content from the trailing blockquote-like
paragraph, so the item is not tight even though its nested child list is.

::: compare

```carve
- a
  - b

   > q
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
    <p>&gt; q</p>
  </li>
</ul>
```

:::

## Unresolved footnote reference with a trailing attribute stays literal

A `[^a]` footnote reference with no matching definition is not a footnote and
does not become an attributed span: it stays literal text, and a following
`{...}` attribute block does not attach to it.

::: compare

```carve
Text[^a]{.ref}.
```

```html
<p>Text[^a].</p>
```

:::

A resolved footnote reference is unaffected.

::: compare

```carve
Text[^a].

[^a]: note.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A genuine bracketed span with attributes still works.

::: compare

```carve
A [span]{.c} here.
```

```html
<p>A <span class="c">span</span> here.</p>
```

:::

## Tight list item keeps trailing text after a block bare

In a tight list item, text that follows a closed block (a fenced code block, a
div, or an admonition) is part of the item's inline content and is not wrapped
in a `<p>`, matching the item's tightness. Only a blank-separated (loose) item
wraps its paragraphs.

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
    tail
  </li>
</ul>
```

:::

The same holds after a div body, and for an ordered item.

:::: compare

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
:::note
body
:::
tail</li>
</ul>
```

::::

A blank line makes the item loose, so its leading text and the trailing text
are each wrapped.

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
  <li><p>item</p>
    <pre><code>c
</code></pre>
    <p>tail</p>
  </li>
</ul>
```

:::

## Quote flanking after an escaped character

A backslash-escaped character still flanks as the character it is, so a quote
that follows it decides direction from the literal. `\{` is an opening bracket
and opens the quote; `\<` and `\*` are not, so the quote closes - the same
decision the unescaped character produces. Escaping changes what the character
*is*, not what it flanks like.

Worth pinning because the escape is consumed before the quote is resolved, so an
implementation that loses the literal at that point silently flips the direction.

::: compare

```carve
\{"quoted"\} and \<"q"\> and \*'q'\*

A \{ before a quote still opens it: \{"open"

Unescaped for contrast: {"open"}
```

```html
<p>{“quoted”} and &lt;”q”&gt; and *’q’*</p>
<p>A { before a quote still opens it: {“open”</p>
<p>Unescaped for contrast: {“open”}</p>
```

:::

## Comment fence with trailing text

A `%%%` fence line is a delimiter plus an insignificant tail: only the leading run of `%` is structural, so `%%% html` opens a comment and `%%% end` closes one. No separating space is required, and `%%%` has no info string - a raw passthrough block is a *code* fence with an `=FORMAT` info string - so the body stays hidden and the following block still renders.

::: compare

```carve
before

%%% html
secret
%%% end

after
```

```html
<p>before</p>
<p>after</p>
```

:::

## Unterminated comment fence

A `%%%` opener with no matching closer ahead does not open a block. The line degrades to a `%%` line comment, so every following block still renders. This is deliberately **not** the unclosed-`:::` rule (PART 9 §12), where the opener opens and the container closes at the end of the input: a comment block is invisible either way, so failing closed costs nothing here, whereas the same choice on a container turned one mistyped closer into a tail of literal text. A tail on the opener (`%%% TODO`) changes nothing.

::: compare

```carve
before

%%%
secret

after
```

```html
<p>before</p>
<p>secret</p>
<p>after</p>
```

:::

## Widened verbatim fences

A verbatim run widens so its content can hold a shorter backtick run: the span
ends at a run of EXACTLY the opening width, and any shorter run inside is
content. That applies uniformly to the whole verbatim family - inline code, the
inline literal, and both math forms - because each is the same backtick run with
a different sigil in front.

Worth pinning because a highlighter or engine that only handles the one- and
two-backtick widths closes at the first shorter run inside a wider fence and
leaks the rest of the span as prose, which is exactly what happened in the
highlight.js grammar (markup-carve/carve-grammars#52). No other corpus case uses
a fence wider than two backticks for these constructs.

::: compare

```carve
A ```span with `` inside``` stays one code span.

A !```literal with `` inside``` stays prose.

Then $```a `` b``` ends the run.

$$```x `` y```
```

```html
<p>A <code>span with `` inside</code> stays one code span.</p>
<p>A literal with `` inside stays prose.</p>
<p>Then <span class="math inline">\(a `` b\)</span> ends the run.</p>
<p><span class="math display">\[x `` y\]</span></p>
```

:::

## Only the id hoists to the section wrapper

On a top-level heading the id moves to the `<section>` and every other attribute
stays on the `<h*>` - identically whether the id was slugged from the heading
text or written as `{#id}`. Worth pinning because djot resolved the same question
the other way (all attributes migrate) and then implemented that resolution only
for the explicit-id case, so its two cases disagree (`jgm/djot.js#144`). Carve's
agree, and that is what keeps the rule stable when the wrapper is switched off:
the id returns to the `<h*>` and nothing else moves.

::: compare

```carve
{a=b .c}
# Auto slug

{a=b .c #explicit}
# Written id
```

```html
<section id="Auto-slug">
  <h1 a="b" class="c">Auto slug</h1>
</section>
<section id="explicit">
  <h1 a="b" class="c">Written id</h1>
</section>
```

:::

## Headings inside containers are not wrapped

A `<section>` models this document's own outline, so only top-level headings open
one. A heading inside a blockquote, div, or list item emits a bare `<h*>` with
its id on the heading itself. The ids are still assigned, still share the one
document-order dedup namespace with top-level headings, and are still `</#id>`
crossref targets - only the wrapper and the id's emission site differ.

::::: compare

```carve
> # Quoted
>
> Quoted body.

:::
# Divved
:::

- # In an item

  Item body.
```

```html
<blockquote>
  <h1 id="Quoted">Quoted</h1>
  <p>Quoted body.</p>
</blockquote>
<div>
  <h1 id="Divved">Divved</h1>
</div>
<ul>
  <li>
    <h1 id="In-an-item">In an item</h1>
    <p>Item body.</p>
  </li>
</ul>
```

:::::

## Attribute order on an unwrapped heading

A heading that carries no `<section>` wrapper emits its id on the `<h*>`, which
puts a generated attribute next to authored ones. The author's order is never
rearranged; the engine-minted id joins at the end. An id the author wrote is not
generated, so it keeps its authored position instead.

Worth pinning because the combination was previously unreachable except through
a container, and no case gave such a heading attributes - so all three engines
picked different answers here and every one of them stayed green (PART 10 §1).

::::: compare

```carve
> {a=b .c}
> # Auto

> {#x a=b}
> # Written

:::
{a=b .c}
# Divved
:::
```

```html
<blockquote>
  <h1 a="b" class="c" id="Auto">Auto</h1>
</blockquote>
<blockquote>
  <h1 id="x" a="b">Written</h1>
</blockquote>
<div>
  <h1 a="b" class="c" id="Divved">Divved</h1>
</div>
```

:::::

## Attribute braces on a list-item marker line

Three shapes that look alike and mean different things (PART 9 §15 A8). What
decides is whether content follows the brace run on that line, not the column
the braces sit in.

`-{…} text` with no space after the marker attributes the **item**. With a
space and text after the braces, the braces are part of that text. With a space
and *nothing* after them, it is an ordinary attribute line that floats to the
next block - a container does not get its own attribute rules.

Worth pinning because the two halves were each pinned already and their boundary
was not: carve-rs read the third shape as literal text while the other engines
read it as an attribute line, and neither could be shown wrong (carve#454).

::: compare

```carve
-{.item} An attributed item.
- {.c} literal text

- {a=b .c}
  # Attributed heading
```

```html
<ul>
  <li class="item"><p>An attributed item.</p></li>
  <li><p>{.c} literal text</p></li>
  <li>
    <h1 a="b" class="c" id="Attributed-heading">Attributed heading</h1>
  </li>
</ul>
```

:::


## Implicit heading references with no definition

A `[text][]` that matches no link definition falls back to the document's
headings by their rendered text (PART 11 R1). The match is looser than the
exact, case-sensitive link-definition match in the same rule: it trims,
collapses whitespace and folds case, because a definition label is an
identifier the author wrote twice while a heading reference is prose quoted
from elsewhere in the document.

A heading under a blockquote is declined - quoted text names the quoted
document's headings, not this one's - while a list item resolves, because that
is the author's own grouping. An unmatched label stays literal, and a real link
definition wins the tie.

Worth pinning because every case that existed paired `[X][]` with an `[X]: url`
definition, so the fallback branch had no coverage at all and the executable
spec had never implemented it (carve#453).

::: compare

```carve
# Getting Started

See [getting started][] and [Missing][].

> # Quoted

See [Quoted][].

- # In an item

See [In an item][].

# Defined

[Defined]: /wins

See [Defined][].
```

```html
<section id="Getting-Started">
  <h1>Getting Started</h1>
  <p>See <a href="#Getting-Started">getting started</a> and [Missing][].</p>
  <blockquote>
    <h1 id="Quoted">Quoted</h1>
  </blockquote>
  <p>See [Quoted][].</p>
  <ul>
    <li>
      <h1 id="In-an-item">In an item</h1>
    </li>
  </ul>
  <p>See <a href="#In-an-item">In an item</a>.</p>
</section>
<section id="Defined">
  <h1>Defined</h1>
  <p>See <a href="/wins">Defined</a>.</p>
</section>
```

:::
