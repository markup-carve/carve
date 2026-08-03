---
title: "Examples: Core"
description: Core Carve syntax, side by side with the HTML it produces.
---

# Core examples

The everyday syntax: text formatting, headings, links, images, lists, tables, code, attributes and more. Each pair shows Carve source and the HTML it produces; toggle the output to **Rendered** to see the result.

## Emphasis

::: compare

```carve
/italic/  *bold*  /*bold italic*/
_underline_  ~strikethrough~
=highlight=  {^super^}  {,sub,}
```

```html
<p><em>italic</em>  <strong>bold</strong>  <strong><em>bold italic</em></strong>
<u>underline</u>  <s>strikethrough</s>
<mark>highlight</mark>  <sup>super</sup>  <sub>sub</sub></p>
```

:::

The word-boundary rule applies to *every* bare delimiter (`/ * _ ~ =` — all single-char). No bare delimiter emphasizes intraword: `foo*bar*baz`, `foo~bar~baz`, `snake_case`, `a/b/c`, `x = 5`, `key=value` all stay literal. For deliberate intraword emphasis, use the forced `{X … X}` family (below). Superscript and subscript have *no* bare delimiter at all — they exist only in the braced forms `{^…^}` / `{,…,}` (see below). For any bare delimiter:

- an **opener** is recognized only if it is *not* followed by whitespace **and** is preceded by the start of the line/block, whitespace, or a punctuation character (not by an alphanumeric, `_`, or the same delimiter) — so `a/b/c`, `foo_bar_baz`, `snake_case`, and `//a/` stay literal, while `(/x/)` and `a./b/` open after punctuation;
- a **closer** is recognized only if it is *not* preceded by whitespace **and** *not* followed by an alphanumeric character — so `x /a/b y` stays literal.

Highlight is the single-char `=` delimiter; the uniform word boundary keeps `x = 5`, `key=value`, `a=b` literal. Every bare delimiter is single-char, so a *doubled* delimiter (`==x==`) is literal by the same-delimiter-adjacency rule, just like `**x**` or `//x//`. This is *stricter* than Djot, whose `_`/`*` rule is purely whitespace-flanking. `^` and `,` are *not* bare delimiters — a comma or caret in prose is always literal text (`1,2,3`, `a,b,c`, `x, y, z`, `2 ^ 3`), and superscript/subscript are written with the braced forms only. The boundary rule still allows `/usr/local/` → `<em>usr/local</em>`: the opening `/` sits at line start and the inner same-type `/` characters are literal content (Carve does not nest same-type emphasis). The normative rule lives in `resources/grammar.ebnf` PART 9 §9 and §22.

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

A backslash-escaped delimiter inside a title is a literal quote (CommonMark-style), so `\"` does not end a double-quoted title — it renders as a literal `"` (`&quot;`) in the `title` attribute (grammar `link_title`).

::: compare

```carve
[t](/url "ti\"tle")
```

```html
<p><a href="/url" title="ti&quot;tle">t</a></p>
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

After a blank line the **same content-column rule** applies: a continuation belongs to the item only if it reaches the item's content column (three columns under `1. `), exactly as without a blank. The blank line only decides whether the item is tight or loose; it never relaxes the column a block must reach. A block opener at the content column attaches and stays tight — unlike a second paragraph, a nested block does not loosen the list.

::: compare

```carve
1. one

   > q
```

```html
<ol>
  <li>one
    <blockquote><p>q</p></blockquote>
  </li>
</ol>
```

:::

*Below* the content column the line is outside the item body: the list ends and the block parses at document level. A two-column indent is not enough under an ordered marker whose content column is three — the same threshold the no-blank case uses.

::: compare

```carve
1. one

  > q
```

```html
<ol>
  <li>one</li>
</ol>
<p>&gt; q</p>
```

:::

*Above* the content column the residual indentation means the line is no longer a block opener — just as ` # h` is a paragraph, not a heading, at the top level — so it folds in as a second paragraph and turns the item loose (§17 L1).

::: compare

```carve
1. one

    > q
```

```html
<ol>
  <li><p>one</p>
    <p>&gt; q</p>
  </li>
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

A fenced-code **delimiter sits exactly at its container's content column** — at document level, that is column 0. Carve has no indented-code-block construct, so leading spaces carry no meaning to disambiguate against, and the fence is strict like every other block opener (an indented heading, thematic break, or block quote is likewise plain text). A run of backticks indented at document level is therefore an ordinary paragraph, and its delimiters fall back to inline code spans.

::: compare

````carve
 ```
 code
 ```
````

```html
<p><code>
code
</code></p>
```

:::

The **closer is column-exact too**. A closing run indented past the opener is not a delimiter but code content, which is what lets an indented ``` line appear as sample text inside a fence. Here the two-space `` ``` `` is content and the flush `` ``` `` closes.

::: compare

`````carve
```
code
  ```
still code
```
`````

`````html
<pre><code>code
  ```
still code
</code></pre>
`````

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

"Anywhere in the document" includes inside a container: a reference definition
written inside a blockquote or a list item is still an invisible block that is
collected into the document-wide definition table, so a reference elsewhere
resolves against it. The container keeps only its visible content (here, none).

::: compare

```carve
> [ref]: /url

See [it][ref].
```

```html
<blockquote>

</blockquote>
<p>See <a href="/url">it</a>.</p>
```

:::

::: compare

```carve
- [ref]: /url

See [it][ref].
```

```html
<ul>
  <li></li>
</ul>
<p>See <a href="/url">it</a>.</p>
```

:::

A reference definition shares the `link_destination` rule, so its URL ends at
the **first whitespace**: everything after the first space is ignored (it is not
a title unless it is a quoted run). So `[r]: a b c` resolves the label to `a`.

::: compare

```carve
[r][r]

[r]: a b c
```

```html
<p><a href="a">r</a></p>
```

:::

A quoted run after the destination is still parsed as the title, exactly as in
an inline link.

::: compare

```carve
[r][r]

[r]: /url "Title"
```

```html
<p><a href="/url" title="Title">r</a></p>
```

:::

A backslash-escaped quote inside the title is a literal quote, exactly as in an inline link title (`link_title`). The escaped `\"` does not end the quoted run; it renders as a literal `"` (`&quot;`) in the `title` attribute.

::: compare

```carve
[x][y]

[y]: /u "a\"b\"c"
```

```html
<p><a href="/u" title="a&quot;b&quot;c">x</a></p>
```

:::

A reference definition requires a non-empty destination (grammar `reference_definition`). A `[r]:` with nothing after the colon — or only trailing whitespace — is **not** a definition; the line stays literal text.

::: compare

```carve
[r]:
```

```html
<p>[r]:</p>
```

:::

Trailing whitespace after the colon does not create a destination either, so it is still literal.

::: compare

```carve
[r]:   
```

```html
<p>[r]:</p>
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

A quote opens (left/opening quote) when it follows start-of-content, whitespace (incl. NBSP), or one of the opening/operator characters `( [ { = : - /`; otherwise it closes. So a quote right after `=`, `:`, `-`, `/`, or an opening paren still opens the first quote (grammar `smart_quote`).

::: compare

```carve
a="b"
:"q"
-"q"
/"q"
("q")
```

```html
<p>a=“b”
:“q”
-“q”
/“q”
(“q”)</p>
```

:::

When a quote does **not** follow one of those opening contexts it closes instead — so a quote right after a closing bracket (`}` `)` `]`), after sentence punctuation (`.` `,`), or mid-word always becomes a right/closing quote. An empty `""` opens both marks (the second `"` follows a `"`, which is not an opening context, yet there is nothing to its right to close against, so it too renders as an opening quote).

::: compare

```carve
}"q"
)"q"
]"q"
."q"
,"q"
a"b
""
```

```html
<p>}”q”
)”q”
]”q”
.”q”
,”q”
a”b
””</p>
```

:::

The same opening set applies to the single quote `'`. After `(`, `[`, `=`, `:`, `-`, or `/` a single quote opens (`‘`); the matching `'` then closes (`’`).

::: compare

```carve
('q')
['q']
='q'
:'q'
-'q'
/'q'
```

```html
<p>(‘q’)
[‘q’]
=‘q’
:‘q’
-‘q’
/‘q’</p>
```

:::

A single quote after `{` opens too — shown on its own line because a trailing `{…}` would otherwise be read as an attribute block.

::: compare

```carve
{'q'}
```

```html
<p>{‘q’}</p>
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

Longer runs follow the same allocation with no leftover hyphen: seven is one em plus two en, eight is four en, ten is five en, eleven is three em plus one en, and thirteen is three em plus two en.

::: compare

```carve
a------- b-------- c---------- d----------- e-------------
```

```html
<p>a—–– b–––– c––––– d———– e———––</p>
```

:::

The open/close decision reads the character before the quote. A bare emphasis
delimiter is not that character - the quote sees the start of the emphasis
CONTENT - and nothing at all before a quote opens it. A quote directly after
another one follows whichever half that one resolved to, so a nested pair opens
while an empty pair stays closed.

::: compare

```carve
*'q'*

"hello"

"'nested'"

a*'q'*
```

```html
<p><strong>‘q’</strong></p>
<p>“hello”</p>
<p>“‘nested’”</p>
<p>a*’q’*</p>
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

## Inline footnotes

An inline footnote `^[content]` carries its note text in place (pandoc-style),
with no separate definition. It is numbered into the same endnotes section as a
reference footnote, interleaved by document order, and its content is inline
(§16). A caret immediately before `[` opens the note; any other caret is
literal text (there is no bare superscript). `^[x]^` is therefore a note plus
a literal `^`, `^^[x]` is a literal `^` plus a note, and `\^[x]` is literal.

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

A bare colon fence closes a container only when it is EXACTLY as long as that
container's opener, so the run length is a local depth count: the outermost
container is `:::` and every level inward adds a colon. That is the direction
`carve fmt` emits, and it is writable from the top down - a fence is sized by
the levels above it, which are already on the page. The other direction parses
too; equal-length fences nest as well, since a fence carrying a type word is
never a closer.

:::::: compare

```carve
::: outer

:::: middle

::::: note
X
:::::

::::

:::
```

```html
<div class="outer">
  <div class="middle">
    <aside class="admonition note">
      <p>X</p>
    </aside>
  </div>
</div>
```

::::::

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

A definition continues exactly like a list item. An indented block after a
blank line folds into the definition, so a `<dd>` can hold more than one
paragraph:

::: compare

```carve
:: term
:  A definition can now hold

   more than one paragraph.
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>A definition can now hold</p>
    <p>more than one paragraph.</p>
  </dd>
</dl>
```

:::

A lone `+` is the continuation marker (the same one lists and block quotes
use): it attaches the following flush-left block to the definition with no
indentation.

::: compare

```carve
:: term
:  A first paragraph,
+
then a flush-left block joined with +.
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <p>A first paragraph,</p>
    <p>then a flush-left block joined with +.</p>
  </dd>
</dl>
```

:::

A flush-left line with no blank before it lazily continues the open definition
paragraph, exactly as it would inside a list item (and as in djot). A blank
line, a new marker, or a block opener ends the definition instead.

::: compare

```carve
:: term
:  A definition wrapped
onto the next line.
```

```html
<dl>
  <dt>term</dt>
  <dd>A definition wrapped
onto the next line.</dd>
</dl>
```

:::

When the definition's sole content is a lone `+`, it opens a *first block*: the
body is the following flush-left block, with no indentation - the same opener
the list form `- +` provides. Write `:  \+` for a literal `+`.

::: compare

```carve
:: term
:  +
> the whole definition is this quote
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <blockquote><p>the whole definition is this quote</p></blockquote>
  </dd>
</dl>
```

:::

The **term** side is inline-only, like a heading label: it holds inline content
(no block content), but it *does* fold a following plain line into the term
with a soft break - a wrapped term line joins the term instead of ending the
list. A new marker (`::` / `:  `), a blank line, or a block opener ends the
term.

::: compare

```carve
:: A term that
wraps onto the next line
:  its definition
```

```html
<dl>
  <dt>A term that
wraps onto the next line</dt>
  <dd>its definition</dd>
</dl>
```

:::

A definition list also does **not** interrupt a paragraph - a `::` line
directly under prose folds into that paragraph, so a list needs a blank line
before it.

A blank line may separate a term from its definition (or one definition from
the next) for readability - a following `:  ` line still attaches to the entry:

::: compare

```carve
:: term

:  the definition
```

```html
<dl>
  <dt>term</dt>
  <dd>the definition</dd>
</dl>
```

:::

A definition (`<dd>`) ends at a blank line that is followed by neither an
indented continuation nor a `:  ` definition, at a new `::` term, or at a block
opener.

Attributes attach to the **whole `<dl>`** via a preceding block-attribute line
(`{.class}` on the line before the first `:: term`). There is deliberately no
per-`<dt>` / per-`<dd>` attribute form: unlike a list item (`-{.c}`) or a table
row (`| … |{.c}`), a term or definition takes no glued marker attributes. Style
individual terms/definitions with CSS descendant selectors (`dl.gloss dt`), or
put the attributes on the `<dl>`.

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

Leading whitespace before `%%` does not matter: an indented line whose first
non-whitespace content is `%%` is a line comment, exactly like one in the first
column. It renders nothing and, like any block, interrupts an open paragraph.

::: compare

```carve
x
  %% indented comment
y
```

```html
<p>x</p>
<p>y</p>
```

:::

An indented comment-only line on its own renders nothing (it does not leave an
empty paragraph).

::: compare

```carve
before

  %% indented comment

after
```

```html
<p>before</p>
<p>after</p>
```

:::

Tooling (`carve fmt --stamp`) may append a *provenance marker* - a trailing
comment recording the spec version a document was processed under and the engine
that wrote it. It is an ordinary comment, so it renders nothing; it is
deterministic (no timestamp) and tool-managed (replaced in place, not
hand-written).

::: compare

```carve
Hello.

%% carve-version: 0.1; generated-by: carve-js 0.1.0
```

```html
<p>Hello.</p>
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

The non-breaking space U+00A0 serializes as `&nbsp;` in text and code-span
output. (In a heading `id` it is kept as the raw byte instead - ids are not
entity-encoded; see *Heading IDs*.)

::: compare

```carve
`a b`
```

```html
<p><code>a&nbsp;b</code></p>
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

The autolink body is built from URL characters only; `<` and `>` are not URL
characters, so a `<` inside the angle brackets cannot be part of the body. The
whole run is not an autolink and renders as fully escaped literal text (grammar
`url_autolink` / `url_char`).

::: compare

```carve
<http://a.com/<script>>
```

```html
<p>&lt;http://a.com/&lt;script&gt;&gt;</p>
```

:::

`url_char` also excludes `"` `\` `` ` `` `{` `}` `|` `^`, so a double quote inside the brackets breaks the autolink. The whole run is literal text; the straight quotes additionally pick up smart-quote typography.

::: compare

```carve
<http://a.com/"q">
```

```html
<p>&lt;http://a.com/“q”&gt;</p>
```

:::

A clean URL with only `url_char`s autolinks normally, query string and all.

::: compare

```carve
<http://a.com/p?x=1>
```

```html
<p><a href="http://a.com/p?x=1">http://a.com/p?x=1</a></p>
```

:::

A well-formed `<url>` still autolinks normally.

::: compare

```carve
<http://a.com/>
```

```html
<p><a href="http://a.com/">http://a.com/</a></p>
```

:::

An email autolink requires a trailing dot and TLD (grammar `email_autolink`):
`<a@b.com>` becomes a `mailto:` link, but `<a@b>` (no dot+TLD) and `<x@y:z>`
(`:` is not an email character) are not email autolinks and stay literal.

::: compare

```carve
<a@b> <a@b.com> <x@y:z>
```

```html
<p>&lt;a@b&gt; <a href="mailto:a@b.com">a@b.com</a> &lt;x@y:z&gt;</p>
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

Superscript and subscript exist *only* in the braced forms `{^…^}` and
`{,…,}` (the same brace-pair family that forces intraword emphasis) — there is
no bare `^x^` or `,x,` delimiter. The dominant uses (H₂O, mc², 10⁶) are
intraword, which only the braced family can express, and a bare comma or caret
would collide with plain prose punctuation.

::: compare

```carve
H{,2,}O and E=mc{^2^}
```

```html
<p>H<sub>2</sub>O and E=mc<sup>2</sup></p>
```

:::

A `^` or `,` outside the braced forms is always literal text — even where a
bare delimiter's word-boundary rule would have matched:

::: compare

```carve
typo ,oops, happens and 10^6^ things and x ^2^ y
```

```html
<p>typo ,oops, happens and 10^6^ things and x ^2^ y</p>
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

An inner run of two or more spaces is a medial gap - the alignment a caesura or a column of aligned text is made of - and is preserved the same way. A lone inner space stays an ordinary collapsible space, so a long line can still wrap between words.

:::: compare

```carve
::: |
Two roads    diverged in a yellow wood,
And looked   down one as far as I could
:::
```

```html
<div class="line-block">
  <p>Two roads&nbsp;&nbsp;&nbsp;&nbsp;diverged in a yellow wood,<br>
And looked&nbsp;&nbsp;&nbsp;down one as far as I could</p>
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

For a smaller local opt-in to visible line breaks, use `::: \`. It turns soft breaks in direct paragraph children into hard breaks, but it does not preserve leading whitespace and does not affect nested blocks.

:::: compare

```carve
::: \
one
two
:::
```

```html
<div class="hardbreaks">
  <p>one<br>
two</p>
</div>
```

::::

Nested blocks keep ordinary soft-break behavior, and leading whitespace is not treated as alignment.

::::: compare

```carve
:::: \
  indented
next

::: note
a
b
:::
::::
```

```html
<div class="hardbreaks">
  <p>indented<br>
next</p>
  <aside class="admonition note">
    <p>a
b</p>
  </aside>
</div>
```

:::::

A gap written with TABS measures in columns, not characters: each tab advances
to the next four-column stop, counted from where the run starts. So a tab is a
medial gap or a lone space depending on where it lands - below, `tab` sits at
column 3 so its tab crosses one column and collapses, while the two after `wide`
cross two full stops and are kept. A LEADING tab follows the same arithmetic.

:::: compare

```carve
::: |
tab	gap
wide		gap
	lead
:::
```

```html
<div class="line-block">
  <p>tab gap<br>
wide&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;gap<br>
&nbsp;&nbsp;&nbsp;&nbsp;lead</p>
</div>
```

::::
