---
title: Examples
description: Side-by-side Carve source and the HTML it produces.
---

# Examples

Each pair shows the Carve source on the left and the HTML it produces on the right. The HTML rendering reflects the *intended* output — Carve itself is still a spec, so think of these as the contract a future implementation should honor.

## Emphasis

::: compare

```carve
/italic/  *bold*  /*bold italic*/
_underline_  ~strikethrough~
^super^  ,sub,  =highlight=
```

```html
<p><em>italic</em>  <strong>bold</strong>  <strong><em>bold italic</em></strong>
<u>underline</u>  <s>strikethrough</s>
<sup>super</sup>  <sub>sub</sub>  <mark>highlight</mark></p>
```

:::

The word-boundary rule applies to *every* bare delimiter (`/ * _ ~ ^ = ,` — all single-char). No bare delimiter emphasizes intraword: `foo*bar*baz`, `foo~bar~baz`, `snake_case`, `a/b/c`, `x = 5`, `key=value`, `1,2,3` all stay literal. For deliberate intraword emphasis, use the forced `{X … X}` family (below). For any bare delimiter:

- an **opener** is recognized only if it is *not* followed by whitespace **and** is preceded by the start of the line/block, whitespace, or a punctuation character (not by an alphanumeric, `_`, or the same delimiter) — so `a/b/c`, `foo_bar_baz`, `snake_case`, and `//a/` stay literal, while `(/x/)` and `a./b/` open after punctuation;
- a **closer** is recognized only if it is *not* preceded by whitespace **and** *not* followed by an alphanumeric character — so `x /a/b y` stays literal.

Highlight and subscript are the single-char `=` and `,` delimiters; the uniform word boundary keeps `x = 5`, `key=value`, `1,2,3`, `a,b,c`, `x, y, z` literal. Every bare delimiter is single-char, so a *doubled* delimiter (`==x==`, `,,x,,`) is literal by the same-delimiter-adjacency rule, just like `**x**` or `//x//`. This is *stricter* than Djot, whose `_`/`*` rule is purely whitespace-flanking. The boundary rule still allows `/usr/local/` → `<em>usr/local</em>`: the opening `/` sits at line start and the inner same-type `/` characters are literal content (Carve does not nest same-type emphasis). The normative rule lives in `resources/grammar.ebnf` PART 9 §9 and §22.

::: compare

```carve
foo*bar*baz and a/b/c stay literal.
```

```html
<p>foo*bar*baz and a/b/c stay literal.</p>
```

:::

An opener without a matching closer is left as a literal character.

::: compare

```carve
/foo bar
```

```html
<p>/foo bar</p>
```

:::

Escapes neutralize delimiters — `\/`, `\*`, `\_` render as the literal character.

::: compare

```carve
\/literal\/ and \*not bold\*
```

```html
<p>/literal/ and *not bold*</p>
```

:::

Emphasis nests freely; inner spans render inside outer ones.

::: compare

```carve
*bold with /italic/ inside* and /italic with *bold* inside/
```

```html
<p><strong>bold with <em>italic</em> inside</strong> and <em>italic with <strong>bold</strong> inside</em></p>
```

:::

Inner slashes inside a `/…/` span are literal content — a path-like span still parses as emphasis.

::: compare

```carve
/usr/local/
```

```html
<p><em>usr/local</em></p>
```

:::

Whitespace immediately after an opener (or before a closer) blocks emphasis — the delimiter renders literally.

::: compare

```carve
/ not emphasis /
```

```html
<p>/ not emphasis /</p>
```

:::

An opener may follow punctuation, not only whitespace or the line start.

::: compare

```carve
(/x/) and a./b/
```

```html
<p>(<em>x</em>) and a.<em>b</em></p>
```

:::

A closer is rejected when followed by an alphanumeric character, so an interrupted path stays literal.

::: compare

```carve
x /a/b y
```

```html
<p>x /a/b y</p>
```

:::

*No* bare delimiter produces intraword emphasis — `*` behaves like `/` and `_`.

::: compare

```carve
foo_bar_baz and snake_case stay literal
```

```html
<p>foo_bar_baz and snake_case stay literal</p>
```

:::

An emphasis opener (any bare delimiter) immediately preceded by the *same* delimiter or by a literal `_` is not valid (this does not affect different-delimiter combinations like `/*bold italic*/`, and a `_` that itself opens an underline span does not block a following opener).

::: compare

```carve
//a/ and snake_/case/
```

```html
<p>//a/ and snake_/case/</p>
```

:::

### Forced intraword emphasis

Wrapping a bare delimiter in a brace pair — `{/.../}`, `{*...*}`, `{_..._}`, `{~...~}`, `{^...^}`, `{,...,}`, `{=...=}` — forces a span with no word-boundary condition, so it emphasizes *intraword*. This is the escape hatch for the cases a bare delimiter leaves literal.

::: compare

```carve
foo{*bar*}baz and my{_path_}name and a{/b/}c
```

```html
<p>foo<strong>bar</strong>baz and my<u>path</u>name and a<em>b</em>c</p>
```

:::

The braces bound the span: a bare same-kind delimiter inside is literal, and cross-type marks nest normally.

::: compare

```carve
{/a/b/} and {/italic *bold*/}
```

```html
<p><em>a/b</em> and <em>italic <strong>bold</strong></em></p>
```

:::

Highlight is the single-char `=`; a doubled `==…==` is literal by the same-delimiter-adjacency rule.

::: compare

```carve
=marked= here, but ==doubled== is literal.
```

```html
<p><mark>marked</mark> here, but ==doubled== is literal.</p>
```

:::

`{~ … ~}` is editorial substitution when it contains a top-level `~>`, and forced strikethrough otherwise. `{= … =}` is forced highlight.

::: compare

```carve
re{~view~} it, then {~old~>new~}, and {=mark=} it.
```

```html
<p>re<s>view</s> it, then <del>old</del><ins>new</ins>, and <mark>mark</mark> it.</p>
```

:::

## Headings

::: compare

```carve
# Welcome
## Getting started
### Setup
```

```html
<section id="Welcome">
  <h1>Welcome</h1>
  <section id="Getting-started">
    <h2>Getting started</h2>
    <section id="Setup">
      <h3>Setup</h3>
    </section>
  </section>
</section>
```

:::

All six heading levels are supported.

::: compare

```carve
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

```html
<section id="H1">
  <h1>H1</h1>
  <section id="H2">
    <h2>H2</h2>
    <section id="H3">
      <h3>H3</h3>
      <section id="H4">
        <h4>H4</h4>
        <section id="H5">
          <h5>H5</h5>
          <section id="H6">
            <h6>H6</h6>
          </section>
        </section>
      </section>
    </section>
  </section>
</section>
```

:::

Attributes attach to the heading via a block-attribute line on the line above (the uniform block rule, §15) — a heading line carries no trailing `{…}` block. The rendered attribute order matches the source order. An explicit `#id` hoists to the `<section>` wrapper.

::: compare

```carve
{#install .featured}
## Setup
```

```html
<section id="install">
  <h2 class="featured">Setup</h2>
</section>
```

:::

Inline emphasis renders inside heading text.

::: compare

```carve
## Why /Carve/?
```

```html
<section id="Why-Carve">
  <h2>Why <em>Carve</em>?</h2>
</section>
```

:::

A `#` at line start without a following space is a tag, not a heading. By
default it renders as a styled inline token, not an invented link target.

::: compare

```carve
#notaheading
```

```html
<p><span class="tag"><strong>#notaheading</strong></span></p>
```

:::

A heading that skips an intermediate level still nests by section: `# H1`
followed by `### H3` places H3's `<section>` inside H1's, and Carve does not
synthesize an intervening `<h2>`/`<section>` (§13 — the stack closes only
sections at level `>= N`).

::: compare

```carve
# H1

### H3

content
```

```html
<section id="H1">
  <h1>H1</h1>
  <section id="H3">
    <h3>H3</h3>
    <p>content</p>
  </section>
</section>
```

:::

## Links

::: compare

```carve
Read [Djot](https://djot.net) for details.
```

```html
<p>Read <a href="https://djot.net">Djot</a> for details.</p>
```

:::

A quoted title after the URL becomes the `title` attribute on the anchor.

::: compare

```carve
[Site](https://example.com "Hover text")
```

```html
<p><a href="https://example.com" title="Hover text">Site</a></p>
```

:::

Single-quoted titles work too (a deliberate enhancement over djot). A literal apostrophe in a rendered title is escaped to `&apos;`.

::: compare

```carve
[A](/a 'plain') and [B](/b "Bob's")
```

```html
<p><a href="/a" title="plain">A</a> and <a href="/b" title="Bob&apos;s">B</a></p>
```

:::

Autolinks use angle brackets and produce a self-titled anchor; bare email addresses get the `mailto:` scheme.

::: compare

```carve
Visit <https://example.com> or write <hello@example.com>.
```

```html
<p>Visit <a href="https://example.com">https://example.com</a> or write <a href="mailto:hello@example.com">hello@example.com</a>.</p>
```

:::

A trailing `{…}` block attaches attributes to an autolink.

::: compare

```carve
<https://example.com>{.ext}
```

```html
<p><a href="https://example.com" class="ext">https://example.com</a></p>
```

:::

Escaped brackets render as literals, no link is produced.

::: compare

```carve
\[not a link\](https://example.com)
```

```html
<p>[not a link](https://example.com)</p>
```

:::

An empty link text is allowed and produces an empty anchor — useful as a target for a styled link.

::: compare

```carve
[](https://example.com)
```

```html
<p><a href="https://example.com"></a></p>
```

:::

A bracketed run directly followed by an attribute block is an inline span (PART 9 §14): the attributes attach to a `<span>`.

::: compare

```carve
[some text]{.highlight #note key=val}
```

```html
<p><span class="highlight" id="note" key="val">some text</span></p>
```

:::

Span content is parsed recursively, and an inline link still wins over a span.

::: compare

```carve
[a /b/ c]{.x} and [t](u)
```

```html
<p><span class="x">a <em>b</em> c</span> and <a href="u">t</a></p>
```

:::

Links never nest. When a link's text contains another link, the inner link is replaced by its text and only the outer destination applies, so explicit nesting collapses to a single anchor.

::: compare

```carve
[[x](y)](z)
```

```html
<p><a href="z">x</a></p>
```

:::

The same rule covers an autolink that lands inside a link's text: the autolink becomes plain text, never a nested anchor.

::: compare

```carve
[pre <http://h> post](/u)
```

```html
<p><a href="/u">pre http://h post</a></p>
```

:::

It also covers a crossref, which only becomes a link once it resolves: inside a link's text it contributes its resolved text, not a second anchor.

::: compare

```carve
# H

[see </#H>](/outer)
```

```html
<section id="H">
  <h1>H</h1>
  <p><a href="/outer">see H</a></p>
</section>
```

:::

The rule is about link content in the parsed tree. One renderer-level case is out of scope: a footnote reference inside a link label still renders its own `doc-noteref` anchor inside the outer anchor. Putting a footnote inside a link is unusual, and the footnote body and endnote are unaffected.

## Images

::: compare

```carve
![Apollo 11](apollo.jpg)
```

```html
<img src="apollo.jpg" alt="Apollo 11">
```

:::

## Lists

::: compare

```carve
- apples
- oranges
- pears
```

```html
<ul>
  <li>apples</li>
  <li>oranges</li>
  <li>pears</li>
</ul>
```

:::

A marker is a list item only when followed by a space **and** content. A content-less marker — bare (`-`) or trailing whitespace only (`- `) — is not a list; it stays paragraph text. The rule ignores trailing whitespace, so `-` and `- ` behave the same (an editor stripping the space can't change the meaning). Carve is stricter than CommonMark, where a bare `-` is an empty item.

::: compare

```carve
-
not a list
```

```html
<p>-
not a list</p>
```

:::

Ordered lists use `N.` prefixes — numbering starts from the first marker.

::: compare

```carve
1. first
2. second
3. third
```

```html
<ol>
  <li>first</li>
  <li>second</li>
  <li>third</li>
</ol>
```

:::

Nested lists indent two spaces under the parent item.

::: compare

```carve
- fruit
  - apples
  - oranges
- vegetables
```

```html
<ul>
  <li>fruit
    <ul>
      <li>apples</li>
      <li>oranges</li>
    </ul>
  </li>
  <li>vegetables</li>
</ul>
```

:::

Lists can mix markers — an ordered list may contain a nested unordered list (and vice versa).

::: compare

```carve
1. setup
   - clone
   - install
2. build
```

```html
<ol>
  <li>setup
    <ul>
      <li>clone</li>
      <li>install</li>
    </ul>
  </li>
  <li>build</li>
</ol>
```

:::

An ordered list nests the same way — a child indented to the parent's content column (three spaces under `1. `) is a sub-list, even though an ordered marker does not interrupt a paragraph (§10).

::: compare

```carve
1. outer
   1. inner
```

```html
<ol>
  <li>outer
    <ol>
      <li>inner</li>
    </ol>
  </li>
</ol>
```

:::

An ordered child *below* the content column does not nest: an ordered marker does not interrupt a paragraph (§10), so it folds into the item as lazy text.

::: compare

```carve
1. outer
  1. inner
```

```html
<ol>
  <li>outer
1. inner</li>
</ol>
```

:::

A task item's content column is the bullet width (2), since the checkbox is content, not marker, so a child indented to column 2 nests. A marker indented below the content column folds in as lazy continuation rather than nesting; no list marker interrupts (§10), so only a marker at or past the content column opens a sub-list.

::: compare

```carve
- [ ] outer
  - inner
```

```html
<ul>
  <li><input type="checkbox" disabled> outer
    <ul>
      <li>inner</li>
    </ul>
  </li>
</ul>
```

:::

A list marker does not interrupt an open paragraph — like an ordered marker, a bullet needs a blank line before it. An indented bullet after a prose line folds into the paragraph (lazy continuation).

::: compare

```carve
text
  - item
```

```html
<p>text
- item</p>
```

:::

With no preceding paragraph, an indented bullet simply opens a list whose base column is the indentation (Rule B).

::: compare

```carve
  - a
  - b
```

```html
<ul>
  <li>a</li>
  <li>b</li>
</ul>
```

:::

A blank line between items produces a loose list — each item wraps in a paragraph.

::: compare

```carve
- apples

- oranges
```

```html
<ul>
  <li><p>apples</p></li>
  <li><p>oranges</p></li>
</ul>
```

:::

A paragraph ends at a blank line — or at a line that begins an interrupting
block. A continuation line that starts with `>`, a valid `|…|` table row, a
heading `#`, a thematic break, or a fence with a closer interrupts the
paragraph and starts that block, with no blank line required (the
Markdown-like rule; §10). A **list marker is the exception**: neither a
bullet (`- ` / `* `) nor an ordered marker (`1.`, `1)`, `a.`, …) interrupts —
a list needs a blank line before it (symmetric, Djot-like). So a
hard-wrapped prose line that happens to begin with a bullet stays prose; the
bullet lines fold into the paragraph as lazy continuation.

::: compare

```carve
Die Frage ist x = 5
* 3 + 17 wahr.
```

```html
<p>Die Frage ist x = 5
* 3 + 17 wahr.</p>
```

:::

A heading under a prose line still interrupts it; a list — bullet or
ordered — does not, so these fold into one paragraph.

::: compare

```carve
Liste:
- eins
- zwei
```

```html
<p>Liste:
- eins
- zwei</p>
```

:::

A blank line before the marker makes it a list, even with one item.

::: compare

```carve
Text hier

- nur eins
```

```html
<p>Text hier</p>
<ul>
  <li>nur eins</li>
</ul>
```

:::

Tight nesting is unaffected by the paragraph rule: an indented marker inside an
open list item opens a sublist with no blank line, so a one-child nested list
still nests.

::: compare

```carve
- parent
  - child
```

```html
<ul>
  <li>parent
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
```

:::

A blockquote needs a blank line before it like any block; its caption line
then attaches and the pair renders as a figure.

::: compare

```carve
Intro

> Stay hungry
^ Steve Jobs
```

```html
<p>Intro</p>
<figure>
  <blockquote><p>Stay hungry</p></blockquote>
  <figcaption>Steve Jobs</figcaption>
</figure>
```

:::

After a lazy continuation line, a marker at the content column resumes the *same* sub-list rather than starting a new one (§10).

::: compare

```carve
1. outer
   1. inner
lazy
   2. sibling
```

```html
<ol>
  <li>outer
    <ol>
      <li>inner
lazy</li>
      <li>sibling</li>
    </ol>
  </li>
</ol>
```

:::

## Task lists

::: compare

```carve
- [ ] todo
- [x] done
```

```html
<ul>
  <li><input type="checkbox" disabled> todo</li>
  <li><input type="checkbox" checked disabled> done</li>
</ul>
```

:::

Only `[x]`/`[X]` render a checked box; every other state (`[ ]`, `[-]`, `[_]`, `[>]`, `[?]`) renders an unchecked box.

::: compare

```carve
- [-] dropped
- [_] paused
- [>] deferred
- [?] maybe
```

```html
<ul>
  <li><input type="checkbox" disabled> dropped</li>
  <li><input type="checkbox" disabled> paused</li>
  <li><input type="checkbox" disabled> deferred</li>
  <li><input type="checkbox" disabled> maybe</li>
</ul>
```

:::

## Blockquote with attribution

::: compare

```carve
> Stay hungry, stay foolish.
^ Steve Jobs
```

```html
<figure>
  <blockquote><p>Stay hungry, stay foolish.</p></blockquote>
  <figcaption>Steve Jobs</figcaption>
</figure>
```

:::

## Image with caption

::: compare

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

:::

A trailing attribute block is the **image's** attribute, so it stays on the
`<img>` even when the image is wrapped in a `<figure>`, the same target as a
standalone block image. To attribute the `<figure>` instead, use a preceding
block-attribute line, which floats onto the outer block (§15).

::: compare

```carve
![Apollo 11](apollo.jpg){.hero}
^ Figure 1: First moon landing
```

```html
<figure>
  <img src="apollo.jpg" alt="Apollo 11" class="hero">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::

::: compare

```carve
{.gallery}
![Apollo 11](apollo.jpg)
^ Figure 1: First moon landing
```

```html
<figure class="gallery">
  <img src="apollo.jpg" alt="Apollo 11">
  <figcaption>Figure 1: First moon landing</figcaption>
</figure>
```

:::

## Tables

::: compare

```carve
|= Fruit |= Price |
| Apple  | $1     |
| Pear   | $2     |
^ Fruit prices
```

```html
<table>
  <caption>Fruit prices</caption>
  <thead><tr><th>Fruit</th><th>Price</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td>$1</td></tr>
    <tr><td>Pear</td><td>$2</td></tr>
  </tbody>
</table>
```

:::

Single-column tables follow the same rules — one `|=` cell yields the header row.

::: compare

```carve
|= Heading |
| Row 1    |
| Row 2    |
```

```html
<table>
  <thead><tr><th>Heading</th></tr></thead>
  <tbody>
    <tr><td>Row 1</td></tr>
    <tr><td>Row 2</td></tr>
  </tbody>
</table>
```

:::

A GFM-style separator row (the second row, all dashes with optional alignment colons) is also accepted: it makes the first row the header and sets per-column alignment.

::: compare

```carve
| Name | Age |
|:-----|----:|
| Alice | 28  |
```

```html
<table>
  <thead><tr><th style="text-align: left;">Name</th><th style="text-align: right;">Age</th></tr></thead>
  <tbody>
    <tr><td style="text-align: left;">Alice</td><td style="text-align: right;">28</td></tr>
  </tbody>
</table>
```

:::

An escaped pipe inside cell content (`\|`) renders as a literal `|` and does not split the cell.

::: compare

```carve
|= Symbol |= Meaning  |
| \|      | pipe char |
```

```html
<table>
  <thead><tr><th>Symbol</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td>|</td><td>pipe char</td></tr>
  </tbody>
</table>
```

:::

Empty cells produce empty `<td>` elements — placement is preserved, not collapsed.

::: compare

```carve
|= A |= B |= C |
| 1  |    | 3  |
```

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>C</th></tr></thead>
  <tbody>
    <tr><td>1</td><td></td><td>3</td></tr>
  </tbody>
</table>
```

:::

Inline emphasis applies inside cells just like in paragraphs.

::: compare

```carve
|= Style    |= Sample      |
| italic    | /soft/        |
| strong    | *firm*        |
| code      | `literal`     |
```

```html
<table>
  <thead><tr><th>Style</th><th>Sample</th></tr></thead>
  <tbody>
    <tr><td>italic</td><td><em>soft</em></td></tr>
    <tr><td>strong</td><td><strong>firm</strong></td></tr>
    <tr><td>code</td><td><code>literal</code></td></tr>
  </tbody>
</table>
```

:::

A `|=` cell in a body row is a row header: it renders as `<th>` inside `<tbody>` while the row stays a body row. This expresses row headers (a leading first-column `<th>` per data row), which a separator row cannot. The thead is still only the leading all-header rows.

::: compare

```carve
|=         |= Diameter (km) |= Size vs Earth |
|= Mercury | 4,879.4         | 38%            |
|= Venus   | 12,104          | 95%            |
```

```html
<table>
  <thead><tr><th></th><th>Diameter (km)</th><th>Size vs Earth</th></tr></thead>
  <tbody>
    <tr><th>Mercury</th><td>4,879.4</td><td>38%</td></tr>
    <tr><th>Venus</th><td>12,104</td><td>95%</td></tr>
  </tbody>
</table>
```

:::

With no leading header row, every first cell can still be a row header — the table has no `<thead>` at all.

::: compare

```carve
|= Mercury | 4,879 |
|= Venus   | 12,104 |
```

```html
<table>
  <tbody>
    <tr><th>Mercury</th><td>4,879</td></tr>
    <tr><th>Venus</th><td>12,104</td></tr>
  </tbody>
</table>
```

:::

## Tables with rowspan and colspan

::: compare

```carve
|= Category |= Item    |= Price |
| Fruit     | Apple    | $1     |
| ^         | Banana   | $0.50  |
| Total     | <        | $1.50  |
```

```html
<table>
  <thead><tr><th>Category</th><th>Item</th><th>Price</th></tr></thead>
  <tbody>
    <tr><td rowspan="2">Fruit</td><td>Apple</td><td>$1</td></tr>
    <tr><td>Banana</td><td>$0.50</td></tr>
    <tr><td colspan="2">Total</td><td>$1.50</td></tr>
  </tbody>
</table>
```

:::

## Fenced code

::: compare

````carve
```python
print("hi")
```
````

```html
<pre><code class="language-python">print("hi")
</code></pre>
```

:::

Literal tabs in code content are preserved verbatim (a tab is not the same as spaces; display width is a CSS `tab-size` concern). Opt in to tab→space expansion with a tab-normalize extension.

::: compare

````carve
```
	indented with a tab
```
````

```html
<pre><code>	indented with a tab
</code></pre>
```

:::

A fenced block with no info string renders without a language class.

::: compare

````carve
```
plain text
```
````

```html
<pre><code>plain text
</code></pre>
```

:::

A code fence carries no inline attributes — the info string is just the language. Attributes on a code block use the standard preceding `{…}` block-attribute line; they render on the `<pre>` (the language stays `language-…` on the `<code>`).

::: compare

````carve
{.fancy #x}
```php
code
```
````

```html
<pre class="fancy" id="x"><code class="language-php">code
</code></pre>
```

:::

The info string may carry a bracketed `[label]` after the language (or a bare `[label]` with no language). The label is structured metadata — it is **not** part of the language class; the core renderer ignores it, and an extension (e.g. a code-group) may use it.

::: compare

````carve
```php [NPM]
npm install x
```
````

```html
<pre><code class="language-php">npm install x
</code></pre>
```

:::

A quoted `"header"` after the language (and before any `[label]`) sets a human-visible title for the block. Because a code block's `<pre><code>` holds atomic preformatted text, the header cannot be a child element the way an admonition title is — core carries it as the `title` attribute on the `<pre>`, and the host decides whether to render a filename bar or leave it as the native mouseover tooltip. It uses the same quoted-title token as an admonition header, but because it targets an attribute the text is literal (not inline-parsed), only HTML-escaped — so markup-like characters in a filename survive.

::: compare

````carve
```php "src/Auth.php"
$ok = true;
```
````

```html
<pre title="src/Auth.php"><code class="language-php">$ok = true;
</code></pre>
```

:::

A header and a `[label]` may combine, in that fixed order. The label stays inert in core (a code-group would use it as the tab name); the header still becomes the `title`.

::: compare

````carve
```php "src/Auth.php" [Composer]
composer require x
```
````

```html
<pre title="src/Auth.php"><code class="language-php">composer require x
</code></pre>
```

:::

A header may appear with no language, leaving the `<code>` unclassed.

::: compare

````carve
``` "notes.txt"
remember the milk
```
````

```html
<pre title="notes.txt"><code>remember the milk
</code></pre>
```

:::

The header text is literal — markup-like characters (a glob `*`, an underscore) are not parsed, so a filename survives intact in the `title`.

::: compare

````carve
```js "*.config.js"
export default {}
```
````

```html
<pre title="*.config.js"><code class="language-js">export default {}
</code></pre>
```

:::

If the preceding `{…}` block-attribute line also sets `title`, that line wins — the opener header only fills `title` when the attribute line did not.

::: compare

````carve
{title="from the attribute line"}
```php "from the header"
code
```
````

```html
<pre title="from the attribute line"><code class="language-php">code
</code></pre>
```

:::

Anything else after the language token — a bare second word, a `key="value"` pair, an inline `{…}` block, or a header and label in the wrong order — is **not** a fenced code block. There is no error: the backtick run falls back to ordinary inline parsing (an inline code span). Quotes and brackets are the only delimiters that admit metadata, and only in the order header-then-label.

::: compare

`````carve
```js title="x"
code
```
`````

```html
<p><code>js title="x"
code
</code></p>
```

:::

::: compare

`````carve
```php [Composer] "x"
code
```
`````

```html
<p><code>php [Composer] "x"
code
</code></p>
```

:::

Tildes are an alternative fence — useful when the body contains backtick fences.

::: compare

```carve
~~~yaml
key: value
~~~
```

```html
<pre><code class="language-yaml">key: value
</code></pre>
```

:::

Lengthening the fence lets a code block embed a literal triple-backtick fence as content.

::: compare

`````carve
````markdown
```python
print("hi")
```
````
`````

`````html
<pre><code class="language-markdown">```python
print("hi")
```
</code></pre>
`````

:::

Code-block content is never parsed for Carve syntax — emphasis, headings, and tags inside are literal.

::: compare

````carve
```
# not a heading
/not italic/  *not bold*  #notatag
```
````

```html
<pre><code># not a heading
/not italic/  *not bold*  #notatag
</code></pre>
```

:::

## Inline code

::: compare

```carve
Run `npm install` first.
```

```html
<p>Run <code>npm install</code> first.</p>
```

:::

Use a longer run of backticks to embed a literal backtick inside the span.

::: compare

```carve
The literal `` ` `` is one backtick.
```

```html
<p>The literal <code>`</code> is one backtick.</p>
```

:::

Carve syntax inside a code span is never parsed — it renders as literal text.

::: compare

```carve
The string `*not bold*` is literal.
```

```html
<p>The string <code>*not bold*</code> is literal.</p>
```

:::

A pipe inside an inline code span does not split the surrounding table cell.

::: compare

```carve
Use `ls | grep foo` to filter.
```

```html
<p>Use <code>ls | grep foo</code> to filter.</p>
```

:::

The opener is a maximal run of backticks and closes only on a run of the same length. A run with no matching closer is not literal text: it opens a verbatim span that runs to the end of the block. (A fence-looking ` ``` ` mid-paragraph is the common case.)

::: compare

````carve
text
```
code
````

````html
<p>text
<code>
code</code></p>
````

:::

An unclosed run is opaque: an emphasis delimiter or link tail after it is verbatim content, so the surrounding construct never closes.

::: compare

```carve
*a ` b*
```

```html
<p>*a <code> b*</code></p>
```

:::

## Admonitions

:::: compare

```carve
::: note
Heads up — this is important.
:::
```

```html
<aside class="admonition note">
  <p>Heads up — this is important.</p>
</aside>
```

::::

Carve renders `:::` blocks by a two-tier rule (PART 9 §12). The eight canonical types — `note`, `tip`, `warning`, `danger`, `info`, `success`, `example`, `quote` — render as `<aside class="admonition {type}">`. Any other identifier (`hint`, `tabs`, `mermaid`, `details`, …) renders as a generic `<div class="{type}">`, the fenced-div primitive the block-extension mechanism builds on. A quoted title after the type becomes a `<p class="admonition-title">` in either tier; the quotes are stripped and never folded into the class.

### Recognized `:::` type words

A `::: name` opener's behavior keys off the **type word** (not a class). Only these words are recognized by core; every other word is an ordinary generic `<div class="{word}">` that an extension may give meaning to.

| Type word | Renders as | Special behavior |
|-----------|-----------|------------------|
| `note` `tip` `warning` `danger` `info` `success` `example` `quote` | `<aside class="admonition {type}">` | Admonition (PART 9 §12); optional quoted title → `<p class="admonition-title">` |
| `\|` (pipe) | `<div class="line-block">` | Line block - preserves the author's per-line layout / soft breaks (PART 9 §23). The token is the pipe, not a word; an inline `::: {.line-block}` is not a fence at all (strict djot) but an ordinary paragraph. |
| *(any other word)* | `<div class="{word}">` | None in core, a generic fenced div; meaning supplied by a Tier-3 extension (e.g. `tabs`, `code-group`, `mermaid`). |

Because the behavior keys to the bare type word, give a purely presentational container a class on an **attribute line before the opener** (`{.mybox}` then `:::`) so you never collide with a recognized type word. The `:::` fence takes no inline attributes (strict djot), so an inline `::: {.mybox}` is a paragraph, not a div.

A quoted title on a canonical type renders inside the `<aside>`:

:::: compare

```carve
::: tip "Pro Tip"
Save early, save often.
:::
```

```html
<aside class="admonition tip">
  <p class="admonition-title">Pro Tip</p>
  <p>Save early, save often.</p>
</aside>
```

::::

A custom type renders as a generic `<div>` with the literal type as its class.

:::: compare

```carve
::: hint "Heads up"
Custom call-out.
:::
```

```html
<div class="hint">
  <p class="admonition-title">Heads up</p>
  <p>Custom call-out.</p>
</div>
```

::::

A `[label]` after the type (and after any quoted header) is a grouping identifier — the same `[label]` token a code fence takes. Core ignores it on a standalone block; a group extension (e.g. tabs) uses it as the tab name. It is the canonical replacement for the older tabs `{label="…"}` / inner-heading convention (both stay supported, deprecated). The `selected` default-tab marker is not a label — it stays a boolean attribute on the preceding `{…}` line.

:::: compare

```carve
::: tip "Pro Tip" [Build]
Save early, save often.
:::
```

```html
<aside class="admonition tip">
  <p class="admonition-title">Pro Tip</p>
  <p>Save early, save often.</p>
</aside>
```

::::

A typeless generic div may carry a label too (a tab member with no semantic type); core still renders a plain `<div>`.

:::: compare

```carve
::: [First]
First panel.
:::
```

```html
<div>
  <p>First panel.</p>
</div>
```

::::

As the first token after the fence, the bare `[label]` may sit directly against it (`:::[First]`), the same allowance a code fence makes for `` ```[NPM] ``.

:::: compare

```carve
:::[First]
First panel.
:::
```

```html
<div>
  <p>First panel.</p>
</div>
```

::::

:::: compare

```carve
::: warning
Mind the gap.
:::
```

```html
<aside class="admonition warning">
  <p>Mind the gap.</p>
</aside>
```

::::

An admonition may contain multiple block-level children, including lists and code blocks.

:::: compare

````carve
::: tip
Quick steps:

- read the docs
- run the demo
:::
````

```html
<aside class="admonition tip">
  <p>Quick steps:</p>
  <ul>
    <li>read the docs</li>
    <li>run the demo</li>
  </ul>
</aside>
```

::::

## Abbreviations

::: compare

```carve
The HTML spec is essential reading.

*[HTML]: HyperText Markup Language
```

```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec is essential reading.</p>
```

:::

## Mentions and tags

::: compare

```carve
Hey @alice, see #release-1.0.
```

```html
<p>Hey <span class="mention"><strong>@alice</strong></span>, see <span class="tag"><strong>#release-1.0</strong></span>.</p>
```

:::

## Inline extensions

::: compare

```carve
Press :kbd[Ctrl+C] to copy.
```

```html
<p>Press <kbd>Ctrl+C</kbd> to copy.</p>
```

:::

## Attributes

::: compare

```carve
{.large #intro}
# Title

A paragraph with [a styled link](url){.btn .primary}.
```

```html
<section id="intro">
  <h1 class="large">Title</h1>
  <p>A paragraph with <a href="url" class="btn primary">a styled link</a>.</p>
</section>
```

:::

An inline `{...}` attaches to the preceding inline node — including an inline code span. (The `{=html}` / `{=latex}` raw-inline form is a separate rule.)

::: compare

```carve
`code`{.cls}
```

```html
<p><code class="cls">code</code></p>
```

:::

A `{...}` line on its own attaches to the next block (PART 9 §15).

::: compare

```carve
{.note}
This paragraph gets the class.
```

```html
<p class="note">This paragraph gets the class.</p>
```

:::

Consecutive attribute lines merge, and classes accumulate in source order.

::: compare

```carve
{.a}
{.b}
Merged.
```

```html
<p class="a b">Merged.</p>
```

:::

Block attributes attach to any block — here, a list.

::: compare

```carve
{.todo}
- one
- two
```

```html
<ul class="todo">
  <li>one</li>
  <li>two</li>
</ul>
```

:::

Attributes render in the order written in the source — classes merge into one `class` at the first class's position (PART 9 attributes rule).

::: compare

```carve
[label]{key=c .a #b}
```

```html
<p><span key="c" class="a" id="b">label</span></p>
```

:::

## Frontmatter

::: compare

```carve
---
title: My Document
author: Jane Doe
date: 2026-03-15
---

Content begins here.
```

```html
<p>Content begins here.</p>
```

:::

The opening delimiter may name the metadata format (`---yaml`, `---json`, `---toml`, `---neon`, …); a bare `---` defaults to YAML. Either way the frontmatter is metadata, not rendered. The closing delimiter is always a bare `---`.

::: compare

```carve
---json
{"title": "My Document"}
---

Content begins here.
```

```html
<p>Content begins here.</p>
```

:::

The space between `---` and the format token is optional — `---toml` and `--- toml` are both accepted (the no-space form is canonical), matching code fences: ` ```php ` is canonical, though a space after the fence is accepted for compatibility.

::: compare

```carve
--- toml
title = "My Document"
---

Content begins here.
```

```html
<p>Content begins here.</p>
```

:::

## Heading IDs

Heading ids are **case-preserving** by default and apply no Unicode
normalization: a heading keeps its original case and any non-ASCII characters
verbatim. Cross-references resolve **case-insensitively**, so a lowercase
`</#getting-started>` still points at a `Getting-Started` heading.

::: compare

```carve
# Café Notes

# Über uns

# 2024 Recap

## Setup

## Setup

{#api-v2}
# API

See </#cafe-notes>, </#section-2024-recap>, </#setup-2>, and </#api-v2>.
```

```html
<section id="Café-Notes">
  <h1>Café Notes</h1>
</section>
<section id="Über-uns">
  <h1>Über uns</h1>
</section>
<section id="s-2024-Recap">
  <h1>2024 Recap</h1>
  <section id="Setup">
    <h2>Setup</h2>
  </section>
  <section id="Setup-2">
    <h2>Setup</h2>
  </section>
</section>
<section id="api-v2">
  <h1>API</h1>
  <p>See &lt;/#cafe-notes&gt;, &lt;/#section-2024-recap&gt;, <a href="#Setup-2">Setup</a>, and <a href="#api-v2">API</a>.</p>
</section>
```

:::

A cross-reference matches its target case-insensitively and links to the
target's actual (case-preserved) id, so the reference can be written in
lowercase regardless of how the heading is capitalized.

::: compare

```carve
# Getting Started

Jump to </#getting-started>.
```

```html
<section id="Getting-Started">
  <h1>Getting Started</h1>
  <p>Jump to <a href="#Getting-Started">Getting Started</a>.</p>
</section>
```

:::

Non-ASCII symbols, marks, and punctuation are kept verbatim; only runs of
ASCII non-alphanumerics collapse to a single hyphen.

::: compare

```carve
# Café Crème

# Hello • World

# 中文、标题
```

```html
<section id="Café-Crème">
  <h1>Café Crème</h1>
</section>
<section id="Hello-•-World">
  <h1>Hello • World</h1>
</section>
<section id="中文、标题">
  <h1>中文、标题</h1>
</section>
```

:::

Smart-typography substitutions (curly quotes, dashes, ellipsis, arrows, and
the like) are reversed to their ASCII source before the id is computed, so an
id never depends on presentational typography.

::: compare

```carve
# Don't repeat yourself

# Step 1 -> done...
```

```html
<section id="Don-t-repeat-yourself">
  <h1>Don’t repeat yourself</h1>
</section>
<section id="Step-1-done">
  <h1>Step 1 → done…</h1>
</section>
```

:::

A slug that begins with any Unicode number (Arabic-Indic digits, superscripts,
Roman numerals) is prefixed with `s-`, because a leading digit is a valid HTML
id but not a bare CSS selector.

::: compare

```carve
# ١٢٣ heading

# ²super

# Ⅷ chapter
```

```html
<section id="s-١٢٣-heading">
  <h1>١٢٣ heading</h1>
</section>
<section id="s-²super">
  <h1>²super</h1>
</section>
<section id="s-Ⅷ-chapter">
  <h1>Ⅷ chapter</h1>
</section>
```

:::

A heading whose text yields no identifier characters falls back to `s`.

::: compare

```carve
# ( )
```

```html
<section id="s">
  <h1>( )</h1>
</section>
```

:::

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

## Reference link

`[text][label]` resolves against a `[label]: url "title"` definition
anywhere in the document (order-independent). The definition line
itself produces no output.

::: compare

```carve
Read the [introduction][intro] first.

[intro]: https://example.com/intro "Introduction"
```

```html
<p>Read the <a href="https://example.com/intro" title="Introduction">introduction</a> first.</p>
```

:::

A trailing attribute block attaches to the resolved `<a>`, the same slot an
inline link uses (grammar `reference_link`).

::: compare

```carve
Read the [intro][x]{.ext} first.

[x]: /intro
```

```html
<p>Read the <a href="/intro" class="ext">intro</a> first.</p>
```

:::

## Collapsed reference link

`[text][]` uses the link text as the label.

::: compare

```carve
See [Other Page][] for details.

[Other Page]: /other-page
```

```html
<p>See <a href="/other-page">Other Page</a> for details.</p>
```

:::

A trailing attribute block attaches to the resolved `<a>` here too
(grammar `collapsed_reference_link`).

::: compare

```carve
See [Other][]{.ext} for details.

[Other]: /other
```

```html
<p>See <a href="/other" class="ext">Other</a> for details.</p>
```

:::

## Unresolved reference link

A reference with no matching definition renders as literal text.

::: compare

```carve
A [missing][nope] ref stays literal.
```

```html
<p>A [missing][nope] ref stays literal.</p>
```

:::

## Smart typography dashes and quotes

`--` `---` `...` become en/em dashes and ellipsis; straight quotes
become contextual curly quotes.

::: compare

```carve
He paused -- then ran --- fast... "Stop!" it's over.
```

```html
<p>He paused – then ran — fast… “Stop!” it’s over.</p>
```

:::

A single quote before a digit is an apostrophe (decade elision), so a digit pair becomes apostrophes on both sides; a quote before a letter in an open context opens.

::: compare

```carve
the '70s and '24' and 'word'
```

```html
<p>the ’70s and ’24’ and ‘word’</p>
```

:::

A run of four or more hyphens is allocated into em/en dashes (all em if divisible by 3, all en if by 2, otherwise max em-dashes with an en remainder) — matching djot.

::: compare

```carve
a---- b----- c------
```

```html
<p>a–– b—– c——</p>
```

:::

## Smart typography arrows and symbols

Arrows, comparisons, plus/minus and symbols are converted. Fractions are
intentionally **not** converted (they collide with dates and paths; see
`docs/dismissed-syntax.md`).

::: compare

```carve
Flow: a -> b <- c <-> d => e; x != y, p <= q, r >= s, +-1.
(c) 2024, (r), (tm). Dates like 1/2/2024 stay literal.
```

```html
<p>Flow: a → b ← c ↔ d ⇒ e; x ≠ y, p ≤ q, r ≥ s, ±1.
© 2024, ®, ™. Dates like 1/2/2024 stay literal.</p>
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

## Math

Inline math is `` $`…` `` and display math `` $$`…` ``. Wrapping the
content in a backtick span removes any ambiguity with a literal `$`, so
currency stays literal. The output matches djot.

::: compare

```carve
Inline $`E = mc^2` and currency $5 stays literal.

$$`\int_0^1 x\,dx`
```

```html
<p>Inline <span class="math inline">\(E = mc^2\)</span> and currency $5 stays literal.</p>
<p><span class="math display">\[\int_0^1 x\,dx\]</span></p>
```

:::

A trailing attribute block applies to the math span, merging classes into the
existing `math inline` / `math display` class (math reuses the code-span
attribute slot). The `{=format}` raw form is code-span-only and is not inherited
by math: `` $`x`{=html} `` leaves the `{=html}` literal.

::: compare

```carve
$`a^2`{.boxed #eq1 data-k=v}
```

```html
<p><span class="math inline boxed" id="eq1" data-k="v">\(a^2\)</span></p>
```

:::

## Footnotes

A `[^label]` reference is numbered by document order; its `[^label]: …`
definition renders in an endnotes section with a backlink, using djot's
`doc-noteref` / `doc-endnotes` / `doc-backlink` roles.

::: compare

```carve
Carve has footnotes.[^fn]

[^fn]: Defined anywhere; resolved by label.
```

```html
<p>Carve has footnotes.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Defined anywhere; resolved by label.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A reference definition is invisible metadata, so it still ends the paragraph
even with no blank line (§10); indented lines continue the note body.

::: compare

```carve
See the note[^m].
[^m]: First line of the note
   and a continuation line.
```

```html
<p>See the note<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>First line of the note
and a continuation line.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A footnote definition that is never referenced produces no endnotes section.

::: compare

```carve
text
[^f]: note
```

```html
<p>text</p>
```

:::

A trailing attribute block on a reference attaches to the noteref `<a>`
(grammar PART 9 §16). Only the reference where the author wrote the block
carries it.

::: compare

```carve
Text[^a]{.ref}.

[^a]: note.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref" class="ref"><sup>1</sup></a>.</p>
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

A note referenced more than once gets a distinct `fnref` id per reference and one numbered backlink per reference (`↩` with a superscript), so each return arrow points back to its own reference. (A note referenced once keeps a plain `↩`.)

::: compare

```carve
See[^m] and again[^m].

[^m]: One note, two refs.
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and again<a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>One note, two refs.<a href="#fnref1" role="doc-backlink">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink">↩<sup>2</sup></a></p>
    </li>
  </ol>
</section>
```

:::

## Generic divs

A bare `:::` opener with no type word is djot's generic container: a plain
`<div>` (a typed `::: word` is a two-tier admonition/div instead). The
fence line carries no inline attributes (strict djot); to attribute a div,
put a `{…}` block-attribute line before the opener, which floats onto it.

:::: compare

```carve
:::
A plain box.
:::

{#s .sidebar}
:::
A div with attributes.
:::
```

```html
<div>
  <p>A plain box.</p>
</div>
<div id="s" class="sidebar">
  <p>A div with attributes.</p>
</div>
```

::::

An inline attribute block on the fence line is **not** a div: the opener is
an ordinary paragraph (matching canonical djot).

:::: compare

```carve
::: {.sidebar}
not a div
:::
```

```html
<p>::: {.sidebar}
not a div
:::</p>
```

::::

The type word is a grammar identifier, so it may start with an underscore.

:::: compare

```carve
::: _box
content
:::
```

```html
<div class="_box">
  <p>content</p>
</div>
```

::::

A grammar identifier cannot start with a digit, so a digit-first token is
not a valid type word: the opener is an ordinary paragraph (a `class="123"`
would also be invalid CSS). This is a deliberate divergence from djot,
which would accept it.

:::: compare

```carve
::: 123
not a div
:::
```

```html
<p>::: 123
not a div
:::</p>
```

::::

## Definition lists

`:: term` (one or more) then `:  definition` (one or more) form an entry,
rendered as a `<dl>` of `<dt>` then `<dd>`. Two colons is a term; three
is a div/admonition.

::: compare

```carve
:: color
:: colour
:  The visual property of objects.
:  A pigment or paint.
```

```html
<dl>
  <dt>color</dt>
  <dt>colour</dt>
  <dd>The visual property of objects.</dd>
  <dd>A pigment or paint.</dd>
</dl>
```

:::

## Comments

`%%` starts a line comment and a `%%%` fence a block comment; neither is
rendered.

::: compare

```carve
Visible.

%% this line is a comment

%%%
a hidden
block
%%%

Also visible.
```

```html
<p>Visible.</p>
<p>Also visible.</p>
```

:::

A trailing `%%` (preceded by a space or at the start of the line) comments out
the rest of the physical line. The visible prefix is kept; the comment is not
rendered.

::: compare

```carve
Also visible. %% this tail is a comment
```

```html
<p>Also visible.</p>
```

:::

Without a space before it, `%%` is literal - so percentages and `a%%b` are safe.

::: compare

```carve
50%% off and a%%b stay literal.
```

```html
<p>50%% off and a%%b stay literal.</p>
```

:::

`%%` inside a code span is verbatim.

::: compare

```carve
Run `a %% b` then done. %% gone
```

```html
<p>Run <code>a %% b</code> then done.</p>
```

:::

A trailing comment works in a heading; it does not affect the generated id.

::: compare

```carve
# Title %% editor note
```

```html
<section id="Title">
  <h1>Title</h1>
</section>
```

:::

A trailing comment ends at the line break; the next line of the paragraph stays.

::: compare

```carve
foo %% note
bar
```

```html
<p>foo
bar</p>
```

:::

## Raw blocks

A ` ```=FORMAT ` block (a code fence whose info string is `=FORMAT`) passes its
content through verbatim when FORMAT matches the output; other formats are
dropped. This is the block parallel of the inline raw `{=format}` attribute.

::: compare

````carve
```=html
<custom-el>Verbatim HTML</custom-el>
```
````

````html
<custom-el>Verbatim HTML</custom-el>
````

:::

## Hard line breaks

A backslash at the end of a line forces a `<br>`.

::: compare

```carve
line one\
line two
```

```html
<p>line one<br>
line two</p>
```

:::

## Non-breaking space

A backslash before a space produces a non-breaking space.

::: compare

```carve
10\ kg
```

```html
<p>10&nbsp;kg</p>
```

:::

A non-breaking space counts as whitespace for smart-quote flanking, so a quote that follows one opens (exactly as it would after an ordinary space).

::: compare

```carve
say\ 'twas a fine\ "day"
```

```html
<p>say&nbsp;‘twas a fine&nbsp;“day”</p>
```

:::

## Raw inline

A verbatim span tagged `{=format}` passes through when the format
matches the output; otherwise it is dropped.

::: compare

```carve
Use `<br>`{=html} to break, and `\foo`{=latex} is dropped.
```

```html
<p>Use <br> to break, and  is dropped.</p>
```

:::

## Emoji

`:name:` is an emoji shortcode resolved against a processor-supplied map;
with no map it renders literally. `:type[…]` is still an extension.

::: compare

```carve
Great :rocket: and :kbd[Ctrl] is an extension.
```

```html
<p>Great :rocket: and <kbd>Ctrl</kbd> is an extension.</p>
```

:::

## Ordered list start and delimiter

An ordered list that begins above 1 emits `start`; the `)` delimiter is
accepted (and a delimiter change starts a new list).

::: compare

```carve
3. third
4. fourth
```

```html
<ol start="3">
  <li>third</li>
  <li>fourth</li>
</ol>
```

:::

::: compare

```carve
1) one
2) two
```

```html
<ol>
  <li>one</li>
  <li>two</li>
</ol>
```

:::

## Ordered list dialects

Alphabetic (`a.`/`A.`) and roman (`i.`/`I.`) markers set the `<ol type>`;
the first item fixes the dialect and `start`.

::: compare

```carve
a. apple
b. banana
```

```html
<ol type="a">
  <li>apple</li>
  <li>banana</li>
</ol>
```

:::

::: compare

```carve
iv. four
v. five
vi. six
```

```html
<ol type="i" start="4">
  <li>four</li>
  <li>five</li>
  <li>six</li>
</ol>
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

## Editorial markup

CriticMarkup-style review marks: insert, delete, substitute, and an inline
comment. The `{~ … ~}` pair is substitution only when it contains a top-level
`~>`; without it, it is forced strikethrough (see Forced intraword emphasis).
`{# … #}` is the comment (no collision — `#` is not an emphasis delimiter).

::: compare

```carve
a {+ins+} {-del-} {~old~>new~} b{# note #}
```

```html
<p>a <ins>ins</ins> <del>del</del> <del>old</del><ins>new</ins> b<span class="critic-comment"> note </span></p>
```

:::

`{=text=}` is forced highlight (`<mark>`), and bare highlight is single-char
`=`. The raw-inline format attribute has its own shape — `{=html}` (no trailing
`=` before `}`) on a code span is raw passthrough, distinct from the
forced-highlight `{=text=}`.

::: compare

```carve
=x= and {=y=} both mark.
```

```html
<p><mark>x</mark> and <mark>y</mark> both mark.</p>
```

:::

## Thematic breaks

A line of three or more `-`, `*`, or `_` is a thematic break.

::: compare

```carve
a

---

b

***

c

___
```

```html
<p>a</p>
<hr>
<p>b</p>
<hr>
<p>c</p>
<hr>
```

:::

## Cross-reference

`</#id>` links to a heading and fills in its text (here, standalone).

::: compare

```carve
# Getting Started

See </#getting-started>.
```

```html
<section id="Getting-Started">
  <h1>Getting Started</h1>
  <p>See <a href="#Getting-Started">Getting Started</a>.</p>
</section>
```

:::

## Autolinks

A `<url>` or `<email>` in angle brackets becomes a self-titled link;
email gets a `mailto:` scheme.

::: compare

```carve
<https://example.com> and <a@b.com>
```

```html
<p><a href="https://example.com">https://example.com</a> and <a href="mailto:a@b.com">a@b.com</a></p>
```

:::

## Escapes

A backslash before ASCII punctuation makes it literal.

::: compare

```carve
\*lit\* \[x\] \#h \@u
```

```html
<p>*lit* [x] #h @u</p>
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

## Bare URLs stay literal

A bare URL is not auto-linked (matching djot); wrap it in `<…>` to link.

::: compare

```carve
see https://example.com now
```

```html
<p>see https://example.com now</p>
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

## Inline span

A bracketed run followed by an attribute block is a `<span>`.

::: compare

```carve
A [styled run]{.hl} here.
```

```html
<p>A <span class="hl">styled run</span> here.</p>
```

:::

A valid attribute block forms a span even when it is empty — an empty `{}` is
the explicit "make this a span" hook (it can be decorated by a processor).

::: compare

```carve
[x]{}
```

```html
<p><span>x</span></p>
```

:::

A whitespace-only block (`{ }`) is also a valid empty block and forms the
same bare span.

::: compare

```carve
[x]{ }
```

```html
<p><span>x</span></p>
```

:::

A block whose content is not a recognized attribute (e.g. `{???}`) is not
an attribute block at all: the brackets and the block render literally.

::: compare

```carve
[x]{???}
```

```html
<p>[x]{???}</p>
```

:::

The bracket content is still inline-parsed even when the trailing block is
invalid, so emphasis inside the brackets is rendered.

::: compare

```carve
[*x*]{???}
```

```html
<p>[<strong>x</strong>]{???}</p>
```

:::

## Superscript and subscript

`^x^` is superscript and `,x,` is subscript — both single-char bare delimiters
under the uniform word-boundary rule, so they mark only at a word boundary; for
the common intraword cases (H₂O, mc²) use the forced `{^…^}` / `{,…,}` family.

::: compare

```carve
H{,2,}O and E=mc{^2^}
```

```html
<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>
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
is literal by the same-delimiter-adjacency rule, so `==x==` and `,,y,,` are
doubled `=` / `,` and render literal, while the single-char `=z=` and `,w,`
mark.

::: compare

```carve
==x== ,,y,, =z= ,w,
```

```html
<p>==x== ,,y,, <mark>z</mark> <sub>w</sub></p>
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

## Numbered cross-references

A `#` in a caption is a number placeholder: the label is the text before it,
the number is injected in its place, and `</#id>` to the element resolves to
"label + number".

::: compare

```carve
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset
```

```html
<figure id="fig-sun">
  <img src="sun.jpg" alt="A sunset">
  <figcaption>Figure 1: A sunset</figcaption>
</figure>
```

:::

Numbers run per label, in document order.

::: compare

```carve
![one](a.jpg)
^ Figure #: one

![two](b.jpg)
^ Figure #: two
```

```html
<figure>
  <img src="a.jpg" alt="one">
  <figcaption>Figure 1: one</figcaption>
</figure>
<figure>
  <img src="b.jpg" alt="two">
  <figcaption>Figure 2: two</figcaption>
</figure>
```

:::

A `</#id>` to a numbered caption fills its text with the label and number.

::: compare

```carve
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset

See </#fig-sun> for the colors.
```

```html
<figure id="fig-sun">
  <img src="sun.jpg" alt="A sunset">
  <figcaption>Figure 1: A sunset</figcaption>
</figure>
<p>See <a href="#fig-sun">Figure 1</a> for the colors.</p>
```

:::

Tables use the same placeholder; the number lands in the `<caption>`.

::: compare

```carve
{#tbl-r}
|= Item |= Qty |
| Apple | 3 |
^ Table #: Stock

See </#tbl-r>.
```

```html
<table id="tbl-r">
  <caption>Table 1: Stock</caption>
  <thead><tr><th>Item</th><th>Qty</th></tr></thead>
  <tbody>
    <tr><td>Apple</td><td>3</td></tr>
  </tbody>
</table>
<p>See <a href="#tbl-r">Table 1</a>.</p>
```

:::

Labels bucket independently, so other languages number on their own.

::: compare

```carve
![a](a.jpg)
^ Abbildung #: erstes

![b](b.jpg)
^ Figure #: first
```

```html
<figure>
  <img src="a.jpg" alt="a">
  <figcaption>Abbildung 1: erstes</figcaption>
</figure>
<figure>
  <img src="b.jpg" alt="b">
  <figcaption>Figure 1: first</figcaption>
</figure>
```

:::

A `#word` stays a tag, never a number placeholder.

::: compare

```carve
![chart](c.jpg)
^ See #data for details
```

```html
<figure>
  <img src="c.jpg" alt="chart">
  <figcaption>See <span class="tag"><strong>#data</strong></span> for details</figcaption>
</figure>
```

:::

An escaped `\#` is a literal number sign, never a placeholder.

::: compare

```carve
![price](p.jpg)
^ Costs \# units
```

```html
<figure>
  <img src="p.jpg" alt="price">
  <figcaption>Costs # units</figcaption>
</figure>
```

:::

A caption after a fenced code block makes it a numbered **listing**: the block
is wrapped in a `<figure>`, and `</#id>` resolves to "Listing N" on the same
per-label counter as figures and tables.

::: compare

````carve
{#lst-greet}
```python
def greet():
    return 1
```
^ Listing #: a greeting

See </#lst-greet>.
````

```html
<figure id="lst-greet">
  <pre><code class="language-python">def greet():
    return 1
</code></pre>
  <figcaption>Listing 1: a greeting</figcaption>
</figure>
<p>See <a href="#lst-greet">Listing 1</a>.</p>
```

:::

A caption after a standalone display-math block makes it a numbered
**equation**: the math is wrapped in a `<figure>`, and `</#id>` resolves to
"Equation N" on its own per-label counter. Only a block whose sole content is
the display-math span qualifies; inline math, or display math with trailing
prose, is untouched.

::: compare

```carve
{#eq-emc}
$$`E = mc^2`
^ Equation #: mass-energy

See </#eq-emc>.
```

```html
<figure id="eq-emc">
  <p><span class="math display">\[E = mc^2\]</span></p>
  <figcaption>Equation 1: mass-energy</figcaption>
</figure>
<p>See <a href="#eq-emc">Equation 1</a>.</p>
```

:::

## Inline footnotes

An inline footnote `^[content]` carries its note text in place (pandoc-style),
with no separate definition. It is numbered into the same endnotes section as a
reference footnote, interleaved by document order, and its content is inline
(§16). A caret immediately before `[` opens the note; `^[x]^` is therefore a
note plus a literal `^`, `^^[x]` is suppressed, and `\^[x]` is literal.

::: compare

```carve
A note^[see *later*] inline. And a ref[^a].

[^a]: reference body.
```

```html
<p>A note<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> inline. And a ref<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a>.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>see <strong>later</strong><a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
    <li id="fn2">
      <p>reference body.<a href="#fnref2" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A trailing attribute block attaches to the noteref `<a>`, like a reference
footnote (§16).

::: compare

```carve
Text^[note]{.ref}.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref" class="ref"><sup>1</sup></a>.</p>
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

## Line blocks

A `::: |` block preserves the author's line layout: each soft line break becomes a hard break (`<br>`), a blank line starts a new stanza (`<p>`), and per-line leading whitespace is kept (each leading space serializes as `&nbsp;` in HTML). It renders as a generic `<div class="line-block">`. The pipe is the block's type token on the `:::` opener - not a per-line prefix - so it is free of the pipe/table ambiguity of the Pandoc per-line `|` form, with no English keyword.

:::: compare

```carve
::: |
Roses are red,
Violets are blue.
:::
```

```html
<div class="line-block">
  <p>Roses are red,<br>
Violets are blue.</p>
</div>
```

::::

Leading whitespace is preserved; each leading space becomes a non-breaking space so the indentation is visible without extra CSS.

:::: compare

```carve
::: |
Roses are red,
  Violets are blue.
:::
```

```html
<div class="line-block">
  <p>Roses are red,<br>
&nbsp;&nbsp;Violets are blue.</p>
</div>
```

::::

A blank line separates stanzas; each stanza is its own paragraph inside the block.

:::: compare

```carve
::: |
Stanza one,
still one.

Stanza two.
:::
```

```html
<div class="line-block">
  <p>Stanza one,<br>
still one.</p>
  <p>Stanza two.</p>
</div>
```

::::

Inline markup inside a line block parses normally; only whitespace and line breaks are special.

:::: compare

```carve
::: |
*Bold* and /italic/,
plain line.
:::
```

```html
<div class="line-block">
  <p><strong>Bold</strong> and <em>italic</em>,<br>
plain line.</p>
</div>
```

::::

The behavior keys off the `|` type token on the opener, not the class. The inline `::: {.line-block}` class form is not a fence at all (strict djot: no inline attributes on the opener), so it renders as an ordinary paragraph (no div, no hard breaks).

:::: compare

```carve
::: {.line-block}
one
two
:::
```

```html
<p>::: {.line-block}
one
two
:::</p>
```

::::

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

A `^` with content on both sides inside a cell is a complete superscript span - only a *lone* `^` as the sole cell content is a rowspan marker.

::: compare

```carve
| Value |
| ^2^   |
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

::: compare

```carve
[click here](javascript:stealCookies)
```

```html
<p><a href="">click here</a></p>
```

:::

An autolink with a dangerous scheme is blanked the same way:

::: compare

```carve
<vbscript:msgbox>
```

```html
<p><a href="">vbscript:msgbox</a></p>
```

:::

An image whose source uses a dangerous scheme keeps its `alt` but drops the
`src` value:

::: compare

```carve
![logo](javascript:stealCookies)
```

```html
<img src="" alt="logo">
```

:::

An event-handler attribute (any `on*` name) is dropped entirely:

::: compare

```carve
A [danger]{onclick="steal()"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

A `style` value containing a CSS `expression(` (or `url(`, `@import`,
`behavior:`, `-moz-binding`) is blanked, keeping the harmless `style` slot:

::: compare

```carve
A [danger]{style="x:expression(steal())"} span.
```

```html
<p>A <span style="">danger</span> span.</p>
```

:::

The `srcdoc` and `formaction` attribute names are dropped:

::: compare

```carve
A [danger]{srcdoc="<script>"} span.
```

```html
<p>A <span>danger</span> span.</p>
```

:::

An attribute-block `href`/`src` override cannot reintroduce a dangerous scheme;
the safe destination is kept and the override is ignored:

::: compare

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
