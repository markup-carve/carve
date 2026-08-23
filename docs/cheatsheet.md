---
title: Cheat Sheet
description: Every Carve construct on one scannable page.
---

# Cheat Sheet

The whole syntax, one page. Carve's mnemonic: **the markup looks like its output**.

Everything here is **core** (Tier-1) — on by default, identical across every
implementation — except rows marked **✦**, which are opt-in extensions
(Tier-2/3) you enable in your processor. Look any feature up in the
[feature → tier table](/extensions#feature-tiers-quick-reference).

Two kinds of block appear below. A block tagged `carve` is a **document**: paste
it into the [Playground](/playground) and you get what the text around it says.
A block tagged `text` is **notation** - several constructs packed onto a line
each, with the explanation in a right-hand column. That is how a reference card
fits on one page, and it is not a document: pasted anywhere, the annotations
make every line prose. For the working version of a notation block, see
[Blocks & Attributes](/blocks-and-attributes) and [Examples](/examples).

## Inline

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
| `\*literal\*` | escape | backslash + any ASCII punctuation |
| `--` `---` `...` `-->` `==>` `(c)` | – — … → ⇒ © | smart typography; a bare HYPHEN RUN with a space before it and a non-space after it is a CLI flag and stays literal (`x --next`) - the arrows are matched before that guard and still convert there (`x -->next` is `x →next`) |
| `{--}` | – | braced en dash — converts in the flag position the bare run refuses |
| `\` at end of line | hard break | `\ ` is a hard break here too — the trailing space is stripped before the escape is read |
| `\ ` mid-line | no-break space | backslash-space; in the last column it is the hard break above |
| `` `<br>`{=html} `` | raw inline | target-routed; Carve renderers emit only `=html`, others feed external writers ([why](/divergence-from-djot#_10-raw-passthrough-is-target-routed-and-the-pandoc-boundary)) |

Bare delimiters work only at word boundaries; force one intraword with the brace form, e.g. `H{,2,}O`, `mc{^2^}`. The braces need content: an empty pair like `{^^}` is text.

## Blocks

````text
# H1   ## H2   ### H3        (ATX headings 1-6; put attributes on the
                              line above: {#id .class})

---                          (thematic break: --- *** ___)

- unordered      1. ordered  (dialects: a. A. i. I. and the ) delimiter;
- [ ] task        - [x] done  more task states: [-] [_] [>] [?])
. bare dot                   (decimal from 1; only `.` may drop its value)
-{.c} styled item            (attrs abutting the marker target the <li>)

- step one                   (lone + attaches the next flush-left block
+                             to the item - no deep indenting)
> note for step one

:: term                      (definition list)
:  definition

{loose}                      (consumed boolean: the container's children
- one-item loose list         render as blocks. The one shape a blank
                              line cannot spell - a one-item list, or a
                              one-block <dd>. No {tight} twin: tight is
                              always spellable by removing the blanks.)

> blockquote
^ Attribution                (caption: ^ prefix; wraps the quote in a figure)

> quoted                     (+ at col 0 attaches the next flush-left
+                             block to the quote - no > prefixing)
- list now lives inside the quote

```language "Header" [Label]
code block
```
                             (canonical is ```language - no space; "Header"
                              -> <pre title>, [Label] = code-group tab name;
                              both optional, space-separated, in that order)

```=html
<div>passed through when the output format matches</div>
```

::: note "Custom Title"      (admonition: note tip warning danger
body                          info success example quote;
:::                           any other word = <div class="word">;
                              optional "Title" -> admonition-title,
                              must be straight-quoted - unquoted or
                              curly-quoted text makes the line a
                              plain paragraph)

::: tab [Label]              (optional [Label] after the type = group
body                          identifier, e.g. the tab name; same
:::                           "Header" [Label] tokens as a code fence)

::: outer                    (a closer matches its opener's length
:::: note                     exactly; canonical nesting adds one
inner                         colon per level inward)
::::
:::

::: |                        (preserves per-line layout)
Roses are red,
  Violets are blue.
:::

::: \                        (local hard breaks; no whitespace preservation)
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
space -- and it is atomic, so a run that is rejected takes the `=` with it. On `|=` it sets column defaults; on a plain `|` it overrides that cell.
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

Glued is what makes it alignment; the terminating space ends the run. A
standalone `| < |` cell is the colspan merge, `| ^ |` the rowspan merge.

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

A caption spans multiple lines like a paragraph — following lines fold in until
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
- **[Formal Grammar](/grammar)** — the normative spec.
