---
title: Cheat Sheet
description: Every Carve construct on one scannable page.
---

# Cheat Sheet

Rows marked **✦** require an opt-in extension. Other entries are core syntax.
See the [feature tier table](/extensions#feature-tiers-quick-reference) for
availability.

`carve` code blocks are valid documents. `text` blocks are compact notation;
their right-hand comments are not part of the syntax. [Examples](/examples)
shows complete input and output.

## Inline

### Formatting

| Write | Get | Mnemonic |
|-------|-----|----------|
| `/italic/` | *italic* | slashes lean like italics |
| `*bold*` | **bold** | asterisks are heavy |
| `/*bold italic*/` | ***both*** | combined |
| `_underline_` | underline | the line sits below |
| `~strike~` | ~~strike~~ | tilde runs through |
| `{^super^}` | super­script | caret points up |
| `{,sub,}` | sub­script | commas pull down |
| `=highlight=` | highlight | like a highlighter pen |
| `` `code` `` | `code` | backticks |
| `` !`/kaet/` `` | /kaet/ | inline literal — verbatim prose, no `code` styling; `!` mirrors `$`-math |

### Links, references, and extensions

| Write | Get | Mnemonic |
|-------|-----|----------|
| `[text](url)` | link | |
| `[text][ref]` | reference link | `[ref]: https://url` on its own line, anywhere |
| `[Page Name][]` | wiki-style link | resolves to a heading |
| `<https://url>` | autolink | bare URLs stay literal (autolinking them is Tier-2 opt-in) |
| `</#section-id>` | cross-reference | link text cloned from the target |
| `![alt](img.jpg)` | image | |
| `[^1]` / `^[inline note]` | footnote | reference / inline form |
| `[span]{.class}` | span | `{…}` adds class, id, or attributes |
| `:youtube[ID]` ✦ | extension | `:type[content]{attrs}` — syntax is core; the handler is opt-in |
| `@user` `#tag` | mention / tag | social conventions |

### Escapes and typography

| Write | Get | Mnemonic |
|-------|-----|----------|
| `\*literal\*` | escape | backslash + any ASCII punctuation |
| `--` `---` `...` `-->` `==>` `(c)` | – — … → ⇒ © | smart typography; see the note below |
| `{--}` | – | braced en dash — converts in the flag position the bare run refuses |
| `\` at end of line | hard break | `\ ` is a hard break here too — the trailing space is stripped before the escape is read |
| `\ ` mid-line | no-break space | backslash-space; in the last column it is the hard break above |
| `` `<br>`{=html} `` | raw inline | emitted only in HTML output; other format names are retained for external converters ([security and configuration](/security)) |

A bare hyphen run stays literal when it looks like a CLI flag: `x --next`.
Arrows still convert in that position, so `x -->next` becomes `x →next`.

Bare delimiters work only at word boundaries; force one intraword with the brace form, e.g. `H{,2,}O`, `mc{^2^}`. The braces need content: an empty pair like `{^^}` is text.

## Blocks

````text
# H1   ## H2   ### H3        (ATX headings 1-6; put attributes on the
                              line above: {#id .class})

---                          (thematic break: --- *** ___)

- unordered
. auto-numbered              (preferred native Carve form; counts from 1 and
                              keeps nested indentation stable at 10, 100, ...)
1. ordered                   (explicit number: Markdown/Djot-portable, sets the
                              start; dialects: a. A. i. I. and the ) delimiter)
- [ ] open task              (task items: one per line)
- [_] open alias             (keeps the authored marker)
- [/] task in progress
- [!] blocked task
- [x] done task
- [-] dropped task
- [>] deferred task
- [?] uncertain task
-{.c} styled item            (attrs abutting the marker target the <li>)

- step one                   (lone + at the item's marker column attaches
+                             the next block at that column - no deep
                              indenting; nested items work the same way)
> note for step one

:: term                      (definition list)
: definition

{loose}                      (consumed boolean: the container's children
- one-item loose list         render as blocks. The one shape a blank
                              line cannot spell - a one-item list, or a
                              one-block <dd>. No {tight} twin: tight is
                              always spellable by removing the blanks.)

> blockquote
^ Attribution                (caption: ^ prefix; wraps the quote in a figure)

> quoted                     (+ at the quote's column attaches the next
+                             block there to the quote - no > prefixing)
- list now lives inside the quote

::: >                        (the SAME block quote, fenced: no marker on
notes:                       every line. `fmt` writes back whichever
                              spelling you used. Nests at constant width,
- a                           so re-quoting is prepend-and-append. Takes
- b                           the ^ caption on its CLOSING fence.)
:::

```language "Header" [Label]
code block
```
                             (standard form is ```language - no space; "Header"
                              -> <pre title>, [Label] = code-group tab name;
                              both optional, space-separated, in that order)

```=html
<div>passed through when the output format matches</div>
```

::: note "Custom Title"      (admonition: note tip warning danger
body                          info success example quote;
:::                          any other word = <div class="word">;
                              optional "Title" -> admonition-title,
                              must be straight-quoted - unquoted or
                              curly-quoted text makes the line a
                              plain paragraph)

::: tab [Label]              (optional [Label] after the type = group
body                          identifier, e.g. the tab name; same
:::                          "Header" [Label] tokens as a code fence)

::: outer                    (a closer matches its opener's length
:::: note                     exactly; standard nesting adds one
inner                         colon per level inward)
::::
:::

::: |                        (verse: every line break and leading
                              space kept; lists/fences inside are text)
Roses are red,
  Violets are blue.
:::

::: \                        (every line break kept, nothing else
                              changes: leading spaces dropped, lists work)
one
two
:::
````

> Block markers must start at column 0 (or, inside a list, at the item's content
> column). A marker indented past that - an indented `#`, `>`, `-`, `` ``` ``, or
> `:::` - is literal paragraph text, not a block. Markdown tolerates 0-3 spaces
> of leading indent here; Carve does not.

## Tables

`|=` marks a header cell: in the first row it heads a column, in a body row it
heads that row. Every cell marker is glued to the pipe and followed by a space -
that space is what ends the marker run, so `|=a |` is a data cell whose text is
`=a`. A `^` line after the table is its caption.

```carve
|= Item |= Qty |
|= Apple | 12 |
| Pear   |  3 |
^ Stock on hand
```

A cell holding only `^` merges upward (rowspan) and one holding only `<` merges
leftward (colspan); a `+` row continues the row above it, cell by cell, joined
with a space.

```carve
|= Item |= Qty |= Note |
| Apple | 12 | fresh |
+       |    | picked today |
| ^     |  3 | <     |
```

### Alignment

`<` left, `~` center, `>` right; paired `^` top, `~` middle, `v` bottom. A
horizontal marker may stand alone; a vertical marker always needs a horizontal
partner. Where that partner should stay whatever the column already says, `?`
stands in for it: `?^`, `?~` and `?v` set the vertical axis only and leave the
horizontal one to the column. The run is glued to the pipe and terminated by a
space. It is atomic, so a run that is rejected takes the `=` with it. On a head-row `|=` it sets a default for its starting column; on a later row-header `|=` or a plain `|` it overrides that cell. A `<` span cell beside it carries no default into the covered column. Promoting a plain row with `header-rows` does not turn its markers into column defaults.
Table attributes can set headerless defaults:
`{aligns="right,center" valigns="top," widths="30,70"}`. Use
`{header-rows=N footer-rows=N}` before a pipe table for explicit `thead`/`tfoot`
ranges; `|=` header cells still work in the body.

```carve
|=~ Item |=>^ Qty |
| Apple | 12 |
| Subtotal |<v 12 |
| Total |?v 15 |
```

`<v` overrides both axes for that cell; `?v` moves only the vertical one, so the
Total figure keeps the column's right alignment.

An alignment run beginning with `<` needs content after its terminating space. A
standalone `| < |` cell is the colspan merge, `| ^ |` the rowspan merge.
`|<|`, `| <|` and `|< |` also merge. The four lone `^` forms behave the
same way. To make a merged
header without `=`, add a GFM delimiter row or use
`{header-rows=1 aligns="right,right,center"}` for explicit per-column defaults.

### CSV and TSV data

A `{table}` flag on the line above a `csv` or `tsv` fence makes the fence a
table. The first record is the header row. Fields follow RFC 4180 quoting, so a
quoted field can hold a comma or a newline, and `""` is a literal quote.

````carve
{table}
```csv
Item,Qty,Note
Apple,12,fresh
"Pear, green",3,"picked
today"
```
^ Stock on hand
````

renders as

```html
<table>
  <caption>Stock on hand</caption>
  <thead>
    <tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Note</th></tr>
  </thead>
  <tbody>
    <tr><td>Apple</td><td>12</td><td>fresh</td></tr>
    <tr><td>Pear, green</td><td>3</td><td>picked
today</td></tr>
  </tbody>
</table>
```

A `tsv` fence splits on TAB and quotes the same way. The other table attributes
work on the same line: `aligns`, `valigns`, `widths`, `footer-rows`, and
`header-rows=0` for a table without a header row.

````carve
{table header-rows=0 aligns=left,right}
```csv
Apple,12
Pear,3
```
````

Fields are literal text: no inline markup, span markers or cell attributes.
A short record is padded with empty cells. `carve fmt` keeps the delimited form.

A fence stays a code block when the `{table}` flag is missing, or when the
quoting is malformed (an unclosed quote, a quote inside an unquoted field, text
after a closing quote). The malformed case reports `delimited-table-malformed`
in `carve lint`. A record with more fields than the first one keeps its extra
cells and reports `delimited-table-wide-row`. See [Validation](/validation).

The data can also live in its own file: put `{table}` above a
<code v-pre>{{ data/plans.csv @code:csv }}</code> include, as shown in
[Including source as code](/includes#including-source-as-code-code).
Linting included data is covered in
[Linting included content](/includes#linting-included-content).

### Aligned source formatting

`carve fmt` writes one space on each side of a cell, whatever the column width.
That is the canonical form. Formatters may offer an opt-in mode that pads every
cell to its column's width (CARVE-P11-071):

```carve
|= Name |= Score |= Note |
| Ada | 9 | first try |
| 山田太郎 | 10 | a longer note |
+ | | that wraps |
| Total | 19 | < |
```

`carve fmt --align-tables` writes

```carve
|= Name    |= Score |= Note         |
| Ada      | 9      | first try     |
| 山田太郎 | 10     | a longer note |
+          |        | that wraps    |
| Total    | 19     | <             |
```

Padding goes after the content, also in right-aligned columns. Width counts
wide characters such as CJK as two columns. Both forms render the same table.

Since carve-js 0.1.12, table alignment is available through:

- carve-js CLI: `carve fmt --align-tables`, and `carve fmt --align-tables --check`
  as the matching CI gate
- Prettier, through the plugin carve-js ships: `"carveAlignTables": true`
- carve-lsp: the `format.alignTables` setting

The mode is optional per engine. The `carve fmt --align-tables` option, including
`--check`, is also supported from carve-php 0.1.14 and carve-rs 0.1.11.

## Captions (images, quotes, tables, code listings, equations, figure groups)

One `^` line after the block adds a semantic `<figcaption>`:

```carve
![Photo](img.jpg)
^ Caption text
```

A `#` in the caption is the auto number, so a cross-reference to the element's
id renders as "Figure 1" rather than repeating the caption:

```carve
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset

See </#fig-sun> for the view.
```

A `^` caption after a fenced code block makes a numbered *listing*; after a
standalone `$$`-math block, a numbered *equation*.

A bare `::: figure` container is a *composite figure*: its captioned children
become lettered panels, and a `^` caption after the closing fence captions and
numbers the whole group (`</#panel-id>` then renders as "Figure 2a"):

```carve
::: figure
![one](a.png)
^ (a) One

![two](b.png)
^ (b) Two
:::
^ Figure #: The pair
```

A caption spans multiple lines like a paragraph: following lines fold in until
a blank line or a block that would interrupt a paragraph (a list marker folds
in, it does not end the caption):

```carve
![Photo](img.jpg)
^ A long caption that
continues on the next line.
```

## Attributes & metadata

```text
{#id .class key=value}        (attach to the preceding/following element)
{loose}                       (consumed structural keys: they change the
{header-rows=N footer-rows=N}  rendered structure and are NOT emitted as
{aligns=… valigns=… widths=…}  HTML attributes. loose makes a list's or a
                               definition list's children render as blocks;
                               the rest are pipe-table row groups and
                               columns)
{:fr}  {:de-CH}  {:}          (language: short for lang="fr"; {:} = unknown)
[Tab]{kbd}                    (semantic span: <kbd>Tab</kbd>; core names are
[HTML]{abbr="HyperText …"}     kbd, abbr, time — samp/var/cite/dfn need the
[now]{time="2026-01-01"}       SemanticSpan extension)

*[HTML]: HyperText Markup Language   (abbreviation definition)

---
title: My Document            (frontmatter: leading --- block,
tags: [carve, markup]          held raw; add ---toml / ---json for
---                            other formats)
```

## Math, comments, editorial

```carve
Inline $`e^{i\pi}+1=0`        Display $$`\int_0^1 x\,dx`

%% line comment
text %% trailing comment
foo {% hidden %} baz          (ends at its closer, so prose can resume)
%%%
block comment
%%%

{+inserted+}  {-deleted-}  {~old~>new~}  {#a comment#}
```

The last line is CriticMarkup: insert, delete, substitute, comment. Its comment
is the one that RENDERS - `{#` shows a note to the reader, `{%` hides one from
them. Every one of these needs content - an empty pair such as `{++}` or `{##}`
is text, not a construct, and the same holds for the forced spans above. `{--}`
is the exception that became something: it is the [braced en dash](#inline).

## Diagrams & charts

Fenced blocks drawn by a client library or a build step. Fence words: `mermaid`,
`d2`, `graphviz`, `wavedrom`, `abc`, `plantuml` (`puml`), `vega-lite`, `chart`.

````carve
``` mermaid
classDiagram              (UML: classDiagram, sequenceDiagram,
  Parser --> Document      stateDiagram-v2, erDiagram)
```

``` chart
{"type":"bar","data":{"labels":["a","b"],"datasets":[{"data":[1,2]}]}}
```
````

Extension, off by default; falls back to a code block when unrendered. See
**[Diagrams & Charts](/diagrams)**.

## Next

- **[Examples](/examples)** — each construct next to its rendered HTML.
- **[Get Started](/get-started)** — render Carve in your own project.
- **[Formal Grammar](/grammar)** — the language specification.
