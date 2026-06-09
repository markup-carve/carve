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
<section id="welcome">
  <h1>Welcome</h1>
  <section id="getting-started">
    <h2>Getting started</h2>
    <section id="setup">
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
<section id="h1">
  <h1>H1</h1>
  <section id="h2">
    <h2>H2</h2>
    <section id="h3">
      <h3>H3</h3>
      <section id="h4">
        <h4>H4</h4>
        <section id="h5">
          <h5>H5</h5>
          <section id="h6">
            <h6>H6</h6>
          </section>
        </section>
      </section>
    </section>
  </section>
</section>
```

:::

Attributes attach to the heading via a trailing `{…}` block. The rendered attribute order is alphabetical.

::: compare

```carve
## Setup {#install .featured}
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
<section id="why-carve">
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

A paragraph ends at a blank line — or at a line that begins a block. A
continuation line that starts with a block marker — `-`, `*`, `+`, `>`, a
valid `|…|` table row, a heading `#`, a fence with a closer, or a decimal
`1.` / `1)` — interrupts the paragraph and starts that block, with no blank
line required (the Markdown-like rule; §10). The trade-off is that a
hard-wrapped prose line that happens to begin with such a marker becomes a
block — insert a blank line, or backslash-escape the marker (`\* 3`), to keep
it prose.

::: compare

```carve
Die Frage ist x = 5
* 3 + 17 wahr.
```

```html
<p>Die Frage ist x = 5</p>
<ul>
  <li>3 + 17 wahr.</li>
</ul>
```

:::

The same applies to any number of marker lines, and to every block type — a
heading or a `1.` list under a prose line interrupts it just the same.

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

Interruption applies inside nested content too: a single marker in a list item
or block quote starts a block, so a one-child nested list still nests.

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

Anything else after the language token — a bare second word, a quoted value, or an inline `{…}` block — is **not** a fenced code block. There is no error: the backtick run falls back to ordinary inline parsing (an inline code span). The bracket is the only delimiter that admits metadata.

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

Carve renders `:::` blocks by a two-tier rule (PART 9 §12). The eight canonical types — `note`, `tip`, `warning`, `danger`, `info`, `success`, `example`, `quote` — render as `<aside class="admonition {type}">`. Any other identifier (`hint`, `tabs`, `mermaid`, `details`, …) renders as a generic `<div class="{type}">`, the fenced-div primitive the block-extension mechanism builds on. A quoted title after the type becomes a `<p class="admonition-title">` in either tier; the quotes are stripped and never folded into the class.

A quoted title on a canonical type renders inside the `<aside>`:

::: compare

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

:::

A custom (Tier-2) type renders as a generic `<div>` with the literal type as its class.

::: compare

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

:::

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
# Title {.large #intro}

A paragraph with [a styled link](url){.btn .primary}.
```

```html
<section id="intro">
  <h1 class="large">Title</h1>
  <p>A paragraph with <a href="url" class="btn primary">a styled link</a>.</p>
</section>
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

The space between `---` and the format token is optional — `---toml` and `--- toml` are both accepted (the no-space form is canonical), matching the optional space on a code fence (` ```php ` / ` ``` php `).

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

::: compare

```carve
# Café Notes

# Über uns

# 2024 Recap

## Setup

## Setup

# API {#api-v2}

See </#cafe-notes>, </#section-2024-recap>, </#setup-2>, and </#api-v2>.
```

```html
<section id="café-notes">
  <h1>Café Notes</h1>
</section>
<section id="über-uns">
  <h1>Über uns</h1>
</section>
<section id="s-2024-recap">
  <h1>2024 Recap</h1>
  <section id="setup">
    <h2>Setup</h2>
  </section>
  <section id="setup-2">
    <h2>Setup</h2>
  </section>
</section>
<section id="api-v2">
  <h1>API</h1>
  <p>See &lt;/#cafe-notes&gt;, &lt;/#section-2024-recap&gt;, <a href="#setup-2">Setup</a>, and <a href="#api-v2">API</a>.</p>
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

## Generic divs

A `:::` opener with no type word — bare `:::` or an attributes-only
`::: {…}` — is djot's generic container: a plain `<div>` carrying only
the opener's attributes (a typed `::: word` is a two-tier admonition/div
instead).

::: compare

```carve
:::
A plain box.
:::

::: {#s .sidebar}
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

:::

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
<section id="title">
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

A ` ```raw FORMAT ` block passes its content through verbatim when FORMAT
matches the output; other formats are dropped.

::: compare

````carve
```raw html
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
comment. (Highlight is `==text==`, not an editorial mark — see below.)

::: compare

```carve
a {+ins+} {-del-} {~old~>new~} b{# note #}
```

```html
<p>a <ins>ins</ins> <del>del</del> <del>old</del><ins>new</ins> b<span class="critic-comment"> note </span></p>
```

:::

The djot `{=text=}` highlight form is not supported; it renders literally,
even directly adjacent to another inline node (a `{…}` that yields no
attribute is not consumed). Highlight is `==text==`.

::: compare

```carve
==x=={=hl=}
```

```html
<p><mark>x</mark>{=hl=}</p>
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
<section id="getting-started">
  <h1>Getting Started</h1>
  <p>See <a href="#getting-started">Getting Started</a>.</p>
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

::: compare

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

:::

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

On a heading (the attributes attach to the `<h1>`):

::: compare

```carve
# H {k="{y}"}
```

```html
<section id="h">
  <h1 k="{y}">H</h1>
</section>
```

:::

On a generic div:

::: compare

```carve
:::{k="{y}"}
body
:::
```

```html
<div k="{y}">
  <p>body</p>
</div>
```

:::

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

The same escape applies on a heading's attribute block.

::: compare

```carve
# H {title="a\"b"}
```

```html
<section id="h">
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
<section id="h">
  <h1>H {???}</h1>
</section>
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

A block whose content is not a recognized attribute (`{???}`, `{=y=}`) is not
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

`^x^` is superscript and `,,x,,` is subscript (intraword, no word-boundary
restriction).

::: compare

```carve
H,,2,,O and E=mc^2^
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
~old~ ==new==
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
"no nesting of same type" rule is uniform across all five single-character
delimiters: `**`, `~~`, and `^^` stay literal exactly like `//` and `__`.

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

The two-char delimiters `==` (highlight) and `,,` (subscript) are atomic
tokens, so a run that extends them with a third same character does not open
— `====x====` and `,,,,y,,,,` stay literal, consistent with the
doubled single-char rule. (`==x==` and `,,y,,` still mark and subscript.)

::: compare

```carve
====x==== ,,,,y,,,,
```

```html
<p>====x==== ,,,,y,,,,</p>
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
![a](/i){=hl=}
```

```html
<p><img src="/i" alt="a">{=hl=}</p>
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

A paragraph ends at a blank line — or at a line that begins a block. Under the
Markdown-like rule (§10) a **visible** block interrupts an open paragraph with
no blank line before it, at the top level and inside nested content. Three
carve-outs keep common prose safe: an ordered marker interrupts only as `1.` /
`1)`; a fence or `:::` interrupts only when it has a matching closer ahead; and
a bare image is never a block. Invisible constructs (reference definitions,
comments) interrupt as they always have.

A heading marker after a prose line interrupts.

::: compare

```carve
text
# H
```

```html
<p>text</p>
<section id="h">
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

An unordered list interrupts.

::: compare

```carve
text
- a
- b
```

```html
<p>text</p>
<ul>
  <li>a</li>
  <li>b</li>
</ul>
```

:::

An ordered-list marker does **not** interrupt — it needs a blank line (the one
visible block kept on the Djot rule; see the carve-out below).

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

::: compare

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

:::

**Carve-out — ordered lists never interrupt.** An ordered marker is too common
in prose ("see step 2.", "version 1985.", "upgrade to 1. today"), and the only
way to allow it would be the CommonMark `1.`-only heuristic Djot removed. So no
ordered value — `1.`, `2.`, a year — interrupts; all stay paragraph text.

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

::: compare

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

:::

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

**Nested content.** Interruption applies inside a block quote too: a list
marker after a prose line interrupts within the quote.

::: compare

```carve
> p one
> - item
```

```html
<blockquote>
  <p>p one</p>
  <ul>
    <li>item</li>
  </ul>
</blockquote>
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
<section id="h">
  <h1>H</h1>
</section>
```

:::

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

A heading spills onto following lines (like Djot, and like blockquotes), until a blank line. A continuation line may carry the same-or-lower number of `#` (stripped) or none; a higher/other heading marker starts a new heading, and a caption (`^ …`) or fenced comment (`%%%`) ends it. The heading id is built from the full folded text. (Setext underline headings remain intentionally excluded.)

::: compare

```carve
# Title
outside
```

```html
<section id="title-outside">
  <h1>Title
outside</h1>
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
<section id="h">
  <h1>H</h1>
</section>
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
