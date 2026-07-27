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
| `[Page Name][]` | wiki-style link | resolves to a heading |
| `<https://url>` | autolink | |
| `</#section-id>` | cross-reference | link text cloned from the target |
| `![alt](img.jpg)` | image | |
| `[^1]` / `^[inline note]` | footnote | reference / inline form |
| `[span]{.class}` | span | `{…}` adds class, id, or attributes |
| `:youtube[ID]` ✦ | extension | `:type[content]{attrs}` — syntax is core; the handler is opt-in |
| `@user` `#tag` | mention / tag | social conventions |
| `\*literal\*` | escape | backslash + any ASCII punctuation |
| `--` `---` `...` `->` `(c)` | – — … → © | smart typography |
| `\` at end of line | hard break | `\ ` (backslash-space) = no-break space |
| `` `<br>`{=html} `` | raw inline | target-routed; Carve renderers emit only `=html`, others feed external writers ([why](/divergence-from-djot#_10-raw-passthrough-is-target-routed-and-the-pandoc-boundary)) |

Bare delimiters work only at word boundaries; force one intraword with the brace form, e.g. `H{,2,}O`, `mc{^2^}`.

## Blocks

````carve
# H1   ## H2   ### H3        (ATX headings 1-6; put attributes on the
                              line above: {#id .class})

---                          (thematic break: --- *** ___)

- unordered      1. ordered  (dialects: a. A. i. I. and the ) delimiter;
- [ ] task        - [x] done  more task states: [-] [_] [>] [?])
-{.c} styled item            (attrs abutting the marker target the <li>)

- step one                   (lone + attaches the next flush-left block
+                             to the item - no deep indenting)
> note for step one

:: term                      (definition list)
:  definition

> blockquote
^ Attribution                (caption / attribution: ^ prefix)

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

:::: outer                   (longer fences nest shorter ones)
::: note
inner
:::
::::

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

```carve
|= Header |= Header |        (|= marks a header cell; also works in body
| Cell    | Cell    |         rows for ROW headers)
^ Table caption

|= Name |=> Age |=~ City |   (column alignment glued to |=: < ~ >;
| Sum    |< 12   | NYC    |   a data-cell marker overrides per cell)

| Name  | Age |              (GFM separator row accepted as a
|-------|----:|               compatibility alias: marks the header
| Alice |  30 |               row + column alignment)

| ^      | spanned |         (^ = rowspan)
| Header | <       |         (< = colspan)
+ continuation cell |        (+ = multi-line cell)
```

## Captions (images, quotes, tables, code listings, equations)

```carve
![Photo](img.jpg)
^ Figure 1: Caption text      (one ^ adds a semantic <figcaption>)

{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset          (# = auto number; </#fig-sun> then renders
                               as "Figure 1")
```

A `^` caption after a fenced code block makes a numbered *listing*; after a
standalone `$$`-math block, a numbered *equation*.

A caption spans multiple lines like a paragraph — following lines fold in until
a blank line or a block that would interrupt a paragraph (a list marker folds
in, it does not end the caption):

```carve
![Photo](img.jpg)
^ A long caption that
continues on the next line.
```

## Attributes & metadata

```carve
{#id .class key=value}        (attach to the preceding/following element)

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
%%%
block comment
%%%

{+inserted+}  {-deleted-}  {~old~>new~}  {#a comment#}   (CriticMarkup)
```

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
