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
  <thead><tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Age</th><th scope="col" style="text-align: center;">City</th></tr></thead>
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
  <thead><tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Qty</th></tr></thead>
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
  <thead><tr><th scope="col">Name</th><th scope="col">Age</th></tr></thead>
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
  <thead><tr><th scope="col" style="text-align: right;">Category</th><th scope="col">Item</th><th scope="col">Price</th></tr></thead>
  <tbody>
    <tr><td style="text-align: right;">Fruit</td><td>Apple</td><td>$1</td></tr>
    <tr><td colspan="2" style="text-align: right;">Total</td><td>$1.50</td></tr>
  </tbody>
</table>
```

:::

## Table doubled alignment marker

An alignment run is accepted as a unit. A duplicate horizontal axis makes the
whole run invalid, so `|=<<` keeps both `<` characters as visible content rather
than consuming a valid prefix. The header `=` remains independent.

::: compare

```carve
|=<< Note |= Plain |
| a         | b       |
```

```html
<table>
  <thead><tr><th scope="col">&lt;&lt; Note</th><th scope="col">Plain</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
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
  <thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead>
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
  <thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead>
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
  <thead><tr><th scope="col">Tier</th><th scope="col">User</th></tr></thead>
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
  <thead><tr><th scope="col">Feature</th><th scope="col">Description</th></tr></thead>
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
  <thead><tr><th scope="col">Category</th><th scope="col">Item</th></tr></thead>
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

Only a fence that CLOSES is opaque. An opener with no closer ahead opens no
span at all, so the container's own closer stays structural and the lines after
it are parsed normally. Without this one unclosed fence would swallow the rest
of the document - the `:::` and `after` below would both render inside the code
block, and the admonition would close at end of input.

The `%%%` rule already worked this way; the code fence did not, in any of the
three engines, because the spec had only ever written it down for `%%%`.

:::: compare

````carve
::: note
```
x
:::
after
````

```html
<aside class="admonition note">
  <pre><code>x
</code></pre>
</aside>
<p>after</p>
```

::::

A fence with nothing to take structure away from is unaffected: alone, or as
the whole content of a blockquote, an unterminated fence still opens a code
block that runs to the end.

:::: compare

````carve
> ```
````

```html
<blockquote>
  <pre><code>
</code></pre>
</blockquote>
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

An abbreviation definition is collected for the document's abbreviation table
and leaves nothing behind. It renders to nothing only where it is a definition,
which is at document level: inside a container the same line is ordinary text.

:::: compare

```carve
*[HTML]: HyperText Markup Language

:::
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
:widget[x]{k="{y}"}
```

```html
<p><span class="ext-widget" k="{y}">x</span></p>
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
a class lands on the fallback span, and on the semantic element where an
extension supplies one.

::: compare

```carve
:widget[x]{.foo}
```

```html
<p><span class="ext-widget foo">x</span></p>
```

:::

A semantic span carries its attributes on the element it names, because a
consumed name RENAMES the span rather than wrapping it (PART 9 §9).

::: compare

```carve
[x]{#k .key kbd}
```

```html
<p><kbd id="k" class="key">x</kbd></p>
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

A flush-left line after a heading cannot stay in the item that ends on that
heading: the heading leaves no paragraph open. At a nested depth it may still
resume an enclosing item's open paragraph. What it does *not* do is fold into
the heading: a heading ends at the newline (§18), and its id is built from the
heading line alone.

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
      </li>
    </ul>
    lazy
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

A bullet's content column is where the marker actually ends, not a fixed 2. A
bullet followed by extra spaces puts its content further right, and a block
belongs to the item only if it reaches that column.

::: compare

```carve
-   item
    # Wide
```

```html
<ul>
  <li>item
    <h1 id="Wide">Wide</h1>
  </li>
</ul>
```

:::

Below that column the line is lazy paragraph text instead, so its marker
survives literally — the same content-column rule as everywhere else, measured
from the marker rather than assumed.

::: compare

```carve
-   item
  # H
```

```html
<ul>
  <li>item
# H</li>
</ul>
```

:::

A task item is the exception: its content column stays at 2. The checkbox is
content rather than marker, and extra spaces before it do not move the column
either, so neither 6 nor 8 is where the body starts.

::: compare

```carve
-   [ ] item
    # H
```

```html
<ul>
  <li><input type="checkbox" disabled> item
# H</li>
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

A block quote marker followed by a space interrupts.

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

Without the space, `>` is ordinary paragraph text. This keeps operators and
technical prose from opening accidental quotes.

::: compare

```carve
text
>>= operator
>=3 items
>_< face
```

```html
<p>text
&gt;≥ operator
≥3 items
&gt;_&lt; face</p>
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

The open-paragraph condition is not about list markers. **Plain** lazy text
needs one too, and the same closed blocks leave none - so the quote ends and the
line becomes a top-level paragraph.

This is the case the list-marker example above does not reach, and every engine
had a defect in it: carve-php kept the quote open after a heading, and carve-js
and carve-php both kept it open after the two below.

::: compare

```carve
> # h
b
```

```html
<blockquote>
  <h1 id="h">h</h1>
</blockquote>
<p>b</p>
```

:::

A definition **term** is bounded the same way. It holds inline content, not a
paragraph, so there is nothing for the next line to continue.

::: compare

```carve
> :: t
~
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<p>~</p>
```

:::

An invisible definition leaves nothing on the page at all, which is the clearest
case of the rule: there is no paragraph because there is no output.

::: compare

```carve
> [f]: ~
/
```

```html
<blockquote>

</blockquote>
<p>/</p>
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

A heading **ends at the newline**. Nothing folds into it: the next line begins whatever block it begins, exactly as after any other closed block. This diverges from djot deliberately — djot folds a following plain line into the heading, which is a silent corruption for anyone arriving from Markdown, and `divergence-from-djot` §7 already broke from djot on the mirror case. A `^ …` caption line is no exception: it does not fold in, and it does not attach either, because a heading is not one of §4's captionable hosts - it opens an ordinary paragraph. The heading id is built from the single line. (Setext underline headings remain intentionally excluded.)

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

A colon fence that is **not a valid opener** opens no block, so it leaves the paragraph open and the dedented line folds in. `:::note` has no space between the fence and the type word, so §12's opener test rejects it and the line is ordinary paragraph text; from there the paragraph absorbs the following fence-shaped line as text too (§12, "the absorption is not width-tagged"). Nothing ever interrupted the item's paragraph, so it is still **open** when `tail` arrives, and PART 1 S4 folds `tail` into it. What decides is whether a block was opened, never the shape of the line that tried - an absorbed fence is prose:

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
:::
tail</li>
</ul>
```

:::::

Give the same fence its space and the contrast is exact. Written `::: note`, it is a valid opener: it interrupts the item's paragraph, its closer completes the block, and a closed `:::` div or admonition leaves no open paragraph - so there `tail` does end the item and becomes a document paragraph, exactly as after the fenced code block and the table above. One space between the fence and the type word decides which of the two answers the same five lines get.

The same clause settles the neighboring shapes, which is how one knows it is the clause and not a special case, and each of them is a place an implementation could get the right answer here for the wrong reason. Indenting the lazy line to column 1 changes nothing, since it is still below the content column. The malformed fence may be the paragraph's FIRST line, written on the marker line itself (`- :::note`), and the item then opens with a paragraph that begins with fence-shaped text. Inside a block quote, `> tail` supplies the quote's prefix but not the item's indentation, which is the partial match S4 is written for. All three fold, for the one reason above; `tests/colon-fence-absorbed-in-an-item.test.mjs` pins them.

The same rule reaches a list item's second paragraph. The blank before
`spaced` makes the item loose, but it does not close the paragraph that
`spaced` opens. The following flush-left line therefore folds into that
innermost paragraph; paragraph depth does not create a special boundary.

::: compare

```carve
1. item

   spaced
flush
```

```html
<ol>
  <li><p>item</p>
    <p>spaced
flush</p>
  </li>
</ol>
```

:::

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

An **invisible construct** does not loosen either, and for a plainer reason than L2: §17 L1 asks whether the item holds a blank-line-separated second *paragraph*, and a comment or a definition is not a paragraph - it renders nothing at all. An item wrapped in `<p>` because of a line that produces no output would be the blank line showing through.

::: compare

```carve
- a

  %% just a note
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

The same for a definition, which is collected and renders nothing where it stood.

::: compare

```carve
- a

  [r]: /u
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

A **sibling item after it** is a different question, and there the list is loose: L1's other clause asks whether an item is followed by a blank line before the next sibling marker, and it is - an invisible line in the gap does not fill it.

::: compare

```carve
- a

  %% just a note
- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

A paragraph inside an item carries block attributes like any other, and the attribute line sits above it exactly as it does at document level.

::: compare

```carve
- a

  first

  {.c}
  second
```

```html
<ul>
  <li><p>a</p>
    <p>first</p>
    <p class="c">second</p>
  </li>
</ul>
```

:::

The attribute still reaches its paragraph **across a blank line**, exactly as it does at document level: §15 A2a floats it to the next visible block, and a blank is not a block. The item is loose because that paragraph is a real second one, not because of the attribute line.

::: compare

```carve
- a

  {.c}

  b
```

```html
<ul>
  <li><p>a</p>
    <p class="c">b</p>
  </li>
</ul>
```

:::

On its own, though, an attribute line leaves the item **tight** — it renders nothing, so it is not the second paragraph §17 L1 asks for, the same reason a comment or a definition is not.

::: compare

```carve
- a

  {.c}
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

One column further in it is not an attribute line at all: §15 makes it column-strict, so it is literal paragraph text. It renders, and it loosens like any other paragraph — the one place where an attribute line and a comment part company, since a comment renders nothing at any indent.

::: compare

```carve
- a

   {.c}
```

```html
<ul>
  <li><p>a</p>
    <p>{.c}</p>
  </li>
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

### A sub-list's marker column takes the marker too

"The current container" in §17 L3 is whichever container the marker's column belongs to, and inside an item that can be a sub-list. A `+` at the sub-list's marker column attaches the block to the sub-list's item, not to the outer one:

::: compare

```carve
- a
  - b
  +
  c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        c
      </li>
    </ul>
  </li>
</ul>
```

:::

Indent it one step further and it is past every marker column in scope, so it is ordinary text again — the same rule as above, read against the sub-list instead of the outer item:

::: compare

```carve
- a
  - b
    +
    c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
+
c</li>
    </ul>
  </li>
</ul>
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
  <thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead>
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
attribute, normally rendered `name=""`. It works in any attribute position and
mixes with id / class / key=value. The nine semantic span names are the core
exception: on `[content]{attrs}` they select their semantic wrapper.

::: compare

```carve
Press [Tab]{kbd} to indent.
```

```html
<p>Press <kbd>Tab</kbd> to indent.</p>
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
  <thead><tr><th scope="col"></th><th scope="col">b</th></tr></thead>
  <tbody>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::

## Table cell attributes

A `{…}` attribute block glued to a cell (no space) sets that cell's attributes;
the rest, after optional whitespace, is the cell content. A space before the
brace keeps it literal, and a cell carrying attributes is never a bare span
marker. The block binds after the cell's kind and alignment markers, so on a
cell with no marker it sits directly against the opening `|`.

::: compare

```carve
|{.highlight} Total | 99 |
|---|---|
| a | b |
```

```html
<table>
  <thead><tr><th scope="col" class="highlight">Total</th><th scope="col">99</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

## Table row attributes

An attribute block glued to a row's closing `|` sets that row's `<tr>`
attributes - the row-level twin of a cell's attribute block, in a different
position: a row's follows the row's last `|`, a cell's follows the cell's
markers. It applies to a header or a body row and composes with the GFM
delimiter row.

::: compare

```carve
| Name | Score |{.head}
|------|-------|
| Ann  | 9     |{.win}
```

```html
<table>
  <thead><tr class="head"><th scope="col">Name</th><th scope="col">Score</th></tr></thead>
  <tbody>
    <tr class="win"><td>Ann</td><td>9</td></tr>
  </tbody>
</table>
```

:::

## Table header cell rowspan

A `^` rowspan marker extends the cell above it even across the header/body
boundary: a header cell can span into the body rows below, rendering as
`<th scope="col" rowspan="N">`.

::: compare

```carve
|= H |= G |
| ^ | b |
| ^ | c |
```

```html
<table>
  <thead><tr><th scope="col" rowspan="3">H</th><th scope="col">G</th></tr></thead>
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

One column further out the same blank belongs to the OUTER item: `second` sits at the outer item's content column, so that item holds two blocks - the sub-list and a paragraph - and goes loose. The lead being a marker line is not part of the looseness test.

::: compare

```carve
- - A

  second
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
    </ul>
    <p>second</p>
  </li>
</ul>
```

:::

Flush left, the blank has closed the sub-item's paragraph and the line is below every open item's content column, so the list ends and the text is a document-level paragraph. Without the blank the same line would fold into the sub-item as lazy continuation.

::: compare

```carve
- - A

second
```

```html
<ul>
  <li>
    <ul>
      <li>A</li>
    </ul>
  </li>
</ul>
<p>second</p>
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
  <thead><tr><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th></tr></thead>
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
  <thead><tr><th scope="col">p</th><th scope="col">q</th><th scope="col">r</th><th scope="col">s</th></tr></thead>
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

A `+` continuation row joins the row ABOVE IT IN THE SOURCE, and a delimiter
row is consumed: it produces no `<tr>` and is not a row of the table. So a `+`
line directly under one has no row to join and stays an ordinary paragraph.

The reason is the delimiter row and not the missing body row. A header row on
its own IS joinable - see *A continuation row joins the row above it, whatever
its cells hold* below - so "no body row yet" would answer that document wrongly
(markup-carve/carve#1354).

::: compare

```carve
| a | b |
| - | - |
+ cont |
```

```html
<table>
  <thead><tr><th scope="col">a</th><th scope="col">b</th></tr></thead>
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
opener. The opener still opens its admonition, which closes at end of input, and
the stray `:::` opens a second, top-level div with an empty body:

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
      <thead><tr><th scope="col">H</th></tr></thead>
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


## Bare-dot ordered markers

An ordered marker may drop its value when the delimiter is `.`: a bare `. `
counts from 1, the AsciiDoc-style shorthand for the list nobody numbers by hand.

::: compare

```carve
. first
. second
. third
```

```html
<ol>
  <li>first</li>
  <li>second</li>
  <li>third</li>
</ol>
```

:::

The bare dot is a **spelling, not a dialect**: it *is* decimal-dot, so it opens
and continues one list with the explicit form. Only `.` may drop its value -
a leading `) ` collides with prose parentheticals far more often than a leading
`. ` does, the same asymmetry that keeps `(1)` from being a marker.

::: compare

```carve
1. explicit
. continues the same list

) not a marker, and never opens one
```

```html
<ol>
  <li>explicit</li>
  <li>continues the same list</li>
</ol>
<p>) not a marker, and never opens one</p>
```

:::

Carrying no value, it cannot set a start - `3.` is how that is written - and
li-attributes attach to it exactly as they do to every other marker, because
the shape is marker, then attributes, then the required space.

::: compare

```carve
.{#x} attributed
. plain
```

```html
<ol>
  <li id="x">attributed</li>
  <li>plain</li>
</ol>
```

:::

## A repeated definition: which one wins

The three definition kinds do not answer this the same way, so each is pinned
separately.

A repeated **link reference** definition is overridden by the later one.

::: compare

```carve
see [t][r].

[r]: /a

[r]: /b
```

```html
<p>see <a href="/b">t</a>.</p>
```

:::

A repeated **abbreviation** definition behaves the same way - the later
expansion wins.

::: compare

```carve
*[A]: a
*[A]: b

A here.
```

```html
<p><abbr title="b">A</abbr> here.</p>
```

:::

A repeated **footnote** definition does not: the FIRST one wins and the later
one is dropped. `carve lint` reports it as `duplicate-footnote-definition`.

::: compare

```carve
see [^f].

[^f]: one

[^f]: two
```

```html
<p>see <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>one<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A marker separator is a space, never a tab

Every marker that takes a separator takes the space character: a tab after the
marker leaves ordinary paragraph text. The definition term is shown because it
was the last construct to agree - carve-js and carve-php read a tab as a term
until carve#532.

::: compare

```carve
::	term
:  d
```

```html
<p>::	term
:  d</p>
```

:::

A space opens the same document as written.

::: compare

```carve
:: term
:  d
```

```html
<dl>
  <dt>term</dt>
  <dd>d</dd>
</dl>
```

:::

## Two abbreviation definitions

Nothing about the second definition is special - it is here because a document
with TWO of them is what tells the engines apart. The HTML says nothing about
how the definitions were spelled, so a formatter that joined them differently
stayed invisible until the canonical-Carve target was compared across engines
(carve-php#682).

::: compare

```carve
*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

HTML and CSS.
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> and <abbr title="Cascading Style Sheets">CSS</abbr>.</p>
```

:::

## A flush-left line needs an open paragraph to fold into

A lazy continuation folds into the innermost OPEN paragraph (PART 1 S4). Where
nothing is open, the unmatched containers close and the line is re-classified at
the top level - and an item whose last block is an EMPTY container has nothing
open, whatever column the next line starts at.

Pinned because no case had a container as an item's last block followed by a
flush-left line, so three engines gave three answers with every suite green
(carve#561, carve#572, carve#582).

An empty quote on the marker line opens no paragraph, so the item closes:

::: compare

```carve
. >
X
```

```html
<ol>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ol>
<p>X</p>
```

:::

The same with a bullet marker:

::: compare

```carve
- >
lazy
```

```html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>lazy</p>
```

:::

CONTRAST: give the quote content and a paragraph IS open, so the line folds into
it and the item stays:

::: compare

```carve
- > q
lazy
```

```html
<ul>
  <li>
    <blockquote><p>q
lazy</p></blockquote>
  </li>
</ul>
```

:::

A sub-list is not special either. The item's last block is a list whose own last
item holds an open paragraph, so the flush-left line folds into THAT paragraph -
the same answer as when the sub-list is opened on its own line.

::: compare

```carve
- - a
b
```

```html
<ul>
  <li>
    <ul>
      <li>a
b</li>
    </ul>
  </li>
</ul>
```

:::

The line does not have to be flush left, and it does not have to look like prose.
One column in it reaches no content column - not the sub-list's, not the outer
item's - so it opens nothing and folds as text, marker and all.

::: compare

```carve
- - a
 - b
```

```html
<ul>
  <li>
    <ul>
      <li>a
- b</li>
    </ul>
  </li>
</ul>
```

:::

A heading in that position folds the same way. Flush left it would be a heading,
and at the sub-list's own column the marker above would be a sibling item: the
fold is about reaching no column at all.

::: compare

```carve
- x
  - a
 # H
```

```html
<ul>
  <li>x
    <ul>
      <li>a
# H</li>
    </ul>
  </li>
</ul>
```

:::

How FAR below the column it sits changes nothing. §24 C3 asks one question - does
the line reach the content column - and Rule B's "any indent" is scoped to where
a TOP-LEVEL list may open (C4), not to nesting. Here the sub-list's content
column is 6 and the outer item's is 4, so a marker at 2 reaches neither and
folds, exactly as it does one column in.

::: compare

```carve
-   x
    - a
  - b
```

```html
<ul>
  <li>x
    <ul>
      <li>a
- b</li>
    </ul>
  </li>
</ul>
```

:::

## An abbreviation definition is recognized only at document level

`*[TERM]: expansion` defines an abbreviation only as a direct child of the document. Inside a block quote, a list item or a div the line is ordinary paragraph text: it defines nothing and it is preserved as written. An abbreviation is the only definition kind with no marker at the use site, so a definition carried in quoted material would otherwise rewrite every occurrence of its term in the quoting document.

::: compare

```carve
> *[HTML]: Hyper Text

The HTML spec.
```

```html
<blockquote><p>*[HTML]: Hyper Text</p></blockquote>
<p>The HTML spec.</p>
```

:::

## A list item does not define an abbreviation either

The same rule holds for every container, not just the block quote: the definition line stays visible text and expands nothing.

::: compare

```carve
- *[HTML]: Hyper Text

The HTML spec.
```

```html
<ul>
  <li>*[HTML]: Hyper Text</li>
</ul>
<p>The HTML spec.</p>
```

:::

## A div does not define an abbreviation either

The rule names three containers - a block quote, a list item and a div - and the first two were pinned while the third was not. A div is the one of the three that renders its children unchanged, so a definition inside it is the case where the line looks most like a document-level one, and the use below it still gets no `<abbr>`.

::::: compare

```carve
:::
*[HTML]: Hyper Text

The HTML spec.
:::
```

```html
<div>
  <p>*[HTML]: Hyper Text</p>
  <p>The HTML spec.</p>
</div>
```

:::::

## Openers past the nesting cap are one paragraph

Past `MAX_NESTING_DEPTH` (200) an opener stops recursing and becomes literal
paragraph text (PART 9 §25). Those lines are ORDINARY paragraph text, so they
group by the ordinary paragraph rule: consecutive over-cap openers, and any text
following them, form one paragraph, with no trailing newline before `</p>`.

This was unstated and the three engines each chose differently - one paragraph
per opener, one paragraph for all of them with a trailing newline, and one
without it (carve#494). Nothing measured it, because no corpus document reached
the cap and every gate compares HTML over the corpus.

The case is large because it has to be: the cap is 200, so no shorter document
reaches the path at all. It is marked `no-render` so the docs page does not try
to display 200 nested containers. The container marker is five colons because
the body holds four-colon openers, and markdown-it-container closes on the first
matching run it sees.

::::: compare no-render

```carve
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
:::: note
x
```

```html
<aside class="admonition note">
  <aside class="admonition note">
    <aside class="admonition note">
      <aside class="admonition note">
        <aside class="admonition note">
          <aside class="admonition note">
            <aside class="admonition note">
              <aside class="admonition note">
                <aside class="admonition note">
                  <aside class="admonition note">
                    <aside class="admonition note">
                      <aside class="admonition note">
                        <aside class="admonition note">
                          <aside class="admonition note">
                            <aside class="admonition note">
                              <aside class="admonition note">
                                <aside class="admonition note">
                                  <aside class="admonition note">
                                    <aside class="admonition note">
                                      <aside class="admonition note">
                                        <aside class="admonition note">
                                          <aside class="admonition note">
                                            <aside class="admonition note">
                                              <aside class="admonition note">
                                                <aside class="admonition note">
                                                  <aside class="admonition note">
                                                    <aside class="admonition note">
                                                      <aside class="admonition note">
                                                        <aside class="admonition note">
                                                          <aside class="admonition note">
                                                            <aside class="admonition note">
                                                              <aside class="admonition note">
                                                                <aside class="admonition note">
                                                                  <aside class="admonition note">
                                                                    <aside class="admonition note">
                                                                      <aside class="admonition note">
                                                                        <aside class="admonition note">
                                                                          <aside class="admonition note">
                                                                            <aside class="admonition note">
                                                                              <aside class="admonition note">
                                                                                <aside class="admonition note">
                                                                                  <aside class="admonition note">
                                                                                    <aside class="admonition note">
                                                                                      <aside class="admonition note">
                                                                                        <aside class="admonition note">
                                                                                          <aside class="admonition note">
                                                                                            <aside class="admonition note">
                                                                                              <aside class="admonition note">
                                                                                                <aside class="admonition note">
                                                                                                  <aside class="admonition note">
                                                                                                    <aside class="admonition note">
                                                                                                      <aside class="admonition note">
                                                                                                        <aside class="admonition note">
                                                                                                          <aside class="admonition note">
                                                                                                            <aside class="admonition note">
                                                                                                              <aside class="admonition note">
                                                                                                                <aside class="admonition note">
                                                                                                                  <aside class="admonition note">
                                                                                                                    <aside class="admonition note">
                                                                                                                      <aside class="admonition note">
                                                                                                                        <aside class="admonition note">
                                                                                                                          <aside class="admonition note">
                                                                                                                            <aside class="admonition note">
                                                                                                                              <aside class="admonition note">
                                                                                                                                <aside class="admonition note">
                                                                                                                                  <aside class="admonition note">
                                                                                                                                    <aside class="admonition note">
                                                                                                                                      <aside class="admonition note">
                                                                                                                                        <aside class="admonition note">
                                                                                                                                          <aside class="admonition note">
                                                                                                                                            <aside class="admonition note">
                                                                                                                                              <aside class="admonition note">
                                                                                                                                                <aside class="admonition note">
                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                  <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                    <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                      <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                        <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                          <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                            <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                              <aside class="admonition note">
                                                                                                                                                                                                                                                                                                                                                                                                                <p>:::: note
:::: note
:::: note
x</p>
                                                                                                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                                </aside>
                                                                                                                                                                                                              </aside>
                                                                                                                                                                                                            </aside>
                                                                                                                                                                                                          </aside>
                                                                                                                                                                                                        </aside>
                                                                                                                                                                                                      </aside>
                                                                                                                                                                                                    </aside>
                                                                                                                                                                                                  </aside>
                                                                                                                                                                                                </aside>
                                                                                                                                                                                              </aside>
                                                                                                                                                                                            </aside>
                                                                                                                                                                                          </aside>
                                                                                                                                                                                        </aside>
                                                                                                                                                                                      </aside>
                                                                                                                                                                                    </aside>
                                                                                                                                                                                  </aside>
                                                                                                                                                                                </aside>
                                                                                                                                                                              </aside>
                                                                                                                                                                            </aside>
                                                                                                                                                                          </aside>
                                                                                                                                                                        </aside>
                                                                                                                                                                      </aside>
                                                                                                                                                                    </aside>
                                                                                                                                                                  </aside>
                                                                                                                                                                </aside>
                                                                                                                                                              </aside>
                                                                                                                                                            </aside>
                                                                                                                                                          </aside>
                                                                                                                                                        </aside>
                                                                                                                                                      </aside>
                                                                                                                                                    </aside>
                                                                                                                                                  </aside>
                                                                                                                                                </aside>
                                                                                                                                              </aside>
                                                                                                                                            </aside>
                                                                                                                                          </aside>
                                                                                                                                        </aside>
                                                                                                                                      </aside>
                                                                                                                                    </aside>
                                                                                                                                  </aside>
                                                                                                                                </aside>
                                                                                                                              </aside>
                                                                                                                            </aside>
                                                                                                                          </aside>
                                                                                                                        </aside>
                                                                                                                      </aside>
                                                                                                                    </aside>
                                                                                                                  </aside>
                                                                                                                </aside>
                                                                                                              </aside>
                                                                                                            </aside>
                                                                                                          </aside>
                                                                                                        </aside>
                                                                                                      </aside>
                                                                                                    </aside>
                                                                                                  </aside>
                                                                                                </aside>
                                                                                              </aside>
                                                                                            </aside>
                                                                                          </aside>
                                                                                        </aside>
                                                                                      </aside>
                                                                                    </aside>
                                                                                  </aside>
                                                                                </aside>
                                                                              </aside>
                                                                            </aside>
                                                                          </aside>
                                                                        </aside>
                                                                      </aside>
                                                                    </aside>
                                                                  </aside>
                                                                </aside>
                                                              </aside>
                                                            </aside>
                                                          </aside>
                                                        </aside>
                                                      </aside>
                                                    </aside>
                                                  </aside>
                                                </aside>
                                              </aside>
                                            </aside>
                                          </aside>
                                        </aside>
                                      </aside>
                                    </aside>
                                  </aside>
                                </aside>
                              </aside>
                            </aside>
                          </aside>
                        </aside>
                      </aside>
                    </aside>
                  </aside>
                </aside>
              </aside>
            </aside>
          </aside>
        </aside>
      </aside>
    </aside>
  </aside>
</aside>
```

:::::
:::

## A comment is recognized at any column

Every other construct below an item's content column folds as text (§24 C3), but a comment is invisible by nature and authors indent one freely, so it is found wherever it sits. Folding it would make `%% c` visible, which is the one outcome a comment may never have. The item stays open, so a following line still belongs to it.

::: compare

```carve
- a
 %% c
b
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
```

:::


## A definition below every content column folds as text

A definition is not block-shaped, but §24 C3's "every other line" covers it too: below every open content column it folds into the item paragraph as literal text and registers nothing, so a reference to it elsewhere stays literal. The failure this guards against is not a wrong shape but a disappearance - a definition that falls past the fold branch lands at the item's own column 0, where it is skipped as already-extracted and renders as nothing at all.

::: compare

```carve
- - a
 [^f]: x
```

```html
<ul>
  <li>
    <ul>
      <li>a
[^f]: x</li>
    </ul>
  </li>
</ul>
```

:::

## A caret is a reference label, not an empty footnote

`footnote_label = {character - ']'}+` is one-or-more, so `[^]` has no footnote
label and `[^]: /u` is not a footnote definition. `reference_label = (character
- ']' - '@'), {character - ']'}` excludes exactly two characters, and `^` is not
one of them - so the line IS a link reference definition whose label is `^`, and
a reference spelled `[text][^]` resolves against it.

Pinned because all three engines and this repository's own oracle once
disagreed: the definition vanished in one, became an empty-label footnote in
another, and the oracle's label pattern excluded a character the production
admits (carve-rs#488, carve-rs#511, carve#589).

::: compare

```carve
[^]: /u

see [text][^].
```

```html
<p>see <a href="/u">text</a>.</p>
```

:::

A bare `[^]` with nothing defining it stays literal, since Carve has no
shortcut reference.

::: compare

```carve
see [^].
```

```html
<p>see [^].</p>
```

:::

## An invisible line does not cancel a blank-line separation

§17 L1 asks whether an item holds a blank-line-separated second paragraph. A line that renders nothing - a comment, a definition, an attribute line - is not a paragraph, which is why it cannot be the second one; the same fact means it cannot stand between the blank line and the paragraph that follows either. Delete the comment below and every implementation renders the item loose, so a construct that outputs nothing may not change that.

::: compare

```carve
- a

  %% n
  text
```

```html
<ul>
  <li><p>a</p>
    <p>text</p>
  </li>
</ul>
```

:::

An invisible line on its own is still not a second paragraph, so the item stays tight.

::: compare

```carve
- a

  %% n
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

## A comment fence is a comment at any column too

§24 C3 recognizes a comment at any column, and that covers the fence form as well as the `%%` line: an indented `%%%` opener below an item's content column stays invisible, along with the body it encloses. Rendering the opener as text would put the comment on the page, which is what the rule exists to prevent.

::: compare

```carve
- a
 %%% n
 x
 %%%
 tail
```

```html
<ul>
  <li>a
    tail
  </li>
</ul>
```

:::

## A floating attribute stops at the item boundary

§15 A2a floats a pending attribute past what renders nothing and attaches it to the next VISIBLE block. An item boundary ends that scope: the attribute does not carry into the next item's paragraph, so neither `a` nor `b` takes the class. All four implementations agree, and agreement is not a check - without a case, a future regression has nothing to fail against.

::: compare

```carve
- a

  {.c}
- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

## A comment under a nested item does not close it

A comment renders nothing, so it cannot decide which item the line after it belongs to. Remove the comment and `b` folds into the inner item; with it there, `b` must still fold into the inner item. An invisible construct has no structural effect - §28's `comment_line` makes the indentation part of the construct rather than a column measurement.

::: compare

```carve
- - a
 %% c
 b
```

```html
<ul>
  <li>
    <ul>
      <li>a
        b
      </li>
    </ul>
  </li>
</ul>
```

:::

## A definition inside a comment registers nothing

A comment's body is opaque, and that covers the lines that render nothing of their own. A link reference or footnote definition written inside `%%%` registers no label, so a reference to it elsewhere stays literal. A definition that registered from inside a comment would be invisible in the output and active in the link table at once - a reference resolving against text the author commented out.

::: compare

```carve
%%%
[r]: /u
%%%
[r][]
```

```html
<p>[r][]</p>
```

:::

## A blank after a comment still ends the item

A comment renders nothing, so it neither closes the item nor holds it open across a blank line. The blank does what a blank always does: it ends the item, and the indented line after it is a document-level paragraph rather than item content.

::: compare

```carve
- - a
 %% c

 b
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
<p>b</p>
```

:::

## A comment fence under a nested item does not close it either

The fence form behaves as the `%%` line does: it is invisible, it leaves the item open, and the line after it folds into the inner item exactly as it would with no comment between.

::: compare

```carve
- - a
 %%% c
 x
 %%%
 b
```

```html
<ul>
  <li>
    <ul>
      <li>a
        b
      </li>
    </ul>
  </li>
</ul>
```

:::

## A collapsed reference is matched by the label the author wrote

`[label][]` resolves against the definition whose label is that BRACKET TEXT, whitespace-collapsed - the same spelling the definition line registers. The rendered text is a different string as soon as the label carries markup, and keying on it inverts the rule in both directions: the definition that names the label stops resolving, and a plain definition the author never referenced starts.

This engine-visible pair is what nothing pinned. carve-php stripped `_ * ~ ^ + = { } [ ] ` ` from every collapsed label and got both halves backwards (carve-php#768); the executable spec keyed on the rendered text and got the same two answers wrong (carve#648). Three implementations agreed all along and no case could tell.

::: compare

```carve
[*bold*]: /x

see [*bold*][]
```

```html
<p>see <a href="/x"><strong>bold</strong></a></p>
```

:::

The inverse: a decorated label does not reach a plain definition, because `[bold]` is not the label that was written. Unresolved, the construct renders as the SOURCE the author typed - `[*bold*][]`, markers and all - not as the bracket content re-rendered. The executable spec emitted the rendered form here (`[<strong>bold</strong>][]`), which drops the markers that identify the construct while keeping the brackets that make it look like one.

::: compare

```carve
[bold]: /x

see [*bold*][]
```

```html
<p>see [*bold*][]</p>
```

:::

## An abbreviation at a list item's content column is still not a definition

`*[TERM]: expansion` is recognized only at document level - NORMATIVE, and already pinned inside a block quote and on a list item's MARKER line. The position that was missing is the one where the other definition kinds do the opposite: an item's CONTENT COLUMN, on a continuation line. There the line is item text and defines nothing, so the reference below it renders without an `<abbr>`.

::: compare

```carve
- a
  *[HTML]: Hyper Text

The HTML spec.
```

```html
<ul>
  <li>a
*[HTML]: Hyper Text</li>
</ul>
<p>The HTML spec.</p>
```

:::

The contrast is the point: a REFERENCE definition written at that same column IS the item's block, so it renders nothing and resolves. Three definition kinds, one column, two answers - and until now nothing measured the difference at this position.

::: compare

```carve
- a
  [r]: /u

see [t][r]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

## A definition inside a container is collected at that container's content column

A definition is invisible and active wherever its container puts it. At column 0 that is settled; one container deeper it is the same rule, measured from INSIDE the container: `> - a` puts the item's content column at 2 of the quoted content, so a definition written there belongs to the item.

Every engine lost this in a different way and had to be fixed for it - carve-js#646, carve-php#786, carve-rs#587 - which is what a case pins against.

::: compare

```carve
> - a
>   [r]: /u

see [t][r]
```

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
</blockquote>
<p>see <a href="/u">t</a></p>
```

:::

The mirror arrangement - a quote INSIDE an item rather than an item inside a quote - reads the same way: the quote sits at the item's content column, the definition is its content, and the quote renders empty.

::: compare

```carve
- a
  > [r]: /u

see [t][r]
```

```html
<ul>
  <li>a
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

An indented `>` that reaches no content column is not a container at all: the line renders as the text it looks like and defines nothing. Without this case the two above can be satisfied by stripping whitespace indiscriminately, which is exactly what three separate fixes did before it was measured.

::: compare

```carve
[x][r] here.

    > [r]: /u
```

```html
<p>[x][r] here.</p>
<p>&gt; [r]: /u</p>
```

:::

## Trailing attributes on a link reference definition

A `{...}` block at the end of a definition line attaches to the DEFINITION and
reaches every link that resolves the label (PART 9R R1). That is what makes a
definition worth writing once: without it, attributing a destination used ten
times means repeating the attribute ten times.

::: compare

```carve
[Example][ex] and [again][ex]

[ex]: https://example.com {.external}
```

```html
<p><a href="https://example.com" class="external">Example</a> and <a href="https://example.com" class="external">again</a></p>
```

:::

The merge is the one stacked attribute lists already use (PART 9 §15 A3): the
definition's list first, the link's second, so a repeated key takes the LAST
value and classes ACCUMULATE.

::: compare

```carve
[Example][ex]{.internal #b}

[ex]: /u {.external #a}
```

```html
<p><a href="/u" class="external internal" id="b">Example</a></p>
```

:::

A `{...}` on its own line ABOVE a definition is a different construct: it floats
PAST the definition to the next visible block (§15 A2a). Both can appear at
once, and they do different things.

::: compare

```carve
{.a}
[ex]: /u {.b}

[E][ex] and text
```

```html
<p class="a"><a href="/u" class="b">E</a> and text</p>
```

:::

## A comment ends the paragraph it sits under

Staying open is not the same as staying in the same *paragraph*. A comment renders nothing, but it is still a block boundary: the line after it begins the item's **second** paragraph. A tight list renders both readings identically, which is why the distinction needs a loose one to show at all - and why the rule went unstated while the sentence above it appeared to promise the opposite.

::: compare

```carve
- a
  %% x
 b

- c
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

## An image takes a reference the way a link does

An image resolves against the same definition table a link does (PART 3, `reference_image`; carve#641). Every reference FORM was pinned for links and none for images, so the three engines agreed here with nothing holding them to it - and the AST rule that a resolved reference keeps `ref` and `rawRef` beside its destination (PART 12 §3a) had no image case either.

::: compare

```carve
![moon][m]

[m]: /moon.png
```

```html
<img src="/moon.png" alt="moon">
```

:::

## A collapsed image reference uses its alt text as the label

`![alt][]` takes the alt text as the label, and a definition title becomes the image's `title`.

::: compare

```carve
![moon][]

[moon]: /moon.png "Title"
```

```html
<img src="/moon.png" alt="moon" title="Title">
```

:::

## One definition serves a link and an image

The definition table is shared, so the same label resolves for both - once as a destination, once as a source.

::: compare

```carve
See [text][m] and ![moon][m].

[m]: /moon.png
```

```html
<p>See <a href="/moon.png">text</a> and <img src="/moon.png" alt="moon">.</p>
```

:::

## An unresolved image reference stays literal

With no matching definition the image renders as the text the author typed, exactly as an unresolved link reference does.

::: compare

```carve
![moon][gone]
```

```html
<p>![moon][gone]</p>
```

:::

## A definition on a footnote body's continuation line is collected

A footnote body is a container like any other, and §16 collects a definition out of a container. On the body's own continuation column the line defines, renders nothing, and the reference below the note resolves. carve-rs rendered it as note text until carve-rs#599; nothing in the corpus held the other two to it.

::: compare

```carve
[^a]: note
  [r]: /u

see[^a] and [t][r]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::


## A footnote body holds blocks, and they render where they were written

A note body is a container: it holds blocks, not just inline content, and each renders at the body's own indentation. The body here ends in a PARAGRAPH, so the backlink lands in it directly; "A footnote body's last block, when it is not a paragraph, gets a synthesized paragraph for the backlink" (below) pins what happens when the last block is a code block, a block quote, a table, a div or a raw block instead.

::: compare

```carve
[^a]: intro

  | a |
  | - |
  | b |

  closing line.

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <table>
        <thead><tr><th scope="col">a</th></tr></thead>
        <tbody>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <p>closing line.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A heading in a footnote body takes an id but no section wrapper

A heading inside a note is a heading: it gets the generated id every other heading gets, so a fragment link and an implicit reference can reach it. What it does NOT get is the `<section>` wrapper, which only applies at document level - a note is already inside an `<li>`.

::: compare

```carve
[^a]: note

  # H

  after

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <h1 id="H">H</h1>
      <p>after<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## An attribute line inside a footnote body attaches inside it

A block-attribute line attaches to the block that follows it, wherever it was written. Inside a note body that is the note's own next block, and a dangling one at the end of the body attaches to nothing at all - it does not reach the document below (§15 A4).

::: compare

```carve
[^a]: note

  {.cls}
  styled

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p class="cls">styled<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A nested list in a footnote body stays nested

Relative indentation inside a note body means what it means everywhere else: it says which item a marker belongs to. A body collected flush-left loses that, and the sublist becomes a sibling.

::: compare

```carve
[^a]: note

  - one
    - deep

  end.

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ul>
        <li>one
          <ul>
            <li>deep</li>
          </ul>
        </li>
      </ul>
      <p>end.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A reference image takes a caption

A caption attaches to the captionable block above it, and an image written as a reference is an image. Every captioned-image case pinned the inline form, so the oracle accepted only that spelling and left the caption as literal text under a reference image while all three engines built the figure.

::: compare

```carve
![a][ok]
^ cap

[ok]: /p.png
```

```html
<figure>
  <img src="/p.png" alt="a">
  <figcaption>cap</figcaption>
</figure>
```

:::

## A combined bold-italic span may cross a line

`/*…*/` is one construct (`bold_italic`), and like any inline span it folds across the lines of its paragraph. The nesting is the same either way: strong outside emphasis. Nothing pinned the multi-line form, and the oracle inverted it there - pairing the two delimiters separately gives emphasis outside strong.

::: compare

```carve
/*multi
line*/
```

```html
<p><strong><em>multi
line</em></strong></p>
```

:::

## An unresolved reference image takes no caption

The caption attaches to a captionable block, and a reference image that resolves to nothing is not one: the whole thing stays the text the author typed, both lines in one paragraph. The resolved form beside it becomes a figure, and the definition may sit anywhere - which is why this cannot be decided by looking at the image line alone.

::: compare

```carve
![a][nope]
^ cap
```

```html
<p>![a][nope]
^ cap</p>
```

:::

## A quote marker is `>` plus a space, and a lazy line keeps its own text

`>text` with no space is prose, not a quote marker (§10 I1). Inside an open quoted paragraph such a line folds in as lazy continuation and keeps its `>`, rather than being read as a marker and stripped.

::: compare

```carve
> ok
>bad
```

```html
<blockquote><p>ok
&gt;bad</p></blockquote>
```

:::

## A block-attribute line inside a quote ends the paragraph above it

§10 I5 lists the block-attribute line among the invisible constructs that interrupt an open paragraph, and that holds inside a container as much as at the top level: the paragraph ends, and the attributes attach to the block that follows.

::: compare

```carve
> a
> {.c}
> text
```

```html
<blockquote>
  <p>a</p>
  <p class="c">text</p>
</blockquote>
```

:::

## A flush-left line after a footnote definition belongs to the document

A note body is the definition line plus lines indented by at least two spaces (§16). A flush-left line is not one of them: it ends the body and is the document's own next block. The `+` continuation marker (§17 L4) is the way to attach a flush-left block to a note, and it is deliberate rather than accidental.

::: compare

```carve
a
[^f]: note
b

see[^f]
```

```html
<p>a</p>
<p>b</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A tag inside a literal brace run is still a tag

A trailing `{…}` on a heading is not an attribute list - Carve is djot-strict, so the braces are inline content (§15 A7). Their CONTENTS are inline content too, which is where `#word` is a tag (§19). Both rules apply at once: the braces stay as typed and the tag inside them renders.

::: compare

```carve
# H {#id .cls}
```

```html
<section id="H-id-cls">
  <h1>H {<span class="tag"><strong>#id</strong></span> .cls}</h1>
</section>
```

:::

## A comment fence at column 0 ends the item; a `%%` line does not

Both spellings stay invisible wherever they sit (§24 C3). They differ in what they do to the item above them: a flush-left `%%%` fence ends it, so the next line belongs to the document, while a flush-left `%%` line leaves the item open and that line folds in. An INDENTED fence stays with the item either way.

::::: compare

```carve
- a
%%%
c
%%%
b
```

```html
<ul>
  <li>a</li>
</ul>
<p>b</p>
```

:::::

The line form, same columns, different answer:

::: compare

```carve
- a
%% c
b
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
```

:::

## A marker attribute may hold a quoted brace

A list marker's attribute block is glued to the marker (`1.{…}`), and a quoted value inside it may contain `}` - the quote ends the value, not the first brace that comes along.

::: compare

```carve
1.{title='a}b'} item
```

```html
<ol>
  <li title="a}b">item</li>
</ol>
```

:::

## A `:` description line needs a term above it

A definition list is a term plus its descriptions, so a `:` line with no term above it opens nothing - the line is ordinary paragraph text, and anything on it stays text too.

::: compare

```carve
:  [r]: /u

see [t][r]
```

```html
<p>:  [r]: /u</p>
<p>see [t][r]</p>
```

:::

## A heading id keeps a non-ASCII space

The id is the heading's text with each run of non-alphanumeric ASCII replaced by `-`; non-ASCII characters pass through unchanged. A no-break space in the text is non-ASCII, so it survives into the id rather than becoming a separator - and the id carries the character itself, not an entity. (The marker's own separator must be an ASCII space: `# Title` is a paragraph, not a heading.)

::: compare

```carve
#  Title
```

```html
<section id=" Title">
  <h1>&nbsp;Title</h1>
</section>
```

:::

## A footnote body's own column is two, and a third column is its text

The body's column is fixed by §16's `space, space`, not read off the first continuation line. A reader consumes exactly two columns and hands the rest to the body's blocks, so a body written one column in has ONE residual column - and there a block opener is paragraph text, the same way it is above a list item's content column (§24 C3). The same rows at two spaces are a table ("A footnote body holds blocks" pins that); a third column makes them a paragraph. carve-js derived the column from the first continuation line and read a table, alone against the other two engines and this spec (carve-js#677).

::: compare

```carve
[^a]: intro

   | a |
   | - |
   | b |

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>intro</p>
      <p>| a |
| - |
| b |<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A definition below a footnote body's column is the document's own text

One space is not a continuation - §16 wants two - so the line leaves the note and is the document's next block. It is not a definition either: the production starts at the opening bracket and allows no leading indent, so the reference below stays literal. The line is VISIBLE and INERT, and those two halves have to be pinned together: carve-js and carve-php rendered it AND defined from it, so a reader saw the definition as prose while a reference silently resolved through the same line (carve#701, carve-js#681, carve-php#825).

::: compare

```carve
[^a]: note
 [r]: /u

see[^a] and [t][r]
```

```html
<p>[r]: /u</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and [t][r]</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A definition past a footnote body's column is the body's own text

Three spaces IS a continuation, so the line belongs to the note - but the body's column is two and the third column is residual indent its blocks read, so the definition never reaches an opener position and stays paragraph text inside the note. Visible and inert again, and for the opposite reason to the case above: there the line was outside the body, here it is inside it. Beside "A footnote body's own column is two", this is what makes the column load-bearing in both directions.

::: compare

```carve
[^a]: note
   [r]: /u

see[^a] and [t][r]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and [t][r]</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
[r]: /u<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A heading reference folds Unicode normalization, but not compatibility

The heading index is matched loosely on purpose (PART 9R R1): trimmed, internal whitespace collapsed, NFC-normalized, then compared case-insensitively. NFC has to be in that list because the ID side already normalizes (§25) - without it a document publishes `id="Café"` and then declines `[Café][]` against the very heading that produced it, and the two spellings look identical on screen so the miss has no visible cause. The heading below is written `Cafe` + U+0301 and the reference is precomposed U+00E9.

Compatibility folding is NOT in the list: `[file][]` does not reach `# ﬁle`. NFKC would change which text the author is quoting rather than how it is spelled. carve-rs folded NFC and the other three did not (carve#725).

::: compare

```carve
# Café

see [Café][] and [file][]

# ﬁle
```

```html
<section id="Café">
  <h1>Café</h1>
  <p>see <a href="#Café">Café</a> and [file][]</p>
</section>
<section id="ﬁle">
  <h1>ﬁle</h1>
</section>
```

:::

## A tab as the first character of a definition term

A tab right after the marker's separator space is a different question from
the previous one: the separator itself is a literal space, and it is present,
so the marker is satisfied and a term forms. The tab is the first character of
the term's *content*, not part of the separator - ordinary leading whitespace
there, stripped the same way a bullet's own extra separator spaces never reach
the item's text. It is not protected by the tabs-in-code verbatim rule, which
covers fenced code content and inline code spans only (carve#698).

::: compare

```carve
:: 	x
```

```html
<dl>
  <dt>x</dt>
</dl>
```

:::

## An abbreviation term is one ASCII alphanumeric word

`abbreviation_term = (letter | digit)+`, and `letter` is enumerated as `a`..`z` plus `A`..`Z`. So the term is case-blind, may start with a digit, and may be a digit alone - every corpus abbreviation before this one was an uppercase multi-letter word, which is the one shape that hides all of those.

::: compare

```carve
*[dl]: definition list
*[3D]: three dimensional
*[9]: nine

A dl, a 3D one, and 9.
```

```html
<p>A <abbr title="definition list">dl</abbr>, a <abbr title="three dimensional">3D</abbr> one, and <abbr title="nine">9</abbr>.</p>
```

:::

A term outside that alphabet is not a definition, and the line stays as written rather than being dropped. An abbreviation has no marker at the use site, so a definition swallowed here would take its whole line of prose with it and leave nothing behind to explain the loss.

::: compare

```carve
*[ß]: sharp s
*[e.g.]: for example
*[HTTP API]: an interface

Text about ss and eg below.
```

```html
<p>*[ß]: sharp s
*[e.g.]: for example
*[HTTP API]: an interface</p>
<p>Text about ss and eg below.</p>
```

:::

## A tab reaches a footnote body's column just as two spaces do

A footnote body's own column is fixed at two ("A footnote body's own column is
two, and a third column is its text"), but *reaching* that column is column
arithmetic (§24 C1), not a count of space characters: a tab from column 0
lands at column 4, already past the floor, so it satisfies the same
requirement two literal spaces satisfy. A single space (column 1) still falls
short and leaves the note, as it already does today (carve#692).

::: compare

```carve
[^a]: note

	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p>more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A space then a tab reaches the same column (1, then to the next stop at 4), so
it qualifies too:

::: compare

```carve
[^a]: note

 	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <p>more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The blank line above is not what admits the tab - the column requirement is
per line, so a tab-indented line directly under the definition, with no blank
line at all, is a continuation too (and, with no blank between them, it folds
into the same paragraph as a soft break, exactly as two spaces would):

::: compare

```carve
[^a]: note
	more

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A footnote body's last block, when it is not a paragraph, gets a synthesized paragraph for the backlink

A footnote body whose last block is a paragraph gets its backlink appended
directly into that paragraph (see above). When the last block is something
else, the backlink is never folded into a paragraph found inside or before
that block - a synthesized `<p>` after the last block holds it instead,
as a sibling of that block (carve#688). Five shapes, previously unpinned:

A code block:

::: compare

````carve
[^a]: note
  ```
  code
  ```

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <pre><code>code
</code></pre>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A block quote. The quote's own paragraph ("quoted") is not where the backlink
goes - that would misattribute it to the quoted source. The synthesized
paragraph is a sibling of the `<blockquote>`, not a child of it:

::: compare

```carve
[^a]: note
  > quoted

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <blockquote><p>quoted</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A table:

::: compare

```carve
[^a]: note

  | a |
  | - |
  | b |

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <table>
        <thead><tr><th scope="col">a</th></tr></thead>
        <tbody>
          <tr><td>b</td></tr>
        </tbody>
      </table>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A div:

:::::: compare

```carve
[^a]: note

  ::: note
  d
  :::

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <aside class="admonition note">
        <p>d</p>
      </aside>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

::::::

A raw block. Its content is passed through verbatim by definition; appending
the backlink inside it would put navigation markup into a region the author
asked to be left untouched, so the synthesized paragraph follows it instead:

::: compare

````carve
[^a]: note

  ```=html
  <b>x</b>
  ```

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <b>x</b>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A definition attached by a + continuation marker is collected, and the item keeps no trace

The `+` continuation marker (§17 L3/L4) attaches a flush-left block to the container above it like any other block - a definition is not special-cased out of that. It is collected exactly as one written at the item's own content column (above), and the item that held it renders with no trace of the line at all: no empty block, no blank line left behind (carve#665; §17 L6).

::: compare

```carve
- a
+
[r]: /u

see [t][r]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

## A definition inside a definition-list dd is collected, and the entry keeps no trace

A `<dd>` continues like a list item (§17, definition_body) and is one of the block-level contexts §17 L6 names: a definition written as its content is collected into the document-wide table and the entry renders empty, exactly as a list item or block quote does. This holds the same way for both definition kinds a `<dd>` can hold - a link reference definition and a footnote definition - so a fix for one is not a fix for only one (carve#666).

::: compare

```carve
:: term
:  [r]: /u

see [t][r]
```

```html
<dl>
  <dt>term</dt>
  <dd></dd>
</dl>
<p>see <a href="/u">t</a></p>
```

:::

::: compare

```carve
:: term
:  [^f]: x

see[^f]
```

```html
<dl>
  <dt>term</dt>
  <dd></dd>
</dl>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A line at a footnote definition's own column, followed by non-blank text, forms its own tight block

A footnote definition on a list item's own content column renders no trace (above), and none of the three reference engines loosens the item on account of it - agreed already. What was not settled is what a plain line right after the definition, with no blank line anywhere, does to the item. §10 I5 already answers half of it: an invisible construct interrupts an open paragraph exactly like a visible one, so the line after the definition starts a NEW block rather than folding back into the paragraph the definition ended. §17 L1/L2 answer the rest: nothing here is a blank line, so the item never loosens, and a tight item's paragraphs are ALL bare - the new block included, not only the first one. The item ends up holding two paragraph blocks with no blank between them, both unwrapped (carve#668; §17 L6).

::: compare

```carve
- a
  [^f]: x
  more

see[^f]
```

```html
<ul>
  <li>a
    more
  </li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## An empty abbreviation term is not a definition

`abbreviation_term = (letter | digit)+` needs at least one character, so `*[]:` opens nothing and the line stays paragraph text.

::: compare

```carve
*[]: expansion

Text.
```

```html
<p>*[]: expansion</p>
<p>Text.</p>
```

:::

## An at sign is a reference label character everywhere but the first position

`reference_label = (character - ']' - '@'), {character - ']'}`. The exclusion is positional: it keeps `[@key]` free for citations and costs nothing after the first character.

A label that STARTS with `@` is a citation definition in the extension layer, so the core corpus cannot state its rendering here - the executable spec refuses that input (carve#798). The engines agree on it: `[@x]: /u` defines nothing and the label renders as a mention.

::: compare

```carve
[a@b]: /v

see [u][a@b].
```

```html
<p>see <a href="/v">u</a>.</p>
```

:::

## A tab after a heading, quote or caption marker leaves the line as prose

The definition markers already pin this rule; the block markers are the same one and nothing covered them. A tab after `#`, `>` or `^` is not the marker's separator, so no block opens.

::: compare

```carve
#	Heading

>	quoted
```

```html
<p>#	Heading</p>
<p>&gt;	quoted</p>
```

:::

The caption marker needs a block to attach to before the rule is observable at all - on its own line it is prose either way. Directly under an image, a space makes a `<figure>` and a tab does not.

::: compare

```carve
![Moon](m.jpg)
^	Figure 1
```

```html
<p><img src="m.jpg" alt="Moon">
^	Figure 1</p>
```

:::

## Two dashes are not a thematic break

A thematic break needs three or more markers. Two dashes are ordinary text - and smart typography renders them as an en dash, which is what the reader sees.

::: compare

```carve
a

--

b
```

```html
<p>a</p>
<p>–</p>
<p>b</p>
```

:::

## Two backticks are not a code fence, opening or closing

A fence opens on three or more. Two backticks are an inline code span, so the lines between them become its content instead of a code block.

::: compare

```carve
``
code
``
```

```html
<p><code>
code
</code></p>
```

:::

The closer is the same length rule seen from the other side: a two-backtick line inside an open fence is CONTENT, not the end of the block.

::: compare

````carve
```
code
``
still code
```
````

````html
<pre><code>code
``
still code
</code></pre>
````

:::

## A single percent is not a comment

A comment line opens on `%%`. One percent is ordinary text, which matters because the character is common in prose.

::: compare

```carve
% not a comment
```

```html
<p>% not a comment</p>
```

:::

## An uppercase roman numeral is a list marker

Roman markers are case-blind: `I.` opens a list with `type="I"` as `i.` does with `type="i"`.

::: compare

```carve
I. one
II. two
```

```html
<ol type="I">
  <li>one</li>
  <li>two</li>
</ol>
```

:::

## A table delimiter cell needs at least one dash

A lone `:` does not make a delimiter row, so the row is an ordinary body row and the table gets no header.

::: compare

```carve
| a | b |
|:|:|
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>:</td><td>:</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

## A continuation row carries no trailing text

The `+` continuation marker replaces the leading pipe, and the row must close with one. A proper continuation merges into the row above; text after the closing pipe leaves the line outside the table entirely.

::: compare

```carve
| a | b |
+ c | d |
```

```html
<table>
  <tbody>
    <tr><td>a c</td><td>b d</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| a | b |
+ c | d | junk
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p>+ c | d | junk</p>
```

:::

## A format character before a scheme is not stripped, and is inert

§25's scheme probe strips leading controls, every Unicode space and the BOM. It stops there: the WHATWG URL parser strips C0 controls and space and nothing else, so a destination starting with ZERO WIDTH SPACE fails to parse as a URL at all and resolves as a relative path. It stays in the document as the author wrote it.

::: compare

```carve
[x](​javascript:alert(1))
```

```html
<p><a href="​javascript:alert(1)">x</a></p>
```

:::

## A link definition written before a footnote stays before it

§7 orders collected definitions by source position, and PART 11 §6 binds the writer to the order the tree holds. The corpus pinned only the shape where the footnote comes first (`a definition on a footnote body's continuation line`), and a writer that emits footnotes in a fixed position - first or last - is correct on exactly that shape. This is its mirror: every engine's `carve` output for it must put the link definition first, because the author did.

::: compare

```carve
see[^a] and [t][r]

[r]: /u

[^a]: note
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and <a href="/u">t</a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Two definitions of the SAME kind pin the other half of the rule: a writer that sorts them by label rather than by position reverses these two.

::: compare

```carve
see[^b] and[^a]

[^b]: bee

[^a]: ay
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>bee<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p>ay<a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A zero-width character in a reference definition destination

`link_destination` ends at Unicode whitespace, and a ZERO WIDTH NO-BREAK SPACE is not whitespace: it is an ordinary destination character. The same rule governs a reference definition, because the definition is built from that same production - so the character is neither skipped as the separator run nor read as the end of the destination.

The inline form was already pinned. This is the definition form, where two engines kept the character and one dropped it or truncated at it, because the host language's own whitespace class holds U+FEFF and the Unicode property does not.

::: compare

```carve
[r]: ﻿https://e.com/

see [x][r]
```

```html
<p>see <a href="﻿https://e.com/">x</a></p>
```

:::

Position does not change the answer: a definition is not truncated at a zero-width character in the middle of its destination either.

::: compare

```carve
[r]: https://e﻿.com/

see [x][r]
```

```html
<p>see <a href="https://e﻿.com/">x</a></p>
```

:::

## A multi-line raw block is placed at its opening and verbatim after it

A raw block's content reaches the target unchanged, so a renderer that indents its output indents the block's OPENING position - the way it would any other block - and leaves every line after the first on the columns the author gave it. The corpus pinned only a single-line raw block, which is the one shape where "indent the block" and "indent every line" agree, so three engines could pass it while giving three different answers here.

::: compare

```carve
[^a]: note

  ```=html
  <b>x</b>
  <i>y</i>
  ```

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <b>x</b>
<i>y</i>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Inside a `<pre>` the difference is CONTENT rather than layout: two columns added to each line change what the rendered code block says.

::: compare

```carve
> ```=html
> <pre>
> a
>   b
> </pre>
> ```
```

```html
<blockquote>
  <pre>
a
  b
</pre>
</blockquote>
```

:::

## A block image is separated from the block after it on every target

A lone image is a BLOCK, so whatever separates two blocks on a target separates this one from what follows. The corpus held no document where a block image is followed by another block, so no gate compared the engines on it - and one of them ran the alt text straight into the next paragraph on the plain and ANSI targets (`alt textfollowing paragraph`), which the two repos claiming non-HTML parity could not catch because each reads its own committed snapshot rather than the other engines (carve-rs#692, carve-js#762).

::: compare

```carve
![alt text](img.png)

following paragraph
```

```html
<img src="img.png" alt="alt text">
<p>following paragraph</p>
```

:::

## A tab indent is the column it reaches, whatever the line holds

§24 C1 makes indentation a column claim: a space advances one column, a tab advances to the next multiple of 4. `1. ` claims columns 0-2, so the item's content column is 3 and a tab reaches column 4 - one column PAST it, which is what four spaces reach too. A block opener at the content column nests; one column past it is text, and the tab spelling has to say the same thing as the space spelling of the same column.

The corpus pinned neither, so two engines read the tab as if it stopped at the content column and nested a block quote no space spelling of column 4 produces (carve-js#767, carve-php#890).

::: compare

```carve
1. a
	> quote
```

```html
<ol>
  <li>a
&gt; quote</li>
</ol>
```

:::

At the content column itself it nests, which is the boundary the rule above is drawn against.

::: compare

```carve
1. a
   > quote
```

```html
<ol>
  <li>a
    <blockquote><p>quote</p></blockquote>
  </li>
</ol>
```

:::

## The same column, written with four spaces

The control for the rule above, and the half that was stated rather than
checked. That pair pins the tab against the THREE-space spelling, which shows
the two DIFFER. What makes the tab case decidable is the other comparison: a
tab reaches column 4, four spaces reach column 4, so the two are the same claim
and must get the same answer.

Without this document an engine can pass both halves of that pair while still
answering column 4 differently depending on which whitespace arrived there -
which is the exact shape of the defect the rule was written for (carve-js#767,
carve-php#890).

::: compare

```carve
1. a
    > quote
```

```html
<ol>
  <li>a
&gt; quote</li>
</ol>
```

:::

## Sibling markers that reach one column are one list

The same column claim decides sibling markers as decides a block opener: two markers that reach one column are one list, however the indentation was written. A space advances one column and a tab advances to the next multiple of 4 (§24 C1), so four spaces and a space-plus-tab both put a marker at column 4.

This is the third shape of the rule the corpus pinned in `a tab indent is the column it reaches`, held back until the residual columns a straddling tab leaves behind stopped claiming source offsets they do not have (carve-js#773).

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
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

## The continuation marker at an item's own column, and what follows it

§17's `+` continuation marker was pinned by the corpus in one shape only: a marker at column 0 with a BLOCK after it. Both axes it varies - where the marker sits, and what kind of thing follows - were unreached, and each hid a live divergence until someone measured it by hand (carve#812).

An INDENTED `+` is not consumed as a marker, so it survives as text in the item, and a definition below it is still collected:

::: compare

```carve
- a
  +
  [r]: /u

see [t][r]
```

```html
<ul>
  <li>a
+</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::

The same indented `+` with nothing attached stays in the item it was written in, rather than starting a block of its own:

::: compare

```carve
- a
  +

x
```

```html
<ul>
  <li>a
+</li>
</ul>
<p>x</p>
```

:::

A PARAGRAPH attached by a column-0 `+` is the shape the marker most obviously serves, and the corpus pinned only non-paragraph blocks - a fenced code block and a block quote - on which the engines had always agreed. Attached paragraph text is bare, not wrapped in its own `<p>`:

::: compare

```carve
- a
+
b

x
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
<p>x</p>
```

:::

## A continuation marker after a blank line in the item

§17 L3 conditions the marker on its COLUMN and on nothing else - not on the item being tight, and not on what the item already holds. The corpus reached it only in a tight item, so an engine could recognize it there and drop it once a blank line had appeared, which is what carve-php did (carve-php#925): the marker came out as literal text inside the paragraph it was meant to end, and the block it should have attached folded in with it.

::: compare

```carve
- a

  b
+
c

x
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
    <p>c</p>
  </li>
</ul>
<p>x</p>
```

:::

## An attribute name admits no colon

`identifier` is the production behind every attribute name - `#id`, `.class`,
`key=value` and a bare boolean key all build on it - and it admits letters,
digits, `_` and `-` only. A colon-bearing name is therefore not recognized, and
§14's rule that ONE unrecognized name makes the whole `{...}` not an attribute
block leaves the run literal.

Nothing pinned this. No corpus document carried a colon in an attribute name,
so `compare:impls` had no input that could show carve-php building
`xlink:href`, `class="a:b"` and `id="a:b"` where carve-js and carve-rs left the
same source literal (carve#797). The `id` row is the one with teeth: an anchor
target exists in one engine and not in the other, so a link to `#a:b` resolves
or dangles depending on which engine rendered the page.

The `#a:b` row does not render as inert text a reader sees verbatim. The
attribute block is rejected and the leftover source is inline-parsed, so the
`#a` inside it is an ordinary hashtag - which is why pinning the rendering is
worth more here than describing it.

::: compare

```carve
[a]{xlink:href=u}

[b]{k:v="q"}

[c]{.sm:hover}

[d]{#a:b}

[e]{.ok xml:lang=en}
```

```html
<p>[a]{xlink:href=u}</p>
<p>[b]{k:v=“q”}</p>
<p>[c]{.sm:hover}</p>
<p>[d]{<span class="tag"><strong>#a</strong></span>:b}</p>
<p>[e]{.ok xml:lang=en}</p>
```

:::

The colon is legal one position over, inside an unquoted VALUE, which
`unquoted_value` admits so that `xml:lang` and `sm:hover` need no quoting when
they are what an attribute HOLDS rather than what it is called. This pair is
the control: it fails if a fix reaches past the name into the value.

::: compare

```carve
[a]{k=x:y}

[b]{#i .c k=v}

| a | b |{.x}
```

```html
<p><span k="x:y">a</span></p>
<p><span id="i" class="c" k="v">b</span></p>
<table>
  <tbody>
    <tr class="x"><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

A carrier other than an inline span reaches the same answer, so a table row
whose trailing block carries a colon is not a table row at all, and a bullet
whose glued block carries one does not open a list.

::: compare

```carve
| a | b |{.a:b}

-{.a:b} item
```

```html
<p>| a | b |{.a:b}</p>
<p>-{.a:b} item</p>
```

:::

## Trailing whitespace after a block marker

A block marker is what it is regardless of whitespace after it. Every engine already reads it that way, and no corpus document carried any of these six shapes - so an engine that dropped one of those tolerances could not be caught here. carve-php shipped exactly that for the continuation marker (carve#871).

A thematic break:

::: compare

```carve
a

--- 

b
```

```html
<p>a</p>
<hr>
<p>b</p>
```

:::

A code fence's closer:

::: compare

````carve
``` 
x
``` 

y
````

```html
<pre><code>x
</code></pre>
<p>y</p>
```

:::

A colon fence's closer:

::::: compare

```carve
::: note
x
::: 

y
```

```html
<aside class="admonition note">
  <p>x</p>
</aside>
<p>y</p>
```

:::::

A table's continuation row:

::: compare

```carve
| a | b |
+ c | d | 
```

```html
<table>
  <tbody>
    <tr><td>a c</td><td>b d</td></tr>
  </tbody>
</table>
```

:::

A footnote definition separated by more than one space:

::: compare

```carve
[^f]:   note

see[^f]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

And the continuation marker, which §17 L3 spells "a line whose only content is `+`":

::: compare

```carve
- a
+ 
b

x
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
<p>x</p>
```

:::

## Line endings and a byte order mark

A line ends at `\n`, `\r\n` or a lone `\r`, and a byte order mark at the start
of a document is not content. All four spellings below are the same document
and produce the same output, including the same heading id - a carriage return
that leaked into the text would show up there rather than only in whitespace
nobody looks at.

The examples are written with ordinary newlines. The bytes are applied when the
fixture is generated (`::: compare crlf`, `cr`, `bom`), because the example
files are reviewable Markdown and are not protected from line-ending
normalization the way `tests/corpus/**` is.

::: compare crlf

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare cr

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare bom

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

::: compare

```carve
# Title

a
b
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>a
b</p>
</section>
```

:::

## A continuation marker after a blank line in a loose item

The marker sits at the item's marker column and attaches the flush-left block
below it, whether or not a blank line comes first. The blank does not loosen
the item on its own - this item is loose because of the blank between `a` and
`b`, not because of the one before the marker.

::: compare

```carve
- a

  b

+
c

x
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
    <p>c</p>
  </li>
</ul>
<p>x</p>
```

:::

## A tab separates two attributes, and pads a block, as a space does

**The heading is the name this category was given when it pinned the opposite
answer, and it is kept deliberately.** Corpus category names are an append-only
contract - every engine allowlists them as `NN-slug`, so renaming one
invalidates all of those lists at once. The documents below now pin the
NARROWED answer (markup-carve/carve#906): a tab does not separate two attributes
inside an INLINE block. The second half of the heading is still true, and is
what the ruling turned on - a tab does pad a block-attribute LINE, which the
category *The inline attribute interior is space-only, the attribute line is
not* pins directly.

Every whitespace slot of the inline block takes `space`. All of them sit AFTER
the first non-whitespace character of their line, which is where PART 7's rule
says a tab is not syntax, so the block is unrecognized and its braces show:

::: compare

```carve
*x*{.a	.b}

*y*{	.c}

*z*{.d	}
```

```html
<p><strong>x</strong>{.a	.b}</p>
<p><strong>y</strong>{	.c}</p>
<p><strong>z</strong>{.d	}</p>
```

:::

A tab after an UNQUOTED value ends the value - `unquoted_value` holds letters,
digits, `-`, `_`, `.` and `:` and no whitespace at all - and then satisfies no
separator either, so the whole block fails. Inside a QUOTED value it is content,
as any other character is, and that half did not move:

::: compare

```carve
*x*{k=a	.b}

*y*{k="a	b"}
```

```html
<p><strong>x</strong>{k=a	.b}</p>
<p><strong k="a	b">y</strong></p>
```

:::

The blessed EMPTY block is a separate position rather than a use of the
separator, and it has to move with it: narrow the separator alone and `[x]{`
tab `}` is still a valid empty block, so the document below would keep passing
and pin nothing.

::: compare

```carve
[x]{	}
```

```html
<p>[x]{	}</p>
```

:::

## An inline attribute block does not span lines, but an attribute line does

`attributes` pads and separates with `opt_ws`, which grammar.ebnf annotates
"spaces/tabs only, no line breaks". The line-spanning form is a different
production: `block_attributes` separates with `attr_separator = (whitespace |
continuation), opt_ws`, and `continuation` is where a newline is admitted.

So a brace run broken across two lines directly after an inline construct is
literal text.

::: compare

```carve
*x*{.a
.b}
```

```html
<p><strong>x</strong>{.a
.b}</p>
```

:::

A standalone attribute line may be written the same way, and it attaches to the
block below it. The line break is admitted in the padding as well as between
two attributes, so all three placements are one block.

::: compare

```carve
{.a
.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::

::: compare

```carve
{
.a}

first

{.b
}

second
```

```html
<p class="a">first</p>
<p class="b">second</p>
```

:::

## Colon fence separator must be a space

The colon fence has ONE separator slot -- the whitespace immediately after the
fence run -- and all four openers share it. It is a MARKER SEPARATOR (PART 7,
MARKER SEPARATORS AND PADDING SLOTS): the token after it selects an admonition,
a div, a line block or a local hard-break block, so it is spelled `space` and a
tab does not satisfy it. A tabbed opener is an ordinary paragraph, exactly as a
tab after a heading, list or definition marker already is.

The four openers are pinned separately because implementations decide them in
four separate places. In carve-rs the same rule lived in four branches, and
fixing the first left the other three opening; carve-js and carve-php each had
their own split. One representative shape would have covered a quarter of that.

An admonition opener:

:::: compare

```carve
:::	note
x
:::
```

```html
<p>:::	note
x
:::</p>
```

::::

The separator is a run, and the rule is about the whole run rather than its
first character. Both mixed spellings are prose too -- the shape that survives a
fix written as "the first character must be a space" is the one with the space
first.

:::: compare

```carve
::: 	note
x
:::
```

```html
<p>::: 	note
x
:::</p>
```

::::

:::: compare

```carve
:::	 note
x
:::
```

```html
<p>:::	 note
x
:::</p>
```

::::

A bare `[label]` may sit flush against the fence (`:::[First]`), so this slot is
OPTIONAL in the div opener. Optional is a different property from a different
role: when the slot IS written, it answers the same way.

:::: compare

```carve
:::	[First]
x
:::
```

```html
<p>:::	[First]
x
:::</p>
```

::::

:::: compare

```carve
::: 	[First]
x
:::
```

```html
<p>::: 	[First]
x
:::</p>
```

::::

A line block:

:::: compare

```carve
:::	|
x
:::
```

```html
<p>:::	|
x
:::</p>
```

::::

:::: compare

```carve
::: 	|
x
:::
```

```html
<p>::: 	|
x
:::</p>
```

::::

A local hard-break block. The trailing backslash is no longer a block selector
once the line is prose, so it is read as ordinary inline content and produces a
hard break inside the paragraph -- which is itself the discriminator, since the
recognized form would have produced a `div.hardbreaks` wrapper instead.

:::: compare

```carve
:::	\
x
:::
```

```html
<p>:::	<br>
x
:::</p>
```

::::

:::: compare

```carve
::: 	\
x
:::
```

```html
<p>::: 	<br>
x
:::</p>
```

::::

Cardinality is a separate question from the terminal, and this case is the guard
against a fix that drifts the other way. `space` names the character, not the
width: a run of more than one space still opens the block.

:::: compare

```carve
:::  note
x
:::
```

```html
<aside class="admonition note">
  <p>x</p>
</aside>
```

::::


## Colon fence metadata slots must be a space too

Once `admonition_type` has been read the block is decided, so the opener's
`"title"` and `[label]` slots carry no recognition -- they are PADDING. They are
spelled `space` all the same, for the other reason PART 7 gives: a tab is syntax
ONLY in a line's leading indentation run, and a padding slot sits after the first
non-whitespace character of its line.

This half is pinned beside the separator half deliberately. A case that pinned
only the separator invites a fix that narrows the whole line, and a case that
pinned only the padding invites the reverse; carve-js carried both defects at
once, in opposite directions.

:::: compare

```carve
::: note	"Title"
x
:::
```

```html
<p>::: note	“Title”
x
:::</p>
```

::::

:::: compare

```carve
::: note 	"Title"
x
:::
```

```html
<p>::: note 	“Title”
x
:::</p>
```

::::

The `[label]` slot reverts independently of the `"title"` slot, so it carries its
own pair: a fixture with a tab at both cannot tell them apart, because narrowing
either one already leaves the line as prose.

:::: compare

```carve
::: note "Title"	[First]
x
:::
```

```html
<p>::: note “Title”	[First]
x
:::</p>
```

::::

:::: compare

```carve
::: note "Title" 	[First]
x
:::
```

```html
<p>::: note “Title” 	[First]
x
:::</p>
```

::::

The spaced spellings are unchanged, and both slots still carry their metadata.

:::: compare

```carve
::: note "Title" [First]
x
:::
```

```html
<aside class="admonition note">
  <p class="admonition-title">Title</p>
  <p class="div-label">First</p>
  <p>x</p>
</aside>
```

::::

## Table cell padding must be a space

A table cell has a padding slot at each end -- the whitespace between the
opening `|` and the cell content, and between the content and the closing `|`.
Both are spelled `space` (grammar.ebnf `delimiter_cell`, `header_cell`,
`data_cell`, `rowspan_marker`, `colspan_marker`). Every one of them sits after
the row's opening pipe, so every one of them is INLINE, and a tab is syntax
only in a line's leading indentation run (PART 7, MARKER SEPARATORS AND PADDING
SLOTS).

A tab written in one of those slots is therefore not padding. It stays where it
is and becomes ordinary cell content, which is a visible answer rather than a
rejection: the cell keeps the tab, and a delimiter cell stops being one.

Each end is pinned separately. A padding rule is easy to implement at one end
only, and a document carrying a tab at both ends cannot tell a half-fix from a
whole one -- the shape carve#901 found at the admonition opener.

A data cell, tab-first at the leading slot:

:::: compare

```carve
|	a |	b |
```

```html
<table>
  <tbody>
    <tr><td>	a</td><td>	b</td></tr>
  </tbody>
</table>
```

::::

The slot is a RUN, and the rule is about the whole run rather than its first
character. Both mixed spellings keep the tab as content too -- the one that
survives a fix written as "the first character must be a space" is the one with
the space first.

:::: compare

```carve
| 	a | 	b |
```

```html
<table>
  <tbody>
    <tr><td>	a</td><td>	b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|	 a |	 b |
```

```html
<table>
  <tbody>
    <tr><td>	 a</td><td>	 b</td></tr>
  </tbody>
</table>
```

::::

The trailing slot answers the same way, and reverts independently of the
leading one:

:::: compare

```carve
| a	| b	|
```

```html
<table>
  <tbody>
    <tr><td>a	</td><td>b	</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a 	| b 	|
```

```html
<table>
  <tbody>
    <tr><td>a 	</td><td>b 	</td></tr>
  </tbody>
</table>
```

::::

A header cell carries the same two slots, after its `=` marker:

:::: compare

```carve
|=	h |=	i |
| 1 | 2 |
```

```html
<table>
  <thead><tr><th scope="col">	h</th><th scope="col">	i</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|=	 h |=	 i |
| 1 | 2 |
```

```html
<table>
  <thead><tr><th scope="col">	 h</th><th scope="col">	 i</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|= h	|= i	|
| 1 | 2 |
```

```html
<table>
  <thead><tr><th scope="col">h	</th><th scope="col">i	</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
|= h 	|= i 	|
| 1 | 2 |
```

```html
<table>
  <thead><tr><th scope="col">h 	</th><th scope="col">i 	</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

A delimiter cell is the one slot whose failure is structural rather than
textual. With a tab in the padding the cell is no longer a `delimiter_cell`, so
the second line is not a delimiter row: no header is promoted, no alignment is
assigned, and the `---` run is ordinary inline content that smart typography
renders as an em dash.

:::: compare

```carve
| a | b |
|	--- |	--- |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	—</td><td>	—</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| 	--- | 	--- |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	—</td><td>	—</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| ---	| ---	|
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>—	</td><td>—	</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

::::

The two span markers are padding around a single token, so a tab beside one
makes the cell ordinary content and the span does not happen:

:::: compare

```carve
| a | b |
|	^ | c |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>	^</td><td>c</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| c |	< |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>c</td><td>	&lt;</td></tr>
  </tbody>
</table>
```

::::

A continuation row's cells are `data_cell`s too (grammar.ebnf
`continuation_row`), so they carry the same two slots. This is the spelling an
implementation is most likely to pad in a second place, and a fix applied only
to the standard row leaves it joining the tab away.

:::: compare

```carve
| a | b |
+	x | y |
```

```html
<table>
  <tbody>
    <tr><td>a 	x</td><td>b y</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
+ x	| y	|
```

```html
<table>
  <tbody>
    <tr><td>a x	</td><td>b y	</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
+ x | y |
```

```html
<table>
  <tbody>
    <tr><td>a x</td><td>b y</td></tr>
  </tbody>
</table>
```

::::

The spaced spellings are unchanged, and so is a cell with no padding at all or
with more than one space -- cardinality is a separate question from the
terminal.

:::: compare

```carve
|=h|=  i |
|a|  b  |
```

```html
<table>
  <thead><tr><th scope="col">h</th><th scope="col">i</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| --- | ---: |
| 1 | 2 |
```

```html
<table>
  <thead><tr><th scope="col">a</th><th scope="col" style="text-align: right;">b</th></tr></thead>
  <tbody>
    <tr><td>1</td><td style="text-align: right;">2</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| ^ | c |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td>b</td></tr>
    <tr><td>c</td></tr>
  </tbody>
</table>
```

::::

:::: compare

```carve
| a | b |
| c | < |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td colspan="2">c</td></tr>
  </tbody>
</table>
```

::::

## Link and image title slots must be a space

The whitespace before a link or image title is a PADDING SLOT: the link is
already a link once its destination is read, and the title sits inline after
it. `link_title` spells that slot `space`, and `image_title = link_title`
inherits it. A tab is syntax only in a line's leading indentation run (PART 7,
MARKER SEPARATORS AND PADDING SLOTS), and this slot sits well past the first
non-whitespace character of its line.

A tab written there is therefore not padding, and the inline is not a link at
all: the bracket run stays literal text, with the tab where it was written.

A link title, tab-first:

::: compare

```carve
[t](/u	"T")
```

```html
<p>[t](/u	“T”)</p>
```

:::

The slot is a RUN, and the rule is about the whole run rather than either of
its ends. Both mixed spellings keep the text literal too -- the one that
survives a fix written as "the first character must be a space" is the one with
the space first, and the one that survives "the last character must be a space"
is the other.

::: compare

```carve
[t](/u 	"T")
```

```html
<p>[t](/u 	“T”)</p>
```

:::

::: compare

```carve
[t](/u	 "T")
```

```html
<p>[t](/u	 “T”)</p>
```

:::

An image title answers the same way. `image_title = link_title` is one
production defined by reference, and every engine serves the link tail and the
image tail from one function -- so the two agree by construction today, and
nothing would notice the day one of them splits:

::: compare

```carve
![a](/p.png	"T")
```

```html
<p>![a](/p.png	“T”)</p>
```

:::

::: compare

```carve
![a](/p.png 	"T")
```

```html
<p>![a](/p.png 	“T”)</p>
```

:::

::: compare

```carve
![a](/p.png	 "T")
```

```html
<p>![a](/p.png	 “T”)</p>
```

:::

A single space is the titled form, unchanged:

::: compare

```carve
[t](/u "T")
```

```html
<p><a href="/u" title="T">t</a></p>
```

:::

## Code fence metadata slots must be a space too

A fenced code block carries three of the same slots: the one before the info
string (`fenced_code_block`, spelled `[space]`), and the `"header"` and
`[label]` slots inside `code_fence_info` (spelled `space+`). All three sit
after the fence run, which has already decided the block, so all three are
padding and all three take a space.

The fallback here is the INVALID-FENCE FALLBACK the grammar already names: the
opener is not a fence opener, so the run is read as an inline verbatim span in
a paragraph and every character of it survives.

Each slot is pinned separately, because implementations decide them in three
places and a document carrying a tab in all three cannot tell a partial fix
from a whole one.

The slot before the info string, tab-first:

::: compare

````carve
```	js
x
```
````

````html
<p><code>	js
x
</code></p>
````

:::

Both mixed runs answer the same way, for the reason the title slots give:

::: compare

````carve
``` 	js
x
```
````

````html
<p><code> 	js
x
</code></p>
````

:::

::: compare

````carve
```	 js
x
```
````

````html
<p><code>	 js
x
</code></p>
````

:::

The `"header"` slot, which sits after the language token and reverts
independently of the slot before it:

::: compare

````carve
```js	"T"
x
```
````

````html
<p><code>js	"T"
x
</code></p>
````

:::

::: compare

````carve
```js 	"T"
x
```
````

````html
<p><code>js 	"T"
x
</code></p>
````

:::

::: compare

````carve
```js	 "T"
x
```
````

````html
<p><code>js	 "T"
x
</code></p>
````

:::

And the `[label]` slot, which reverts independently of both:

::: compare

````carve
```js "T"	[L]
x
```
````

````html
<p><code>js "T"	[L]
x
</code></p>
````

:::

::: compare

````carve
```js "T" 	[L]
x
```
````

````html
<p><code>js "T" 	[L]
x
</code></p>
````

:::

::: compare

````carve
```js "T"	 [L]
x
```
````

````html
<p><code>js "T"	 [L]
x
</code></p>
````

:::

A single space in each slot is the fenced form, unchanged:

::: compare

````carve
```js "T" [L]
x
```
````

````html
<pre title="T"><code class="language-js">x
</code></pre>
````

:::

## A tab continues a list item just as two spaces do

The tab-stop rule that lets a tab reach a marker column applies to a list item's
CONTINUATION line as much as to its first. `- item` puts the content column at
2, and a following line indented with one tab reaches it exactly as two spaces
do, so both spellings are one paragraph inside the item.

Pinned because the two spellings are decided in different places and one engine
decides them differently. carve-js publishes no position for the paragraph or
any of its three inlines when the continuation is a TAB, and places all four
when it is two spaces or when the marker is `1.`; carve-rs and carve-php place
them either way and agree to the offset
([carve-js#712](https://github.com/markup-carve/carve-js/issues/712)). The HTML
is identical in all three, which is why nothing in this corpus could see it -
the divergence is entirely in PART 12 positions, which the pair below does not
express and `npm run ast:check` now does.

The tab spelling:

:::: compare

```carve
- item
	more

x
```

```html
<ul>
  <li>item
more</li>
</ul>
<p>x</p>
```

::::

The two-space spelling, which is the control: it is the same document, and the
engine that drops the positions above keeps them here.

:::: compare

```carve
- item
  more

x
```

```html
<ul>
  <li>item
more</li>
</ul>
<p>x</p>
```

::::

## An absorbed colon fence leaves a block quote's paragraph open

The item form of PART 9 §12's absorption is pinned above, under *Lazy
continuation*. The BLOCK QUOTE form was not pinned anywhere, and it is the same
clause reached through a different container, so an engine could get the quote
wrong indefinitely without any document moving - which is what happened
(markup-carve/carve-rs#727).

`:::note` has no space between the fence and the type word, so §12's opener test
rejects it: it opens no block and is ordinary paragraph text. From that point
the paragraph **absorbs the next fence-shaped line as text too, instead of being
interrupted by it**. Nothing ever interrupted the quote's paragraph, so it is
still open when `tail` arrives at column 0, and PART 1 S4 folds `tail` in. The
quote's own prefix is missing on that line, which is exactly the partial match
S4 is written for:

::::: compare

```carve
> quote
> :::note
> body
> :::
tail
```

```html
<blockquote><p>quote
:::note
body
:::
tail</p></blockquote>
```

:::::

The absorption is **not width-tagged**. A four-colon run under a three-colon
`:::note` is fence-shaped too, and it is absorbed on the same terms - the
paragraph is not looking for a matching closer, because no block was ever
opened for it to close:

::::: compare

```carve
> quote
> :::note
> body
> ::::
tail
```

```html
<blockquote><p>quote
:::note
body
::::
tail</p></blockquote>
```

:::::

The malformed fence may be the quote's **first** line. There is no preceding
prose for the paragraph to have been opened by, so the absorbed line opens it -
and the rest follows unchanged:

::::: compare

```carve
> :::note
> :::
tail
```

```html
<blockquote><p>:::note
:::
tail</p></blockquote>
```

:::::

It holds at **depth two**, where the flush-left line matches neither prefix. S4
folds it into the innermost open paragraph rather than closing one quote per
missing marker:

::::: compare

```carve
> > quote
> > :::note
> > body
> > :::
tail
```

```html
<blockquote>
  <blockquote><p>quote
:::note
body
:::
tail</p></blockquote>
</blockquote>
```

:::::

Give the same fence its space and the answer inverts, exactly as it does in an
item: written `::: note` it is a valid opener, it interrupts the quote's
paragraph, and its closer completes the block - so nothing is open when `tail`
arrives. One space decides which of the two answers the same five lines get.

## A blank line holds spaces and tabs and nothing else

`blank_line = {whitespace}, newline` (`resources/grammar.ebnf`, PART 1) over
`whitespace = ' ' | '\t'` (PART 7). Two characters, and
no third. Every other character that a host language's whitespace class might
sweep up - a Unicode space separator, a C0 control, a zero-width character - is
CONTENT, so a line holding one of them keeps the paragraph open and soft-breaks
into it.

PART 0 states the U+FEFF row of that outright, under A LEADING BYTE ORDER MARK
IS STRIPPED:
a leading byte order mark is stripped, "ONE, and only there: a U+FEFF anywhere
else is an ordinary zero-width character". The three documents below carry the
characters raw; they are invisible in review, which is why
`tests/fixture-bytes.test.mjs` pins each one by name.

The rule and its opposite, in one document: the line holding only a byte order
mark is content and `a` continues into `b`, while a line holding only spaces and
a line holding only a tab each end the paragraph. Covers U+FEFF, U+0020 and
U+0009.

::: compare

```carve
a
﻿
b
  
c
	
d
```

```html
<p>a
﻿
b</p>
<p>c</p>
<p>d</p>
```

:::

The Unicode space separators are not `whitespace` either, nor is the other
zero-width character PART 9 names alongside the byte order mark. One paragraph,
nine soft breaks. Covers U+00A0, U+1680, U+2000, U+2009, U+200A, U+202F, U+205F,
U+3000 and U+200B.

::: compare

```carve
a
 
 
 
 
 
 
 
　
​
b
```

```html
<p>a
&nbsp;
 
 
 
 
 
 
　
​
b</p>
```

:::

The C0 controls and the Unicode line and paragraph separators are the rows a
regular-expression whitespace class reaches without anyone deciding it should.
They are content too. Covers U+000B, U+000C, U+0085, U+2028 and U+2029.

::: compare

```carve
a



 
 
b
```

```html
<p>a



 
 
b</p>
```

:::

## A link title takes exactly one space

`link_title = space, ('"' ... )` spells its padding slot as exactly ONE
character, and four artifacts read it as a run: carve-js, carve-php, carve-rs
and the executable spec all took the title after two spaces. carve#912 settled
which side gives. The production is right and the four are lax, so a second
space is no longer padding.

This is deliberately the opposite call from the one carve#905 made for the same
slots. That change settled WHICH character a slot admits (a space, never a tab)
and left HOW MANY alone; this one settles the cardinality, and settles it
tight.

With two spaces the quoted run is not a title, so the bracket run is not a link
at all and every character of the line survives as text:

::: compare

```carve
[t](/u  "T")
```

```html
<p>[t](/u  “T”)</p>
```

:::

`image_title = link_title` is one production defined by reference, so the image
tail answers the same way:

::: compare

```carve
![a](/p.png  "T")
```

```html
<p>![a](/p.png  “T”)</p>
```

:::

The CONTROL, and the point of the ruling: a single space is still the titled
form. This pair passed before carve#912 and passes after it, and it is what
distinguishes narrowing the slot from breaking it.

::: compare

```carve
[t](/u "T")
```

```html
<p><a href="/u" title="T">t</a></p>
```

:::

::: compare

```carve
![a](/p.png "T")
```

```html
<img src="/p.png" alt="a" title="T">
```

:::

## A code fence opener takes exactly one space

`fenced_code_block = code_fence_open, [space], [code_fence_info]` spells the
opener slot as exactly one character. A second space reaches `language_info`,
whose character class holds no space, so the opener matches no shape and the
INVALID-FENCE FALLBACK applies: the run is an inline verbatim span in a
paragraph.

The two metadata slots INSIDE `code_fence_info` are spelled `space+` and are
unaffected. The productions differ, so the cardinality differs, and carve#912
ruled only on the four slots spelled with a bare `space`.

::: compare

````carve
```  php
x = 1
```
````

````html
<p><code>  php
x = 1
</code></p>
````

:::

The CONTROL. One space is the lenient Djot spelling and stays a fenced block
with its language:

::: compare

````carve
``` php
x = 1
```
````

````html
<pre><code class="language-php">x = 1
</code></pre>
````

:::

## A frontmatter opener takes exactly one space

`frontmatter_open = "---", [space], [frontmatter_format]` spells its slot as
exactly one character too. With two, the second space reaches
`frontmatter_format = (letter | digit)+`, which cannot match it, so the line is
not a typed opener.

What is left is not a thematic break either -- a break is a dash run and
nothing else -- so the line is ordinary paragraph text, the metadata lines fold
into it as lazy continuation, and the closing `---` is the thematic break. The
opening dashes are then subject to smart typography like any other text, which
is why they render as an em dash.

::: compare

```carve
---  yaml
title: T
---

body
```

```html
<p>—  yaml
title: T</p>
<hr>
<p>body</p>
```

:::

The CONTROL. One space is the lenient spelling and still opens frontmatter,
which renders nothing:

::: compare

```carve
--- yaml
title: T
---

body
```

```html
<p>body</p>
```

:::

## A reference definition's metadata slots take exactly one space

The definition line carries two of the four slots carve#912 narrowed:
`link_title` before the quoted title, and `[space, attributes]` before the
trailing attribute block. Both are padding -- the definition is already a
definition at `[a]: /url` -- and both are spelled as exactly one space.

With two spaces the title is not a title, and the leftover quoted run is what
the line then fails on: the definition is anchored at end of line (carve#911),
so the whole line is an ordinary paragraph and the reference does not resolve.

::: compare

```carve
[a]: /u  "T"

[a][]
```

```html
<p>[a]: /u  “T”</p>
<p>[a][]</p>
```

:::

The attribute block answers the same way, and note where it does NOT go: the
zero-space case is a different shape, because `[a]: /u{.c}` glues the braces to
the destination and gives `href="/u{.c}"`. Two spaces end the destination
instead, so the block is left over and the production fails on it.

When these two documents were written under carve#912 the leftover was silently
dropped and the line stayed a definition, which is the outcome PART 7 names as
the one to avoid. carve#911 anchored the line, and this is the fallback the
clause promises.

::: compare

```carve
[a]: /u  {.c}

[a][]
```

```html
<p>[a]: /u  {.c}</p>
<p>[a][]</p>
```

:::

The CONTROLS. One space carries the title, and one space carries the
attributes:

::: compare

```carve
[a]: /u "T"

[a][]
```

```html
<p><a href="/u" title="T">a</a></p>
```

:::

::: compare

```carve
[a]: /u {.c}

[a][]
```

```html
<p><a href="/u" class="c">a</a></p>
```

:::

## A reference definition is anchored at end of line

`reference_definition` ends in `newline`, and always has. All three engines and
the executable spec nevertheless read `[a]: /u zzz` as a definition with
trailing junk, and nothing in the grammar authorized that reading. carve#911
settled it the way the production already said: what follows the destination
and the optional title makes the production FAIL, so the line is an ordinary
paragraph.

The reason it matters is not tidiness. PART 7 promises that a slot which fails
to match "falls back to prose rather than silently dropping metadata", and at
this line there was no prose to fall back to -- the swallowing tail took
whatever the slot rejected. So the clause's promised failure mode was
unreachable here, and every narrowing at this line dropped metadata instead.
With the line anchored the promise holds, and the tab and cardinality rules at
both slots follow from the general rule with no special case.

::: compare

```carve
[a]: /u zzz

[a][]
```

```html
<p>[a]: /u zzz</p>
<p>[a][]</p>
```

:::

A quoted run after a title is junk in the same way. The title is read, and then
the line fails on what is left:

::: compare

```carve
[a]: /u "T" zzz

[a][]
```

```html
<p>[a]: /u “T” zzz</p>
<p>[a][]</p>
```

:::

### The tab, at both slots

The title slot and the trailing-attributes slot take `space` under PART 7, like
every other padding slot. Both sit on this line, and both were left unpinned by
carve#907 for the reason above: with the line unanchored, a tab there dropped
the metadata rather than producing the visible failure the clause names. Now it
produces the failure, so it can be pinned.

Each slot carries the tab-first form and BOTH mixed runs. A rule about a run
written as "the first character must be a space" passes the tab-first fixture
and admits `<SP><TAB>`; written as "the last character must be a space" it
admits `<TAB><SP>` instead. Both spellings have been written for real in this
org, in three languages, on one day.

The title slot:

::: compare

```carve
[a]: /u	"T"

[a][]
```

```html
<p>[a]: /u	“T”</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u 	"T"

[a][]
```

```html
<p>[a]: /u 	“T”</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u	 "T"

[a][]
```

```html
<p>[a]: /u	 “T”</p>
<p>[a][]</p>
```

:::

The trailing-attributes slot:

::: compare

```carve
[a]: /u	{.c}

[a][]
```

```html
<p>[a]: /u	{.c}</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u 	{.c}

[a][]
```

```html
<p>[a]: /u 	{.c}</p>
<p>[a][]</p>
```

:::

::: compare

```carve
[a]: /u	 {.c}

[a][]
```

```html
<p>[a]: /u	 {.c}</p>
<p>[a][]</p>
```

:::

### What the anchor does NOT reject

The line ending is `whitespace` -- a space or a tab -- which is the same
terminal `blank_line = {whitespace}` takes (PART 1, carve#890). So trailing
spaces and a trailing tab are still a line ending rather than content, and the
definition stands; a trailing NO-BREAK SPACE, EN QUAD or FORM FEED is content
under that same ruling, so a line ending in one is not a definition. A trailing
ZERO-WIDTH character is a third answer again: U+200B and U+FEFF are not
whitespace at all, so they never reach the line ending -- `link_destination`
reads them, the definition stands, and the character is in the href. The
trailing attribute block is peeled by a scan that trims the line ending first,
so that scan has to trim the SAME run the anchor accepts, or the same character
answers one way with a block on the line and another without one. Those shapes
are pinned in
`tests/separator-role-split.test.mjs` rather than here, because a trailing
whitespace run in a reviewable Markdown source file is one editor save from
vanishing -- and because what a document does with trailing whitespace is its
own question (carve#926).

And the glued form is untouched, because nothing is left over: `link_destination`
simply reads the braces.

::: compare

```carve
[a]: /u{.c}

[a][]
```

```html
<p><a href="/u{.c}">a</a></p>
```

:::

### A definition still INTERRUPTS, attribute block and all

The anchor changes what the pattern matches, and the pattern is read in nine
places rather than one: eight of them ask "is this line a definition" to decide
paragraph interruption, lazy continuation, the def-list fold, the container
scan, the item fold and the marker scan. While the pattern ended in a
swallow-everything tail those eight could test the RAW line and be right by
accident, because `[a]: /u {.c}` matched it raw. Anchored, they cannot: the
trailing attribute block has to be split off first, or a definition carrying
one stops interrupting anything and folds into the paragraph above it.

Nothing pinned that. Reverting all eight to the raw line left the entire suite
green, and a differential sweep then found 42 of 72 generated shapes moving.
These three are the sweep's representatives -- top level, inside a list item,
and inside a definition-list description.

::: compare

```carve
text
[a]: /u {.c}

[a][]
```

```html
<p>text</p>
<p><a href="/u" class="c">a</a></p>
```

:::

::: compare

```carve
- text
  [a]: /u {.c}

[a][]
```

```html
<ul>
  <li>text</li>
</ul>
<p><a href="/u" class="c">a</a></p>
```

:::

::: compare

```carve
:: term
:  def
[a]: /u {.c}

[a][]
```

```html
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
<p><a href="/u" class="c">a</a></p>
```

:::

The fourth is the one the other three cannot reach. A block quote's open
paragraph asks the same question in a SECOND place -- the lazy-continuation
test, not the paragraph collector -- and reverting only that one site left even
the differential sweep above unmoved. Here the definition has to interrupt, or
the line below it lazily continues INSIDE the quote:

::: compare

```carve
> text
[a]: /u {.c}
more

[a][]
```

```html
<blockquote><p>text</p></blockquote>
<p>more</p>
<p><a href="/u" class="c">a</a></p>
```

:::

Two more, found the same way: each of the eight sites was reverted on its own,
and three of them survived every shape above. A definition INSIDE a quote is
the third site -- it is what leaves the quote with no open paragraph, so a
following lazy line starts its own block instead of folding in:

::: compare

```carve
> text
> [a]: /u {.c}
lazy
```

```html
<blockquote><p>text</p></blockquote>
<p>lazy</p>
```

:::

And a definition after a blank line inside a list item is the fourth and fifth.
An invisible construct is not a second paragraph, so the list stays TIGHT
(PART 9 §17 L1/L2); with the raw predicate it loosens:

::: compare

```carve
- text

  [a]: /u {.c}

[a][]
```

```html
<ul>
  <li>text</li>
</ul>
<p><a href="/u" class="c">a</a></p>
```

:::

The CONTROLS. Every legal shape of the line still is one:

::: compare

```carve
[a]: /u "T" {.c}

[a][]
```

```html
<p><a href="/u" title="T" class="c">a</a></p>
```

:::

## A definition marker's separator is a space, and it is a run

The three definition markers share one separator rule: the marker-to-content
separator is the `space` terminal, U+0020, and a tab never satisfies it. What
the grammar did not say is how MANY. `footnote_definition` and
`abbreviation_definition` were spelled with a single `space` while all three
engines and the executable spec consumed a run, so the productions forbade a
shape nothing rejected. carve#892 corrects them to `space+`.

Note that this is the OPPOSITE cardinality answer from carve#912's, which held
four PADDING SLOTS to exactly one space. The two are not in conflict, because
they govern different positions. A padding slot sits between two tokens on a
line whose construct is already fixed, and its width means nothing. A marker
separator is what stands between the marker and the content it introduces, and
a writer aligning definitions in a column is writing separator, not content.

Two spaces, at both markers:

::: compare

```carve
*[HTML]:  Hyper Text

HTML
```

```html
<p><abbr title="Hyper Text">HTML</abbr></p>
```

:::

::: compare

```carve
x[^f]

[^f]:  note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

### The run is ASCII spaces, so the first other character is content

This is where the three engines disagreed, each in a different place, and where
the executable spec gave a fourth answer no engine gave: it refused a footnote
marker followed by any non-ASCII whitespace as a definition at all.

A NO-BREAK SPACE after the separator is content. The abbreviation expands to a
string that starts with it:

::: compare

```carve
*[HTML]:  Hyper Text

HTML
```

```html
<p><abbr title=" Hyper Text">HTML</abbr></p>
```

:::

and the footnote is defined, with the character opening its body:

::: compare

```carve
x[^f]

[^f]:  note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>&nbsp;note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A TAB after the run is content by the same rule, and the two markers then
answer differently for a reason downstream of this clause rather than in it. An
abbreviation expansion is a raw string, so the tab survives into the `title`:

::: compare

```carve
*[HTML]: 	Hyper Text

HTML
```

```html
<p><abbr title="	Hyper Text">HTML</abbr></p>
```

:::

while a footnote body is parsed as blocks, where a leading tab is that body's
own indentation run (PART 9 section 24 C1) rather than a character in it:

::: compare

```carve
x[^f]

[^f]: 	note
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

### The CONTROLS

A tab as the SEPARATOR is still not a separator. Widening the run is not
widening the terminal, and this is the pair that separates the two:

::: compare

```carve
*[HTML]:	Hyper Text

HTML
```

```html
<p>*[HTML]:	Hyper Text</p>
<p>HTML</p>
```

:::

::: compare

```carve
x[^f]

[^f]:	note
```

```html
<p>x[^f]</p>
<p>[^f]:	note</p>
```

:::

And MARKER REQUIRES CONTENT still applies after the run. A marker followed by
spaces and nothing else is a paragraph, because a line of `whitespace` is blank
(PART 1). The spaces-only forms are pinned in
`tests/separator-role-split.test.mjs` rather than here -- a trailing whitespace
run in a reviewable Markdown source file is one editor save from vanishing --
and this is the version the corpus can hold, a bare marker:

::: compare

```carve
x[^f]

[^f]:
```

```html
<p>x[^f]</p>
<p>[^f]:</p>
```

:::

One space is unchanged, which is the form every document actually uses:

::: compare

```carve
*[HTML]: Hyper Text

HTML
```

```html
<p><abbr title="Hyper Text">HTML</abbr></p>
```

:::

## Trailing whitespace on a content line is dropped

A `whitespace` run at the end of a content line does not reach the output. It
is not content, and there is no shape of the language that gives it meaning:
Carve's hard break is the backslash form, never two trailing spaces.

The rule is the project's rather than any one production's, and it decides more
than the shape that raised it:

> trailing (invisible and bad) whitespace is the one important rule we have: no
> such thing.

It was previously written down only for a paragraph's FINAL line, and PART 12
section 7 asserted the opposite for a line before a soft break. carve#926
settled it as general and corrected both.

A trailing space on the last line of a paragraph, which was already the stated
rule:

::: compare

```carve
abc 
```

```html
<p>abc</p>
```

:::

And on a line before a SOFT BREAK, which is the half the specification had
backwards. These two documents are the same document:

::: compare

```carve
abc 
def
```

```html
<p>abc
def</p>
```

:::

A tab answers the same way, at both positions:

::: compare

```carve
abc	
def	
```

```html
<p>abc
def</p>
```

:::

Every other line that carries content answers the same way. A heading, a list
item, a block quote line and a definition entry:

::: compare

```carve
# Title 

- item 

> quoted 
```

```html
<section id="Title">
  <h1>Title</h1>
  <ul>
    <li>item</li>
  </ul>
  <blockquote><p>quoted</p></blockquote>
</section>
```

:::

::: compare

```carve
:: term 
:  def 
```

```html
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
```

:::

A table caption, which kept its run until carve#926 measured it:

::: compare

```carve
| a |
^ Cap 
```

```html
<table>
  <caption>Cap</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

### The run is `whitespace`, and nothing else is whitespace

The dropped run is `' '` or a tab, the same two-character terminal
`blank_line = {whitespace}` takes. Every other character is CONTENT and
survives, however invisible it looks in an editor. This one document carries a
no-break space, a zero-width space, a byte order mark, an en quad and a form
feed, each at the end of its own line:

::: compare

```carve
a 
b​
c﻿
d 
e
```

```html
<p>a&nbsp;
b​
c﻿
d 
e</p>
```

:::

That is why U+FEFF was a red herring in the shape that raised this. In a line
holding a space, a byte order mark and a space, the BOM is content and what is
dropped is the trailing SPACE:

::: compare

```carve
 ﻿ 
```

```html
<p>﻿</p>
```

:::

### Where the rule does not reach

Verbatim content keeps its bytes. A fenced code block's body is the block's
payload, not a content line:

::: compare

````carve
```
abc 
```
````

````html
<pre><code>abc 
</code></pre>
````

:::

And whitespace INSIDE a construct is not trailing: it ends at the construct's
delimiter rather than at the line's end. A code span, a literal inline and a
table cell all keep it, and so does the run before a hard-break backslash:

::: compare

```carve
`x ` and !`y `
```

```html
<p><code>x </code> and y </p>
```

:::

::: compare

```carve
a \
b
```

```html
<p>a <br>
b</p>
```

:::

A LINE BLOCK is not an exception either, in the order that matters. Its MEDIAL
GAPS rule converts an inner or trailing run of two or more columns into NBSP
CONTENT first, and content is not whitespace -- so this rule never reaches it,
and only the one-column case is left for it to drop:

:::: compare

```carve
::: |
abc  
def 
:::
```

```html
<div class="line-block">
  <p>abc&nbsp;&nbsp;<br>
def</p>
</div>
```

::::

### A definition term's continuation line

A `dt` written across two physical lines is one logical line assembled from
two, and the second line's trailing run is dropped exactly like the first
line's would be (markup-carve/carve#1289). Nothing exempts a term: the run is
whitespace at the end of a content line, and the verbatim run that spans the
break carries a newline rather than the dropped space.

::: compare

```carve
:: `a
b 
:  d
```

```html
<dl>
  <dt><code>a
b</code></dt>
  <dd>d</dd>
</dl>
```

:::

The control belongs to "where the rule does not reach" above rather than to
this one: spaces INSIDE the run are the construct's content and end at its
closing delimiter, so a term whose whole content is an all-space verbatim keeps
them.

::: compare

```carve
:: `  `
:  d
```

```html
<dl>
  <dt><code>  </code></dt>
  <dd>d</dd>
</dl>
```

:::

## A definition body continuation indented past its column is lazy text

`definition_indent` (`resources/grammar.ebnf`, PART 2) is a whitespace run REACHING
the body's column - the one `:  ` establishes. REACHING it is what makes a line
the body's own content; going past it does not make the line something else,
because there is nothing past that column for indentation to mean. So a line
indented further is a continuation of the body's OPEN PARAGRAPH, its content is
inline, and a `>` on it is a greater-than sign rather than a block quote opener.

The alternative reading - extra indentation opens a nested block, the way it
does inside a list item - makes indentation depth mean two different things one
line apart: the line above continues a paragraph lazily and this one would open
a block. carve-js and carve-php read it that way and both move (carve#918).

The two documents after it are CONTROLS. They pin the columns on either side of
the boundary, which do not change and are not what was ruled: at the body's own
column a block opener still opens a block, and flush left the body ends and the
quote is its sibling. Without them the rule above reads as "an indented `>` is
never a quote", which is not what it says.

::: compare

```carve
:: t
:  body
    > q
```

```html
<dl>
  <dt>t</dt>
  <dd>body
&gt; q</dd>
</dl>
```

:::

CONTROL, at the body's column. Three spaces reach column 3, so the line is the
body's own block content and the quote opens.

::: compare

```carve
:: t
:  body
   > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>body</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::

CONTROL, flush left. Column 0 does not reach the body's column at all, so the
body ends and the quote is a sibling of the list.

::: compare

```carve
:: t
:  body
> q
```

```html
<dl>
  <dt>t</dt>
  <dd>body</dd>
</dl>
<blockquote><p>q</p></blockquote>
```

:::

## A real div in a container and the flush-left line after it

PART 1 S4 folds a flush-left line into the innermost open paragraph, and folds
nothing when there is none. A REAL `::: ` div - one whose opener passes PART 7's
separator test, so it is a block and not absorbed paragraph text - makes that
clause decide two ways depending on what the div holds when the line arrives.

An UNTERMINATED div holding a paragraph has an open paragraph in the stack, so
the flush-left line folds into it. An unterminated div holding NOTHING has none,
so the line ends the container instead. The two documents differ by one line of
body, and that line is the whole rule (carve#909).

::: compare

```carve
- item
  ::: note
  body
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note">
      <p>body
tail</p>
    </aside>
  </li>
</ul>
```

:::

The same shape with an empty div. Nothing in the stack holds an open paragraph
when `tail` arrives - the item's own paragraph was closed by the div that
followed it, and the div itself is empty - so S4 folds nothing and the line is a
top-level paragraph.

::: compare

```carve
- item
  ::: note
tail
```

```html
<ul>
  <li>item
    <aside class="admonition note">

    </aside>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL, and the reason the rule is about an UNTERMINATED div. Close the div and
the paragraph inside it closes with it, so the first document's answer inverts
on the strength of one `:::` line. This pins behavior that does not change.

::: compare

```carve
- item
  ::: note
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

:::

A note on the spelling, because it is what made this look like a four-way split
when carve#909 was written. The shapes there are spelled `:::note`, with no
separator. PART 7 has since narrowed the colon fence's separator to a space
(carve#900, carve#905), so `:::note` no longer passes the opener test at all: it
is ABSORBED as paragraph text, and the answer for it comes from §12's absorption
rule and carve#902 rather than from S4. That row is already pinned by
`86-list-lazy-continuation-9` and already declared in
`resources/engine-pin-drift.txt`. The documents above use `::: note`, which is a
div.

## The flush-left line after a container a quoted line opened

The item form of PART 1 S4's *NO OPEN PARAGRAPH, NO LAZY LINE* is pinned above,
under *A real div in a container*. The BLOCK QUOTE form was not pinned anywhere
(markup-carve/carve#920), and the two containers were answering the same
question differently: a list item closed and put the flush-left line at top
level, while a block quote kept it.

The stack after `> ::: note` holds a quote and an EMPTY div. S4 asks whether ANY
container in it holds an OPEN paragraph, and none does - the quote's own
paragraph was closed by the div opener, and the div has no content yet. So
`tail` supplies no prefix, nothing is open for it to fold into, both containers
close, and it is a top-level paragraph:

::::: compare

```carve
> quote
> ::: note
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note">

  </aside>
</blockquote>
<p>tail</p>
```

:::::

Closing the div does not change the answer, because a CLOSED container holds no
open paragraph either. Both the empty form and the form with a body land the
same way, and they are the block-quote twins of the list-item documents above:

::::: compare

```carve
> quote
> ::: note
>
> :::
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note">

  </aside>
</blockquote>
<p>tail</p>
```

:::::

::::: compare

```carve
> quote
> ::: note
> body
> :::
tail
```

```html
<blockquote>
  <p>quote</p>
  <aside class="admonition note">
    <p>body</p>
  </aside>
</blockquote>
<p>tail</p>
```

:::::

The last document is the one place §12's absorption and S4 meet, and they are
decided by WHOSE line it is. `:::note` has no separator, so it opens nothing and
is absorbed as paragraph text - and the quoted `> :::` under it is absorbed on
the same terms, which is what *An absorbed colon fence leaves a block quote's
paragraph open* pins. A FLUSH-LEFT `:::` is not one of the quote's lines: it
supplies no `>` prefix and would reach that paragraph only by S4's lazy fold.
The strict column-0 rule decides it instead. The quote closes and the line is
re-classified at top level, where it opens a div of its own:

::::: compare

```carve
> quote
> :::note
> body
:::
```

```html
<blockquote><p>quote
:::note
body</p></blockquote>
<div>
</div>
```

:::::


## An autolink body admits non-ASCII and excludes format characters

`url_char` was an enumerated ASCII set, so read as written an autolink admitted
no non-ASCII at all - and two engines linked internationalized domains anyway
(markup-carve/carve#860). The rule now reads: outside ASCII, `url_char` admits
any character that is not whitespace and not a FORMAT character
(General_Category Cf).

The deciding asymmetry is that the same destination written as an inline link
already links everywhere, because `link_destination` admits
`unicode_url_char`. One destination cannot answer two ways on the character set
depending on which spelling the author reached for.

::: compare

```carve
<https://例.jp/>
```

```html
<p><a href="https://例.jp/">https://例.jp/</a></p>
```

:::

A non-ASCII PATH links on the same terms:

::: compare

```carve
<https://example.com/café>
```

```html
<p><a href="https://example.com/café">https://example.com/café</a></p>
```

:::

And so does a non-ASCII character that is not a LETTER. This is the row that
separates the rule from "Unicode letters are letters": the executable spec's
`urlChar` used ohm's built-in `letter`, which is Unicode-aware, so it linked
`café` for free and left a currency sign, a CJK comma or an emoji literal.

::: compare

```carve
<https://example.com/€10>
```

```html
<p><a href="https://example.com/€10">https://example.com/€10</a></p>
```

:::

### A format character is not a URL character

The exclusion is the half that is new rather than permissive. A format
character is invisible by definition, so a host carrying one renders as the
host WITHOUT it and links somewhere else - a spoofing surface, not an authoring
convenience. The next document has a U+FEFF BYTE ORDER MARK between the `e` and
the `.com`, and it is not an autolink:

::: compare

```carve
<https://e﻿.com/>
```

```html
<p>&lt;https://e﻿.com/&gt;</p>
```

:::

A LEADING one, before the scheme, is literal too - there for a different
reason, since a scheme starts with a letter and this is not one:

::: compare

```carve
<﻿https://e.com/>
```

```html
<p>&lt;﻿https://e.com/&gt;</p>
```

:::

A U+200B ZERO WIDTH SPACE is a format character as well, despite the name -
Unicode moved it out of the space categories in 4.0.1. Spelling the rule as a
PROPERTY is what makes these two documents answer alike: a host language whose
own whitespace class happens to hold U+FEFF gets the first one right for the
wrong reason and this one wrong.

::: compare

```carve
<https://e​.com/>
```

```html
<p>&lt;https://e​.com/&gt;</p>
```

:::

A U+00A0 NO-BREAK SPACE is excluded by the OTHER half of the rule - it is
whitespace - and was already the answer under both readings:

::: compare

```carve
<https://e .com/>
```

```html
<p>&lt;https://e&nbsp;.com/&gt;</p>
```

:::

### What did not change

CONTROL. The ASCII exclusions are untouched. `"`, `\`, a backtick, `{`, `}`,
`|`, `^`, `<` and `>` are still not `url_char`s, and all four artifacts already
agreed on them - which is why the rule is spelled `unicode_url_char -
format_char` rather than "any non-whitespace, non-control character". The
latter would re-admit these nine and move every implementation on a question
nobody asked. (The straight quotes additionally pick up smart-quote typography,
which is what makes the output curly.)

::: compare

```carve
<https://example.com/"q">
```

```html
<p>&lt;https://example.com/“q”&gt;</p>
```

:::

CONTROL. `link_destination` is a different production and is unchanged, so a
format character in an INLINE destination is still an ordinary destination
character. The pair below and the interior-BOM autolink above are the same
character in the same position, answering differently because the two
spellings are two productions:

::: compare

```carve
[t](https://e﻿.com/)
```

```html
<p><a href="https://e﻿.com/">t</a></p>
```

:::

CONTROL. Only the BODY admits non-ASCII. A `scheme` is
`letter, {letter | digit | '+' | '-' | '.'}` and `letter` is the enumerated
ASCII alphabet, so a scheme written in another script opens no autolink. The
executable spec accepted one until this landed, for the same reason it linked
`café`: ohm's `letter` is Unicode-aware.

::: compare

```carve
<例://example.com/>
```

```html
<p>&lt;例://example.com/&gt;</p>
```

:::


## The inline attribute interior is space-only, the attribute line is not

markup-carve/carve#906 is a POSITION distinction rather than a per-construct
exception, and this category is the half that does not move. The three
documents above pin the inline block narrowing; these pin what it narrowed
against.

CONTROL. The SPACE forms of all four inline positions - the run after `{`, the
run between two attributes, the run before `}`, and the blessed empty block -
are untouched, and a reader that narrowed too far breaks here rather than
silently accepting less:

::: compare

```carve
*x*{.a .b}

*y*{ .c}

*z*{.d }

[w]{ }
```

```html
<p><strong class="a b">x</strong></p>
<p><strong class="c">y</strong></p>
<p><strong class="d">z</strong></p>
<p><span>w</span></p>
```

:::

The block-attribute LINE keeps `whitespace` at all three of its slots. It is
the one construct in this grammar whose interior can hold a leading indentation
run: after a `continuation`, the next line's leading whitespace IS indentation,
and the rule that narrows the inline block is the same rule that protects this
one.

::: compare

```carve
{	.a	.b	}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::

And the continuation line's own indentation, which is the position the whole
distinction is about:

::: compare

```carve
{.a
	.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::


## A quoted attribute value stops at the newline

`quoted_value` is ONE production, read by the inline attribute block and by the
block-attribute line alike, and the two normative files answered it differently:
`resources/grammar.ebnf` built the value out of `character`, which is any
Unicode character, and `resources/carve-core.ohm` excluded a newline at the same
slot. Nothing pinned either answer (markup-carve/carve#888).

It is settled the ohm file's way, because the alternative falsifies a sentence
the grammar already states. An inline attribute block cannot span lines
(markup-carve/carve#897), and since markup-carve/carve#906 its padding takes
`space` and its separator `space+` - neither admits a line break. The quoted
value was the last way through:

::: compare

```carve
*x*{k="a
b"}
```

```html
<p><strong>x</strong>{k=“a
b”}</p>
```

:::

CONTROL. The same value on one line is an ordinary attribute, so the rule is
about the line break and not about the quotes:

::: compare

```carve
*x*{k="a b"}
```

```html
<p><strong k="a b">x</strong></p>
```

:::

The BLOCK-attribute line reads the same production, so a line break inside a
quoted value ends that block too. This is the half with a cost: all three
engines accept it today, and they do not agree on what it means - one keeps the
newline in the value, two collapse it to a space, which no production describes.

::: compare

```carve
{k="a
b"}

paragraph
```

```html
<p>{k=“a
b”}</p>
<p>paragraph</p>
```

:::

CONTROL, and the reason the rule is about the value rather than about the block:
a block attribute may still span lines. `continuation` is where a newline is
admitted, and it sits BETWEEN two tokens, never inside one.

::: compare

```carve
{.a
.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::

CONTROL. A BLANK line is not a continuation - it ends the block, and the braces
stay literal. The ohm grammar accepted one at every slot of `blockAttrs` until
this landed, which no document could show because the layout automaton stops at
a blank line before the rule is reached; it is pinned directly in
`tests/block-attribute-line-breaks.test.mjs` and pinned here as behavior.

::: compare

```carve
{.a

.b}

paragraph
```

```html
<p>{.a</p>
<p>.b}</p>
<p>paragraph</p>
```

:::

## A collapsed reference reaches a heading by the heading's rendered text

PART 9R R1's implicit heading fallback keys the index by each heading's RENDERED
PLAIN TEXT, so `# *bold* heading` is registered as `bold heading`. R1 said the
label and the heading text are "both" trimmed, collapsed, NFC-normalized and
case-folded, but it never said which string the label side contributes - its
source run or its rendered plain text. Read as the source run, the asterisks
survive all four normalizations and no heading containing markup is reachable by
its collapsed spelling; read as rendered plain text, it is. Nothing pinned
either answer, and carve-js took the first reading while carve-rs, carve-php and
the executable spec took the second (markup-carve/carve#648).

It is settled as rendered plain text on this path: the heading side of the
comparison is already rendered plain text, and two strings of different kinds
can never meet.

::: compare

```carve
# *bold* heading

[*bold* heading][]
```

```html
<section id="bold-heading">
  <h1><strong>bold</strong> heading</h1>
  <p><a href="#bold-heading"><strong>bold</strong> heading</a></p>
</section>
```

:::

A code span in the heading is the same row, and worth pinning separately because
an implementation that strips a fixed list of emphasis characters can pass the
first one and fail this one:

::: compare

```carve
# `code()` heading

[`code()` heading][]
```

```html
<section id="code-heading">
  <h1><code>code()</code> heading</h1>
  <p><a href="#code-heading"><code>code()</code> heading</a></p>
</section>
```

:::

Those two were the whole sample for a long time, and both are on the list a
character-class strip would carry, so the list itself went unmeasured. These are
the shapes such a strip cannot reach (markup-carve/carve#1011). Carve's emphasis
delimiter is `/`, and no strip can remove it without eating every path and URL an
author might quote:

::: compare

```carve
# an /em/ heading

[an /em/ heading][]
```

```html
<section id="an-em-heading">
  <h1>an <em>em</em> heading</h1>
  <p><a href="#an-em-heading">an <em>em</em> heading</a></p>
</section>
```

:::

An ESCAPE is the shape where the two sides meet at neither spelling: the heading
renders `a_b`, the label as written is `a\_b`, and deleting the underscore from
the label leaves the backslash behind.

::: compare

```carve
# a\_b heading

[a\_b heading][]
```

```html
<section id="a-b-heading">
  <h1>a_b heading</h1>
  <p><a href="#a-b-heading">a_b heading</a></p>
</section>
```

:::

A NESTED LINK in the label contributes its text and not its destination, which
is the heading side's own rule; dropping the brackets alone leaves `(/y)`
standing. The resolved reference carries no nested anchor, because links never
nest (PART 12 §3a).

::: compare

```carve
# a [x](/y) b

[a [x](/y) b][]
```

```html
<section id="a-x-b">
  <h1>a <a href="/y">x</a> b</h1>
  <p><a href="#a-x-b">a x b</a></p>
</section>
```

:::

SMART TYPOGRAPHY is the shape with no markup characters in it at all: the
heading holds the curly apostrophe the substitution produced and the label holds
the one the author typed, so only a comparison made after rendering relates
them.

::: compare

```carve
# it's a heading

[it's a heading][]
```

```html
<section id="it-s-a-heading">
  <h1>it’s a heading</h1>
  <p><a href="#it-s-a-heading">it’s a heading</a></p>
</section>
```

:::

An INLINE LITERAL contributes its content, the same as the code span above (§27
renders it as visible prose):

::: compare

```carve
# a !`Cat` b

[a !`Cat` b][]
```

```html
<section id="a-Cat-b">
  <h1>a Cat b</h1>
  <p><a href="#a-Cat-b">a Cat b</a></p>
</section>
```

:::

A SYMBOL SHORTCODE is the one shape where the two sides meet by both
contributing NOTHING. The slug rule (syntax.md §4.1 step 1) takes the heading's
rendered plain text "inline markup removed; symbols `:name:` and footnote
references excluded", so `# a :smile: b` is `a-b` and is keyed `a b`. The
exclusion is by CONSTRUCT and not by what the symbol renders as, which is what
makes the id hold still: a symbol resolves through processor configuration - an
inline-renderer handler, else the renderer's `symbols` map, else the literal
`:name:` - while an id is assigned in a parse pass no renderer option reaches.
An id keyed on the shortcode NAME would name a spelling the document stops
rendering the moment a host configures a map, and one keyed on the RESOLVED
value would move every such id at that same moment. The corpus renders with no
map, so the heading below prints `:smile:` and is still `a-b`.

::: compare

```carve
# a :smile: b

[a :smile: b][]
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
  <p><a href="#a-b">a :smile: b</a></p>
</section>
```

:::

The exclusion reaches the INDEX KEY as well, and it has to: the index is keyed by
the same rendered plain text, so a heading that excludes the shortcode is keyed
`a b` and is reachable by that spelling too. Excluding it from the id alone
would leave the id and the key describing two different strings.

::: compare

```carve
# a :smile: b

[a b][]
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
  <p><a href="#a-b">a b</a></p>
</section>
```

:::

The two exclusions compose: a heading holding both a symbol and emphasis
contributes the emphasis text and not the shortcode.

::: compare

```carve
# a :smile: /b/ c

[a :smile: /b/ c][]
```

```html
<section id="a-b-c">
  <h1>a :smile: <em>b</em> c</h1>
  <p><a href="#a-b-c">a :smile: <em>b</em> c</a></p>
</section>
```

:::

The strip is SCOPED TO THE HEADING INDEX. An authored definition is still
matched by the label as written -
`193-a-collapsed-reference-is-matched-by-the-label-the-author-wrote` pins both
directions of that, and a change that reaches it is a deviation from R1 rather
than a generalization of it. The tie-break is unaffected too: linkDefs wins, so
a definition whose label carries the same markup beats the heading the fallback
would otherwise find.

::: compare

```carve
[*bold* heading]: /x

# *bold* heading

[*bold* heading][]
```

```html
<section id="bold-heading">
  <h1><strong>bold</strong> heading</h1>
  <p><a href="/x"><strong>bold</strong> heading</a></p>
</section>
```

:::

## A fence opened on a list marker line, body below the content column

A code fence opened on a list MARKER line, with its body below the item's
content column, got four different answers from four readers - the executable
spec swallowed the closer into the code text, carve-js did the same with an
extra space, carve-php read the column-0 line as body and let the column-0 fence
close it, and only carve-rs closed the item (markup-carve/carve#646). No corpus
case put a fence body below the content column, so nothing could tell.

PART 9 §24's STEP algorithm already decides it, without a new rule. Take `x` at
column 0 with the stack `document > list > item(content_column 2) > code fence
body`:

- **S1 MATCH PREFIXES** walks the stack and stops at the first container whose
  prefix the line does not supply. `x` supplies no indentation, so the walk stops
  at the ITEM and the fenced body is never reached.
- **S2 FENCED BODY** therefore does not fire: it applies only when the innermost
  MATCHED container is a fenced body, and here that is the item.
- **S4 PARTIAL MATCH** governs. Its lazy-continuation branch continues an OPEN
  PARAGRAPH, and a fenced body is not one - the NO OPEN PARAGRAPH, NO LAZY LINE
  clause the spec already spells out for `. >`. What remains is S4's otherwise:
  close the unmatched containers and re-classify the residue in the surviving
  context.

So the item holds an EMPTY code block and `x` re-parses at document level:

::::: compare

````carve
- ```
x
```
````

```html
<ul>
  <li>
    <pre><code>
</code></pre>
  </li>
</ul>
<p>x
<code></code></p>
```

:::::

The trailing delimiter becoming EMPTY INLINE CODE is pinned deliberately rather
than inherited. It is not part of the rule - it is what a backtick run means once
the line is ordinary paragraph text - but it is the kind of output nobody would
write down on purpose, so it is stated.

One column in is the same answer, and it is a separate row because the two
broken readings differed here: one kept the leading space in the code text and
one stripped it. Below the content column is below the content column.

::::: compare

````carve
- ```
 x
 ```
````

```html
<ul>
  <li>
    <pre><code>
</code></pre>
  </li>
</ul>
<p>x
<code></code></p>
```

:::::

CONTROL. AT the content column the fence body is the item's, the closer closes
it, and nothing leaves the item. All four readers always agreed here, which is
the shape every existing corpus case uses:

::::: compare

````carve
- ```
  x
  ```
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
```

:::::

The BLOCK QUOTE analogue is the same derivation with the same answer, and all
three engines already agree on it - unenforced until now, which is why the list
case could drift away from it:

::::: compare

````carve
> ```
x
```
````

```html
<blockquote>
  <pre><code>
</code></pre>
</blockquote>
<p>x
<code></code></p>
```

:::::

A tilde fence takes the same route, and the residue shows the empty inline code
above was a property of the BACKTICK run rather than of this rule: `~~~` in
paragraph text is just text.

::::: compare

```carve
- ~~~
x
~~~
```

```html
<ul>
  <li>
    <pre><code>
</code></pre>
  </li>
</ul>
<p>x
~~~</p>
```

:::::

The guard is on the OPEN FENCE, not on the item's paragraph state. Once the body
has collected a line at the content column, a reader tracking "is a paragraph
open" sees one again and folds - so this row and the first one need different
mechanisms to pass, and only the fence-shaped rule passes both:

::::: compare

````carve
- ```
  x
 y
  ```
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
<p>y
<code></code></p>
```

:::::

The same clause reaches one shape further: a fence opened on a CONTINUATION line
rather than on the marker line. S1 stops at the item either way, so the item
closes at the below-column line and its closer never joins the body. What the
truncated item then holds is §10 I4's business, not this clause's: `a` opened a
paragraph, the fence that follows has no closer left inside the item, and I4
says such a fence does not interrupt - so the delimiter run is paragraph text.

This row is pinned because the executable spec's answer moves here too, and an
unpinned move is the drift this corpus exists to prevent. No engine was measured
on it - the ticket measured the marker-line spelling - so it is carried by the
engine tickets rather than presented as a cross-reader agreement.

::::: compare

````carve
- a
  ```
  b
 y
  ```
````

```html
<ul>
  <li>a
<code>
b</code></li>
</ul>
<p>y
<code></code></p>
```

:::::

## A below-column marker after a comment, where no paragraph is open

§24 C3's below-column branch says a dedented line "folds in as lazy item text".
That names an OPERATION, and lazy continuation continues an OPEN PARAGRAPH (§10
I2). A comment ends the paragraph and does NOT end the item - C3's comment
exception says both in the same breath - so after one there is nothing to fold
into, and the branch has no answer for a case it does not notice it is in
(markup-carve/carve#682).

The line is then classified in the context that survives. The item is still
open, so a MARKER sits at the item body's own column 0, where C4 Rule B opens a
list. carve-js, carve-rs and carve-php all answer this way; the executable spec
was the lone dissenter, because it read the comment fence's BODY as prose and
believed a paragraph was open.

::: compare

```carve
- a
  %%%
  x
  %%%
 - s
```

```html
<ul>
  <li>a
    <ul>
      <li>s</li>
    </ul>
  </li>
</ul>
```

:::

An ordered marker is the same row, and a separate case because the two marker
shapes are recognized by different productions:

::: compare

```carve
- a
  %%%
  x
  %%%
 1. o
```

```html
<ul>
  <li>a
    <ol>
      <li>o</li>
    </ol>
  </li>
</ul>
```

:::

A NON-marker line after the same comment fence is the other half of the clause:
it stays in the item too, beginning the item's SECOND paragraph rather than
continuing the first. ` # h` is not a heading below the content column, so it is
that paragraph's text - and all four readers already agreed here, which is why
only the marker shapes ever diverged:

::: compare

```carve
- a
  %%%
  x
  %%%
 # h
```

```html
<ul>
  <li>a
    # h
  </li>
</ul>
```

:::

CONTROL, and the one that shows this is the mechanism rather than a coincidence
about comments: with the paragraph still OPEN the fold is available and the
marker is lazy item text, as C3 says. Deleting the comment fence from the first
document inverts its answer.

::: compare

```carve
- a
  b
 - s
```

```html
<ul>
  <li>a
b
- s</li>
</ul>
```

:::

CONTROL. A BLOCK QUOTE leaves its own paragraph open, so the fold is available
there too and the marker folds into the quote - the same rule reaching a third
answer purely on whether a paragraph is open:

::: compare

```carve
- a
  > q
 - s
```

```html
<ul>
  <li>a
    <blockquote><p>q
- s</p></blockquote>
  </li>
</ul>
```

:::

## A list marker at the content column inside an open fence

A line that LOOKS like a list marker, sitting AT the item's content column
inside an open code fence, is CODE TEXT. PART 9 §24's STEP walk decides it with
no new rule, and neither of the two steps involved ever reads the line's first
character.

Take `  - x` with the stack `document > list > item(content_column 2) > code
fence body`:

- **S1 MATCH PREFIXES** consumes each container's prefix in turn. The line
  supplies the item's two columns, so the walk reaches the item; a fenced body
  demands no per-line prefix, so the walk reaches that too and stops there.
- **S2 FENCED BODY** therefore fires - the innermost MATCHED container IS the
  fenced body - and the line is verbatim content unless it matches that fence's
  where-guarded closer. "No other rule applies to L." A marker is never asked
  about.

The plain-text sibling is already pinned and already passes:
`276-a-fence-opened-on-a-list-marker-line-body-below-the-content-column-3` puts
`x` at this exact column and gets a code block holding `x`. The only difference
here is which character follows the indentation, and no step of the walk looks
at it. A reader that answers the two differently is recognizing a marker before
it has established that the line is markup at all.

::::: compare

````carve
- ```
  - x
  ```
````

```html
<ul>
  <li>
    <pre><code>- x
</code></pre>
  </li>
</ul>
```

:::::

The same rule with the fence opened after a BLANK line inside the item rather
than on the marker line. It is a SEPARATE row because readers reach the two
through different machinery - one continues the item from its marker line, the
other collects the item's content after a blank - so a fix applied to one is
invisible to the other. A single row would let half of this rule stay broken and
still read as done, which is the failure carve-php#1003 had to correct and the
reason the ruling on carve-php#1007 asked for both shapes at once.

The item stays TIGHT and `a` stays bare: PART 9 §17 L2 names fenced code among
the sub-blocks a blank line attaches WITHOUT loosening, and no second paragraph
ever appears here.
`164-tight-list-item-keeps-trailing-text-after-a-block-bare-3` is this same
opening plus a trailing paragraph, and that paragraph is what loosens it there.

::::: compare

````carve
- a

  ```
  - x
  ```
````

```html
<ul>
  <li>a
    <pre><code>- x
</code></pre>
  </li>
</ul>
```

:::::

Both rows are carried by the engine tickets rather than presented as a
cross-reader agreement. No engine answers both shapes this way today, and the
three do not fail on the same one, so a red engine corpus job against these two
is the measurement the engine work is made against rather than a regression.

## A boundary line inside an open fence does not end the container

PART 9 §17 L3 attaches ONE BLOCK of ANY kind, "up to the next blank line,
sibling marker, or a further `+`". That list bounds the ATTACHED BLOCK, and a
block's own extent is settled before the list is ever consulted: a fenced block
runs from its opener to its matching closer, so every line between the two is
INSIDE the one block L3 attached. A blank line there is not "the next blank
line" any more than the closer is "a sibling marker" - it is fence content, and
the boundary list never sees it.

The same holds one construct over, for a body collected by INDENTATION rather
than by a marker. §24 S1 MATCH PREFIXES places a line by the column it reaches
and never by its first character; §24 S2 FENCED BODY then makes the line
verbatim when the innermost matched container is a verbatim body; and §28 makes
a comment fence's body verbatim and invisible. None of the three asks what the
line looks like.

Seven rows, deliberately not one per cell. Each reaches a DIFFERENT collector,
and in every reader those collectors are separate loops that a fix to one leaves
untouched - which is the failure `carve-php#1003` had to correct and the reason
`278-a-list-marker-at-the-content-column-inside-an-open-fence` needed two rows
rather than one. Each of the three fence spellings appears, because the fence
kind is a real axis: a reader can survive a code fence and sever a colon fence
at the same boundary.

The seventh row arrived late, and why it did is worth recording. The list `+`
collector is the largest severing group of the whole class, and it was the one
cell this category could not pin, because the executable spec severed it too:
its `+`-attach extent helpers were spelled twice and only one of the two
consulted any fence state (`carve#982`). A checker is not an argument - THE
EXECUTABLE ARTIFACTS DECIDE NOTHING - but a row whose expectation nothing in the
repo could hold is not reviewable either. With the checker corrected against L3
the cell became committable, and it is committed here.

### A definition line inside an attached code fence

The worst of them, and the reason this category exists. `[^z]: zz` sits inside
an open code fence, so §24 S2 and §28 make it verbatim text: it defines nothing,
and §17 L3's boundary list does not name a definition line at ALL, so nothing
here ends the attached block early. The note body holds the whole fence.

The `+` attach into a footnote body is already pinned by
`66-footnote-with-multiple-blocks-2`; this row only says what a fence inside
that attached block does.

What the three readers do instead is worth stating, because it is not a near
miss: each of them ends the note body at the definition line, the fence is left
unterminated, and `b` escapes the note entirely to become the document's FIRST
block - printed ahead of the paragraph that references the note. A line of
verbatim code text moved a block from the end of the document to the beginning.

::::: compare

````carve
[^f]: n
+
```
a
[^z]: zz
b
```

see[^f]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <pre><code>a
[^z]: zz
b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::::

### A blank line inside the same fence

The boundary L3 DOES name, in the one position where it cannot apply. The blank
is between the fence's opener and its closer, so it is code text; the attached
block ends at the closer, as it did above.

Stated as its own row because the two are different predicates: one reader ends
the block on a definition line, the other on a blank, and a fix to either is
invisible to the other.

::::: compare

````carve
[^f]: n
+
```
a

b
```

see[^f]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n</p>
      <pre><code>a

b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::::

### The same blank, in a definition list's body

A third row for the same blank line because a `dd` is collected by a DIFFERENT
loop than a footnote body in every reader, and `carve-php#1003` is the
precedent for one row letting the other half stay broken and still read as done.
The `+` attach into a `dd` is pinned by `25-definition-lists-3`.

::::: compare

````carve
:: t
:  d
+
```
a

b
```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <pre><code>a

b
</code></pre>
  </dd>
</dl>
```

:::::

### A definition line inside an attached COLON fence, in a block quote

The same boundary, a different fence kind, and a different answer - which is
exactly why the fence kind is its own axis. A colon fence's body is NOT verbatim:
it holds blocks, so `[^z]: zz` really is a definition. §17 L6 collects it and
leaves NO TRACE where it was written, and the same clause has it INTERRUPT the
open paragraph, so `b` begins a new one rather than folding back into `a`.

Two paragraphs, therefore, where the control (the same document without the
definition line) has one. What no reading gives is a div that ENDS at the
definition line, which is the answer one reader produces.

::::: compare

```carve
> q
+
:::
a
[^z]: zz
b
:::
```

```html
<blockquote>
  <p>q</p>
  <div>
    <p>a</p>
    <p>b</p>
  </div>
</blockquote>
```

:::::

### A list marker at the body's column inside an item's colon fence

`- m` sits at the div body's own column zero, and the div body holds blocks, so
the question is not §24 S2 this time but §10 I2: LIST MARKERS NEVER INTERRUPT. A
marker line folds into the open paragraph as lazy continuation, and §10 I6
applies that to EVERY open paragraph, containers included. So the div holds one
paragraph of three lines and ends at its closer.

This is the row that separates the fence kinds most sharply. Put the same marker
inside a CODE fence at the same column and §24 S2 answers it instead, which is
`278-a-list-marker-at-the-content-column-inside-an-open-fence`. Two clauses,
two paths, one answer: the line is content. All three readers close the div at
the marker, open a real list, and leave a stray empty div behind at the end.

::::: compare

```carve
- x
  :::
  a
  - m
  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a
- m
b</p>
    </div>
  </li>
</ul>
```

:::::

### A blank line inside an item's comment fence

§28 makes a comment fence's body verbatim AND invisible, so the blank line, the
text around it and the closer are all inside the fence and none of them renders.
The item is left holding nothing visible, which is `<li></li>` -
`117-footnote-definition-inside-a-container-is-collected-2` and
`16-reference-link-4` already pin that shape for an item whose only content is
invisible.

The item also stays TIGHT: §17 L1 loosens on a blank-line-separated second
PARAGRAPH, and there is no paragraph here at all. A reader that lets this blank
line out of the fence gets the opposite of invisible - it prints the comment's
body as two paragraphs.

::::: compare

```carve
- %%%
  a

  b
  %%%
```

```html
<ul>
  <li></li>
</ul>
```

:::::

### The same blank, in a block attached to a LIST ITEM

The fourth collector for the one boundary, and the one that severs hardest. A
list item's `+` attach is a separate loop again - separate from the footnote
body, separate from the `dd`, separate from the block quote - so nothing the
other three `+` rows pin reaches it.

What severing costs here is not a rearranged block but a broken document. End
the attached block at the blank and the item keeps `a` alone, the closing fence
is never consumed, and that stray delimiter run opens an EMPTY inline code
element at document level: output that no reading of the source licenses, from
an input whose only unusual feature is a blank line in a code block. L3 gives
the whole fence to the item and leaves nothing at document level but `z`.

The item also stays TIGHT. §17 L1 loosens on a blank-line-separated second
PARAGRAPH; this blank is code text and there is no second paragraph, so it is
not the kind of blank L1 asks about.

::::: compare

````carve
- x
+
```
a

b
```

z
````

```html
<ul>
  <li>x
    <pre><code>a

b
</code></pre>
  </li>
</ul>
<p>z</p>
```

:::::

### A blank line inside an item's INDENTED comment fence, with lead text

The sixth row above is the same fence with the same interior blank, and it
passes everywhere. The difference is one word. There the fence opens ON the
marker line, so the item holds nothing visible at all and there is no paragraph
for looseness to wrap - the tight and the loose answer coincide, and the row
cannot see this cell. Put `x` on the marker line and the two answers separate
(carve#985).

§28 makes a comment fence's body verbatim AND invisible, so the blank line, the
text around it and the closer are all fence content and none of them renders.
§17 L1 loosens an item on a blank-line-separated second PARAGRAPH, and this item
has no second paragraph anywhere: L1b says outright that a line rendering
nothing "is not a paragraph, which is why it cannot BE the second one". The item
is tight, and the document renders exactly one visible thing.

This reaches a collector none of the seven rows above touches. Those pin the
extent of the ONE block a `+` attaches (§17 L3); this is the item collector's
OWN blank-line decision, a separate reader of separate state, and a fix to the
first leaves it untouched.

::::: compare

```carve
- x
  %%%
  a

  b
  %%%
```

```html
<ul>
  <li>x</li>
</ul>
```

:::::

### The same item, with the blank line OUTSIDE the fence

The control the row above needs. Same item, same fence, same lead text; the
blank line has moved past the closer, where it separates two paragraphs of the
ITEM and §17 L1 does loosen.

Without this document the row above is satisfied by a reader that simply stops
loosening whenever a comment fence appears in an item, which is not the rule and
would be a second defect wearing the first one's answer. The two documents
differ only in which side of the closer the blank line sits on, and they must
answer differently.

::::: compare

```carve
- x
  %%%
  a
  %%%

  b
```

```html
<ul>
  <li><p>x</p>
    <p>b</p>
  </li>
</ul>
```

:::::

### A blank line inside an item's indented colon fence, with lead text

The same collector, the other fence kind, and the kind is a real axis here as it
is above: a colon fence's body is NOT verbatim, so this blank line is not
invisible the way the comment fence's was. It genuinely separates two paragraphs
- of the DIV.

What it does not do is give the ITEM a second paragraph. §17 L1 asks for a
blank-line-separated second paragraph of the item, and the div is ONE block, so
the item stays tight and keeps `x` unwrapped. Both answers are visible in the
one output: loose inside the div, tight outside it, from a single blank line. A
reader that lets that blank reach the item's looseness scan gets `<p>x</p>` and
an otherwise identical div.

::::: compare

```carve
- x
  :::
  a

  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a</p>
      <p>b</p>
    </div>
  </li>
</ul>
```

:::::

### The same item, with the blank line OUTSIDE the colon fence

The control for the colon spelling, and it is not redundant with the comment
one: the two rows are the two branches of the same tracker, and a reader can
carry one kind and miss the other, which is exactly the shape this whole
category keeps finding.

Here the blank follows the closer, so the div is one block and `b` is a second
paragraph of the item. The item is loose, and the div's own body - `a` alone,
with no interior blank - is a single paragraph.

::::: compare

```carve
- x
  :::
  a
  :::

  b
```

```html
<ul>
  <li><p>x</p>
    <div>
      <p>a</p>
    </div>
    <p>b</p>
  </li>
</ul>
```

:::::

The first seven rows were carried by `markup-carve/carve-js#884`,
`markup-carve/carve-php#1049` and `markup-carve/carve-rs#802` rather than
presented as a cross-reader agreement, because no engine answered the class
when they landed. All three engine tickets are closed now. The last four arrive
the same way, from `markup-carve/carve#985`, and the pinned reference build is
knowingly behind on the two that pin a defect - declared in
`resources/engine-pin-drift.txt` rather than tolerated.

## A container a lazy line folded into is still open

PART 1 S4's lazy branch ends "and NOTHING closes". That binds the lines AFTER
the folded one as much as the folded one itself: a line that comes back to the
container's content column is still that container's content, because nothing
in the stack was ever closed (markup-carve/carve#980).

Every document already pinned for this rule put the flush-left line LAST -
`270-a-real-div-in-a-container-and-the-flush-left-line-after-it` does, and so
does the block-quote category beside it. That spelling cannot tell a reader
that folds and stays open from one that folds and then closes, so the rows
below put a line after the fold, which is the only place the two differ.

::::: compare

```carve
- x
  :::
  a
d
  b
  :::
```

```html
<ul>
  <li>x
    <div>
      <p>a
d
b</p>
    </div>
  </li>
</ul>
```

:::::

Leaving the div unterminated does not change it. The fold and the reach are
the same rule either way, and the closer only matters to a line that arrives
after it:

::::: compare

```carve
- x
  :::
  a
d
  b
```

```html
<ul>
  <li>x
    <div>
      <p>a
d
b</p>
    </div>
  </li>
</ul>
```

:::::

THE CONTAINER KIND IS NOT A PARAMETER, here as in §24's clause. A block quote
inside the item folds and stays open the same way, and its `> ` prefix on the
line after the fold reaches the same quote rather than a second one:

::::: compare

```carve
- x
  > a
d
  > b
```

```html
<ul>
  <li>x
    <blockquote><p>a
d
b</p></blockquote>
  </li>
</ul>
```

:::::

The same quote written on the item's MARKER line is a third row, because a
marker-line container is collected through a different path:

::::: compare

```carve
- > a
d
  > b
```

```html
<ul>
  <li>
    <blockquote><p>a
d
b</p></blockquote>
  </li>
</ul>
```

:::::

CONTROL, and the sharp one. When NOTHING in the stack holds an open paragraph
the line still ENDS the container, and the line after it is outside too. An
empty `::: note` has no paragraph, and the item's own paragraph was closed by
the div opener, so both `d` and `b` are one top-level paragraph. This is the
answer that must not move when the rule above is implemented: a reader that
keeps the container open here has replaced one over-reach with another.

::::: compare

```carve
- x
  ::: note
d
  b
```

```html
<ul>
  <li>x
    <aside class="admonition note">

    </aside>
  </li>
</ul>
<p>d
b</p>
```

:::::

## A caption attaches across one blank line

PART 9 §4 gives one rule for all five captionable hosts: adjacent OR exactly one
blank line attaches, two blank lines detach and leave the `^ ` line an ordinary
paragraph. WHERE that rule is written down differs, and that is the whole reason
this category exists. For the fenced code block, the block quote and the table it
is STRUCTURAL - each production ends in `[caption_slot]`, and that slot's single
optional `blank_line` IS the allowance. For the IMAGE PARAGRAPH and the
STANDALONE DISPLAY-MATH BLOCK it is PROSE, because neither has a production to
hang the slot on: both ARE a `paragraph`, and what distinguishes them is a
condition on that paragraph's inline content (carve#991, carve#992).

One rule, two spellings, and the corpus could tell them apart only for one host.
Of the twenty documents carrying a `^ ` caption line, exactly ONE separated the
host from its caption with a blank line - `55-blockquote-caption-after-a-blank-line`
- and blockquote is one of the three hosts that has the slot. The allowance was
unpinned for the other four, and for the two prose hosts it was unpinned
structurally as well. A reader could have dropped the blank-line form on four of
five hosts and stayed green.

Four rows below pin it, one per remaining host. Each is preceded by the SAME
document with the blank line taken out, which must render identically: that is
the actual claim - not that a caption attaches, which is already pinned all over
the corpus, but that these two spellings are ONE rule and produce one answer. The
adjacent members are controls. They are unaffected by any mutation of the
allowance, and they are here so a row cannot be satisfied by a reader that has
stopped attaching captions altogether.

### A table caption, adjacent

The control for the row below. `09-tables` already pins this shape; it is
repeated here so the pair reads as a pair and the two documents differ by exactly
one line.

::::: compare

```carve
|= Fruit |= Price |
| Apple  | $1     |
^ Fruit prices
```

```html
<table>
  <caption>Fruit prices</caption>
  <thead><tr><th scope="col">Fruit</th><th scope="col">Price</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td>$1</td></tr>
  </tbody>
</table>
```

:::::

### A table caption, after one blank line

`table` ends in `[caption_slot]`, so this is the structural spelling. Byte for
byte the same output as the row above.

::::: compare

```carve
|= Fruit |= Price |
| Apple  | $1     |

^ Fruit prices
```

```html
<table>
  <caption>Fruit prices</caption>
  <thead><tr><th scope="col">Fruit</th><th scope="col">Price</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td>$1</td></tr>
  </tbody>
</table>
```

:::::

### A code block caption, adjacent

The control. A captioned code block is a numbered LISTING (§4), and the
`<figure>` wrapper is what carries the caption.

::::: compare

````carve
```python
def greet():
    return 1
```
^ Listing: a greeting
````

```html
<figure>
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing: a greeting</figcaption>
</figure>
```

:::::

### A code block caption, after one blank line

The second structural host. The blank line sits between the fence's CLOSER and
the caption, which is the position `caption_slot`'s optional `blank_line`
describes: `fenced_code_block` ends at a newline, so there is no competing
optional for the blank to be consumed by.

::::: compare

````carve
```python
def greet():
    return 1
```

^ Listing: a greeting
````

```html
<figure>
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing: a greeting</figcaption>
</figure>
```

:::::

### An image caption, adjacent

The control. `08-image-with-caption` pins this shape too; the pair is repeated
here for the same reason the table pair is.

::::: compare

```carve
![Apollo 11](apollo.jpg)
^ Figure 1: First moon landing
```

```html
<figure>
  <img src="apollo.jpg" alt="Apollo 11">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::::

### An image caption, after one blank line

The first of the two PROSE hosts, and the one an author reaches for most often.
There is no `image_paragraph` production and no slot: §4 is the rule, and PART 3
says beside `image` that "there is no separate grammar production for the pair".

So this row is the only thing that holds the allowance for this host. Nothing
structural does.

::::: compare

```carve
![Apollo 11](apollo.jpg)

^ Figure 1: First moon landing
```

```html
<figure>
  <img src="apollo.jpg" alt="Apollo 11">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::::

### A display-math caption, adjacent

The control. A captioned standalone display-math block is a numbered EQUATION
(§4); the block must be solely the `$$`…`` span.

::::: compare

```carve
$$`E = mc^2`
^ Equation: mass-energy
```

```html
<figure>
  <p><span class="math display">\[E = mc^2\]</span></p>
  <figcaption>Equation: mass-energy</figcaption>
</figure>
```

:::::

### A display-math caption, after one blank line

The second PROSE host, and the same argument as the image paragraph: this block
IS a `paragraph`, distinguished by a condition on its inline content, so no slot
can be hung on it without making every paragraph captionable. §4 is the rule and
this row is the pin.

::::: compare

```carve
$$`E = mc^2`

^ Equation: mass-energy
```

```html
<figure>
  <p><span class="math display">\[E = mc^2\]</span></p>
  <figcaption>Equation: mass-energy</figcaption>
</figure>
```

:::::

Nothing here is new behavior. Every one of these eight documents is what
carve-js already produced when the drift audit measured the five hosts across
three separations, which is what makes them committable as a pin rather than a
proposal.

## Two blank lines detach a caption

PART 9 §4 states the caption allowance in two halves: adjacent or exactly ONE
blank line attaches, and anything wider does not. `caption_slot`'s single
optional `blank_line` IS that allowance, and the word that carries the second
half is `[...]` rather than `{...}` - one blank line at most, not a run.

The first half is pinned. `281-a-caption-attaches-across-one-blank-line` put a
one-blank-line document on every host, and removing the optional `blank_line`
from `caption_slot` now breaks five documents where it broke one before.

The second half was pinned nowhere, for any host. Widening `caption_slot` to

```
caption_slot = {blank_line}, caption ;
```

so that ANY number of blank lines attaches broke NOTHING in 856 documents. Every
captioned document in the corpus had zero or one blank line between the host and
the `^ ` line, so not one of them could tell "at most one" apart from "any
number". A reader that attached a caption across three blank lines, or ten,
satisfied every document and every gate in this repository (carve#997).

That is the same shape as the control recorded at
`279-a-boundary-line-inside-an-open-fence-does-not-end-the-container-6`: a
document that passes for a reason unrelated to the rule it looks like it covers.

Five rows below pin the second half, one per captionable host. Each is preceded
by the SAME document with one blank line instead of two, which must attach. That
pairing is the point rather than decoration: a row that only proves detachment at
two blank lines is equally satisfied by a reader that stopped attaching captions
across a blank line at all, which is the opposite defect. The one-blank-line
members are CONTROLS - the widening mutation does not touch them, and the
complementary mutation touches only them.

What detachment looks like is worth stating once, because it is the same on all
five hosts: the host renders UNCAPTIONED - a bare `<table>`, `<pre>`,
`<blockquote>`, `<img>` or math paragraph with no `<figure>` around it - and the
`^ ` line becomes an ordinary paragraph whose text begins with a literal caret.
Nothing is dropped and nothing is an error; the two blocks simply stop being one.

### A table caption, after one blank line

The control for the row below. `table` ends in `[caption_slot]`, so the
attachment here is structural.

::::: compare

```carve
|= City |= People |
| Oslo  | 700k   |

^ Table: city sizes
```

```html
<table>
  <caption>Table: city sizes</caption>
  <thead><tr><th scope="col">City</th><th scope="col">People</th></tr></thead>
  <tbody>
    <tr><td>Oslo</td><td>700k</td></tr>
  </tbody>
</table>
```

:::::

### A table caption, after two blank lines

One line more than the control. The table keeps its rows and loses its
`<caption>`; the `^ ` line is a paragraph.

::::: compare

```carve
|= City |= People |
| Oslo  | 700k   |


^ Table: city sizes
```

```html
<table>
  <thead><tr><th scope="col">City</th><th scope="col">People</th></tr></thead>
  <tbody>
    <tr><td>Oslo</td><td>700k</td></tr>
  </tbody>
</table>
<p>^ Table: city sizes</p>
```

:::::

### A code block caption, after one blank line

The control. A captioned code block is a numbered LISTING (§4) and the `<figure>`
wrapper is what carries the caption.

::::: compare

````carve
```lua
local n = 1
```

^ Listing: a local
````

```html
<figure>
  <pre><code class="language-lua">local n = 1
</code></pre>
  <figcaption>Listing: a local</figcaption>
</figure>
```

:::::

### A code block caption, after two blank lines

The `<figure>` goes with the attachment. What is left is the plain `<pre>` a
fenced block renders on its own, and a paragraph.

::::: compare

````carve
```lua
local n = 1
```


^ Listing: a local
````

```html
<pre><code class="language-lua">local n = 1
</code></pre>
<p>^ Listing: a local</p>
```

:::::

### A blockquote caption, after one blank line

The control. This is the host the corpus could already see: `blockquote` ends in
`[caption_slot]` and `55-blockquote-caption-after-a-blank-line` has pinned the
one-blank-line form since long before this category existed.

::::: compare

```carve
> the cited line

^ Source: the cited work
```

```html
<figure>
  <blockquote><p>the cited line</p></blockquote>
  <figcaption>Source: the cited work</figcaption>
</figure>
```

:::::

### A blockquote caption, after two blank lines

Detached, the quote is an ordinary `<blockquote>` with no `<figure>` and no
`<figcaption>`.

::::: compare

```carve
> the cited line


^ Source: the cited work
```

```html
<blockquote><p>the cited line</p></blockquote>
<p>^ Source: the cited work</p>
```

:::::

### An image caption, after one blank line

The control, and the first of the two PROSE hosts. There is no `image_paragraph`
production and no slot to widen or narrow: the block IS a `paragraph`, and what
makes it captionable is a condition on its inline content (carve#992). §4 is the
whole rule, so a corpus row is the only thing that can hold either half of it.

::::: compare

```carve
![Ganymede](ganymede.jpg)

^ Figure: the largest moon
```

```html
<figure>
  <img src="ganymede.jpg" alt="Ganymede">
  <figcaption>Figure: the largest moon</figcaption>
</figure>
```

:::::

### An image caption, after two blank lines

Without the caption there is no `<figure>`, and an image-only paragraph renders
as the bare `<img>` at block level.

::::: compare

```carve
![Ganymede](ganymede.jpg)


^ Figure: the largest moon
```

```html
<img src="ganymede.jpg" alt="Ganymede">
<p>^ Figure: the largest moon</p>
```

:::::

### A display-math caption, after one blank line

The control, and the second PROSE host. A captioned standalone display-math block
is a numbered EQUATION (§4); the block must be solely the `$$`-prefixed span.

::::: compare

```carve
$$`a + b = c`

^ Equation: the sum
```

```html
<figure>
  <p><span class="math display">\[a + b = c\]</span></p>
  <figcaption>Equation: the sum</figcaption>
</figure>
```

:::::

### A display-math caption, after two blank lines

Detached, the math block is the ordinary paragraph it always was, and the caption
is a second one.

::::: compare

```carve
$$`a + b = c`


^ Equation: the sum
```

```html
<p><span class="math display">\[a + b = c\]</span></p>
<p>^ Equation: the sum</p>
```

:::::

None of this is new behavior. All ten documents were measured against carve-js,
carve-php and carve-rs before they were written down, and all three produce these
bytes on all ten, so the category pins existing behavior rather than proposing
any.

One thing the rows do not prove, and should not be read as proving: the five
hosts are five SPELLINGS of the rule, not five independent implementations of it.
The image paragraph and the display-math block share one decision site in the
executable spec, because both are the same `paragraph` with a different condition
on their content. Both rows still belong - a change to either condition would
move one and not the other - but a mutation of the shared site kills them
together, and the five-host count is a count of hosts, not of code paths.

## An empty footnote body is written with the `{empty}` sentinel

"Footnote definition requires an inline body" above is a PARSE rule, and it leaves the canonical writer a problem: a footnote definition whose body holds no blocks cannot be written back as a bare `[^label]:`, because that line is not a definition - so the definition **and** every reference to it would come back as literal text. PART 11 §7b answers it. The writer emits the sentinel attribute block `{empty}`, which the definition line consumes as attributes and discards, leaving the body empty and the reference resolved.

`{ }` and `{}` do **not** work in this position, and they are the first two spellings a reader reaches for: a block-attribute line requires at least one attribute, so neither run is an attribute block here and both stay literal text inside the note.

::: compare

```carve
See[^f]

[^f]: {empty}
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A ragged table keeps each row's cell count

Cell count is content, not source padding. The canonical writer can align the
cells a row carries, but it does not append empty cells to make the table
rectangular. A missing trailing cell and an authored empty cell render as
different table structures.

::: compare

```carve
| ~x~ |
| a | b |
```

```html
<table>
  <tbody>
    <tr><td><s>x</s></td></tr>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

The same rule applies when the first row is a header. A short body row stays
short, and the canonical native `=` spelling does not need a delimiter row.

::: compare

```carve
| |x |
|---|
| y |
```

```html
<table>
  <thead><tr><th scope="col"></th><th scope="col">x</th></tr></thead>
  <tbody>
    <tr><td>y</td></tr>
  </tbody>
</table>
```

:::

A header row may itself be shorter than a later body row. Its native markers
still preserve it as a header without manufacturing another header cell.

::: compare

```carve
| h |
|---|
| |x |
```

```html
<table>
  <thead><tr><th scope="col">h</th></tr></thead>
  <tbody>
    <tr><td></td><td>x</td></tr>
  </tbody>
</table>
```

:::

## Adjacent block openers in an attached run stay separate

Two adjacent blocks can each be valid at a list item's content column and still
be invalid as a sequence there. Adjacent quote lines become one quote, so the
canonical writer keeps the continuation marker on both attached quotes.

::: compare

```carve
- x
+
> q
+
> q
```

```html
<ul>
  <li>x
    <blockquote><p>q</p></blockquote>
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

Tables have the same sequence rule. Without the second boundary, the next
header row becomes part of the first table's body.

::: compare

```carve
- x
+
| a |
|---|
| b |
+
| a |
|---|
| b |
```

```html
<ul>
  <li>x
    <table>
      <thead><tr><th scope="col">a</th></tr></thead>
      <tbody>
        <tr><td>b</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th scope="col">a</th></tr></thead>
      <tbody>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

## A caret line does not end a paragraph it cannot caption

PART 9 §10 I1 enumerates the lines that interrupt an open paragraph: a heading, a
thematic break, a block quote, a valid table row, a guarded fence opener and a
`:::` opener. I5 adds the invisible ones - a reference definition, a comment, a
block-attribute line. A `^ ` caption line is in neither list, so it does not
interrupt. What ends a paragraph at a caret is §4, and §4 reaches exactly five
captionable hosts; for the two it spells in prose that means a paragraph whose
WHOLE content is one image or one display-math span. Everywhere else the `^ `
line is ordinary paragraph text and folds in, caret and all.

`158-indented-image-and-caption-stay-literal` pins the INDENTED spelling, where
both readings agree because an indented line opens no top-level block at all. The
flush-left spelling was pinned nowhere, and the two readers in this repository
answered it differently: every engine folded the line in, the executable spec
ended the paragraph and opened a second one. Nothing failed while the canonical
writer force-escaped a line-initial caret. When that escape came off, the writer
was right and `oracle(fmt(x))` parted from `oracle(x)` on a document all three
engines agreed about (carve#1046).

A caret line after ordinary prose.

::: compare

```carve
Text
^ Figure 1: moon
```

```html
<p>Text
^ Figure 1: moon</p>
```

:::

A caret line after a paragraph that merely CONTAINS an image. The image is not
the whole paragraph, so no §4 host is present and the caret folds in behind it.

::: compare

```carve
Text
![Apollo](a.jpg)
^ Figure 1: moon
```

```html
<p>Text
<img src="a.jpg" alt="Apollo">
^ Figure 1: moon</p>
```

:::

§10 I6 applies the relation to every open paragraph, including one inside a
container, so a quoted caret line folds the same way.

::: compare

```carve
> Text
> ^ Figure 1: moon
```

```html
<blockquote><p>Text
^ Figure 1: moon</p></blockquote>
```

:::

Control - when the paragraph IS the image, §4 attaches and the pair is a figure.
`158-indented-image-and-caption-stay-literal-3` already pins this shape; it is
repeated here because the rule above is only half a claim without it. The
mutation that folds every caret line in leaves this row untouched, and a reader
that stopped attaching captions altogether - the opposite defect - fails here
and passes everything else in the section.

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
## A column-zero definition ends an open list item

Column zero is the surrounding document's opener column. A link or footnote
definition there interrupts and closes the item, registers as document
metadata, and leaves the following block at document level. Only a nonzero
column below the item content column reaches no definition opener and folds as
literal text. At the content column the definition belongs to the item, as
category 228 pins. A comment remains the explicit exception: its invisibility
is accepted independently of column and does not itself close the item.

::: compare

```carve
1. x
[t](u)
_u_
[r]: /u
[t][r]
\#
```

```html
<ol>
  <li>x
<a href="u">t</a>
<u>u</u></li>
</ol>
<p><a href="/u">t</a>
#</p>
```

:::

::: compare

```carve
- a
[^f]: note
after[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>after<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
1. x
 [r]: /u
```

```html
<ol>
  <li>x
[r]: /u</li>
</ol>
```

:::

::: compare

```carve
1. x
   [r]: /u
   [t][r]
```

```html
<ol>
  <li>x
    <a href="/u">t</a>
  </li>
</ol>
```

:::
## Heading-index plain text covers visible leaves and rejects an empty key

The heading index uses the same rendered-plain-text projection on both sides.
Autolink display text and image alternative text are visible leaves and remain;
symbols and footnote references are the named exclusions. Resolving the outer
link does not flatten a parsed non-link tag span. When all content is excluded,
the heading still receives the fallback id `s`, but no empty index key exists.

::: compare

```carve
# a <https://e.com> b

[a <https://e.com> b][]
```

```html
<section id="a-https-e-com-b">
  <h1>a <a href="https://e.com">https://e.com</a> b</h1>
  <p><a href="#a-https-e-com-b">a https://e.com b</a></p>
</section>
```

:::

::: compare

```carve
# a ![alt](/i.png) b

[a ![alt](/i.png) b][]
```

```html
<section id="a-alt-b">
  <h1>a <img src="/i.png" alt="alt"> b</h1>
  <p><a href="#a-alt-b">a <img src="/i.png" alt="alt"> b</a></p>
</section>
```

:::

::: compare

```carve
# a &#65; b

[a &#65; b][]
```

```html
<section id="a-65-b">
  <h1>a &amp;<span class="tag"><strong>#65</strong></span>; b</h1>
  <p><a href="#a-65-b">a &amp;<span class="tag"><strong>#65</strong></span>; b</a></p>
</section>
```

:::

::: compare

```carve
# :smile:

[:smile:][]
```

```html
<section id="s">
  <h1>:smile:</h1>
  <p>[:smile:][]</p>
</section>
```

:::

## A structural attribute leads the author's own

`type` and `start` are fixed by the first item's marker, so they belong to the
element's shape rather than to what the author wrote in an attribute block.
They are emitted first, and the author's attributes keep their source order
after them (PART 11 §5.1). Nothing pinned this before, and the two readings of
it split the engines (`markup-carve/carve#1090`).

::: compare

```carve
{k=v .attr}
a. alpha
```

```html
<ol type="a" k="v" class="attr">
  <li>alpha</li>
</ol>
```

:::

A decimal marker emits no `type`, so there is nothing to lead and the author's
attributes stand alone. This is the control: it agreed in every engine already,
and it fails only if a change moves authored attributes rather than ordering
the structural one.

::: compare

```carve
{.attr}
1. one
```

```html
<ol class="attr">
  <li>one</li>
</ol>
```

:::

## Adjacent sibling lists survive the round trip

Two lists the parser reads as siblings must still read as two after `fmt`.
Nothing separates them but indentation once their markers match, so the writer
keeps one space more on each list than the one before it (PART 11 §1;
`markup-carve/carve#1088`).

::: compare

```carve
1. a

 1. b
```

```html
<ol>
  <li>a</li>
</ol>
<ol>
  <li>b</li>
</ol>
```

:::

A third list steps again rather than repeating the first offset, which would
put it back in the second list's column.

::: compare

```carve
1. a

 1. b

  1. c
```

```html
<ol>
  <li>a</li>
</ol>
<ol>
  <li>b</li>
</ol>
<ol>
  <li>c</li>
</ol>
```

:::

Where the marker already separates them nothing is owed, and the control is
that this pair renders the same way with no indentation at all.

::: compare

```carve
- a

* b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::

## A fence keeps the blank line at the end of its content

A blank line inside a fence is content, and the last one is content too. That
holds wherever the fence ends: at its own closer, at the end of a container, or
at the end of the document.

Nothing pinned this before, and all three engines lost the blank independently -
each by a different mechanism, and each only on some of the shapes below
(markup-carve/carve-js#988, markup-carve/carve-php#1177,
markup-carve/carve-rs#908).

::: compare

````carve
```
x

```
````

````html
<pre><code>x

</code></pre>
````

:::

An unterminated fence runs to the end of the document, and the blank before that
end is still its content.

::: compare

````carve
```
x

````

````html
<pre><code>x

</code></pre>
````

:::

A container's closer ends the fence the same way its own closer would.

:::: compare

````carve
::: note
```
x

:::
````

````html
<aside class="admonition note">
  <pre><code>x

</code></pre>
</aside>
````

::::

So does the end of a list item.

::: compare

````carve
- ```
  x

````

````html
<ul>
  <li>
    <pre><code>x

</code></pre>
  </li>
</ul>
````

:::

## A boolean and a key/value of the same name are one attribute

A boolean and a `key=value` of the SAME name are one attribute, not two. A
boolean is a key/value whose value is empty (PART 4), so it takes that name's
slot and the repeated key keeps the LAST value at the FIRST position - the same
rule any repeated key follows. Emitting both would produce two HTML attributes
with one name, which is not valid HTML.

::: compare

```carve
[x]{a=1 a}
```

```html
<p><span a="">x</span></p>
```

:::

Order decides which value survives, not which spelling:

::: compare

```carve
[x]{a a=2}
```

```html
<p><span a="2">x</span></p>
```

:::

The slot is the FIRST appearance of the name, so an unrelated attribute written
between them keeps its own place:

::: compare

```carve
[x]{a .c a=2}
```

```html
<p><span a="2" class="c">x</span></p>
```

:::

## A semantic name renames the span, and the leftovers ride the element

An authored `[content]{attrs}` span renders its `<span>` element whether or not
any attribute reaches the output - hardening removes attributes, never the
element the author wrote. A semantic name is not an attribute that was removed:
it never reaches the output as one. It renames the element (PART 9 §9), so the
span does not survive as a wrapper and every remaining attribute lands on the
outermost semantic element.

::: compare

```carve
[x]{}
```

```html
<p><span>x</span></p>
```

:::

::: compare

```carve
[x]{onclick="steal()"}
```

```html
<p><span>x</span></p>
```

:::

::: compare

```carve
[x]{kbd onclick="steal()"}
```

```html
<p><kbd>x</kbd></p>
```

:::

::: compare

```carve
[x]{kbd}
```

```html
<p><kbd>x</kbd></p>
```

:::

## A language attribute is exact sugar for lang

`{:TAG}` sets the natural language of the content it attaches to. It is sugar
for `lang=TAG` and nothing else: the attribute reaching the AST, the merge, and
the HTML are the ones the long form already produced (`language_attribute` in
`resources/grammar.ebnf`, `markup-carve/carve#1114`).

::: compare

```carve
The title is [Le Bon Usage]{:fr}.
```

```html
<p>The title is <span lang="fr">Le Bon Usage</span>.</p>
```

:::

A tag is structure, not a registry lookup: any hyphen-separated run of ASCII
alphanumeric subtags of one to eight characters parses, so script and region
subtags, private use and grandfathered tags all reach `lang` unchanged and with
their case intact.

::: compare

```carve
[a]{:de-CH} [b]{:sr-Latn-RS} [c]{:x-acme} [d]{:i-klingon}
```

```html
<p><span lang="de-CH">a</span> <span lang="sr-Latn-RS">b</span> <span lang="x-acme">c</span> <span lang="i-klingon">d</span></p>
```

:::

The empty form declares the language explicitly unknown. That is not the same
as leaving the attribute off: `lang=""` stops the content inheriting the
language of whatever surrounds it.

::: compare

```carve
{:de}
> Der Titel ist [unbekannt]{:}.
```

```html
<blockquote lang="de"><p>Der Titel ist <span lang="">unbekannt</span>.</p></blockquote>
```

:::

It takes its place in source order among the other attribute kinds.

::: compare

```carve
[x]{#quote :fr .formal title=bonjour}
```

```html
<p><span id="quote" lang="fr" class="formal" title="bonjour">x</span></p>
```

:::

A block attribute line carries it as well.

::: compare

```carve
{:grc}
Μῆνιν ἄειδε θεά
```

```html
<p lang="grc">Μῆνιν ἄειδε θεά</p>
```

:::

## A malformed language tag leaves the whole block literal

The envelope is checked while parsing, so a candidate that misses it is not a
half-consumed attribute: the block fails and the braces stay in the text, which
is what a malformed attribute block does everywhere else (PART 9 §14). An
underscore, an empty subtag, a leading or trailing hyphen and a non-ASCII
letter each fail it.

::: compare

```carve
[a]{:en_US} [b]{:-en} [c]{:en-} [d]{:français}
```

```html
<p>[a]{:en_US} [b]{:-en} [c]{:en-} [d]{:français}</p>
```

:::

A subtag runs to eight characters. The ninth has nothing to match, so the block
fails there rather than truncating the tag.

::: compare

```carve
[a]{:abcdefgh} [b]{:abcdefghi}
```

```html
<p><span lang="abcdefgh">a</span> [b]{:abcdefghi}</p>
```

:::

The deferred braced-symbol spelling keeps its slot: a trailing `:` is not a
subtag character, so `{:name:}` stays literal under this production
(`docs/dismissed-syntax.md`).

::: compare

```carve
[x]{:tada:}
```

```html
<p>[x]{:tada:}</p>
```

:::

An attribute NAME still admits no colon, so a namespaced spelling stays literal
too - the language sigil leads its attribute, it does not appear inside one.

::: compare

```carve
[x]{xml:lang=en}
```

```html
<p>[x]{xml:lang=en}</p>
```

:::

## A language attribute and lang are one key

`{:TAG}` desugars before any merge runs, so writing it beside `lang=TAG` is a
repeated key and follows the rule every repeated key follows: the last value
wins and the slot stays where the key first appeared (§15 - accumulation).
There is no precedence between the two spellings; only their order matters.

::: compare

```carve
[a]{:fr lang=de} [b]{lang=de :fr}
```

```html
<p><span lang="de">a</span> <span lang="fr">b</span></p>
```

:::

The surviving value lands in the slot the FIRST of the two opened, which is
what makes the shorthand invisible to the serializer.

::: compare

```carve
[x]{k=1 :fr lang=de title=t}
```

```html
<p><span k="1" lang="de" title="t">x</span></p>
```

:::

Two shorthands collide the same way.

::: compare

```carve
[x]{:fr :de}
```

```html
<p><span lang="de">x</span></p>
```

:::

Across accumulated block-attribute lines the answer is the same, because the
desugaring happens before that merge too.

::: compare

```carve
{:fr}
{lang=de}
Text
```

```html
<p lang="de">Text</p>
```

:::

An UPPERCASE key is a different key. Attribute names are case-sensitive
(PART 11 §1), so `LANG` is an ordinary attribute that happens to spell a
reserved name differently - the same way `{KBD}` is not the semantic span
`{kbd}` (PART 9 §10). Only the exact lowercase `lang` is the language
attribute's other spelling.

::: compare

```carve
[a]{LANG=fr} [b]{lang=fr}
```

```html
<p><span LANG="fr">a</span> <span lang="fr">b</span></p>
```

:::

This pair is what the round-trip check needs to be able to fail. It compares
`toHtml(fmt(x))` against `toHtml(x)` over every document, and a writer that
folded the key case would rewrite `[a]{LANG=fr}` to `[a]{:fr}` and render
`lang="fr"` where the source asked for `LANG="fr"`. Every other corpus
document writes its attribute names in lower case, so the check could not
see it (carve#1137).

## The language sigil takes no padding

A space after `:` does not belong to the language attribute. The TAG is
optional, the separator is not, so `{: fr}` is the empty language attribute
followed by a SEPARATE boolean `fr` - not a language attribute reading `fr`,
and not a failed block. It follows from `':', [ language_tag ]` with no special
case, and the cost falls on a typo rather than on anything written
deliberately.

::: compare

```carve
[x]{: fr}
```

```html
<p><span lang="" fr="">x</span></p>
```

:::

The same source without the space is the ordinary form, which is the control:
the two differ by one character and by one attribute.

::: compare

```carve
[x]{:fr}
```

```html
<p><span lang="fr">x</span></p>
```

:::

## A boolean lang is the third spelling of the same key

`{lang}` means `lang=""` under PART 4's boolean rule, so the key has three
spellings - `:TAG`, `lang=TAG` and the bare name - and all three land in one
slot with the last value winning. This was stated in the grammar and pinned
nowhere until `markup-carve/carve#1125` made the executable spec merge a
boolean with a key/value of the same name.

::: compare

```carve
[a]{:fr lang} [b]{lang :fr}
```

```html
<p><span lang="">a</span> <span lang="fr">b</span></p>
```

:::

The bare name on its own is the empty language attribute written the long way,
so it declares the language unknown exactly as `{:}` does.

::: compare

```carve
[x]{lang}
```

```html
<p><span lang="">x</span></p>
```

:::

## The semantic registry holds no element Carve already spells

`abbr`, `time`, `samp`, `var`, `kbd`, `cite` and `dfn` render as their same-named
HTML element, in the `:name[…]` form and as a compact span attribute. A name is
admitted only where the language has no other spelling for that element, so
`code` and `mark` are NOT in the registry (PART 9 §9): a code span already writes
`<code>` and the highlight syntax already writes `<mark>`. The inline literal
beside them writes neither - it drops the wrapper, which is what it is for.

::: compare

```carve
`x` !`x` =x=
```

```html
<p><code>x</code> x <mark>x</mark></p>
```

:::

Both are ordinary extension names instead, and take the generic fallback.

::: compare

```carve
:code[*b*] :mark[*b*]
```

```html
<p><span class="ext-code"><strong>b</strong></span> <span class="ext-mark"><strong>b</strong></span></p>
```

:::

As compact span attributes they are ordinary booleans, and land on the outer span
beside whatever else the author wrote.

::: compare

```carve
[*b*]{code} [*b*]{mark}
```

```html
<p><span code=""><strong>b</strong></span> <span mark=""><strong>b</strong></span></p>
```

:::

`code` is the name that showed why one spelling per element is a rule and not a
preference: a code span is verbatim while an extension body is parsed, so the
registry entry gave one tag two content models, chosen by which spelling the
author reached for.

::: compare

```carve
`*b*`
```

```html
<p><code>*b*</code></p>
```

:::

## Two attributes need a separator between them

`attribute_list` is `attribute, {space+, attribute}` (PART 7), so two attributes
may not touch. `{.a.b}` is not two classes, it is one malformed class name, and
one invalid item makes the whole block literal (§14).

::: compare

```carve
[x]{.a.b}
```

```html
<p>[x]{.a.b}</p>
```

:::

The same holds when the two kinds differ, which is the shape a strip-based
validator gets wrong: it removes `.a`, leaves a separator behind where the
source had none, and then accepts `#i` as though it had been separated.

::: compare

```carve
[x]{.a#i}
```

```html
<p>[x]{.a#i}</p>
```

:::

An id abutting a class is literal for the same reason, and the `#i.c` left
inside the braces is then ordinary content - where a `#` opens a tag.

::: compare

```carve
[x]{#i.c}
```

```html
<p>[x]{<span class="tag"><strong>#i.c</strong></span>}</p>
```

:::

A colon inside an UNQUOTED VALUE is not a separator question: the value runs to
the next whitespace, so it is one attribute and the block is valid.

::: compare

```carve
[x]{k=a:b}
```

```html
<p><span k="a:b">x</span></p>
```

:::

## A derived title yields to an authored one

`abbr` and `time` values become `title` and `datetime`, which are ordinary
attribute names an author may also write. Where both are present the authored
one wins - one element never carries the same attribute twice (PART 9 §9).

::: compare

```carve
[x]{abbr="derived" title="authored"} [y]{time="2026" datetime="custom"}
```

```html
<p><abbr title="authored">x</abbr> <time datetime="custom">y</time></p>
```

:::

Without an authored one the derived attribute is what the element carries.

::: compare

```carve
[HTML]{abbr="HyperText Markup Language"}
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr></p>
```

:::

## A math span's base class keeps the class slot in place

`math inline` is a mandatory base class, so it is prepended INSIDE the class slot
and the slot stays at the first-appearance position of a class in the author's
order (PART 10 §1). An id written before any class is still serialized first.

markup-carve/carve#1168 pinned this for the generic `ext-NAME` fallback. The math
span carries a base class the same way and was missed, because no case put an id
before a class on it (markup-carve/carve#1164).

::: compare

```carve
$`E=mc^2`{#i .c k=v}
```

```html
<p><span id="i" class="math inline c" k="v">\(E=mc^2\)</span></p>
```

:::

With no authored class there is no slot to keep, so the base class leads.

::: compare

```carve
$`E=mc^2`{#i k=v}
```

```html
<p><span class="math inline" id="i" k="v">\(E=mc^2\)</span></p>
```

:::

## A marker glued to a name opens nothing

The boundary rule has a right half. A `#` or `@` written directly against the end
of a tag or mention name is preceded by a WORD character - the last character of
that name - so it cannot open a second one, exactly as `a#b` cannot open one
(PART 9 §7).

The `word` production absorbs a glued marker between two word characters, which
is that rule stated structurally, but a run that STARTS with a marker never
enters `word` at all - so this shape was unreachable until markup-carve/carve-js#1029
made `{#i#j}` literal text rather than an attribute block, and the executable
spec read it as two tags (markup-carve/carve#1156).

::: compare

```carve
#i#j
```

```html
<p><span class="tag"><strong>#i</strong></span>#j</p>
```

:::

A mention takes the same guard.

::: compare

```carve
@a@b
```

```html
<p><span class="mention"><strong>@a</strong></span>@b</p>
```

:::

Separated by a space, both open normally - that is the control the guard must not
break.

::: compare

```carve
#a #b
```

```html
<p><span class="tag"><strong>#a</strong></span> <span class="tag"><strong>#b</strong></span></p>
```

:::

## An angle bracket is escaped only where it opens markup

PART 11 §8a M1e. On the Markdown target a `<` is escaped with a backslash when
the next character is an ASCII letter, `/`, `!` or `?` - the four things that can
open raw HTML - and left alone otherwise. A `>` takes nothing: mid-line it is
inert, and at the start of a line it is a block quote marker M1 already covers.

Escaping the `<` alone is sufficient, because a tag that cannot open cannot be
closed. Every engine used to rewrite both brackets to entities, unconditionally
and with no clause behind it (markup-carve/carve#1148); an entity is not an
escape, since it replaces the character rather than protecting it.

::: compare

```carve
a < b and a <b> c and x > y
```

```html
<p>a &lt; b and a &lt;b&gt; c and x &gt; y</p>
```

:::

## An abbreviation expands inside an inline container

PART 9R R3 matches a term in RENDERED TEXT at word boundaries. The container the
text sits in does not change that: an ordinary span, a compact semantic span and
the `:name[…]` extension form all expand, exactly as emphasis and a link do.

The corpus had one case here - the explicit-`abbr` row, which every engine agreed
on - so every neighbouring row was unpinned, and two engines kept opposite
defects for months with no red test: carve-rs dropped the expansion inside a
span, carve-js dropped it inside `:name[…]` (markup-carve/carve#1151).

::: compare

```carve
*[HTML]: Long Form

The [HTML]{.x} key.
```

```html
<p>The <span class="x"><abbr title="Long Form">HTML</abbr></span> key.</p>
```

:::

A compact semantic span is the same question, and PART 9 §10 made this spelling a
documented feature - so a dropped expansion here is silent loss inside a
construct the docs teach.

::: compare

```carve
*[HTML]: Long Form

The [HTML]{kbd} key.
```

```html
<p>The <kbd><abbr title="Long Form">HTML</abbr></kbd> key.</p>
```

:::

The `:name[…]` form takes the generic fallback in a core render, and the term
still expands inside it.

::: compare

```carve
*[HTML]: Long Form

The :kbd[HTML] key.
```

```html
<p>The <span class="ext-kbd"><abbr title="Long Form">HTML</abbr></span> key.</p>
```

:::

The controls: emphasis and a link already agreed across engines, and they pin
that the containers above are not special-cased in one direction.

::: compare

```carve
*[HTML]: Long Form

Both *HTML* and [HTML](/u) expand.
```

```html
<p>Both <strong><abbr title="Long Form">HTML</abbr></strong> and <a href="/u"><abbr title="Long Form">HTML</abbr></a> expand.</p>
```

:::

An explicit `abbr` attribute is the one exception (markup-carve/carve#1127): the
authored expansion wins and the definition does not apply on top of it.

::: compare

```carve
*[HTML]: Long Form

The [HTML]{abbr="Custom"} key.
```

```html
<p>The <abbr title="Custom">HTML</abbr> key.</p>
```

:::

## A captioned quote holds more than one block

A caption makes its host a figure, and PART 9 §4b says a quote is no exception:
the quote goes inside a `<figure>` and the caption becomes its `<figcaption>`,
which is where the HTML Standard puts a quotation's attribution.

Nothing counts the quote's blocks. A multi-paragraph epigraph is ordinary, and so
are a quoted list, a nested quote, a quoted code block and a quoted heading. Each
one takes its caption the same way, in the same place.

This needed pinning because the executable spec refused every shape but a single
paragraph, and no corpus document held any of the others - so the refusal was
unreachable, `npm run core:check` reported every input conformant either way, and
the gap was guarded by the absence of a fixture rather than by a decision
(markup-carve/carve#1181, the markup-carve/carve#755 class).

::: compare

```carve
> Nothing in this world is certain except death and taxes.
>
> The second of the two arrives rather more often.
^ Benjamin Franklin
```

```html
<figure>
  <blockquote>
    <p>Nothing in this world is certain except death and taxes.</p>
    <p>The second of the two arrives rather more often.</p>
  </blockquote>
  <figcaption>Benjamin Franklin</figcaption>
</figure>
```

:::

A quoted list. The caption belongs to the quote as a whole, so the list stays the
quote's only child and the caption sits outside it.

::: compare

```carve
> - Be skeptical.
> - Be kind.
^ House rules
```

```html
<figure>
  <blockquote>
    <ul>
      <li>Be skeptical.</li>
      <li>Be kind.</li>
    </ul>
  </blockquote>
  <figcaption>House rules</figcaption>
</figure>
```

:::

A nested quote. The caption attaches to the OUTER quote - the one whose marker
column the caption line sits against - so the inner quote carries no caption of
its own.

::: compare

```carve
> > I never said that.
^ Quoted in the report
```

```html
<figure>
  <blockquote>
    <blockquote><p>I never said that.</p></blockquote>
  </blockquote>
  <figcaption>Quoted in the report</figcaption>
</figure>
```

:::

A quoted code block. The `<pre>` is the quote's only child and the caption still
lands beside the quote, which is the case that shows the rule is about the quote
rather than about a paragraph.

::: compare

```carve
> ~~~
> git bisect run ./check
> ~~~
^ The release runbook
```

```html
<figure>
  <blockquote>
    <pre><code>git bisect run ./check
</code></pre>
  </blockquote>
  <figcaption>The release runbook</figcaption>
</figure>
```

:::

A quoted heading. The heading keeps its id, and PART 9R leaves it out of the
implicit-reference index because it sits inside a quote - the caption does not
change that either way.

::: compare

```carve
> ## Terms
>
> Delivery is at the discretion of the vendor.
^ Appendix B
```

```html
<figure>
  <blockquote>
    <h2 id="Terms">Terms</h2>
    <p>Delivery is at the discretion of the vendor.</p>
  </blockquote>
  <figcaption>Appendix B</figcaption>
</figure>
```

:::

## An empty inline note is literal

PART 9 §16 says it in as many words: "Empty or whitespace-only (`^[]`, `^[ ]`)
is literal; an unclosed `^[…` is literal." So `^[` does not open a note there.

What is left is ordinary text plus an ordinary bracketed run, and that matters
for the third case below: a bare `[]` is literal, but `[]{.c}` carries an
attribute tail and is a span (PART 9 §14), so the `^` is the only part of
`^[]{.c}` that stays as written.

This needed pinning because the executable spec refused all three, and no corpus
document held an empty note - so the refusal was unreachable, `npm run
core:check` reported every input conformant either way, and the gap was guarded
by the absence of a fixture rather than by a decision (markup-carve/carve#1188,
the markup-carve/carve#755 class).

::: compare

```carve
x ^[]
```

```html
<p>x ^[]</p>
```

:::

Whitespace-only is the same case: a space between the brackets is not content.

::: compare

```carve
x ^[ ]
```

```html
<p>x ^[ ]</p>
```

:::

With an attribute block the brackets are a span, and only the `^` is literal.

::: compare

```carve
x ^[]{.c}
```

```html
<p>x ^<span class="c"></span></p>
```

:::

## A multi-letter ordered marker opens no list

PART 2 spells the marker as `ordered_marker = (digit+ | letter | roman_numeral),
('.' | ')')`. `abc` is not a run of digits, not the single `letter` the
production admits, and not a roman numeral, so `abc. item` matches nothing and
the line is an ordinary paragraph.

`ABC)` is the same reading in the other case and with the other delimiter. Note
that a SINGLE letter still is a marker - it is the second letter that ends the
match - and that a roman run of any length still is one, so `iv. item` is a
list.

The executable spec refused both instead, and no corpus document began a line
with a multi-letter word and a dot (markup-carve/carve#1188).

::: compare

```carve
abc. item
```

```html
<p>abc. item</p>
```

:::

::: compare

```carve
ABC) item
```

```html
<p>ABC) item</p>
```

:::

## A note's content recognizes no note

PART 9 §16 on the inline form: "Content is INLINE-only, parsed recursively with
footnote recognition DISABLED inside it (no `^[…]` or `[^ref]` nested in a note,
either direction)."

Disabled recognition makes the inner spelling ORDINARY TEXT rather than an
unrenderable document. Inside a note `^[` opens nothing, so the `^` is text and
`[b]` is a bracketed run; and `[^1]` is not a reference, so it is a bracketed run
over the content `^1` - which is why the second case renders `[^1]` even though
the document defines that label. The definition is then referenced by nothing and
renders nothing of its own.

Recognition stays off for the WHOLE content, not one level of it: the third case
holds a note spelling two deep and both stay literal.

The executable spec refused all three, and no corpus document nested a note in a
note (markup-carve/carve#1188).

::: compare

```carve
x ^[a ^[b] c]
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a ^[b] c<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
x ^[a [^1] c]

[^1]: n
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a [^1] c<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
x ^[a ^[b ^[c] d] e]
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a ^[b ^[c] d] e<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An attribute block on the inner spelling attaches to the bracketed run it turns
out to be, on either side of the pair.

::: compare

```carve
x ^[a [^1]{.k} c]

[^1]: n
```

```html
<p>x <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a <span class="k">^1</span> c<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A footnote in link text nests the anchors

PART 9 §16 records this as a LIMITATION: a footnote "inside link text
(`[t[^1]](u)`) or inside a heading later cloned by a `</#id>` crossref nests an
`<a>` in an `<a>`; avoid footnotes in those positions."

That is advice about what an author should expect, and it states the outcome. It
does not put the document outside the language: the noteref lands where it was
written, inside the link text, and the note takes its number from the one
document-order sequence like any other.

Both note forms reach it the same way, which is what makes the pairing worth
pinning - the executable spec rendered the inline form and refused the reference
one (markup-carve/carve#1188).

::: compare

```carve
a [t[^1]](/u) b

[^1]: n
```

```html
<p>a <a href="/u">t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t^[n]](/u) b
```

```html
<p>a <a href="/u">t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A footnote in reference link text nests the anchors too

The PART 9 §16 limitation is about LINK TEXT, not about one spelling of a
link: "a footnote (reference `[^1]` or inline `^[…]`) inside link text
(`[t[^1]](u)`) or inside a heading later cloned by a `</#id>` crossref nests an
`<a>` in an `<a>`". A reference tail reaches the same place by a different
route, and reaches the same answer - the noteref lands where it was written and
the note draws its number from the one document-order sequence.

The neighboring section pins the inline-tail half of that cross. This one pins
the reference-tail half, which the executable spec used to refuse: its own
resolution frame carried the link text through a JSON payload, and
`JSON.stringify` escaped the frame's field separator, so the footnote pass never
saw the noteref sitting in it (markup-carve/carve#1195).

::: compare

```carve
a [t[^1]][r] b

[r]: /u

[^1]: n
```

```html
<p>a <a href="/u">t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t^[n]][r] b

[r]: /u
```

```html
<p>a <a href="/u">t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t[^1]][r] c [^1] b

[r]: /u

[^1]: n
```

```html
<p>a <a href="/u">t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></a> c <a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::

## A note body's own references resolve

A footnote body is rendered when the endnotes list is built, which is after the
document text has been walked. Whatever the body introduces - a reference link,
another footnote, a reference link whose text holds a footnote - is therefore
introduced late, and still has to be resolved.

The later note takes the next number in the same sequence, and its own body is
resolved on the same terms, so the list can grow while it is being built.

::: compare

```carve
a [^1] b

[^1]: see [x][r]

[r]: /u
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">x</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [^1] b

[^1]: see [^2]

[^2]: two
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p>two<a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [^1] b

[^1]: see [t[^2]][r]

[r]: /u

[^2]: two
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">t<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p>two<a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A reference link's text survives its own frame

Resolving a reference is deferred: the tail is recorded when the inline pass
reaches it and matched against the definitions afterwards. Everything the link
text holds is carried across that gap, and comes out the other side unchanged -
including the constructs whose own resolution is deferred the same way.

Two of those are worth stating outright. A reference link inside link text is
still a link, so PART 3's rule that links never nest applies to it exactly as it
applies to an inline one: the inner link flattens to its text. An image
reference is not a link, so it stays, and an image inside an anchor is what the
document asked for.

::: compare

```carve
a [t</#}>][r] b

[r]: /u
```

```html
<p>a <a href="/u">t&lt;/#}&gt;</a> b</p>
```

:::

::: compare

```carve
a [t[x][r2]][r] b

[r]: /u

[r2]: /v
```

```html
<p>a <a href="/u">tx</a> b</p>
```

:::

::: compare

```carve
a [t[x][r2]](/u) b

[r2]: /v
```

```html
<p>a <a href="/u">tx</a> b</p>
```

:::

::: compare

```carve
a [t![z][r2]][r] b

[r]: /u

[r2]: /i.png
```

```html
<p>a <a href="/u">t<img src="/i.png" alt="z"></a> b</p>
```

:::

## A footnote in an unresolved reference is not a reference

An unresolved reference degrades to its literal source (PART 9R R1), so the link
text it rendered is discarded rather than written into the document. A footnote
reference or an inline note sitting in that text therefore references nothing:
it draws no number, its definition stays unreferenced and is dropped, and no
endnotes section is written on its account.

Counting it anyway is what a pipeline does when it numbers footnotes before it
knows whether the reference resolved. The numbering says so out loud - the note
a reader can see is then numbered as a repeat of a reference the document does
not contain, and a lone one leaves an endnote whose backlink names an id no
element carries.

::: compare

```carve
a [t[^1]][nope] b

[^1]: n
```

```html
<p>a [t[^1]][nope] b</p>
```

:::

::: compare

```carve
a [t[^1]][nope] b [^1] c

[^1]: n
```

```html
<p>a [t[^1]][nope] b <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> c</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a [t^[n]][nope] b
```

```html
<p>a [t^[n]][nope] b</p>
```

:::

A bracketed run that never had a tail is not a reference at all: PART 9 §14
renders its content, so a note inside it is written and counts.

::: compare

```carve
a [t[^1]] b

[^1]: n
```

```html
<p>a [t<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>] b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## An inline note's content resolves after the note

A note's content is rendered where it is written and placed where the endnotes
go, so a construct inside it whose own resolution is deferred - a crossref, a
reference link, a reference image - has to survive that move. It does: the note
carries the unresolved construct across, and the construct resolves against the
whole document once the note has been placed.

Whether it resolves is a separate question from whether it survives. An
unresolved crossref inside a note renders as its literal source, exactly as it
would outside one.

::: compare

```carve
a ^[see </#h>] b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="#h">h</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see </#nope>] b
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see &lt;/#nope&gt;<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see [t][r]] b

[r]: /u
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="/u">t</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[see ![z][r]] b

[r]: /i.png
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <img src="/i.png" alt="z"><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A collapsed reference reaches the heading index from inside a note too, and the
note's own attributes are unaffected by what its content holds.

::: compare

```carve
a ^[see [h][]] b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a href="#h">h</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ^[</#h>]{.c} b

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref" class="c"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#h">h</a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A note reached from a footnote body is placed after the body that introduced it,
and its own content resolves the same way.

::: compare

```carve
a [^1] b

[^1]: see ^[</#h>]

# h
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section id="h">
  <h1>h</h1>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#h">h</a><a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## An image's alt text closes where a link's text closes

An image has the same three forms as a link, and PART 3 says only the leading
`!` and the `<img src>` output differ. The bracketed run is not one of the
things that differ: the alt text ends at the MATCHING `]`, by the same
balanced, escape- and literal-span-aware scan that closes link text. So an
alt text may hold a bracket, at any depth, in every form and in every host
that re-parses the run.

What the run does NOT share with link text is its content model. `alt` is an
HTML attribute, so nothing inside is inline-parsed: an escape stays as
authored and a backtick run stays a backtick run.

::: compare

```carve
a ![t[z]][r] b

[r]: /i.png
```

```html
<p>a <img src="/i.png" alt="t[z]"> b</p>
```

:::

::: compare

```carve
a ![t[z]](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t[z]"> b</p>
```

:::

Nesting is unbounded, and a trailing attribute block still attaches to the
resolved image.

::: compare

```carve
a ![t[z[q]]][r]{.c} b

[r]: /i.png
```

```html
<p>a <img src="/i.png" alt="t[z[q]]" class="c"> b</p>
```

:::

An escape and a code span both keep their `]` out of the close, and both
reach the attribute as the bytes the author wrote.

::: compare

```carve
a ![t\]z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t\]z"> b</p>
```

:::

::: compare

```carve
a ![t`]`z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t`]`z"> b</p>
```

:::

An UNBALANCED `]` still closes the run where it stands, which leaves a
reference tail with nothing in front of it and the whole line literal.

::: compare

```carve
a ![t]z][r] b

[r]: /i.png
```

```html
<p>a ![t]z][r] b</p>
```

:::

The hosts that re-read the run agree with the inline pass. A paragraph whose
whole content is one reference image is captionable however its alt text is
spelled, and an image inside link text is still an image.

::: compare

```carve
![t[z]][r]
^ cap

[r]: /i.png
```

```html
<figure>
  <img src="/i.png" alt="t[z]">
  <figcaption>cap</figcaption>
</figure>
```

:::

::: compare

```carve
a [x ![t[z]][r] y](/u) b

[r]: /i.png
```

```html
<p>a <a href="/u">x <img src="/i.png" alt="t[z]"> y</a> b</p>
```

:::

## An editorial comment's bracket is content, not the close

The close scan skips the interior of every span whose content is LITERAL:
inline code, the `!`-prefixed inline literal, and an editorial comment. The
test is the property, not the list - a `]` inside any of them cannot be
escaped, so ending the run there would leave no spelling that keeps both the
construct and the author's text.

A comment with no bracket in it never had a say in where the run ends.

::: compare

```carve
a [t{# n #}z](/u) b
```

```html
<p>a <a href="/u">t<span class="critic-comment"> n </span>z</a> b</p>
```

:::

One with a bracket in it does not either, in a link, in a span, in an inline
note, or in an alt text.

::: compare

```carve
a [t{# ] #}z]{.c} b
```

```html
<p>a <span class="c">t<span class="critic-comment"> ] </span>z</span> b</p>
```

:::

::: compare

```carve
a ^[t{# ] #}z] b
```

```html
<p>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t<span class="critic-comment"> ] </span>z<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
a ![t{# ] #}z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t{# ] #}z"> b</p>
```

:::

## Composite figures

A bare `::: figure` container is ONE figure holding ordered panels (PART 9
§4c, the `figure_group` production): its direct captionable children - the
`figure` and `table` nodes the unchanged inner caption rules build - are the
panels, and the `^ ` line after the closing fence is the caption of the whole
group. That closer is caption placement's sixth host (PART 9 §4), and the only
`:::` kind that takes one. The group renders class-first, the panels nested
directly in the group `figure` - HTML's figure content model admits flow
content beside a first-or-last `figcaption`, so no wrapper element sits
between them.

:::: compare

```carve
{#fig-x .columns-2}
::: figure
{#fig-x-a}
![one](a.png)
^ (a) One

{#fig-x-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: Group caption
```

```html
<figure class="carve-figure-group columns-2" id="fig-x">
  <figure class="carve-figure-panel" id="fig-x-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-x-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 1: Group caption</figcaption>
</figure>
```

::::

The group is one numbering unit (PART 9R R5): its caption's `#` draws exactly
one number from the label's sequence, and that draw also registers the panel
ids for cross-references - the group's number plus a letter by panel order.
Panels draw nothing themselves.

:::: compare

```carve
{#fig-first}
![lead](lead.png)
^ Figure #: First

{#fig-x}
::: figure
{#fig-x-a}
![one](a.png)
^ (a) One

{#fig-x-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: Second

See </#fig-x> and </#fig-x-a>.
```

```html
<figure id="fig-first">
  <img src="lead.png" alt="lead">
  <figcaption>Figure 1: First</figcaption>
</figure>
<figure class="carve-figure-group" id="fig-x">
  <figure class="carve-figure-panel" id="fig-x-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-x-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 2: Second</figcaption>
</figure>
<p>See <a href="#fig-x">Figure 2</a> and <a href="#fig-x-a">Figure 2a</a>.</p>
```

::::

A group without a caption is a valid, unnumbered group - no trailing
`figcaption` is emitted.

:::: compare

```carve
::: figure
![one](a.png)
^ (a) One

![two](b.png)
^ (b) Two
:::
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
</figure>
```

::::

A one-panel group is a valid parse, not an error (`carve lint` reports it in
strict profiles as `figure-group-single-panel`).

:::: compare

```carve
::: figure
![lone](l.png)
^ The only panel
:::
^ Figure #: One panel is valid
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="l.png" alt="lone">
    <figcaption>The only panel</figcaption>
  </figure>
  <figcaption>Figure 1: One panel is valid</figcaption>
</figure>
```

::::

Direct children that are not captionable hosts are plain group content,
preserved in place between the panels - never silently dropped, never
re-attached to a panel.

:::: compare

```carve
::: figure
Both panels were shot on the same day.

{#fig-s-a}
![one](a.png)
^ (a) One

{#fig-s-b}
![two](b.png)
^ (b) Two
:::
^ Figure #: With a note between the panels
```

```html
<figure class="carve-figure-group">
  <p>Both panels were shot on the same day.</p>
  <figure class="carve-figure-panel" id="fig-s-a">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
  <figure class="carve-figure-panel" id="fig-s-b">
    <img src="b.png" alt="two">
    <figcaption>(b) Two</figcaption>
  </figure>
  <figcaption>Figure 1: With a note between the panels</figcaption>
</figure>
```

::::

The group caption takes the same allowance as every host (PART 9 §4): adjacent
or exactly one blank line attaches, two blank lines detach and leave the `^ `
line an ordinary paragraph.

:::: compare

```carve
::: figure
![one](a.png)
^ (a) One
:::


^ Figure #: Detached
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
</figure>
<p>^ Figure #: Detached</p>
```

::::

Only the `figure` kind hosts a caption at its closer. A `^ ` line after any
other container's closing fence stays what it always was: ordinary paragraph
content.

:::: compare

```carve
::: note
Body text.
:::
^ Not a caption
```

```html
<aside class="admonition note">
  <p>Body text.</p>
</aside>
<p>^ Not a caption</p>
```

::::

An opener carrying a quoted title or a `[label]` does not match
`figure_group_open` - it stays a generic Tier-2 container, metadata preserved
losslessly (`carve lint` reports `figure-group-opener-metadata`), and its
closer hosts no caption.

:::: compare

```carve
::: figure "A titled figure div"
![one](a.png)
^ (a) One
:::
^ Not a group caption

::: figure [g]
Body.
:::
```

```html
<div class="figure">
  <p class="admonition-title">A titled figure div</p>
  <figure>
    <img src="a.png" alt="one">
    <figcaption>(a) One</figcaption>
  </figure>
</div>
<p>^ Not a group caption</p>
<div class="figure">
  <p class="div-label">g</p>
  <p>Body.</p>
</div>
```

::::

Groups do not nest. A bare `::: figure` opener inside an open group's body is
a generic container (`carve lint` reports `figure-group-nested`), and only the
outer group numbers.

::::: compare

```carve
::: figure
:::: figure
![one](a.png)
^ (a) One
::::
:::
^ Figure #: Outer only
```

```html
<figure class="carve-figure-group">
  <div class="figure">
    <figure>
      <img src="a.png" alt="one">
      <figcaption>(a) One</figcaption>
    </figure>
  </div>
  <figcaption>Figure 1: Outer only</figcaption>
</figure>
```

:::::

Every captionable host panels the same way: a table (captioned or not) is
wrapped in the panel `figure`, and a captioned code listing and a captioned
display-math block already render as figures and take the panel class. An
UNCAPTIONED quote is plain group content - which is how a quotation carries a
figure number without a caption of its own: leave the quote bare and caption
the group (PART 9 §4c).

:::: compare

````carve
{#fig-m}
::: figure
| Kind | N |
|------|---|
| a    | 1 |

```js
const x = 1
```
^ A listing panel

$$`E = mc^2`
^ An equation panel

> Measured twice.

> Brevity.
^ A quoted panel
:::
^ Figure #: Mixed panels
````

````html
<figure class="carve-figure-group" id="fig-m">
  <figure class="carve-figure-panel">
    <table>
      <thead><tr><th scope="col">Kind</th><th scope="col">N</th></tr></thead>
      <tbody>
        <tr><td>a</td><td>1</td></tr>
      </tbody>
    </table>
  </figure>
  <figure class="carve-figure-panel">
    <pre><code class="language-js">const x = 1
</code></pre>
    <figcaption>A listing panel</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <p><span class="math display">\[E = mc^2\]</span></p>
    <figcaption>An equation panel</figcaption>
  </figure>
  <blockquote><p>Measured twice.</p></blockquote>
  <figure class="carve-figure-panel">
    <blockquote><p>Brevity.</p></blockquote>
    <figcaption>A quoted panel</figcaption>
  </figure>
  <figcaption>Figure 1: Mixed panels</figcaption>
</figure>
````

::::

A captionable host takes its number where the host begins, and a figure group
begins at its opening fence - so the group draws its number before anything
inside it does (pre-order). The only construction that can observe the
difference is a numbered caption inside non-panel group content, which draws
after the group even though its caption line sits above the group's in the
source.

::::: compare

```carve
:::: figure
::: note
![x](x.png)
^ Figure #: inner
:::
::::
^ Figure #: group
```

```html
<figure class="carve-figure-group">
  <aside class="admonition note">
    <figure>
      <img src="x.png" alt="x">
      <figcaption>Figure 2: inner</figcaption>
    </figure>
  </aside>
  <figcaption>Figure 1: group</figcaption>
</figure>
```

:::::

## Cell attributes bind after the kind and alignment markers

A cell's `{…}` attribute block attaches AFTER the kind marker `=` and after the
alignment marker, in every cell. The block is glued to the marker run where the
cell has one and to the opening `|` where it has none; a space in front of it
still keeps it literal. This is what makes an attributed HEADER cell
expressible: with the block bound ahead of the `=`, the only available shape is
`|{#x}=R|`, which reads as a data cell whose content starts with `=`.

::: compare

```carve
|={.total} Total |= 99 |
| a | b |
```

```html
<table>
  <thead><tr><th scope="col" class="total">Total</th><th scope="col">99</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

Both markers may precede the block. The kind marker comes first, then the
alignment marker, then the attributes; a native alignment marker on a header
cell still sets the whole column's alignment.

::: compare

```carve
|=~{#score} Score |
| 9 |
```

```html
<table>
  <thead><tr><th scope="col" id="score" style="text-align: center;">Score</th></tr></thead>
  <tbody>
    <tr><td style="text-align: center;">9</td></tr>
  </tbody>
</table>
```

:::

On a data cell the alignment marker likewise comes first, and the computed
alignment composes with the authored block rather than replacing it.

::: compare

```carve
|= Item |= Cost |
| Pen |>{.num} 9 |
```

```html
<table>
  <thead><tr><th scope="col">Item</th><th scope="col">Cost</th></tr></thead>
  <tbody>
    <tr><td>Pen</td><td class="num" style="text-align: right;">9</td></tr>
  </tbody>
</table>
```

:::

The other order is no longer a marker position. A `<` written AFTER the
attribute block is ordinary content, so the cell carries the attributes and is
not aligned. This is the released spelling that changes meaning, and it
reinterprets rather than erroring.

::: compare

```carve
|{#x}< content |
```

```html
<table>
  <tbody>
    <tr><td id="x">&lt; content</td></tr>
  </tbody>
</table>
```

:::

The shape that used to be the only candidate for an attributed header cell is
still a data cell, which is the ambiguity the rule removes: the `=` is content
because the block ahead of it already committed the cell.

::: compare

```carve
|{#x}=R|
```

```html
<table>
  <tbody>
    <tr><td id="x">=R</td></tr>
  </tbody>
</table>
```

:::

Row attributes do not move. They stay glued to the row's closing `|`, and they
compose with cell attributes written in the new position.

::: compare

```carve
|=<{.h} Name |=>{.c} Score |{.head}
| Ann |>{.num} 9 |{.win}
```

```html
<table>
  <thead><tr class="head"><th scope="col" class="h" style="text-align: left;">Name</th><th scope="col" class="c" style="text-align: right;">Score</th></tr></thead>
  <tbody>
    <tr class="win"><td style="text-align: left;">Ann</td><td class="num" style="text-align: right;">9</td></tr>
  </tbody>
</table>
```

:::

## The canonical writer glues a code fence to its info string

`fenced_code_block` calls the no-space opener canonical and the reader accepts
either spelling, so nothing in the source says which one the WRITER emits. PART
11 §6d does: no padding space between the fence run and the info string, and
exactly one space before each metadata token inside it. The `.fmt` sidecar
beside this pair pins the whole opener line, which is what was missing - the fmt
corpus held no document whose canonical form contains an info string at all, so
two engines normalized to the glued form and one to the spaced one with nothing
to adjudicate between them.

The author's spacing is normalized away in all three slots at once, and the
rendered block is unchanged by any of it.

::: compare

````carve
``` php   "src/Auth.php"    [Composer]
composer require x
```
````

````html
<pre title="src/Auth.php"><code class="language-php">composer require x
</code></pre>
````

:::

The canonical form is a fixed point. An opener already written the canonical way
comes back byte for byte, which is the half a writer that merely reproduced the
author's spelling would also pass - both examples are needed to tell the two
apart.

::: compare

````carve
```php "src/Auth.php" [Composer]
composer require x
```
````

````html
<pre title="src/Auth.php"><code class="language-php">composer require x
</code></pre>
````

:::
## Delimited comments

`%%` runs to the end of its inline run, so mid-line commenting already works
wherever the structure supplies a boundary - a table cell ends at `|`, link text
at `]`. Plain prose supplies none. `{% … %}` is the form for it: it opens at
`{%`, closes at the first `%}`, and renders nothing.

::: compare

```carve
foo {% bar %} baz
```

```html
<p>foo  baz</p>
```

:::

It is transparent to the run it sits in, so a comment inside an emphasis span
does not break the span.

::: compare

```carve
*bo{% c %}ld* text
```

```html
<p><strong>bold</strong> text</p>
```

:::

The run may cross a soft line break inside one paragraph - the closer is what
ends it, not the line. It never joins two paragraphs across a blank line; `%%%`
is the block form for that.

::: compare

```carve
a {% one
two %} b
```

```html
<p>a  b</p>
```

:::

An UNTERMINATED opener stays literal text, so a document that opens a comment
and never closes it shows the braces rather than swallowing the rest of the
paragraph.

::: compare

```carve
a {% oops
```

```html
<p>a {% oops</p>
```

:::

There is no nesting: the run ends at the FIRST `%}`, and a `{%` inside is
ordinary comment text.

::: compare

```carve
a {% one {% two %} b
```

```html
<p>a  b</p>
```

:::

A code span is opaque, exactly as it is for `%%`.

::: compare

```carve
Run `a {% x %} b` then done.
```

```html
<p>Run <code>a {% x %} b</code> then done.</p>
```

:::

A backslash on the brace keeps the opener literal.

::: compare

```carve
a \{% not a comment %} b
```

```html
<p>a {% not a comment %} b</p>
```

:::

Both spellings still work where they already did, and they mean different
documents: `%%` takes the rest of the run, the braced form takes what its closer
encloses. The `.fmt` sidecar beside this pair pins that the writer reproduces
the spelling it was given rather than normalizing one into the other.

::: compare

```carve
| a {% hidden %} b | c |
|---|---|
| d %% tail | e |
```

```html
<table>
  <thead><tr><th scope="col">a  b</th><th scope="col">c</th></tr></thead>
  <tbody>
    <tr><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

:::

## An attribute block reaches the nested list it precedes

An attribute block attaches to the block that FOLLOWS it, and a nested list is a
block. Inside a list item that is easy to get wrong, because the item's
continuation collector stops at a marker sitting at the item's content column so
the list parser can own the sub-list: an implementation that splits there leaves
the attribute line at the end of one run and the nested list at the start of the
next, and the attributes are silently discarded. Three engines disagreed about
this for a long time with nothing in the corpus to say who was right
(carve#1238).

The target is the nested `<ul>`/`<ol>` - not the item, and not the outer list.
With a blank line before the attribute block:

::: compare

```carve
- a

  {.x}
  - b
```

```html
<ul>
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The blank line decides nothing. The same three lines with no blank between them
mean the same document, and the item stays tight either way (PART 9 §17 L2: a
sub-block attached after a blank leaves the item tight):

::: compare

```carve
- a
  {.x}
  - b
```

```html
<ul>
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

That the blank is irrelevant is not a claim about lists in particular. The same
unseparated attribute line in front of a PARAGRAPH has always attached, in the
same position with the same spacing:

::: compare

```carve
- a
  {.x}
  para
```

```html
<ul>
  <li>a
    <p class="x">para</p>
  </li>
</ul>
```

:::

One nesting level up the three lines read identically. This is the control that
makes the rule above uniform rather than a special case for nested lists - the
top-level pair `{.x}` before a list is already pinned by `13-attributes-5`:

::: compare

```carve
para
{.x}
- b
```

```html
<p>para</p>
<ul class="x">
  <li>b</li>
</ul>
```

:::

An ordered nested list is the same block in the same position:

::: compare

```carve
- a

  {.x}
  1. b
```

```html
<ul>
  <li>a
    <ol class="x">
      <li>b</li>
    </ol>
  </li>
</ul>
```

:::

Stacked attribute blocks MERGE into one set, the way they do at top level and in
front of a paragraph. An implementation that keeps a single pending slot and
overwrites it drops everything but the last block, and only a two-block document
says so:

::: compare

```carve
- a

  {.x}
  {#i}
  - b
```

```html
<ul>
  <li>a
    <ul class="x" id="i">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The attribute line does not have to be alone in the run it ends. A fix keyed on
"the whole continuation run is an attribute block" passes the cases above and
fails this one:

::: compare

```carve
- a

  para
  {.x}
  - b
```

```html
<ul>
  <li><p>a</p>
    <p>para</p>
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

A line that merely ENDS in a brace is a paragraph, not a second attribute block:
the first block attaches to that paragraph, the text survives, and the nested
list below it is left plain:

::: compare

```carve
- a

  {.x}
  more text}
  - b
```

```html
<ul>
  <li><p>a</p>
    <p class="x">more text}</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

The braces have to be FLUSH in the item's body. One space past the content
column is a paragraph, exactly as `87-compact-list-blocks-10` pins for the form
with nothing after it - and the nested list that follows is then plain. An
implementation that trims the indentation before looking for the brace deletes
this paragraph and re-tightens the item:

::: compare

```carve
- a

   {.c}
   - b
```

```html
<ul>
  <li><p>a</p>
    <p>{.c}</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

None of this touches the abutting form, which is a different mechanism reaching
a different element: a block glued to the marker attributes the `<li>` (PART 9
§15), at any depth. `90-list-item-attributes` pins it at top level; nested, the
class lands on the item and the nested `<ul>` stays plain:

::: compare

```carve
- a

  -{.x} b
```

```html
<ul>
  <li>a
    <ul>
      <li class="x">b</li>
    </ul>
  </li>
</ul>
```

:::

## A block attached after an invisible line leaves the item tight

PART 9 §17 L1 loosens a list when "some item holds a blank-line-separated second
paragraph", and its first clause covers an item followed by a blank line before
the next sibling marker. §17 L2 is the other half: a sub-block attached after a
blank ATTACHES, and the item stays tight.

An invisible line - a comment, a definition, an attribute block - renders
nothing, so it decides neither. `186-an-invisible-line-does-not-cancel-a-blank-line-separation`
pins that it does not close the separation a blank opened, and
`188-a-floating-attribute-stops-at-the-item-boundary` pins the case where nothing
visible follows it at all and the item really did end at the blank.

What neither of those can say is what happens when a block ATTACHES after the
invisible line and the list has a SECOND item. The attachment consumes the
separation exactly as it does when no invisible line is there - `- a` / blank /
`  - b` / `- c` is tight (`87-compact-list-blocks-2`), and inserting a line that
produces no output cannot make the item loose. A reader that remembers the blank
and never forgets it loosens here, which is what the executable spec did
(carve#1265); every corpus document of this shape had one item, so nothing said
so.

An attribute block:

::: compare

```carve
- a

  {.x}
  - b
- c
```

```html
<ul>
  <li>a
    <ul class="x">
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

A comment, which is the same rule with a different invisible line - the class of
the gap-filler is not the question:

::: compare

```carve
- a

  %% note
  - b
- c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

A reference definition:

::: compare

```carve
- a

  [r]: /u
  - b
- c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

Nor is the attached block only a nested list. A quote is a §17 L2 sub-block in
the same position:

::: compare

```carve
- a

  {.x}
  > q
- c
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
  <li>c</li>
</ul>
```

:::

And so is a code fence:

::: compare

```carve
- a

  {.x}
  ```
  code
  ```
- c
```

```html
<ul>
  <li>a
    <pre class="x"><code>code
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::

A PARAGRAPH after the invisible line is the boundary and still loosens, because
that is §17 L1's own second paragraph rather than an attachment - `186-an-invisible-line-does-not-cancel-a-blank-line-separation`
already pins it, one item and two.

## An abbreviation definition in an item body is paragraph text

PART 12 §7 says an `abbreviation_definition` is one only as a direct child of the
document: written inside a block quote, a list item or a div, "the line is not a
definition at all: it is ordinary paragraph text, it defines nothing, and it is
preserved as the text the author typed". So the looseness question §17 L1 asks -
does the item hold a blank-line-separated second paragraph - has an answer that
follows from §7 rather than from a rule about abbreviations: the line renders, so
it IS that paragraph, and the item is loose.

::: compare

```carve
- a

  *[A]: a
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
  </li>
</ul>
```

:::

Nothing changes when a sublist follows it. The definition-shaped line is already
the second paragraph, and §17 L2's attached sub-block cannot take that back:

::: compare

```carve
- a

  *[A]: a
  - b
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

:::

Looseness is a property of the LIST, so a sibling item is wrapped too:

::: compare

```carve
- a

  *[A]: a
  - b
- c
```

```html
<ul>
  <li><p>a</p>
    <p>*[A]: a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

The control is the definition kind that IS collected at that column. A link
reference definition inside the item renders nothing, resolves for the rest of
the document, and leaves the item tight - which is what makes the abbreviation's
answer a consequence of §7 rather than an inconsistency:

::: compare

```carve
- a

  [r]: /u

See [x][r].
```

```html
<ul>
  <li>a</li>
</ul>
<p>See <a href="/u">x</a>.</p>
```

:::

At document level the abbreviation is collected, renders nothing of its own, and
expands its term - the behavior the container position does not get:

::: compare

```carve
*[A]: alpha

A here
```

```html
<p><abbr title="alpha">A</abbr> here</p>
```

:::

## An attribute line after a continuation marker attributes the attached block

An attribute block attaches to the block that FOLLOWS it, and the target is that
block (carve#1238). Nothing in that rule exempts a `+` continuation marker, and
a continuation is exactly the case where the following block is inside the item:
PART 2 has `block = … | block_attributes | …` and PART 11's grammar has
`continuation_marker_block = continuation_marker, block`, so an attribute line is
itself a block the marker can attach, and PART 9 §15 gives it its float to the
next one.

An implementation that reads the line as ordinary text loses both halves at
once - the attributes AND the containment - because the run the marker opened
then ends at the text and the quote below it starts a new top-level block
(carve-rs#1020):

::: compare

```carve
- a
+
{.x}
> q
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
</ul>
```

:::

The control is the same document with the attribute line removed. The marker's
own job is unchanged by this rule, so the quote lands in the item either way and
only the class moves:

::: compare

```carve
- a
+
> q
```

```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

A PARAGRAPH after the attribute line is the second half, and it fails
differently: an implementation that keeps the line as text has nowhere to put it
but the item's open lead paragraph, so the whole run folds into `a` and the
attributes vanish with the block boundary.

::: compare

```carve
- a
+
{.x}
para
```

```html
<ul>
  <li>a
    <p class="x">para</p>
  </li>
</ul>
```

:::

A second item pins the boundary the mis-parse moves. The attached quote belongs
to the first item, so `- c` is still a sibling of `- a` and not of anything the
attribute line produced:

::: compare

```carve
- a
+
{.x}
> q
- c
```

```html
<ul>
  <li>a
    <blockquote class="x"><p>q</p></blockquote>
  </li>
  <li>c</li>
</ul>
```

:::

## A column-0 line after a container's last block, when that block left no paragraph open

PART 1 S4's *NO OPEN PARAGRAPH, NO LAZY LINE* is pinned above for an empty
quote, which reads as though EMPTINESS were the property doing the work. It is
not. The parameter S4 names is whether any container in the open stack holds an
**open paragraph**, and a block that leaves none leaves none wherever it was
written: `- # H` puts a heading in the item exactly as an indented `# H` would.

So a flush-left line after a heading, a table, a break, a comment, a definition
or an attribute block ends the item, and each of these is the same derivation a
block quote already got in every engine (markup-carve/carve#1280).

A heading is a bounded title. Nothing is open after it:

::: compare

```carve
- # H
tail
```

```html
<ul>
  <li>
    <h1 id="H">H</h1>
  </li>
</ul>
<p>tail</p>
```

:::

The block quote spelling of the same document, which every engine already read
this way. The two containers are one rule, and this is the pair that says so:

::: compare

```carve
> # H
tail
```

```html
<blockquote>
  <h1 id="H">H</h1>
</blockquote>
<p>tail</p>
```

:::

A table ends at its last row:

::: compare

```carve
- | a | b |
tail
```

```html
<ul>
  <li>
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

A thematic break holds nothing at all:

::: compare

```carve
- ---
tail
```

```html
<ul>
  <li>
    <hr>
  </li>
</ul>
<p>tail</p>
```

:::

A comment is invisible, and invisible is not open. The item renders empty rather
than absorbing the line below it:

::: compare

```carve
- %% c
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::

The fence spelling of a comment answers the same way. Its closer travels with
its opener, and what follows the closer is outside the item:

::: compare

````carve
- %%%
c
%%%
tail
````

```html
<ul>
  <li></li>
</ul>
<p>c</p>
<p>tail</p>
```

:::

A link reference definition is metadata. Ending the item disposes of the line
BELOW it, never of the definition itself - §17 L6 collects that from wherever it
was written, and the use below still resolves:

::: compare

```carve
- [r]: /u
tail

[r][]
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

A footnote definition, the same both ways:

::: compare

```carve
- [^f]: t
tail

see[^f]
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An attribute block opens no paragraph either, so it never reaches the line below
- the item ends first, and the attribute is left unconsumed:

::: compare

```carve
- {.k}
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::

A sibling marker after the same shape still opens a sibling, which is the
control for "the item ended" rather than "the item swallowed something":

::: compare

```carve
- # H
- next
```

```html
<ul>
  <li>
    <h1 id="H">H</h1>
  </li>
  <li>next</li>
</ul>
```

:::

The question is asked of a quote RECURSIVELY, so a quote is not automatically an
open paragraph either - what decides is the block the quote itself ends on:

::: compare

```carve
- > # H
tail
```

```html
<ul>
  <li>
    <blockquote>
      <h1 id="H">H</h1>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

:::

### The two that still fold, because a paragraph IS open

The rule has one parameter, so the controls are the documents where that
parameter has the other value. A nested quote's trailing paragraph is open, and
the line folds into it:

::: compare

```carve
- > q
tail
```

```html
<ul>
  <li>
    <blockquote><p>q
tail</p></blockquote>
  </li>
</ul>
```

:::

And plain lead text is the ordinary lazy continuation, untouched by any of this:

::: compare

```carve
- a
tail
```

```html
<ul>
  <li>a
tail</li>
</ul>
```

:::

### The unmatched item's last block may itself be a list

The clause binds "even where the unmatched container is a LIST ITEM whose last
block is a container", and a nested list is that container. So the question is
asked of the nested item's own last block, recursively, exactly as it is asked
of a quote's - and it is asked however deep the nesting runs.

Read as prose instead, the marker line answers "paragraph" every time, and the
tell is that depth 1 comes out right while depth 2 does not
(markup-carve/carve#1342). The outer item's last block here is a list whose
item ends on a heading, so nothing is open and `tail` is a document paragraph:

::: compare

```carve
- - # H
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <h1 id="H">H</h1>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

A comment as the nested item's only block reaches the same answer by the same
route, which is how one knows the depth and not the construct is what was
missing:

::: compare

```carve
- - %% c
tail
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

Depth 3 is the document that locates it. An implementation that unwraps one
level and then stops folds `tail` into the MIDDLE item rather than closing all
three, so this pair distinguishes "the rule recurses" from "the rule was applied
once":

::: compare

```carve
- - - # H
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <h1 id="H">H</h1>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

The nested list need not be written on the marker line. A sub-list opened at the
item's content column is the same last block, and leaves the same nothing open:

::: compare

```carve
- a
  - # H
tail
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <h1 id="H">H</h1>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

The controls are the same three documents with a paragraph restored at the
bottom of the stack. A nested item holding plain text folds, at any depth:

::: compare

```carve
- - a
tail
```

```html
<ul>
  <li>
    <ul>
      <li>a
tail</li>
    </ul>
  </li>
</ul>
```

:::

So does a nested item ending on a quote that CARRIES a paragraph - the
recursion has to pass through both containers to reach it:

::: compare

```carve
- - > q
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <blockquote><p>q
tail</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

And the content-column spelling folds too when its sub-item is prose:

::: compare

```carve
- a
  - b
tail
```

```html
<ul>
  <li>a
    <ul>
      <li>b
tail</li>
    </ul>
  </li>
</ul>
```

:::

### An attribute line at the item's content column closes the paragraph too

§10 I5 makes a block-attribute line an interrupter, so an item whose last
content line is one holds no open paragraph and the same clause ends it. The
attribute was written against a container that ends before the flush-left line
arrives, so it reaches nothing and is dropped - it does not travel down to the
line below (markup-carve/carve#1342):

::: compare

```carve
- a
  {.x}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

Separating the attribute line with a blank changes nothing. The blank does not
loosen the item either, because an attribute block renders nothing and §17 L1
asks for a second PARAGRAPH:

::: compare

```carve
- a

  {.x}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

The control is what the attribute does reach: a line at the content column is
inside the item, the container has not ended, and the attribute attaches to the
paragraph it introduces:

::: compare

```carve
- a
  {.x}
  more
```

```html
<ul>
  <li>a
    <p class="x">more</p>
  </li>
</ul>
```

:::

The quote spelling of the same shape is pinned under *A floating attribute is
scoped to the container that holds it* below, and every engine already read it
that way. That the two containers disagreed is what makes the item spelling a
defect rather than a second reading.

### A continuation-row SHAPE is prose until a table is above it

Every construct above answers S4 by its shape, and one construct cannot. §5 T6
says a table "cannot BEGIN with a continuation row", so a `+ ...|` line reached
where no table is open is not a row at all - it is ordinary paragraph text.
*A continuation row needs a body row* pins that already at the document level,
where the row that cannot attach renders as a paragraph.

A marker line is its container's FIRST block, so nothing is ever above it, and
the line is prose there by construction. The item below publishes it as prose -
and then, read by shape alone, told S4 it was a table row, so the item held no
open paragraph and `tail` left it. Prose where it renders, a row where it is
asked about (markup-carve/carve#1345):

::: compare

```carve
- + a |
tail
```

```html
<ul>
  <li>+ a |
tail</li>
</ul>
```

:::

The nested spelling reaches the same first block by the same peel the heading
above uses, and answers the same way:

::: compare

```carve
- - + a |
tail
```

```html
<ul>
  <li>
    <ul>
      <li>+ a |
tail</li>
    </ul>
  </li>
</ul>
```

:::

At the item's CONTENT COLUMN there is a line above, so the question is real
rather than settled by position - and a paragraph is not a table. The line joins
that paragraph, and `tail` joins it too:

::: compare

```carve
- a
  + b |
tail
```

```html
<ul>
  <li>a
+ b |
tail</li>
</ul>
```

:::

A definition body is the third container that asks, and it asks about its last
line. As that body's only line, the shape is prose for the marker line's reason:

::: compare

```carve
:: t
:  + a |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>+ a |
tail</dd>
</dl>
```

:::

And a line above it is not enough - what the rule wants above it is a TABLE:

::: compare

```carve
:: t
:  a
   + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>a
+ b |
tail</dd>
</dl>
```

:::

Through a QUOTE the body's last line is asked the same question one container
in, and the quote holds a paragraph rather than a table - so the shape is prose
there too, and the lazy line reaches all the way down:

::: compare

```carve
:: t
:  > a
   > + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>a
+ b |
tail</p></blockquote>
  </dd>
</dl>
```

:::

## A continuation marker attaches one block, and the boundary is that block's extent

§17 L3 says it in capitals: a `+` attaches "the FOLLOWING flush-left block to
that container — ONE block of ANY kind". The trailing "up to the next blank line,
sibling marker, or a further `+`" is the **extent** of that one block, not a
count — an attached list, quote or fenced block is many lines long and still one
block (markup-carve/carve#1290).

So a marker takes the paragraph and leaves the quote below it outside the item:

::: compare

```carve
- a
+
para
> q
```

```html
<ul>
  <li>a
    para
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

A second attached block takes a second marker. This spelling already produces
identical output in all three engines, so one block costs a marker line and no
expressiveness:

::: compare

```carve
- a
+
para
+
> q
```

```html
<ul>
  <li>a
    para
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

The one block may be many lines. A wrapped paragraph is not cut at its first
line, and the quote below it is still outside:

::: compare

```carve
- a
+
p1
p2
> q
```

```html
<ul>
  <li>a
    p1
p2
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

An attached LIST is one block too, however many items it holds — the extent
clause is what carries them in:

::: compare

```carve
- a
+
> x
> y
- next
```

```html
<ul>
  <li>a
    <blockquote><p>x
y</p></blockquote>
  </li>
  <li>next</li>
</ul>
```

:::

A sibling marker ends the attachment rather than being swallowed into it, which
is the measured case that settles the reading on its own — three flat items, in
every engine:

::: compare

```carve
- a
+
- x
- y
```

```html
<ul>
  <li>a</li>
  <li>x</li>
  <li>y</li>
</ul>
```

:::

The first-block form counts the same way. `- +` opens an item whose body is the
one block that follows, and a second block needs its own marker:

::: compare

```carve
- +
para
> q
```

```html
<ul>
  <li>para</li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::

::: compare

```carve
- +
para
+
> q
```

```html
<ul>
  <li>para
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::

The block-quote form counts the same way. `> quoted` / `+` / `para` / `# H`
attaches the paragraph and leaves the heading outside the quote:

::: compare

```carve
> quoted
+
para
# H
```

```html
<blockquote>
  <p>quoted</p>
  <p>para</p>
</blockquote>
<section id="H">
  <h1>H</h1>
</section>
```

:::

And a second marker brings it in, exactly as in the list form:

::: compare

```carve
> quoted
+
para
+
# H
```

```html
<blockquote>
  <p>quoted</p>
  <p>para</p>
  <h1 id="H">H</h1>
</blockquote>
```

:::


## An unclosed verbatim run in a row stops at the closing pipe

A `|` inside an open code span is cell content, not a separator — that is what
lets `` | a `x|` | b | `` be two cells. An unclosed run has no such reach: the
row's own closing pipe still closes the row, and the run stops there
(markup-carve/carve#1284).

::: compare

```carve
| a `b | c d |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c d</code></td></tr>
  </tbody>
</table>
```

:::

It is a real row, so the table continues below it:

::: compare

```carve
| a `b | c d |
| e | f |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c d</code></td></tr>
    <tr><td>e</td><td>f</td></tr>
  </tbody>
</table>
```

:::

The same under a header row, since nothing here depends on the row's position:

::: compare

```carve
|= h |
| a `b | c |
```

```html
<table>
  <thead><tr><th scope="col">h</th></tr></thead>
  <tbody>
    <tr><td>a <code>b | c</code></td></tr>
  </tbody>
</table>
```

:::

The run's delimiter length does not matter — an unclosed double-backtick run
behaves the same:

::: compare

```carve
| a ``b | c |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b | c</code></td></tr>
  </tbody>
</table>
```

:::

The control, and the reason this is a narrow rule rather than "pipes always
split": a run that DOES close still hides the pipes inside it, so this row has
two cells and not three.

::: compare

```carve
| a `x|` | b |
```

```html
<table>
  <tbody>
    <tr><td>a <code>x|</code></td><td>b</td></tr>
  </tbody>
</table>
```

:::

And a line with content dangling after its last pipe is still prose, open run or
not — the closing-pipe requirement is unchanged.

::: compare

```carve
| a | b
```

```html
<p>| a | b</p>
```

:::

## A floating attribute is scoped to the container that holds it

PART 9 §15 A2 says a pending `{...}` applies to the next block. That answers
which BLOCK, not which container, and containment already bounds everything else
in the language — so an attribute written inside a quote, an item or a `dd` does
not survive that container's end (markup-carve/carve#1281).

A4 already dropped an attribute with no block left to attach to; a container's
end is the second way to run out of blocks, and it drops the same way. Neither
is silent: both are reported as `unattached-block-attribute`.

The attribute does not escape over a blank line onto a document-level
paragraph — `tail` here is unclassed:

::: compare

```carve
> q
> {.k}

tail
```

```html
<blockquote><p>q</p></blockquote>
<p>tail</p>
```

:::

Without the blank line the answer is the same, and it composes with §S4: the
attribute leaves no open paragraph, so the flush-left line ends the quote rather
than joining it, and A4 then has nothing left to attach to.

::: compare

```carve
> q
> {.k}
tail
```

```html
<blockquote><p>q</p></blockquote>
<p>tail</p>
```

:::

A list item is the same container question:

::: compare

```carve
- a
  {.k}

tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

And the attribute does not reach FORWARD out of the item to pull a block in
either. The heading stays outside and stays unclassed:

::: compare

```carve
- a
  {.k}
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

A definition body ends the same way:

::: compare

```carve
:: t
:  d
   {.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

An attribute block may WRAP across lines (§15 A5), and one block is one block
however many lines it takes — a body ending `{.k` / `#x}` closes the same way as
a body ending `{.k}`:

::: compare

```carve
:: t
:  d
   {.k
   #x}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

### Scoped, not disabled

The controls are what keep "scoped" from reading as "dropped". Inside its own
container the attribute attaches exactly as it always has — in a quote:

::: compare

```carve
> {.k}
>
> tail
```

```html
<blockquote><p class="k">tail</p></blockquote>
```

:::

in a list item:

::: compare

```carve
- a
  {.k}
  # H
```

```html
<ul>
  <li>a
    <h1 class="k" id="H">H</h1>
  </li>
</ul>
```

:::

in a definition body:

::: compare

```carve
:: t
:  d
   {.k}
   # H
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <h1 class="k" id="H">H</h1>
  </dd>
</dl>
```

:::

and at the top level, where the document is the container and a blank line ends
nothing:

::: compare

```carve
{.k}

tail
```

```html
<p class="k">tail</p>
```

:::

## A tab after a fence or a frontmatter opener depends on where it sits

Two clauses meet on these two lines, and which one governs is decided by
POSITION rather than by construct (markup-carve/carve#1295).

A tab BEFORE content on the opener is the marker-to-content separator, which is
the `space` terminal and nothing else, so the construct does not open - the
rule the definition, heading, list and task markers already carry. A tab at the
END of the line, with nothing after it, is never that slot: it is trailing
whitespace on a content line, PART 2 drops it, and what is left is the bare
opener. Read that way the two clauses never overlap, so neither needs an
exception written into it to protect the other.

A code fence whose info string is preceded by a tab is not a fence opener. The
backtick run is then an ordinary inline verbatim run, and it reaches the end of
the block:

::: compare

````carve
```	php
x
```
````

````html
<p><code>	php
x
</code></p>
````

:::

The same fence with the tab at the end of the line and no info string opens
normally, because the tab never reaches the separator's question:

::: compare

````carve
```	
x
```
````

````html
<pre><code>x
</code></pre>
````

:::

The frontmatter delimiter is the same pair. Its opener may name a metadata
format, so a tab before that token is the same separator and the same refusal -
the line is not a delimiter, and with no frontmatter consumed the document
starts with the text of those lines:

::: compare

```carve
---	yaml
title: x
---

body
```

```html
<p>—	yaml
title: x</p>
<hr>
<p>body</p>
```

:::

And a delimiter with a trailing tab and no format token opens frontmatter,
which renders nothing:

::: compare

```carve
---	
title: x
---

body
```

```html
<p>body</p>
```

:::

## An unclosed inline run in a line block reaches the end of the block

An inline run with no closer renders to the end of its BLOCK. A line block is
one block, so its line breaks are a rendering instruction rather than a
boundary the inline parser can see (markup-carve/carve#1282). The run therefore
carries the break, and what it carries is a NEWLINE: the break is inside the
run, so it is the run's content and not a `<br>` the container promised.

:::: compare

```carve
::: |
a `b
c d
:::
```

```html
<div class="line-block">
  <p>a <code>b
c d</code></p>
</div>
```

::::

The control is the same two lines as an ordinary paragraph, which every reader
already agreed about. One rule across both containers is what this pins, and
the line block needs no exception:

::: compare

```carve
a `b
c d
```

```html
<p>a <code>b
c d</code></p>
```

:::

And the control that keeps the container's promise intact: a run that DOES
close leaves the break outside itself, where it hardens as every other line
break in a line block does. These two documents differ by one backtick and
answer differently, which is why both are here.

:::: compare

```carve
::: |
a `b`
c d
:::
```

```html
<div class="line-block">
  <p>a <code>b</code><br>
c d</p>
</div>
```

::::

The rule is about runs, not about backticks: a math run spans the break the
same way, and its content holds the newline too.

:::: compare

```carve
::: |
a $`x
c d
:::
```

```html
<div class="line-block">
  <p>a <span class="math inline">\(x
c d\)</span></p>
</div>
```

::::

## Which inline content a heading id is derived from

The id comes from the heading's TEXT CONTENT: every inline contributes the
literal text it carries, and an inline carrying no text of its own contributes
nothing (markup-carve/carve#1283). The section stated what happens to case, to
non-ASCII characters, to typography and to a leading digit, and never which
content those rules were applied to - which is how one engine could leave math
out while keeping the code span beside it.

A math run contributes its text, exactly as the code span below it does. The
two are the same shape of node holding the same kind of verbatim text, and no
rule can keep one and drop the other - only a list can:

::: compare

```carve
# a $`x` b
```

```html
<section id="a-x-b">
  <h1>a <span class="math inline">\(x\)</span> b</h1>
</section>
```

:::

So a heading that is ONLY math has text, and does not reach the empty-text
fallback:

::: compare

```carve
# $`x`
```

```html
<section id="x">
  <h1><span class="math inline">\(x\)</span></h1>
</section>
```

:::

Display math is the same run with a wider delimiter, and contributes the same
way:

::: compare

```carve
# a $$`x` b
```

```html
<section id="a-x-b">
  <h1>a <span class="math display">\[x\]</span> b</h1>
</section>
```

:::

The control the ruling turned on: a code span already contributed its text in
every engine, and it still does. Its answer is what makes the math answer a
rule rather than a preference:

::: compare

```carve
# a `c` b
```

```html
<section id="a-c-b">
  <h1>a <code>c</code> b</h1>
</section>
```

:::

An image contributes its ALT TEXT, which is the text it carries:

::: compare

```carve
# a ![alt](i.png) b
```

```html
<section id="a-alt-b">
  <h1>a <img src="i.png" alt="alt"> b</h1>
</section>
```

:::

A link contributes its label, not its destination:

::: compare

```carve
# a [link](/u) b
```

```html
<section id="a-link-b">
  <h1>a <a href="/u">link</a> b</h1>
</section>
```

:::

An abbreviation definition written on the heading line is not a definition
there at all, so its text is heading text, verbatim:

::: compare

```carve
# a *[HTML]: x b
```

```html
<section id="a-HTML-x-b">
  <h1>a *[HTML]: x b</h1>
</section>
```

:::

A superscript contributes its content, like every other inline that wraps text:

::: compare

```carve
# a {^up^} b
```

```html
<section id="a-up-b">
  <h1>a <sup>up</sup> b</h1>
</section>
```

:::

The other half of the rule. An inline footnote carries no text of its own - the
body belongs to the note, not to the heading - so it contributes nothing, and
the marker it renders as contributes nothing either:

::: compare

```carve
# a ^[note] b
```

```html
<section id="a-b">
  <h1>a <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b</h1>
</section>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A cross-reference contributes nothing even when it RESOLVES and renders the
target's text. This is where "the construct, not the output" is load-bearing:
the id is assigned before the reference is resolved, so the rule cannot depend
on what the link ends up saying:

::: compare

```carve
## Target

# a </#Target> b
```

```html
<section id="Target">
  <h2>Target</h2>
</section>
<section id="a-b">
  <h1>a <a href="#Target">Target</a> b</h1>
</section>
```

:::

A symbol shortcode contributes nothing for the same reason, read from the other
side: a symbol resolves through processor configuration, and with no map it
renders as its own literal text - which is still not heading text:

::: compare

```carve
# a :smile: b
```

```html
<section id="a-b">
  <h1>a :smile: b</h1>
</section>
```

:::

And a line comment contributes nothing by ending the line: everything after it
is comment, so the id is derived from what is left:

::: compare

```carve
# a %% c
```

```html
<section id="a">
  <h1>a</h1>
</section>
```

:::

Two shapes are deliberately NOT settled by the list above, because the engines
still disagree about them and no ruling covers either. An EDITORIAL COMMENT
(`{# … #}`) carries literal text and renders it inside a `critic-comment` span,
and a RAW INLINE (`` `…`{=html} ``) carries a payload that is emitted verbatim:
measured on carve-js `620def4e` and the executable spec, `# a {# hidden #} b`
gives `a-b` in the engine and `a-hidden-b` in the oracle, and the raw inline
splits the same way. Both are named here rather than pinned so the sentence in
Heading IDs is not read as having answered them.

## A continuation row's open run, and an escaped closing pipe

Two shapes sit either side of the row terminator, and neither was settled by
the rule that an unclosed run stops at the row's closing pipe
(markup-carve/carve#1293).

A `+` continuation extends the cell, so the block an unclosed run reaches the
end of is that whole cell, continuation included. The run therefore spans the
row boundary and closes on the continuation row:

::: compare

```carve
| a `b |
+ c` |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b c</code></td></tr>
  </tbody>
</table>
```

:::

An escaped closing pipe is still an escape. The row closes there, because the
line ends in a pipe; what the escape decides is what the CELL holds, which is a
literal pipe and not an orphaned backslash:

::: compare

```carve
| a b \|
```

```html
<table>
  <tbody>
    <tr><td>a b |</td></tr>
  </tbody>
</table>
```

:::

The control that makes the asymmetry visible, and the argument that settled it:
every reader already honors `\|` mid-cell. Reading the escape at every position
except the last one is a position exception with nothing behind it, and `\|` is
the only way to put a literal pipe in a cell:

::: compare

```carve
| a \| b | c |
```

```html
<table>
  <tbody>
    <tr><td>a | b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

The continuation is cut into cells while that run is still open, which is what
keeps its own pipes content. Splitting it with a fresh scanner cuts inside the
run and leaves a segment with no column to join, and a dropped segment is
content loss rather than a second answer:

::: compare

```carve
| a `b |
+ c | d` |
```

```html
<table>
  <tbody>
    <tr><td>a <code>b c | d</code></td></tr>
  </tbody>
</table>
```

:::

The open run belongs to ONE column, and a continuation joins per column, so the
columns before it are still cut at their own pipes. Carrying the run across the
whole continuation line instead swallows those separators and pushes the text
into the wrong cell, which leaves the run's own cell holding an empty
`<code></code>` - the artifact this ruling rejects, produced from the other
direction:

::: compare

```carve
| x | a `b |
+ y | c` |
```

```html
<table>
  <tbody>
    <tr><td>x y</td><td>a <code>b c</code></td></tr>
  </tbody>
</table>
```

:::

## A label beginning with an at sign is not a reference label

`reference_label = (character - ']' - '@'), {character - ']'}` subtracts `@` from the first position, and that exclusion is what keeps `[@key]` free for citations. So a bracket pair whose content starts with `@` was never spelling a label, and the label slot of a reference link is no exception to it: the slot does not match, the production does not match, and the construct is not a reference link. The bracket run stays literal text, exactly as any other malformed reference does (carve#1302).

::: compare

```carve
[t][@a]
```

```html
<p>[t][@a]</p>
```

:::

The image spelling reads the same `reference_label` at the same slot, so it gets the same answer rather than a parallel rule.

::: compare

```carve
![t][@a]
```

```html
<p>![t][@a]</p>
```

:::

The control is what makes this a rule rather than a breakage: `@` at the first position ALREADY means citation, so it cannot also mean label, and an implementation that made the slot accept `@` would have to take that spelling away from citations to do it. A citation's rendering cannot be stated here - the construct is Tier-2 and the executable spec refuses it (carve#798) - so `43-citations-at-label-in-reference-position` in tests/corpus-optional carries the other half: with the Citations extension on, both spellings above are still literal text while a `[@a]` beside them resolves to a citation.

The run declines as ONE construct and is restored as one, so the `@a` inside it is text and nothing else. A rescan would read `[t][@a]` as a `[t][` run, a mention and a `]`, and with the extension on it would read the now tail-less `[@a]` as a citation - which is why the optional control renders both spellings literally on the far side of the switch.

At the HTML layer these rows cannot separate "not a reference label" from "a label nothing defines": a `@`-first label can never be defined, and a declining reference renders as its verbatim source either way. PART 12 §3a is where the readings would differ, all three engines publish an unresolved-reference node there, and the grammar clause records that without settling it.

## A comment fence at an item's content column registers nothing either

`%%%` at a list item's content column is the same construct as `%%%` at column 0. PART 9 §24 S1 places a line by the column it REACHES and never by its first character, S2 makes a line verbatim as soon as the innermost matched container is a fenced body, and §28 makes a comment fence's body verbatim and invisible. Not one of the three is scoped to column 0, so what "A definition inside a comment registers nothing" states above holds wherever the fence sits: the label is not registered, and the reference to it stays literal.

::: compare

```carve
- item
  %%%
  [r]: /url
  %%%

[r][]
```

```html
<ul>
  <li>item</li>
</ul>
<p>[r][]</p>
```

:::

The corpus stated the rule and pinned only the column-0 spelling, which is the gap two engines drifted through while staying green: carve-rs and carve-php both collected the label here and resolved the reference, where carve-js and the executable spec leave it literal (carve#1309, markup-carve/carve-rs#1047, markup-carve/carve-php#1349). carve-rs has since been fixed and reproduces this document (markup-carve/carve-rs#1052); carve-php still collects the label. Nothing about the item's own rendering was ever in question - all three render the comment as nothing and the item as `item`. The disagreement is entirely in the link table, which is why the document has to be read past the list to see it at all.

## A footnote definition inside an item's comment registers nothing

The footnote collector is a separate pass from the link-reference one in every implementation, so it is a separate place to drift and needs its own document. The rule is the same rule, and the symptom is worse: a collected footnote definition does not merely resolve a reference, it emits an endnotes section the author commented out.

::: compare

```carve
- item
  %%%
  [^f]: note body
  %%%

text[^f]
```

```html
<ul>
  <li>item</li>
</ul>
<p>text[^f]</p>
```

:::

## A comment fence opened on an item's marker line hides its body too

The fence may open on the marker line itself. `- %%%` is a bullet whose content begins with a comment fence, the closer sits at the content column, and the item is empty of everything between them. This is the spelling a container-aware reader is most likely to miss, because the fence's own line carries the marker rather than the indentation.

::: compare

```carve
- %%%
  [r]: /url
  %%%

[r][]
```

```html
<ul>
  <li></li>
</ul>
<p>[r][]</p>
```

:::

## A comment fence one item deeper registers nothing either

Nothing in §24 S2 counts containers, so a second level of nesting is not a second rule. The fence sits at the inner item's content column and hides its body exactly as it does at the outer one.

::: compare

```carve
- a
  - b
    %%%
    [r]: /url
    %%%

[r][]
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>[r][]</p>
```

:::

## A wider comment fence inside an item hides its body the same way

Fence WIDTH decides which line closes the fence (§28's exact-length closer), not whether the body is opaque. A four-percent fence at an item's content column is as invisible to the definition collector as a three-percent one, so the two axes stay independent.

::: compare

```carve
- item
  %%%%
  [r]: /url
  %%%%

[r][]
```

```html
<ul>
  <li>item</li>
</ul>
<p>[r][]</p>
```

:::

## An abbreviation inside a comment defines nothing

The abbreviation collector is a third pass again, and this is the one document in the group that has to sit at column 0: PART 12 §7 recognizes an abbreviation definition only as a direct child of the DOCUMENT, so an abbreviation written inside an item's comment is already not a definition for a reason that has nothing to do with the comment, and a document written that way could not tell the two reasons apart. At column 0 both reasons are live and only the comment is doing the work.

::: compare

```carve
%%%
*[HTML]: HyperText Markup Language
%%%

HTML here
```

```html
<p>HTML here</p>
```

:::

Its position makes it look like the link-reference case above, and the collector it exercises makes it a different document: carve-php reads the link-reference form of this shape correctly and defines the abbreviation anyway (markup-carve/carve-php#1349). An abbreviation is the worst of the three to leak, because the use site carries no bracket to give it away - the term is rewritten in running prose that never asked for it.

## A comment fence inside a colon container registers nothing

A colon container's body is parsed as blocks, so a comment fence inside one is a comment fence and its body is opaque for the same reason it is anywhere else.

:::: compare

```carve
::: note
Body.

%%%
[r]: /url
%%%
:::

[r][]
```

```html
<aside class="admonition note">
  <p>Body.</p>
</aside>
<p>[r][]</p>
```

::::

The quoted spelling is pinned too, under *A comment fence reached through a quote registers nothing either* at the end of this file. It sits there rather than here only so that adding it renumbers no existing section.

## URL-list attributes are probed token-wise

`srcset`, `imagesrcset` and `ping` carry a LIST of URLs rather than one, so the scheme probe runs on every token of the value as well as on its head, and any hit blanks the WHOLE value (PART 9 §25). The point is that a dangerous scheme gets the SAME answer wherever in the list it sits: reading position one and vouching for the rest is not a defense, it is a coincidence.

A `javascript:` candidate in the FIRST `srcset` position blanks the attribute:

::: compare no-render

```carve
![a](safe.png){srcset="javascript:alert(1) 1x, safe.png 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

The same two candidates in the other order blank it identically. This is the pair the rule exists for -- before it, the second spelling rendered verbatim in carve-js, carve-php and carve-rs alike (carve#1320):

::: compare no-render

```carve
![a](safe.png){srcset="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

`imagesrcset` has the same candidate-list grammar and gets the same treatment, so it is pinned rather than left to follow by analogy:

::: compare no-render

```carve
![a](safe.png){imagesrcset="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" imagesrcset="">
```

:::

A candidate needs no space after the comma to be a candidate, so the comma has to count as a separator in `srcset` -- a whitespace-only split would read `1x,javascript:alert(1)` as one descriptor and miss it:

::: compare no-render

```carve
![a](safe.png){srcset="safe.png 1x,javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

`ping` is a space-separated list of URLs the user agent POSTs to on activation, and a non-leading token blanks it just the same:

::: compare no-render

```carve
[y](safe.html){ping="safe.html javascript:alert(1)"}
```

```html
<p><a href="safe.html" ping="">y</a></p>
```

:::

`attributionsrc` is the fourth member and the one that is not in the HTML Standard's own attribute index. It comes from the Attribution Reporting API, browsers ship it, and it sends a request to every URL in the list, so the criterion reaches it wherever it was specified:

::: compare no-render

```carve
[y](safe.html){attributionsrc="https://example.com/s javascript:alert(1)"}
```

```html
<p><a href="safe.html" attributionsrc="">y</a></p>
```

:::

THE SEPARATORS ARE PER ATTRIBUTE, and this pair is where that shows. `ping`'s grammar holds no comma, so a lone URL carrying one in its path is one token and survives:

::: compare no-render

```carve
[y](safe.html){ping="https://example.com/a,data:x"}
```

```html
<p><a href="safe.html" ping="https://example.com/a,data:x">y</a></p>
```

:::

The same URL in `srcset` is blanked, because there a comma really does end a candidate and the split cannot tell this one from a boundary. That over-blanks a URL nobody would write, and reading it exactly would mean asking three engines for the HTML candidate-list algorithm byte for byte; the shape is pinned so they cannot each answer it differently:

::: compare no-render

```carve
![a](safe.png){srcset="https://example.com/a,data:x 1x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

The name is matched case-insensitively, like the `on` prefix, and the element still carries the author's spelling. Matching the exact bytes would leave `SRCSET` unprobed:

::: compare no-render

```carve
![a](safe.png){SRCSET="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" SRCSET="">
```

:::

PROSE ATTRIBUTES ARE NOT TOKENIZED, and this pair is the reason the rule names a closed set instead of testing every value for scheme-shaped tokens. `title`, `alt` and `aria-label` legitimately carry colons, and a blanket check would refuse ordinary text:

::: compare no-render

```carve
[z](safe.html){title="See: RFC 3986, http://example.com"}
```

```html
<p><a href="safe.html" title="See: RFC 3986, http://example.com">z</a></p>
```

:::

THE TOKEN PASS IS ADDITIVE, and this pair is what says so out loud. The four names keep the leading-scheme probe on the WHOLE value too, so a value is blanked when EITHER the whole value probes dangerous OR any token does. Every case above blanks under both readings, which is why this one exists: the value-wide probe strips the ASCII whitespace the SPLIT breaks on, so `java script:alert(1)` is two harmless tokens -- `java` carries no scheme and `script` is not denylisted -- and one denied value. An implementation that ran the token pass INSTEAD of the value-wide probe would deny less here than the leading rule denied before this rule existed, and every other document in this section would still pass:

::: compare no-render

```carve
[y](safe.html){ping="java script:alert(1)"}
```

```html
<p><a href="safe.html" ping="">y</a></p>
```

:::

The comma-separated half of the set is pinned separately, because its split is the one an implementation spells on its own: an additive value-wide probe wired into the `ping` branch and forgotten in the `srcset` branch is a reachable state, and it renders this verbatim:

::: compare no-render

```carve
![a](safe.png){srcset="java script:alert(1) 1x, safe.png 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

## An escaped hash keeps its escape at a container's content position

PART 11 §8b M2b is decided on the EMITTED LINE, so a container prefix is passed
over before the position is read. A hash at the start of a block quote's or a
list item's content opens an ATX heading exactly as one at column 0 does, and
its escape is kept there. All three engines dropped it, and a round trip through
the Markdown target turned the author's text into a heading
(markup-carve/carve#1330).

The narrowing itself does not move, which is the half a correction here is most
likely to lose. A hash the prefix does not put at the content position is still
emitted bare, and so is one that stands there but opens no heading, since M2b's
reading is CommonMark's and a run closed by a letter is not a heading. This pair
carries both directions.

::: compare

```carve
> \# heading
>
> C\# is a language

- \# heading
- \#tag rest
```

```html
<blockquote>
  <p># heading</p>
  <p>C# is a language</p>
</blockquote>
<ul>
  <li># heading</li>
  <li>#tag rest</li>
</ul>
```

:::

Nesting needs no rule of its own: the prefix is whatever the writer emitted,
`> > ` included. Neither does lazy continuation, which is a parser concept - this
writer re-prefixes every line of a container, so the last line below is emitted
with its `> ` and read at the content position like any other.

::: compare

```carve
> > \# deep

> a
\# heading
```

```html
<blockquote>
  <blockquote><p># deep</p></blockquote>
</blockquote>
<blockquote><p>a
# heading</p></blockquote>
```

:::

## A comment-only line in a line block is removed before any inline run

`comment_line` is a BLOCK - PART 1 lists it among the invisible blocks - so a
comment-only body line is decided at the block layer, before the stanza reaches
the inline parser. An unclosed verbatim run opened on an EARLIER line therefore
cannot claim it, and a stray backtick cannot turn a comment into published text
(markup-carve/carve#1333). The comment leaves an EMPTY VERSE LINE (PART 9 §23),
and the run carries that line as a newline like every other break it swallows.

:::: compare

```carve
::: |
a `b
%% secret
c
:::
```

```html
<div class="line-block">
  <p>a <code>b

c</code></p>
</div>
```

::::

The control with no run open is the shape §23 has always described and that
nothing had ever pinned: the line is gone, and the stanza keeps its shape
rather than losing a line.

:::: compare

```carve
::: |
a
%% secret
c
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
c</p>
</div>
```

::::

A TRAILING comment is a different construct and answers differently. `x %% secret`
is `inline_comment` (§21), not a comment line, and §21's third bullet is
unconditional: inside a verbatim run there is no comment there at all, only two
percent characters in content. These two documents differ only in where the `%%`
sits on its line, which is why both are here.

:::: compare

```carve
::: |
a `b
x %% secret
c
:::
```

```html
<div class="line-block">
  <p>a <code>b
x %% secret
c</code></p>
</div>
```

::::

The answer is §21's and not the container's, which is why there is no paragraph
document beside these two: `26-comments-4` already pins a `%%` inside a code span
as content, and the paragraph shape adds nothing a mutation of the rule can tell
apart from it. One rule across both containers, as the unclosed-run documents
above pin for the run itself.

An empty verse line is a LINE, not a break: it earns its `<br>` from the boundary
above it like any other line, so a comment ending a stanza adds nothing after the
break that already separates it from the line before. Two breaks on one boundary
is what the section below refuses.

:::: compare

```carve
::: |
a
%% c
:::
```

```html
<div class="line-block">
  <p>a<br>
</p>
</div>
```

::::

## A line block's hard break keeps its backslash

A line block hardens every line boundary of its own accord, and a backslash
break is NOT additive: `hard_break = '\', newline` consumes its own newline, so
no soft break survives for §23 to convert and one boundary still produces one
`<br>` (markup-carve/carve#1334). The backslash is not thereby redundant. PART 7
makes the whitespace run before it INTERIOR, so `a \` is how a verse line keeps a
LONE trailing space - and the canonical writer may not drop it, because a bare
newline makes that space line-trailing, where PART 2 strips it and formatting the
document destroys rendered content (PART 11 §7c).

:::: compare

```carve
::: |
a \
b
:::
```

```html
<div class="line-block">
  <p>a <br>
b</p>
</div>
```

::::

A `\` ALONE on a body line is how a stanza carries an empty verse line. The blank
line is the one spelling that would end the stanza instead, so a writer that drops
this backslash hands back one stanza as two.

:::: compare

```carve
::: |
a
\
b
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
b</p>
</div>
```

::::

The control that bounds the rule: a TRAILING run of TWO OR MORE columns is
already NBSP content under MEDIAL GAPS, so it survives with no backslash and the
backslash carries nothing here. This is the document whose canonical form drops
it.

:::: compare

```carve
::: |
a  \
b
:::
```

```html
<div class="line-block">
  <p>a&nbsp;&nbsp;<br>
b</p>
</div>
```

::::

## A line block's last body line keeps its backslash

PART 11 §7c lets the canonical writer spell a line block's `hard_break` as a
BARE NEWLINE, because the container hardens every line boundary of its own
accord (§23). The permission holds only where re-reading that newline yields the
same tree, and at the END of a stanza it does not: §23 hardens the boundary
BETWEEN two body lines, and the body's end is not one. A `hard_break` there is
the author's own (PART 3), the newline after it belongs to the closing fence,
and a writer that drops the backslash drops the break
(markup-carve/carve-js#1172).

No space is involved. This is the shape the clause's first wording could not
reach, because it enumerated the two cases where a bare newline is unsafe and
both of them are about whitespace.

:::: compare

```carve
::: |
a\
:::
```

```html
<div class="line-block">
  <p>a<br>
</p>
</div>
```

::::

A TRAILING run of TWO OR MORE columns is NBSP content under MEDIAL GAPS and
survives a bare newline on its own, which is why it needs no backslash INSIDE a
stanza - `345-a-line-block-s-hard-break-keeps-its-backslash-3` is that document.
At the stanza's end the break is what is at stake rather than the spaces, so the
same line answers the other way.

:::: compare

```carve
::: |
a  \
:::
```

```html
<div class="line-block">
  <p>a&nbsp;&nbsp;<br>
</p>
</div>
```

::::

A LINE THAT ENDS IN A COMMENT IS EXEMPT, and the shape that shows why is an
EMPTY comment line. The writer spells one as the marker plus a separator space,
and PART 2 strips that space again on the way back in - so the LONE TRAILING
SPACE case does not reach it: the space is inside the note rather than content
the parser is about to lose, and stripping it leaves the same node. A backslash
written to protect it lands INSIDE the note, where the block layer, which claims
the whole line before the inline parser sees it, reads it back as the comment's
own content. The same exemption is why a last body line ending in a comment
takes no backslash either: the marker runs to the end of its own line, so there
is no hard break there to spell.

:::: compare

```carve
::: |
a
%%
b
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
b</p>
</div>
```

::::

And a boundary the author spelled `\` is still a boundary, so it is still the
breaks that decide which line is last. Here the last body line is the COMMENT:
the backslash on `a ` is there to hold the LONE trailing space, and the comment
line below it is a line of its own. Asking the question of the soft-break
conversion asks it where a `\` never arrives, which kept the same note under `a`
and dropped it under `a \`.

:::: compare

```carve
::: |
a \
%% c
:::
```

```html
<div class="line-block">
  <p>a <br>
</p>
</div>
```

::::

## A comment fence reached through a quote registers nothing either

The last of the three columns a comment fence can sit at. `markup-carve/carve#1309` ruled that a definition inside a comment fence is not registered wherever the fence sits, and the corpus pinned the column-0 spelling and the indented one inside a list item. The quoted spelling was left out on the grounds that all three engines registered there, which made it a disagreement rather than a coverage gap - a carve-out that expired once the three engine tickets existed (markup-carve/carve#1341, markup-carve/carve-js#1177, markup-carve/carve-php#1402, markup-carve/carve-rs#1078).

Nothing scopes the fence by container. `comment_block` gives its body as `{character | newline}`, verbatim, and §28 and §24 C3 name no container anywhere; a rule that distinguished a fence reached through a `>` prefix from one reached through indentation would make the same four lines register or not by their prefix. The quote is empty in all four implementations, so the fence IS consumed as a comment - and the definition inside it is then read by a later pass that was looking at lines the block parser had already swallowed.

A link reference definition:

::: compare

```carve
> %%%
> [r]: /url
> %%%

See [r][].
```

```html
<blockquote>

</blockquote>
<p>See [r][].</p>
```

:::

The same fence over a footnote definition. Both kinds are here because the leak sorts definitions BY KIND, which is the evidence that no rule is being followed: carve-js registers the reference above and leaves this note literal, while carve-php and carve-rs register both. A single-kind document would let carve-js pass on the half it happens to get right.

::: compare

```carve
> %%%
> [^f]: note
> %%%

See [^f].
```

```html
<blockquote>

</blockquote>
<p>See [^f].</p>
```

:::

The control is the same two definitions with the fence taken away. They register document-wide from inside a quote in all four implementations, so what the documents above pin is the comment, not the quote:

::: compare

```carve
> [r]: /url
> [^f]: note

See [r][] [^f].
```

```html
<blockquote>

</blockquote>
<p>See <a href="/url">r</a> <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The abbreviation kind is deliberately absent, for the reason *An abbreviation inside a comment defines nothing* gives above: PART 12 §7 recognizes an abbreviation definition only as a direct child of the DOCUMENT, so `> *[ab]: abbrev` defines nothing whether a comment fence wraps it or not - all four implementations leave the use literal either way. A document written that way could not tell the two reasons apart, and it is pinned at column 0 instead, where only the comment is doing the work.
## A closed inline construct spanning a verse boundary

A line block hardens SOFT BREAKS, and §23's subject is the node: the only
question at a boundary is whether a `soft_break` is there, never what encloses
it. An emphasis run, a link label or a semantic span that spans a boundary
encloses one - the newline is a node BESIDE the construct's text - so the break
hardens exactly as it does with no construct around it
(markup-carve/carve#1351).

:::: compare

```carve
::: |
*Roses are red,
Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong></p>
</div>
```

::::

The control is DIFFERENT IN KIND rather than in depth, which is the whole of
the rule. A verbatim run that closes on a LATER line spans the same boundary
and does NOT harden it, because the newline is inside the run's own value and
there is no node for the clause to convert. That completes the set above, and
CLOSING is not what any of it turns on: a run that closes on the SAME line
leaves the break outside itself and hardens, a run that closes on a later line
and a run that never closes both hold the break in their value and do not.
These two documents differ only in which construct spans the boundary and they
answer differently:

:::: compare

```carve
::: |
a `b
c` d
:::
```

```html
<div class="line-block">
  <p>a <code>b
c</code> d</p>
</div>
```

::::

No depth is a threshold either, so one stanza answers its boundaries the same
way whether or not a construct is open across them. The pinned reading gave
this document a bare newline and then a `<br>`:

:::: compare

```carve
::: |
*Roses are red,
Violets are blue.*
And so are you.
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong><br>
And so are you.</p>
</div>
```

::::

A BACKSLASH BREAK IS NOT ADDITIVE holds at depth for the same reason it holds
at the top: the backslash consumed the newline, so no soft break survives
inside the construct either and ONE boundary still produces ONE break. An
implementation that hardens by LINE BOUNDARY rather than by node writes two
here:

:::: compare

```carve
::: |
*Roses are red,\
Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong></p>
</div>
```

::::

A LINK LABEL AND A SEMANTIC SPAN HOLD THE SAME NODE and the rule reaches them
for the same reason - every engine's tree puts a `soft_break` inside the `link`
and inside the `span`. They were not pinned here at first, because the
executable spec's `brContent` admitted no newline and so parsed no bracketed
construct across a line boundary ANYWHERE, in a line block or in an ordinary
paragraph: a fixture would have pinned that limitation rather than this rule.
That is fixed (markup-carve/carve#1352), and the shapes are pinned under
"A bracketed construct spanning a line boundary" below.

And LEADING WHITESPACE is still content inside the construct, so the two rules
compose. An implementation that answers this by re-reading the construct's raw
text loses the gap:

:::: compare

```carve
::: |
*Roses are red,
  Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
&nbsp;&nbsp;Violets are blue.</strong></p>
</div>
```

::::

## A container whose table ends on a continuation row

PART 1 S4 asks what a container's last BLOCK is, and a table is a table however
its last row is spelled. §5 T6 gives a continuation row `table_cell`s and joins
them onto the row above, so it leaves no paragraph open and the container ends
at a flush-left line (markup-carve/carve#1348).

::: compare

```carve
- | a |
  + b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

The control is the same table ending on a STANDARD row. It already answered this
way everywhere, which is what made the pair above a contradiction rather than a
second reading: two spellings of one table's last line, one question:

::: compare

```carve
- | a |
  | b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A QUOTE answers the same way, and this is the half no implementation had right:
all three engines and the executable spec kept `tail` inside the quote here while
sending it out of the same quote ending on a standard row.

::: compare

```carve
> | a |
> + b |
tail
```

```html
<blockquote>
  <table>
    <tbody>
      <tr><td>a b</td></tr>
    </tbody>
  </table>
</blockquote>
<p>tail</p>
```

:::

The quote's own standard-row control, which is the document that decided it. A
build that stops treating a standard row as a block inside a quote passes every
other document in the corpus:

::: compare

```carve
> | a |
> | b |
tail
```

```html
<blockquote>
  <table>
    <tbody>
      <tr><td>a</td></tr>
      <tr><td>b</td></tr>
    </tbody>
  </table>
</blockquote>
<p>tail</p>
```

:::

And the quote answers the same WRAPPED as it does bare, because §5's clause puts
the question to the quote's own body. An implementation that peels the `>` off
one line loses the run above it and makes one document's answer depend on what
is wrapped around it:

::: compare

```carve
:: t
:  > | a |
   > + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a b</td></tr>
        </tbody>
      </table>
    </blockquote>
  </dd>
</dl>
<p>tail</p>
```

:::

The definition body without the quote is the same answer one container in:

::: compare

```carve
:: t
:  | a |
   + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </dd>
</dl>
<p>tail</p>
```

:::

The other direction of the rule is unchanged and is what keeps this a parameter
rather than a new constant answer. With no table above it the same line is prose,
it leaves a paragraph open, and the flush-left line folds:

::: compare

```carve
- a
  + b |
tail
```

```html
<ul>
  <li>a
+ b |
tail</li>
</ul>
```

:::

## A definition at a container's content column

§10 I5 makes a link or footnote definition an INTERRUPTER, so one written at a
list item's content column ends the paragraph it sits under. Nothing about it
closes the container: the container ends because the next line arrives at column
0 with no open paragraph left to fold into, which is PART 1 S4's own "otherwise"
(markup-carve/carve#1350). And the definition BELONGS to the item at that column,
so it registers.

::: compare

```carve
- a
  [r]: /u
tail

[r][]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

The footnote kind is the same construct and answers the same way:

::: compare

```carve
- a
  [^f]: t
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The control is I5's third column, and it is what makes the rule COLUMN-SCOPED
rather than shape-scoped. One space to the left the same line is below the
content column, where it is lazy paragraph text: it registers nothing, it leaves
the paragraph open, and the flush-left line folds. These two documents differ by
a single space and answer differently:

::: compare

```carve
- a
 [r]: /u
tail

[r][]
```

```html
<ul>
  <li>a
[r]: /u
tail</li>
</ul>
<p>[r][]</p>
```

:::

An ABBREVIATION definition is not on I5's list and is recognized at document
level only, so at the same content column it is ordinary paragraph text and the
flush-left line folds:

::: compare

```carve
- a
  *[A]: x
tail
```

```html
<ul>
  <li>a
*[A]: x
tail</li>
</ul>
```

:::

A DEFINITION BODY answers exactly as the list item does, which is what keeps S4
doing the work rather than two container-specific rules:

::: compare

```carve
:: t
:  a
   [r]: /u
tail

[r][]
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

A COMMENT at a definition body's content column is on I5's list too and ends the
paragraph the same way:

::: compare

```carve
:: t
:  a
   %% c
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<p>tail</p>
```

:::

## A bracketed construct spanning a line boundary

A `[` closes at its matching `]`, and NOTHING in that scan is a line. The close
is balanced, escape- and literal-span-aware (PART 3, `link_text`), and a line
boundary is none of those things - `link_text` is `inline_content`, which folds
across lines exactly as a paragraph does. So a link label, a semantic span, an
image's alternative text, an inline note and an extension's content all admit a
soft break like any other inline content.

The executable spec used to spell every one of those content runs with a
`~newline` guard, so it read all five as literal text and the same guard sat on
the braced family beside them. Nothing pinned any of it: all three engines
crossed the boundary, and the oracle alone did not (markup-carve/carve#1352).

::: compare

```carve
See [a
b](/u) here.
```

```html
<p>See <a href="/u">a
b</a> here.</p>
```

:::

A semantic span is the same run with a different tail:

::: compare

```carve
An [a
b]{.k} span.
```

```html
<p>An <span class="k">a
b</span> span.</p>
```

:::

The LABEL TEXT of a reference link crosses too. Its reference LABEL does not,
and the two are pinned apart below:

::: compare

```carve
[a
b][r] resolves.

[r]: /u
```

```html
<p><a href="/u">a
b</a> resolves.</p>
```

:::

AN IMAGE'S ALT IS THE SAME RUN, so the two-line spelling of an image is still
one image - and a paragraph whose whole content is one image is still the
standalone image shape, not a wrapped one:

::: compare

```carve
![a
b](/i)
```

```html
<img src="/i" alt="a
b">
```

:::

and still a captionable host, for the same reason:

::: compare

```carve
![a
b](/i)
^ A caption.
```

```html
<figure>
  <img src="/i" alt="a
b">
  <figcaption>A caption.</figcaption>
</figure>
```

:::

An inline note's body is `brContent` too:

::: compare

```carve
A note ^[a
b] here.
```

```html
<p>A note <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> here.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a
b<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An inline extension closes at its own `]` and reads the same content:

::: compare

```carve
:span[a
b] here.
```

```html
<p><span class="ext-span">a
b</span> here.</p>
```

:::

THE BRACED FAMILY IS THE SAME RULE ONE DELIMITER OVER. An editorial span and a
forced span take inline content and close on their own brace pair, so a line
boundary inside one is content there as well. They are pinned here rather than
in a section of their own because the defect was one guard repeated, not five
decisions:

::: compare

```carve
An {+a
b+} insertion.
```

```html
<p>An <ins>a
b</ins> insertion.</p>
```

:::

::: compare

```carve
A {/a
b/} run.
```

```html
<p>A <em>a
b</em> run.</p>
```

:::

## A bracketed construct's identifiers stay on one line

The runs that admit a boundary are the CONTENT runs. A reference label, a
footnote label and a crossref target are physical-line identifiers, matching the
one-line definition marker they resolve against, and they keep the guard the
content runs lost. These are controls: they answer the same before and after
markup-carve/carve#1352, which is what makes them worth writing down beside it.

::: compare

```carve
[t][r
x]

[r x]: /u
```

```html
<p>[t][r
x]</p>
```

:::

::: compare

```carve
x[^f
g]

[^f g]: n
```

```html
<p>x[^f
g]</p>
```

:::

AND THE TAIL IS AN IDENTIFIER TOO, which is what keeps a captionable host
honest. An image's ALT spans lines; its destination and its reference label do
not, so a tail carrying a boundary is not an image tail and the paragraph is
ordinary prose - it neither renders as an image nor hosts the caption line
below it. These are the near misses a reading that joined the paragraph and
stopped there would swallow:

::: compare

```carve
![a][r
x]
^ cap
```

```html
<p>![a][r
x]
^ cap</p>
```

:::

::: compare

```carve
![a](/i
q)
^ cap
```

```html
<p>![a](/i
q)
^ cap</p>
```

:::

AND A BLOCK BOUNDARY IS STILL A WALL. Admitting a newline into the scan says
nothing about how far it may run: an unclosed `[` is literal text, and the
inline pass never sees past the block it is reading, so the run cannot reach
the next paragraph to find a closer there.

::: compare

```carve
x [a
y

z
```

```html
<p>x [a
y</p>
<p>z</p>
```

:::

## A bracketed construct spanning a verse boundary

The two rules compose, and this is the coverage
"A closed inline construct spanning a verse boundary" above deferred. §23's
subject is the `soft_break` NODE, and a link label spanning a stanza boundary
encloses one, so the break hardens inside the label exactly as it does inside
an emphasis run.

:::: compare

```carve
::: |
See [Roses are red,
Violets are blue.](/u)
:::
```

```html
<div class="line-block">
  <p>See <a href="/u">Roses are red,<br>
Violets are blue.</a></p>
</div>
```

::::

A semantic span holds the same node:

:::: compare

```carve
::: |
[Roses are red,
Violets are blue.]{.verse}
:::
```

```html
<div class="line-block">
  <p><span class="verse">Roses are red,<br>
Violets are blue.</span></p>
</div>
```

::::

And so does a braced construct, which is the point of the rule being about the
node rather than about a list of enclosures:

:::: compare

```carve
::: |
{+Roses are red,
Violets are blue.+}
:::
```

```html
<div class="line-block">
  <p><ins>Roses are red,<br>
Violets are blue.</ins></p>
</div>
```

::::

## A continuation row joins the row above it, whatever its cells hold

What a `+` row joins is the row above it in the SOURCE, and the only line that
declines is a delimiter row, which T7 consumes. A HEADER row is a row, so a
continuation joins it - onto a native `|=` cell as readily as onto a data cell
(markup-carve/carve#1354).

::: compare

```carve
|=a |=b |
+ cont |
```

```html
<table>
  <thead><tr><th scope="col">a cont</th><th scope="col">b</th></tr></thead>
</table>
```

:::

An all-header row that is not the table's first is joinable for the same
reason:

::: compare

```carve
| a |
|=b |
+ c |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
    <tr><th scope="row">b c</th></tr>
  </tbody>
</table>
```

:::

THE DELIMITER ROW IS WHAT DECLINES, and it declines under a NATIVE header row
too - which is what tells the two readings apart, since header-ness is present
here and the answer is still prose. *A continuation row needs a body row* above
pins the GFM spelling of the same decline:

::: compare

```carve
|=a |
| - |
+ cont |
```

```html
<table>
  <thead><tr><th scope="col">a</th></tr></thead>
</table>
<p>+ cont |</p>
```

:::

AN ALL-EMPTY CONTINUATION ROW IS ONE TOO. T2's minimum-cell guard is the
STANDARD row's - it decides what OPENS a table - and a continuation row opens
nothing and produces no `<tr>`, so a row whose every cell is empty appends
nothing, which is what T6 already provides for:

::: compare

```carve
| a |
+ |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

The two-column twin is the control that shows the guard was answering one
clause twice by column count: it was absorbed all along, because only the
one-column shape reaches a one-cell test.

::: compare

```carve
| a | b |
+ | |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

And the empty row declines under a delimiter row exactly as a filled one does,
so the two halves of this rule compose rather than override:

::: compare

```carve
| a | b |
| - | - |
+ |
```

```html
<table>
  <thead><tr><th scope="col">a</th><th scope="col">b</th></tr></thead>
</table>
<p>+ |</p>
```

:::

## A container whose table ends on a joined header row

Once the reader accepts these rows, the container boundary follows from T6's
IT LEAVES NO PARAGRAPH OPEN with no second predicate: the item's last block is
a table however its last row is spelled, so the flush-left line leaves. This is
the shape markup-carve/carve#1354 reported as a container-boundary defect - the
predicate said "row" while the reader published prose - and it is answered by
fixing the reader rather than by teaching the predicate the reader's rejections.

::: compare

```carve
- |=a |
  + b |
tail
```

```html
<ul>
  <li>
    <table>
      <thead><tr><th scope="col">a b</th></tr></thead>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

The empty spelling answers the same, which is the whole point of the two halves
being one rule:

::: compare

```carve
- | a |
  + |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A quote is asked its own body and answers alike:

::: compare

```carve
> |=a |
> + b |
tail
```

```html
<blockquote>
  <table>
    <thead><tr><th scope="col">a b</th></tr></thead>
  </table>
</blockquote>
<p>tail</p>
```

:::

## A quote inside a quote is asked what it ends on

PART 1 S4 puts the question to a quote RECURSIVELY, and "recursively" has no
depth in it: an outer quote whose last block is an inner quote is answered by
what the INNER quote ends on. A heading ends it, so the flush-left line ends
both quotes (markup-carve/carve#1355).

::: compare

```carve
> > # H
tail
```

```html
<blockquote>
  <blockquote>
    <h1 id="H">H</h1>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

The ONE-LEVEL SPELLING is the control that makes this a contradiction rather
than a gap. It has always answered this way, and it is the same derivation:

::: compare

```carve
> # H
tail
```

```html
<blockquote>
  <h1 id="H">H</h1>
</blockquote>
<p>tail</p>
```

:::

A table answers alike, which is what says the rule is about the last block and
not about headings:

::: compare

```carve
> > | a |
> > | b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

So does a thematic break:

::: compare

```carve
> > ---
tail
```

```html
<blockquote>
  <blockquote>
    <hr>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

And an INVISIBLE block, which leaves nothing on the page for a lazy line to
continue and still ends the run:

::: compare

```carve
> > [r]: /u
tail

[r][]
```

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

THREE DEEP IS THE SAME RULE, since nothing in it counts levels:

::: compare

```carve
> > > # H
tail
```

```html
<blockquote>
  <blockquote>
    <blockquote>
      <h1 id="H">H</h1>
    </blockquote>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

An earlier paragraph in the OUTER quote does not change the answer either - the
question is about the LAST block, and the last block is the inner quote:

::: compare

```carve
> a
> > # H
tail
```

```html
<blockquote>
  <p>a</p>
  <blockquote>
    <h1 id="H">H</h1>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

A TABLE ENDING ON A CONTINUATION ROW answers alike, and it is the shape that
says the question is asked with the inner quote's OWN line history rather than
of its last line alone: `+ b |` read on its own is prose (markup-carve/carve#1345),
and read under the row above it is the row that finishes the table
(§5 T6).

::: compare

```carve
> > | a |
> > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a b</td></tr>
      </tbody>
    </table>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

The same at three levels, which is what says the history is carried per depth
rather than for one:

::: compare

```carve
> > > | a |
> > > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a b</td></tr>
        </tbody>
      </table>
    </blockquote>
  </blockquote>
</blockquote>
<p>tail</p>
```

:::

THE FOLD IS UNCHANGED WHERE A PARAGRAPH IS OPEN, which is the half depth was
never a parameter of. These two are controls: they answered the same before
this rule and after it.

::: compare

```carve
> > a
tail
```

```html
<blockquote>
  <blockquote><p>a
tail</p></blockquote>
</blockquote>
```

:::

::: compare

```carve
> > # H
> > a
tail
```

```html
<blockquote>
  <blockquote>
    <h1 id="H">H</h1>
    <p>a
tail</p>
  </blockquote>
</blockquote>
```

:::

AND A RUN A LINE DOES NOT REACH HAS ENDED. A later quote at the same depth is a
NEW quote and inherits nothing from the one before it, so its first line is read
as what it is - here prose, which opens a paragraph the flush-left line folds
into. This is unanimous, and it is the near miss a reading that carried the
history without ending it would take:

::: compare

```carve
> > | a |
> # H
> > + b |
tail
```

```html
<blockquote>
  <blockquote>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </blockquote>
  <h1 id="H">H</h1>
  <blockquote><p>+ b |
tail</p></blockquote>
</blockquote>
```

:::

## A block at a container's content column ends the paragraph, whatever it renders

The content column IS the container body's column 0 (§24 C3), so a line there
is read as a BLOCK - and a block ends the paragraph above it. What the block
RENDERS is not a parameter: a comment, a definition and an attribute block all
render nothing and all three end the paragraph, none of them closes the
container, and the container ends because the FOLLOWING line arrives at
DOCUMENT column 0 with nothing to fold into (markup-carve/carve#1350,
markup-carve/carve#1357).

An ATTRIBUTE BLOCK is the control that decides the argument, because it is
invisible and every implementation already ends the item on it:

::: compare

```carve
- a
  {.k}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

So a COMMENT answers alike. It ends the paragraph and not the item; `tail` ends
the item because it is at column 0:

::: compare

```carve
- a
  %% c
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

The FENCE spelling travels with its opener (§24 C3), so it answers the same:

::: compare

```carve
- a
  %%% c
  %%%
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

THE RULE IS OVER THE BLOCK, NOT OVER ITS FIRST LINE. A footnote definition's
indented body continuation is part of that definition - the footnote parser
consumes it and permits no lazy continuation into it - so nothing of the item's
is open across any of it:

::: compare

```carve
- a
  [^f]: t
    more
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

which is the same answer the ONE-LINE spelling of that definition already gets,
and that is the point - two spellings of one definition had been answering
differently:

::: compare

```carve
- a
  [^f]: t
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A LINK reference definition has no body - it is one line in Carve - so an
indented line under it is ordinary item text and reopens the paragraph. This is
the control that says the rule is about the BLOCK'S EXTENT and not about
indentation, and it is unanimous:

::: compare

```carve
- a
  [r]: /u
    "T"
tail

[r][]
```

```html
<ul>
  <li>a
    “T”
tail
  </li>
</ul>
<p><a href="/u">r</a></p>
```

:::

## What a content-column block does not reach

Two controls, both unchanged and both unanimous. BELOW the content column at a
NONZERO column, the following line reaches the item only through the lazy fold,
and §24 C3's comment exception keeps that path open:

::: compare

```carve
- a
  %% c
 b
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
```

:::

And a line AT the content column after the block is the item's own second
paragraph, which it was before:

::: compare

```carve
- a
  [^f]: t
    more
  b

x[^f]
```

```html
<ul>
  <li>a
    b
  </li>
</ul>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A footnote definition's block runs to the end of its body

The rule is over the BLOCK, and a footnote definition's block is whatever the
footnote parser consumes - which may be more than one block of body. A blank
between the note's blocks is INTERIOR to that block, so it hands nothing back
to the container: the item ends here exactly as it does on the contiguous and
the one-line spellings of the same definition, and the flush-left line is a
document-level paragraph (markup-carve/carve#1363).

::: compare

```carve
- a
  [^f]: t

    more
tail

x[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t</p>
      <p>more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A LINK reference definition is the control, and it does not move. It has no
body, so its block is the one line: the blank falls OUTSIDE it, the indented
line below is the item's own second paragraph, and the flush-left line folds
into that. Every implementation already answers this way, which is what makes
it the control - the difference is the body, not the indentation and not the
blank:

::: compare

```carve
- a
  [r]: /u

    more
tail

[r][]
```

```html
<ul>
  <li><p>a</p>
    <p>more
tail</p>
  </li>
</ul>
<p><a href="/u">r</a></p>
```

:::

## A definition behind an alternating container prefix registers at the innermost content column

Which container's `content_column` a line reaches is decided by PART 9 §24 C5's
dedent chain: every container strips its own prefix and hands the residue down,
so the question is asked of the innermost container in the coordinates it was
handed. The shape of the prefix above it - how many quotes and list items it
alternates, in what order, and how deep - is not a parameter, and a definition
at that column registers exactly as §10 I5 says (markup-carve/carve#1368).

::: compare

```carve
- > - - x
  >     [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x</li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See <a href="/url">r</a>.</p>
```

:::

The FOOTNOTE kind of the same shape, kept beside the link because a reader that
sorts definitions by kind can pass on the half it gets right.

::: compare

```carve
- > - - x
  >     [^f]: note

See [^f].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x</li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The COLUMN control: a heading written at that same column is a block inside the
innermost item. It says the line reaches the column, so a reader that declines
the definition there is answering about the line's spelling rather than about
its column - which §24 C3 refuses.

::: compare

```carve
- > - - x
  >     # h
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>
          <ul>
            <li>x
              <h1 id="h">h</h1>
            </li>
          </ul>
        </li>
      </ul>
    </blockquote>
  </li>
</ul>
```

:::

The PEEL control: the same body with the outer list item removed, which is
precisely what C5 says that item hands down. Every implementation registers
here, so a reader that declines the first case answers one document two ways.

::: compare

```carve
> - - x
>     [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>x</li>
      </ul>
    </li>
  </ul>
</blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::

## A paragraph opened after a block in an item is still open for a lazy line

PART 1 S4 asks one question of the open stack: does any container hold an OPEN
paragraph. It does not ask where that paragraph sits among the container's
blocks. An item whose first block is a table, a fence or a quote and whose next
line is prose holds an open paragraph exactly as an item that began with prose
does, so a following flush-left line folds into it and nothing closes.

The first case is the one that separates the two readings. `| a |` is inside the
QUOTE, so at the item's own content column the block above `+ b |` is a
blockquote and not a table. PART 9 §5 T6 therefore refuses the continuation row,
the line is prose, and prose keeps the paragraph open. A reader that consults the
table through the container below - close enough to call the line a continuation
row for the purpose of ending the paragraph, while still rendering it as
text - answers one line two ways in the same parse.

::: compare

```carve
- > | a |
  + b |
tail
```

```html
<ul>
  <li>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a</td></tr>
        </tbody>
      </table>
    </blockquote>
    + b |
tail
  </li>
</ul>
```

:::

The same rule with no continuation row involved: the item opens on a table, the
next line is ordinary prose at the item's content column, and `tail` folds into
the paragraph that prose opened.

::: compare

```carve
- | a |
  b
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    b
tail
  </li>
</ul>
```

:::

The block the paragraph follows is not what decides it, so a fenced block reads
the same way.

::: compare

````carve
- ```
  c
  ```
  b
tail
````

```html
<ul>
  <li>
    <pre><code>c
</code></pre>
    b
tail
  </li>
</ul>
```

:::

CONTROL. A blank line closes the paragraph, and S4's other half then governs:
nothing in the stack holds an open paragraph, so the item ends and `tail` is a
document sibling.

::: compare

```carve
- | a |
  b

tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    b
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Here the table IS above the line at the item's own column, so the second
row extends it, no paragraph is opened at all, and `tail` is again a document
sibling. A reader that folded after a table unconditionally would answer this one
wrong.

::: compare

```carve
- | a |
  | b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
        <tr><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

## An unterminated container does not extend the item past a blank line

A blank line ends the open paragraph, whatever container stands above it. PART 1
S4 then has nothing to continue, so a following line BELOW the item's content
column is not the item's: it stands at the enclosing document's own opener
column, and the item ends there. The state of the container above the blank does
not enter the question - an unterminated `:::` div reaches no further past a
blank than a terminated one, an opaque body, a quote, or no container at all.

The executable spec answered the unterminated spelling alone. It carried the
blank as container content and left the item's paragraph open across it, so a
flush-left line folded into the div as a second paragraph, while the terminated
div, the code fence, the quote and the bare item all ended the item on the same
input. One rule was being answered two ways by whether a closer had been
written. carve-js, carve-php and carve-rs end the item in every spelling
(carve#1379).

::: compare

```carve
- ::: d
  b

tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
    </div>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Without the blank the paragraph `b` opened is still open, so the same
flush-left line folds into it under S4's lazy branch and nothing closes. The
blank is what decides, not the unterminated container - a reader that ended the
item whenever a `:::` was left open would answer this one wrong.

::: compare

```carve
- ::: d
  b
tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b
tail</p>
    </div>
  </li>
</ul>
```

:::

CONTROL. The blank ends the paragraph, not the ITEM. Content that returns at the
item's content column is still inside the div, as its second block - so a reader
that closed the item on any blank line inside an open container would answer this
one wrong in the other direction.

::: compare

```carve
- ::: d
  b

  tail
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
      <p>tail</p>
    </div>
  </li>
</ul>
```

:::

## A task item's checkbox is not decided by its first block

The checkbox belongs to the ITEM. Nothing about what the item's first block turns
out to be reaches it: it is written directly after the `<li>` opener in every
spelling, and only the content moves - beside the checkbox when the first block
renders inline, on its own indented line below it when it does not.

The executable spec emitted it only where that first block was a PARAGRAPH. Every
other marker-line opener dropped it: a block quote, a code fence, a `:::` div, a
table row, a heading and a thematic break each rendered a plain `<li>`, so the
`[ ]` or `[x]` the author wrote was gone from the output while the item itself
parsed correctly. One serializer branch built the `<li>` opener without the
checkbox, and it was the branch every non-paragraph lead takes. carve-js and
carve-php write it in all of them (carve#1381).

::: compare

```carve
- [ ] > q
- [x] # h
- [ ] ---
```

```html
<ul>
  <li><input type="checkbox" disabled> 
    <blockquote><p>q</p></blockquote>
  </li>
  <li><input type="checkbox" checked disabled> 
    <h1 id="h">h</h1>
  </li>
  <li><input type="checkbox" disabled> 
    <hr>
  </li>
</ul>
```

:::

## Only lazy folding demotes a marker-line colon opener

A `:::` opener written as the sole content of a list item's marker line opens a
container. What takes that away is LAZY FOLDING and nothing else: an opener whose
whole body arrived from lines that folded in from below the item's content column
never acquired container content at all, so it stays literal text. A blank line is
not one of those lines. It is the container's own content - the item collector
keeps it in the item body precisely because a colon fence is open above it - so an
opener a blank follows has opened an EMPTY container, not no container.

The executable spec demoted it. Its guard asked only whether the body was
non-empty, and a lone blank line satisfied that, so `- ::: d` before a blank read
as literal item text while every neighbouring spelling of the same opener was
right: at end of input, with its closer at the content column, with a body line,
and inside a quote instead of an item. Four correct neighbours against one wrong
one, and the difference was a line the collector had already decided was content.
carve-js, carve-php and carve-rs open the div (carve#1382).

::: compare

```carve
- ::: d

tail
```

```html
<ul>
  <li>
    <div class="d">

    </div>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL, and the shape the guard exists for. Here the body really is lazy: `tail`
sits below the item's content column and folds into the open paragraph the opener
line left, so the opener never acquired a body of its own and the whole item is
literal text. The blank that follows rides alongside that folded line and does not
rescue the opener - a reader that stopped asking whether folding happened, and
asked only whether the body was free of blanks, would answer this one wrong in the
other direction.

::: compare

```carve
- ::: d
tail

after
```

```html
<ul>
  <li>::: d
tail</li>
</ul>
<p>after</p>
```

:::

## A blank line before a sibling marker separates the items, whatever consumed it

Section 17 L1's first disjunct is a question about the LIST: is one item followed
by a blank line before the next sibling marker? It reads what stands BETWEEN two
items, and a blank line with nothing of the item after it stands between them
whatever the item's interior was doing with it. An unterminated container above
the blank does not change that, any more than it changes where the item ends.

The executable spec answered it by what the line was doing INSIDE the item.
A blank inside an open fence is fence content, so it recorded no separator and
the list stayed tight - for a `:::` div, an admonition, a code fence, a tilde
fence, a raw block and a comment fence alike, while the same document with the
closer written loosens in every reader. carve-js and carve-rs loosen all six;
carve-php loosens four of the six and stays tight for a code or tilde fence
(markup-carve/carve-php#1445, carve#1383).

::: compare

```carve
- ::: d
  b

- s
```

```html
<ul>
  <li>
    <div class="d">
      <p>b</p>
    </div>
  </li>
  <li><p>s</p></li>
</ul>
```

:::

The same holds where the blank is genuinely the container's CONTENT and can be
seen in the output. An unterminated code fence carries it as an empty payload
line, and it still separates the items - what L1 asks is where the line sits
relative to the marker, not which block absorbed it. Reading the payload instead
would make a structural answer depend on a detail readers already spell
differently: carve-php drops the same trailing blank from a raw block and keeps
it in a code block.

::: compare

````carve
- ```
  b

- s
````

````html
<ul>
  <li>
    <pre><code>b

</code></pre>
  </li>
  <li><p>s</p></li>
</ul>
````

:::

CONTROL. The blank must precede a marker of THIS list. A different bullet
character starts a different list under the section 11 axes, so nothing of the
first list is followed by a blank before one of its own siblings and it stays
tight - a reader that loosened on the blank alone would answer this one wrong.
The first item carries the plain text that makes the answer visible: with only
the fenced item, tight and loose render the same bytes and the case would assert
nothing.

::: compare

````carve
- a
- ```
  b

* s
````

````html
<ul>
  <li>a</li>
  <li>
    <pre><code>b

</code></pre>
  </li>
</ul>
<ul>
  <li>s</li>
</ul>
````

:::

The INTERIOR blank carve#326 C ruled on is untouched, and its own stated reason
is what separates the two: a sibling after such a fence "stays tight because no
blank line actually separates the two items". Content follows an interior blank
before the marker, so nothing stands between the items, and the case above in
this file stays tight in all four readers.

## A raw block keeps the blank line at the end of its payload too

The property is the one the fence section above states: a blank line inside a
fence is content, and the last one is content too, wherever the fence ends. A
raw block is a fence whose interior is a verbatim PAYLOAD rather than content
lines, and the payload is every line between the delimiters. Which container the
block sits in is not a parameter, and neither is whether the closer was written.

The shape that made this look unsettled is a raw block written LAST in the
document. Its payload's trailing newlines then land at the very end of the
output, where the trailing-whitespace trim every reader applies removes them, so
all four readers print the same bytes and the document cannot tell the readings
apart. Put a block after it and the payload becomes visible again (carve#1389).

::: compare

````carve
```=html
b

```

after
````

````html
b

<p>after</p>
````

:::

The same payload, inside a list item and with the fence left open. The item is
loose because a blank line stands before the sibling marker, whatever consumed
it; the blank is the payload's last line all the same.

::: compare

````carve
- ```=html
  b

- s
````

````html
<ul>
  <li>
    b

  </li>
  <li><p>s</p></li>
</ul>
````

:::

CONTROL. A payload with no blank line at the end of it gains none. This document
renders the same bytes under either reading of the case above, so it pins
nothing about the blank - it is here to catch the over-correction, a reader that
emits a separator of its own after the payload.

::: compare

````carve
```=html
b
```

after
````

````html
b
<p>after</p>
````

:::

## An unterminated fence at a content column opens no block, so the paragraph stays open

Section 10 I4 decides whether a code fence interrupts an open paragraph, and it
is a question about the CLOSER: without one the fence line is ordinary paragraph
text. That is what every reader already does at document level, where `q` over a
bare fence run over `b` is one paragraph holding an unclosed inline verbatim run
rather than a code block.

At a container's content column the same line does the same thing, so PART 1 S4
finds an open paragraph and a flush-left line below folds into it. The container
does not end, because nothing closed the paragraph (carve#1387).

::: compare

````carve
- q
  ```
tail
````

````html
<ul>
  <li>q
<code>
tail</code></li>
</ul>
````

:::

The container is not a parameter. A definition body's content column answers the
same way, and so does a block quote's - the quote spelling is the one every
reader already folded, which is what made the list spelling a contradiction
inside each of them rather than a disagreement between them.

::: compare

````carve
:: t
:  a
   ```
tail
````

````html
<dl>
  <dt>t</dt>
  <dd>a
<code>
tail</code></dd>
</dl>
````

:::

::: compare

````carve
> q
> ```
tail
````

````html
<blockquote><p>q
<code>
tail</code></p></blockquote>
````

:::

CONTROL. A blank line closes the paragraph, so S4's other half governs and the
item ends whatever container is still waiting for its closer. This is the
document the reading above must not swallow.

::: compare

````carve
- q
  ```

tail
````

````html
<ul>
  <li>q
<code></code></li>
</ul>
<p>tail</p>
````

:::

CONTROL. AT BLOCK START a fence opens a body whether or not it is terminated -
there is no paragraph for section 10 I4 to protect, and the body runs to the end
of the container. The flush-left line then has nothing to fold into and the item
ends, which is the fenced-body clause with its premise intact. Nothing in the
corpus pinned this shape before, and a reading that made every unterminated
fence at a content column absorb its container's following lines passed all 1267
documents without it.

::: compare

````carve
- a

  ```
  b
tail
````

````html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

CONTROL. A fence WITH its closer is a block, and a block leaves no paragraph
open, so the item ends on the flush-left line for the ordinary reason. The
premise the clause turns on is the closer, and this is the shape where it holds.

::: compare

````carve
- q
  ```
  y
  ```
tail
````

````html
<ul>
  <li>q
    <pre><code>y
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

## A heading at an item's content column leaves no paragraph open

The content column is the item body's column zero, so a heading written there is
the item's own heading block. It is not simultaneously a paragraph for the
purpose of deciding whether a flush-left line may fold. No paragraph is open,
and PART 1 S4 therefore ends the item before `tail`, exactly as it does when the
same heading is written on the marker line or inside a quote. All four readers
used to classify the heading correctly and then keep a phantom paragraph open
behind it (carve#1377).

::: compare

```carve
- | a |
  # h
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    <h1 id="h">h</h1>
  </li>
</ul>
<p>tail</p>
```

:::

CONTROL. Prose at that same column really does open a paragraph, so the
flush-left line lazily continues it. The earlier table does not matter once
prose becomes the item's last block.

::: compare

```carve
- | a |
  prose
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    prose
tail
  </li>
</ul>
```

:::

## A quote is reached by its marker, and a column never reaches into one

Section 10 I5's columns are read against the container a line is IN. A line that
writes no `>` is in no block quote whatever column it lands on, because section
24 C5 composes the strips and the quote's strip is its marker. Such a line
reaches the quote only through PART 1 S4's lazy fold, so it is paragraph text:
it renders where it was written and registers nothing.

What made this look like two rules is that the same line answered differently by
what the quote HELD. With a list in the quote, the line lands on the inner item's
content column, where I5 would make a definition the item's - but it is not
inside the item any more than it is inside the quote (carve#1384).

::: compare

```carve
> - x
  [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>x
[r]: /url</li>
  </ul>
</blockquote>
<p>See [r][].</p>
```

:::

The same shape one container deeper, which is the spelling the ticket reported.

::: compare

```carve
- > - x
    [r]: /url

See [r][].
```

```html
<ul>
  <li>
    <blockquote>
      <ul>
        <li>x
[r]: /url</li>
      </ul>
    </blockquote>
  </li>
</ul>
<p>See [r][].</p>
```

:::

CONTROL. The quote's body is a PARAGRAPH, and the second line is byte for byte
the one above. It folds as text and defines nothing, which is what every reader
already did - it is the document that shows the quote's body was never the
parameter.

::: compare

```carve
> x
  [r]: /url

See [r][].
```

```html
<blockquote><p>x
[r]: /url</p></blockquote>
<p>See [r][].</p>
```

:::

CONTROL. Write the marker and the definition is inside the quote, where I5 gives
it to the item whose content column it sits at. The marker is the parameter.

::: compare

```carve
> - x
>   [r]: /url

See [r][].
```

```html
<blockquote>
  <ul>
    <li>x</li>
  </ul>
</blockquote>
<p>See <a href="/url">r</a>.</p>
```

:::

## Table columns carry alignment, vertical alignment and widths

A preceding table attribute line supplies positional column defaults even when
the table has no header row. Empty entries are unset. Source widths are
percentages; the exchange AST stores the corresponding fractions. Cell-local
markers remain more specific than these defaults.

::: compare

```carve
{aligns="right,,center" valigns="top,middle,bottom" widths="25,50,25"}
| A | B | C |
| D | E | F |
```

```html
<table>
  <colgroup>
    <col style="width: 25%;">
    <col style="width: 50%;">
    <col style="width: 25%;">
  </colgroup>
  <tbody>
    <tr><td style="text-align: right; vertical-align: top;">A</td><td style="vertical-align: middle;">B</td><td style="text-align: center; vertical-align: bottom;">C</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">D</td><td style="vertical-align: middle;">E</td><td style="text-align: center; vertical-align: bottom;">F</td></tr>
  </tbody>
</table>
```

:::

## A table alignment run carries two independent axes

The horizontal marker comes first and the optional vertical marker follows it.
Rendered CSS likewise writes
`text-align` before `vertical-align`. A header-cell run supplies column defaults;
a body-cell run overrides only that cell.

::: compare

```carve
|=~ Item |=>^ Qty |
| Apple | 12 |
| Subtotal |<v 12 |
```

```html
<table>
  <thead><tr><th scope="col" style="text-align: center;">Item</th><th scope="col" style="text-align: right; vertical-align: top;">Qty</th></tr></thead>
  <tbody>
    <tr><td style="text-align: center;">Apple</td><td style="text-align: right; vertical-align: top;">12</td></tr>
    <tr><td style="text-align: center;">Subtotal</td><td style="text-align: left; vertical-align: bottom;">12</td></tr>
  </tbody>
</table>
```

:::

## An all-blank raw payload still emits its line

The payload is every line between the delimiters, so a sole blank line is not
an absent block. For a matching raw format it contributes its newline exactly
as a trailing blank does beside other content. The following paragraph keeps
that newline away from the document end, where output trimming would hide it.

::: compare

````carve
```=html

```

after
````

````html

<p>after</p>
````

:::

## A vertical table marker needs a horizontal partner

Horizontal alignment may stand alone. Vertical alignment is meaningful only as
the second axis of a paired run, so a lone `^` or `v` stays visible instead of
silently changing layout. Axes are always written horizontal then vertical;
vertical-first runs stay visible rather than switching the order.

::: compare

```carve
|=^ Top |=v Bottom |=<^ Paired |=v> Reverse |=~> Middle |
| a | b | c | d | e |
```

```html
<table>
  <thead><tr><th scope="col">^ Top</th><th scope="col">v Bottom</th><th scope="col" style="text-align: left; vertical-align: top;">Paired</th><th scope="col">v&gt; Reverse</th><th scope="col">~&gt; Middle</th></tr></thead>
  <tbody>
    <tr><td>a</td><td>b</td><td style="text-align: left; vertical-align: top;">c</td><td>d</td><td>e</td></tr>
  </tbody>
</table>
```

:::

## A collected definition closes the item paragraph

A link or footnote definition at an item's content column is an I5 block and
ends the paragraph above it. A following nonzero line below that column has no
paragraph to continue, so the item closes; §24 C3 reserves that path for a
comment. Here column 1 is below the bullet's content column 2.

::: compare

```carve
- a
  [r]: /u
 more
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>more
tail</p>
```

:::

The bare decimal-dot marker claims the same two columns as the bullet, so it
has the same boundary rather than the three-column boundary of `1. `.

::: compare

```carve
. a
  [r]: /u
 more
tail
```

```html
<ol>
  <li>a</li>
</ol>
<p>more
tail</p>
```

:::

A footnote body begins two columns beyond its definition. For `1. ` the
definition is at column 3 and its body at column 5; column 4 is item prose, so
it reopens the paragraph and the flush-left line folds into it.

::: compare

```carve
1. a
   [^f]: note
    more
tail
```

```html
<ol>
  <li>a
    more
tail
  </li>
</ol>
```

:::

At the body column the line remains part of the footnote block and opens no
item paragraph. The flush-left line is consequently outside the item.

::: compare

```carve
- a
  [^f]: note
    more
tail

see[^f]
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note
more<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## A table cell can inherit horizontal alignment

`?` in the horizontal position preserves the column's horizontal alignment
while supplying a cell-level vertical alignment. It is valid only as the first
marker of `?^`, `?~`, or `?v`; every other use stays visible content.

::: compare

```carve
|=>^ Name |= Value |
|?v Bottom |?~ Middle |
|?^ Top | plain |
|? lone |v? reversed |
|?< wrong |^< axes |
```

```html
<table>
  <thead><tr><th scope="col" style="text-align: right; vertical-align: top;">Name</th><th scope="col">Value</th></tr></thead>
  <tbody>
    <tr><td style="text-align: right; vertical-align: bottom;">Bottom</td><td style="vertical-align: middle;">Middle</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">Top</td><td>plain</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">? lone</td><td>v? reversed</td></tr>
    <tr><td style="text-align: right; vertical-align: top;">?&lt; wrong</td><td>^&lt; axes</td></tr>
  </tbody>
</table>
```

:::
