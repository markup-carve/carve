---
title: Coming from Markdown
description: A task-oriented guide for Markdown and GFM authors switching to Carve.
---

# Coming from Markdown

::: info Who this is for
Authors who already write CommonMark or GitHub Flavored Markdown (GFM) and want to move documents to Carve. This page says what to change, not why Carve differs; for the reasons, see [Carve compared with Markdown, Djot and MDX](./comparison).
:::

Carve looks like Markdown in the common case: headings, links, images, lists, quotes, code fences and footnotes read much the same. The differences that matter are emphasis, tables, raw HTML and a few block rules. If your source is already Carve 0.1, read [Upgrading from 0.1](./upgrade-0-2) instead.

::: tip Automated conversion
The reference engine `carve-js` converts Markdown to Carve. It reads a named file, or standard input when the file is omitted, and writes Carve to standard output:

```sh
carve import --from gfm input.md > input.crv
```

Use `--from gfm` for ordinary Markdown: it converts tables, task lists, strikethrough, bare URLs and footnotes. `--from markdown` reads strict CommonMark, which keeps a GFM table as escaped paragraph text. In a library, call `importDocument` from `@markup-carve/carve/import`:

```js
import { importDocument } from '@markup-carve/carve/import'

const { source } = importDocument(markdownSource, { from: 'gfm' })
```

The converter handles the mechanical substitutions. Review the output for emphasis, tables and raw HTML. In 0.1 this command was `carve migrate --from markdown`.
:::

## Convert a directory

The same command converts a folder in one run. It keeps subfolders, copies other regular files such as images, and writes a `migration-report.json` beside the converted `.crv` files. The output directory must not exist yet and must lie outside the source:

```sh
carve import --from gfm --directory path/to/markdown --output path/to/carve
jq -r '.review[]' path/to/carve/migration-report.json
```

The command prints a one-line summary of converted files, copied assets, files that need review and skipped entries. The report lists each file with its diagnostics and the state of each local link, the copied assets, the skipped entries and, under `review`, the files a person should check: a lost construct or a link the run could not check.

Folder conversion also checks local links and image paths. It rewrites a link to a `.md` or `.markdown` file to the `.crv` name when the converted target exists and any fragment resolves in that target. An exact id wins. If there is no exact match, a case-insensitive match to one heading id rewrites the fragment to that Carve id, and the file's diagnostics record a `link-fragment-case-rewritten` hint naming the old and new fragment. Each link in a file's `links` list is `valid`, `rewritten` or `unresolved`; a missing file or fragment, for example, is `unresolved` and puts the file on the review list. External URLs are left alone.

Carve heading ids keep the case of the heading text: `= Intro` gets the id `Intro`. A Markdown link to `#intro` therefore needs the rewrite above, and inbound links from outside the converted folder need a check of their own, or an explicit id on the heading (see [Attributes](#attributes)). Routes and URLs that only the publishing host knows still need a check in the destination site.

## Syntax map

The table covers the constructs you use most often. Rows marked *same* work as in Markdown; rows marked *changed* need attention.

| Construct | Markdown | Carve | Notes |
| --- | --- | --- | --- |
| Headings | `# H1` to `###### H6` | `= H1` to `====== H6` | *changed*: `#` headings still work, but `=` is the canonical marker and `carve fmt` writes it. A trailing `{#id}` is **not** an attribute (see below) |
| Links | `[text](url)` | same | |
| Reference links | `[text][ref]` and `[ref]: url` | same | |
| Shortcut reference links | `[ref]` and `[ref]: url` | `[ref][]` and `[ref]: url` | Carve has no shortcut form, so a bare `[ref]` stays text. The importer writes an inline link |
| Images | `![alt](src)` | same | |
| Inline code | `` `code` `` | same | |
| Fenced code | three backticks and a language | same | Write the language directly after the fence. Tilde fences are text |
| Blockquotes | `> text` | same | Carve adds captions (see below). A GitHub alert (`> [!NOTE]`) imports as an admonition |
| Unordered lists | `- item` or `* item` | same | A Markdown `+` bullet imports as `-` |
| Ordered lists | `1. item` | `1. item` or `. item` | `. item` asks Carve to number the list from 1 |
| Task lists | `- [ ] todo` and `- [x] done` | same, plus `[_]`, `[/]`, `[!]`, `[-]`, `[>]` and `[?]` | open alias, in progress, blocked, dropped, deferred, uncertain |
| Thematic break | `---` | `***` | *changed*: `---` and `___` are text in 0.2 |
| Setext headings | `Title` over `---` or `===` | `= Title` | no underline form; `carve lint` reports `setext-heading-underline` |
| Closing heading hashes | `## Title ##` | `== Title` | the closing `##` stays heading text; lint: `heading-closing-hashes` |
| Indented code | four-space indent | a code fence | an indented line is a paragraph; lint: `indented-code-block` |
| Italic | `*italic*` or `_italic_` | `/italic/` | *changed*, see below |
| Bold | `**bold**` or `__bold__` | `*bold*` | *changed*, see below |
| Bold and italic | `***both***` | `/*both*/` | *changed* |
| Underline | (not standard) | `{_underline_}` | Carve adds this |
| Strikethrough | `~~strike~~` (GFM) | `{~strike~}` | *changed*: braced, single tilde |
| Highlight | (not standard) | `{=highlight=}` | Carve adds this |
| Tables | GFM pipe tables with a separator row | `\|=` header cells | *changed*, see below |
| Footnotes | `[^label]` and `[^label]: text` | same | plus inline `^[...]` |
| Raw HTML | inline and block, on by default | escaped unless the host allows it | *changed*, see below |
| Keys, abbreviations, dates | raw `<kbd>`, `<abbr title="...">`, `<time datetime="...">` | `[Tab]{kbd}`, `[HTML]{abbr="..."}`, `[today]{time=...}` | Carve adds this. `samp`, `var`, `cite` and `dfn` need the semantic span extension |

## Emphasis: the most important change

Carve uses `/` for italic and `*` for bold, unlike Markdown's `*` and `**`. Underline, strike and highlight always take braces, and bare `_`, `~` and `=` are ordinary characters. This is the change that catches people most often.

::: compare no-render
```md
*italic text*
**bold text**
_also italic_
__also bold__
~~strikethrough~~
```
```crv
/italic text/
*bold text*
/also italic/
*also bold*
{~strikethrough~}
```
:::

Left in place, the Markdown spellings do not fail loudly. `**bold**` renders with its asterisks, and `_also italic_` stays text with its underscores. `carve lint` reports `markdown-strong-double-star` and `markdown-strikethrough-double-tilde` for the doubled forms.

Bold italic is `/*both*/`. `carve lint` adds a hint there, because the span looks like a C comment; the hint does not fail a check.

The mnemonic: `/` leans like italics, `*` is strong like bold.

## Fenced code blocks

Fenced code works as in Markdown. Put the language directly after the opening backticks:

::: compare no-render
````md
```python
def hello():
    print("hello")
```
````
````crv
```python
def hello():
    print("hello")
```
````
:::

One space before the language is also accepted, and `carve fmt` removes it. Tilde fences (`~~~`) are not fences in 0.2; convert them to backticks.

The info string is structured: an optional language, then an optional `"title"`, then an optional `[label]`. Markdown metadata such as `js {1,3}` or `js title="x"` still opens a `js` code block, and the extra words are dropped. Move a title into the quoted header, ` ```js "x" `, and attributes onto the line above the fence.

## Tables

GFM tables use a separator row (`|---|`) to mark the header. Carve marks each header cell with `|=` and needs no separator row:

::: compare no-render
```md
| Name  | Role   |
|-------|--------|
| Alice | Author |
| Bob   | Editor |
```
```crv
|= Name |= Role |
| Alice | Author |
| Bob | Editor |
```
:::

A pasted GFM table does not render as you expect in 0.2: the separator row is an ordinary data row, so the table has no header and a row of dashes. Convert it with `carve import --from gfm`, or replace the first row's pipes with `|=` and delete the separator row.

Note the space after `|=`. A cell marker is glued to the pipe and ends at a space, so `|=Name |` is a data cell whose text is `=Name`, not a header. Column alignment goes in a brace prefix on the header cell, `|={>} Price |`.

Carve tables also support spans and multi-line cells:

::: compare
```crv
|= Name |= Q1 |= Q2 |
| Alice | 42 | 17 |
| Bob | 9 | ^ |
| Carol and Dan | < | 21 |
```

```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Q1</th><th scope="col">Q2</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>42</td><td rowspan="2">17</td></tr>
    <tr><td>Bob</td><td>9</td></tr>
    <tr><td colspan="2">Carol and Dan</td><td>21</td></tr>
  </tbody>
</table>
```
:::

- `<` merges with the nearest available cell to its left (colspan).
- `^` merges with the nearest available cell above (rowspan).
- A row that starts with `+` continues the row above: each nonempty cell is appended to the cell above it, which makes a multi-line cell, not a span.

## Blockquote captions

Carve blockquotes work as in Markdown, and you can add a caption with a `^` line directly after the quote:

::: compare
```crv
> The art of being wise is the art of knowing what to overlook.
^ William James, /The Principles of Psychology/
```

```html
<figure>
  <blockquote><p>The art of being wise is the art of knowing what to overlook.</p></blockquote>
  <figcaption>William James, <em>The Principles of Psychology</em></figcaption>
</figure>
```
:::

The same caption syntax works after images, tables, code fences and display math.

## Things Markdown does not have

These Carve features have no Markdown equivalent. They do not collide with Markdown syntax you already know.

### Admonitions

::: compare
````crv
::: note
This is a note admonition.
:::

::: warning
Dangerous operation ahead.
:::
````

```html
<aside class="admonition note" aria-label="Note">
  <p>This is a note admonition.</p>
</aside>
<aside class="admonition warning" aria-label="Warning">
  <p>Dangerous operation ahead.</p>
</aside>
```
:::

The built-in callout names are `note`, `tip`, `warning`, `danger`, `info`, `success`, `example` and `quote`. They render as `<aside>`. Another `:::` name, such as `important`, renders as a `<div>` with that class unless an enabled extension handles the name.

GitHub alerts become admonitions on import. A top-level blockquote whose first line is only an alert label converts to the matching type, and the rest of the quote becomes its body:

| GitHub alert | Carve admonition |
| --- | --- |
| `> [!NOTE]` | `::: note` |
| `> [!TIP]` | `::: tip` |
| `> [!IMPORTANT]` | `::: info` |
| `> [!WARNING]` | `::: warning` |
| `> [!CAUTION]` | `::: danger` |

::: compare no-render
```md
> [!WARNING]
> Back up first.
```
````crv
::: warning
Back up first.
:::
````
:::

The importer writes no title; the type carries the meaning. A leftover alert label in Carve source is an ordinary quote, and `carve lint` reports it as `github-alert-marker`.

A custom title goes in straight double quotes after the type:

::: compare
````crv
::: tip "Custom Title"
The quoted header renders as the admonition's title.
:::
````

```html
<aside class="admonition tip" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Custom Title</p>
  <p>The quoted header renders as the admonition’s title.</p>
</aside>
```
:::

VitePress and Docusaurus accept an unquoted title such as `::: tip Custom Title`. Carve does not take it as a title: the container still opens, `carve lint` reports `fence-title-syntax`, and the words are dropped. Typographic quotation marks such as `“Custom Title”` are not accepted either.

### Attributes

Glue `{#id .class key=value}` to an inline element, and put it on its own line directly **above** a block:

::: compare
````crv
A [span]{.highlight} with a class, or an attributed [link](/url){.cta}.

{#custom-id .callout}
::: note
This note has an id and a class, set by the line above it.
:::
````

```html
<p>A <span class="highlight">span</span> with a class, or an attributed <a href="/url" class="cta">link</a>.</p>
<aside id="custom-id" class="admonition note callout" aria-label="Note">
  <p>This note has an id and a class, set by the line above it.</p>
</aside>
```
:::

A `{...}` at the **end of a heading line is not an attribute**. To give a heading its own id, put the attribute on the line above it:

::: compare
```crv
{#intro}
== Introduction
```

```html
<section id="intro">
  <h2>Introduction</h2>
</section>
```
:::

This is the migration trap most likely to bite you, because it fails quietly. `{#id}` at the end of a heading is the kramdown and Pandoc spelling, so it is all over existing Markdown, and left in place it changes the anchor:

<!-- carve-sample {"lint":"shows the trailing heading attribute that lint reports"} -->
::: compare
```crv
== Introduction {#intro}
```

```html
<section id="Introduction-intro">
  <h2>Introduction {#intro}</h2>
</section>
```
:::

The braces and the `#intro` become heading text, and the generated id comes from that text, so the anchor is `Introduction-intro`, neither `Introduction` nor `intro`. Every inbound link to either breaks, and the page still renders. `carve lint` reports it, which is the cheapest way to find them all before you publish:

```text
1:17: warning heading-trailing-attribute Trailing "{#intro}" on a heading is literal text in Carve, not an attribute block. Move it to a "{#intro}" line directly above the heading.
```

Without an explicit id, a heading gets an id generated from its text. The default keeps the case; a host can pick lowercase or ASCII ids with the `headingIds` render option.

### Math

::: compare
```crv
Einstein's famous equation is $`E = mc^2`.

$$`\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}`
```

```html
<p>Einstein’s famous equation is <span class="math inline" role="math">\(E = mc^2\)</span>.</p>
<p><span class="math display" role="math">\[\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}\]</span></p>
```
:::

### Footnotes

Carve supports reference footnotes and inline footnotes:

::: compare
```crv
Reference-style[^1] and inline^[This is the footnote content.] both work.

[^1]: Content for the reference footnote.
```

```html
<p>Reference-style<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> and inline<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> both work.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Content for the reference footnote.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>This is the footnote content.<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```
:::

### Citations

Citations are an extension that the host turns on; they have no core form. With the extension, cite with `:cite[smith2023]`, and add a locator as an attribute, `:cite[smith2023]{locator="p. 4"}`. A bare `[@smith2023]` is not a citation in 0.2: the brackets stay text and `@smith2023` reads as a mention. See [Optional Features and Extensions](./extensions).

### Cross-references

::: compare
```crv
{#intro}
== Introduction

See [the introduction](#intro) or the cross-reference </#intro>.
```

```html
<section id="intro">
  <h2>Introduction</h2>
  <p>See <a href="#intro">the introduction</a> or the cross-reference <a href="#intro">Introduction</a>.</p>
</section>
```
:::

`</#id>` inserts a cross-reference to the target: the heading text for a heading, or a number such as "Figure 3", "Table 2", "Listing 1" or "Equation 4" for a figure, table, listing or equation whose caption carries the `#` number placeholder.

### Extension syntax

The `:name[content]` inline form and the `::: name` block form are available for custom extensions without touching the core grammar. Without a registered extension, `:name[content]` renders as a span with the class `ext-name`, and `::: name` as a div with the class `name`, so documents stay readable.

::: compare
````crv
Watch :video[the intro].

::: roadmap
Planned work.
:::
````

```html
<p>Watch <span class="ext-video">the intro</span>.</p>
<div class="roadmap">
  <p>Planned work.</p>
</div>
```
:::

## Raw HTML

Tags typed in Carve source, such as `<span>` or `<div>`, are always text: they are never read as HTML. This is the key safety difference from Markdown, which passes raw HTML through by default.

The importer keeps the HTML of a Markdown document instead of dropping it. A block element becomes a raw ` ```=html ` block, and an inline tag becomes a raw `` `...`{=html} `` span, so `<span>note</span>` arrives as `` `<span>`{=html}note`</span>`{=html} ``.

The raw forms render as HTML only when the host allows it. By default they are escaped, so even a raw block shows its tags as text:

::: compare no-render
````crv
```=html
<div class="note">Kept from the Markdown source</div>
```
````

```html
<pre><code class="language-html">&lt;div class="note"&gt;Kept from the Markdown source&lt;/div&gt;
</code></pre>
```
:::

For trusted content, turn raw HTML on: `render(source, { rawHtml: true })` in JavaScript, or `carve render --raw-html` on the command line. Leave it off for content that users write. After import, look for raw spans of tags that Carve can spell natively, such as `<kbd>`, `<abbr>` or `<b>`, and replace them with `[Tab]{kbd}`, `[HTML]{abbr="..."}` or `*bold*`. See [Security](./security) for the full model.

## Headings are wrapped in `<section>`

This is the one output change that can break a site whose source converted cleanly, so check it before you convert a whole content directory.

A Markdown renderer writes headings flat. Carve wraps each top-level heading, and the content after it up to the next heading of the same or a higher level, in a `<section>`, and the heading's id goes on that wrapper:

::: compare
```crv
== Page Heading

A paragraph.
```

```html
<section id="Page-Heading">
  <h2>Page Heading</h2>
  <p>A paragraph.</p>
</section>
```
:::

Moving the id from the heading to its `<section>` does not affect a fragment link: `#Page-Heading` resolves to the wrapper exactly as it would to the heading. What the wrapper does break is CSS and JavaScript that assume rendered blocks are direct children of their container. The common casualty is the "owl" spacing rule, because the paragraphs are now grandchildren:

```css
/* Stops matching: the section is the only direct child. */
.stack > * + * { margin-block-start: 1.5em; }

/* Fix: match inside generated sections at any depth. */
:where(.stack, .stack section) > * + * { margin-block-start: 1.5em; }
```

Other things to search your stylesheets and scripts for: `>` child combinators under your content wrapper, `:first-child` and `:last-child` (the first paragraph after a heading is now the section's second child), `:nth-child()` counting, and `element.children` walks over the rendered container.

If a site cannot absorb the change, turn the wrappers off with the `sections` render option, `render(source, { sections: false })`. The id goes back on the heading:

<!-- carve-example {"options":{"sections":false}} -->
::: compare
```crv
== Page Heading

A paragraph.
```

```html
<h2 id="Page-Heading">Page Heading</h2>
<p>A paragraph.</p>
```
:::

Nothing else changes when it is off: ids, duplicate numbering, cross-references and heading references resolve against the same ids. A heading inside a quote, div, admonition or list item is never wrapped; it carries its id itself, which is also what every heading looks like with `sections: false`.

## Migration checklist

When moving a document from Markdown to Carve:

- [ ] Run `carve import --from gfm input.md > input.crv` for a first pass, or `--directory` for a folder, and read the review list of the report.
- [ ] Review all emphasis: `*italic*` becomes `/italic/`, `**bold**` becomes `*bold*`.
- [ ] Check underscores: `_text_` is not italic in Carve and stays text; underline is `{_text_}`.
- [ ] Check that GFM separator rows became `|=` header cells. A separator row left in place is a row of dashes.
- [ ] Check that `~~strike~~` became `{~strike~}`, and that `---` breaks became `***`.
- [ ] Move every heading `{#id}` onto the line above the heading. `carve lint` finds them; left in place they change the heading's anchor.
- [ ] Review imported raw HTML: block elements become raw `=html` blocks and inline tags become raw spans. They render only when the host allows raw HTML. Replace what Carve can spell natively.
- [ ] Run `carve lint` and `carve fmt --check` on the result.
- [ ] Audit CSS and JavaScript for direct-child assumptions: headings now nest their content in `<section>` (see [Headings are wrapped in `<section>`](#headings-are-wrapped-in-section)).

**Specification (external):** [block structure](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (paragraphs and interrupters, headings, tables, fences), [inline content](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (emphasis, braced delimiters, raw inline, citations C2-I-101), [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (sections, raw HTML), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) and [Markdown import is GFM import](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#markdown-import-is-gfm-import).
