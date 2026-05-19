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
^super^  ,,sub,,  ==highlight==
```

```html
<p><em>italic</em>  <strong>bold</strong>  <strong><em>bold italic</em></strong>
<u>underline</u>  <s>strikethrough</s>
<sup>super</sup>  <sub>sub</sub>  <mark>highlight</mark></p>
```

:::

Only `/` and `_` are word-boundary–restricted; every other delimiter (`*`, `~`, `^`, `==`, `,,`) supports intraword emphasis (e.g. `foo*bar*baz` → `foo<strong>bar</strong>baz`, `foo~bar~baz` → `foo<s>bar</s>baz`). For `/` and `_`:

- an **opener** is recognized only if it is *not* followed by whitespace **and** is preceded by the start of the line/block, whitespace, or a punctuation character (not by an alphanumeric, `_`, or the same delimiter) — so `a/b/c`, `foo_bar_baz`, `snake_case`, and `//a/` stay literal, while `(/x/)` and `a./b/` open after punctuation;
- a **closer** is recognized only if it is *not* preceded by whitespace **and** *not* followed by an alphanumeric character — so `x /a/b y` stays literal.

This is a Carve restriction that is *stricter* than Djot: Djot's `_`/`*` rule is purely whitespace-flanking (open if not directly followed by whitespace, close if not directly preceded by whitespace), with no alphanumeric/punctuation condition, so Djot would treat `foo_bar_baz` as emphasis where Carve does not. The boundary rule still allows `/usr/local/` → `<em>usr/local</em>`: the opening `/` sits at line start and the inner same-type `/` characters are literal content (Carve does not nest same-type emphasis). Exact disambiguation of delimiter runs is pinned by the corpus pairs below; the normative rule lives in `resources/grammar.ebnf` PART 9 §9.

::: compare

```carve
foo*bar*baz works but a/b/c does not.
```

```html
<p>foo<strong>bar</strong>baz works but a/b/c does not.</p>
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

Unlike `*`, the `/` and `_` delimiters never produce intraword emphasis.

::: compare

```carve
foo_bar_baz and snake_case stay literal
```

```html
<p>foo_bar_baz and snake_case stay literal</p>
```

:::

A `/` or `_` opener immediately preceded by the *same* delimiter or by `_` is not valid (this does not affect different-delimiter combinations like `/*bold italic*/`).

::: compare

```carve
//a/ and snake_/case/
```

```html
<p>//a/ and snake_/case/</p>
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
<h1 id="welcome">Welcome</h1>
<h2 id="getting-started">Getting started</h2>
<h3 id="setup">Setup</h3>
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
<h1 id="h1">H1</h1>
<h2 id="h2">H2</h2>
<h3 id="h3">H3</h3>
<h4 id="h4">H4</h4>
<h5 id="h5">H5</h5>
<h6 id="h6">H6</h6>
```

:::

Attributes attach to the heading via a trailing `{…}` block. The rendered attribute order is alphabetical.

::: compare

```carve
## Setup {#install .featured}
```

```html
<h2 class="featured" id="install">Setup</h2>
```

:::

Inline emphasis renders inside heading text.

::: compare

```carve
## Why /Carve/?
```

```html
<h2 id="why-carve">Why <em>Carve</em>?</h2>
```

:::

A `#` at line start without a following space is a tag, not a heading. The line renders as a paragraph containing the tag, with a `/tags/<slug>` URL.

::: compare

```carve
#notaheading
```

```html
<p><a class="tag" href="/tags/notaheading">#notaheading</a></p>
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

Autolinks use angle brackets and produce a self-titled anchor; bare email addresses get the `mailto:` scheme.

::: compare

```carve
Visit <https://example.com> or write <hello@example.com>.
```

```html
<p>Visit <a href="https://example.com">https://example.com</a> or write <a href="mailto:hello@example.com">hello@example.com</a>.</p>
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

A hard-wrapped prose line may begin with `-`, `*`, `+`, `>` or `|` as an
operator, not a marker. A lone marker line directly under prose stays prose —
it only starts a block when it forms a real one (two or more markers, an
indented continuation, or a blank line before it). This keeps paragraph
wrapping from changing interpretation (Design Principle 7).

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

Two or more markers are an unambiguous list and do interrupt the paragraph.

::: compare

```carve
Liste:
- eins
- zwei
```

```html
<p>Liste:</p>
<ul>
  <li>eins</li>
  <li>zwei</li>
</ul>
```

:::

A blank line before the marker also makes it a list, even with one item.

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

The guard is scoped to the top level: inside an already-nested block a single
marker still starts a block, so a one-child nested list still nests.

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

A single-line block followed by its caption still interrupts prose — the
caption line is itself a real-block signal.

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

## Admonitions

::: compare

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

:::

Each admonition type produces a matching CSS class — `note`, `tip`, `warning`, and `caution` are the named variants.

::: compare

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

:::

An admonition may contain multiple block-level children, including lists and code blocks.

::: compare

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

:::

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
<p>Hey <a class="mention" href="/users/alice">@alice</a>, see <a class="tag" href="/tags/release-1.0">#release-1.0</a>.</p>
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
# Title {.large #intro}

A paragraph with [a styled link](url){.btn .primary}.
```

```html
<h1 class="large" id="intro">Title</h1>
<p>A paragraph with <a href="url" class="btn primary">a styled link</a>.</p>
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

## Heading IDs

::: compare

```carve
# Café Notes

# Über uns

# 2024 Recap

## Setup

## Setup

# API {#api-v2}

See </#café-notes>, </#section-2024-recap>, </#setup-2>, and </#api-v2>.
```

```html
<h1 id="café-notes">Café Notes</h1>
<h1 id="über-uns">Über uns</h1>
<h1 id="section-2024-recap">2024 Recap</h1>
<h2 id="setup">Setup</h2>
<h2 id="setup-2">Setup</h2>
<h1 id="api-v2">API</h1>
<p>See <a href="#café-notes">Café Notes</a>, <a href="#section-2024-recap">2024 Recap</a>, <a href="#setup-2">Setup</a>, and <a href="#api-v2">API</a>.</p>
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
<p>Write me@example.com or ping <a class="mention" href="/users/markus">@markus</a>.</p>
```

:::

## Tag requires a word boundary

`#` starts a tag only at a word boundary; `foo#bar` is literal text.

::: compare

```carve
A #tag here, but not in foo#bar.
```

```html
<p>A <a class="tag" href="/tags/tag">#tag</a> here, but not in foo#bar.</p>
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
