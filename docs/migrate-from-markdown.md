---
title: Coming from Markdown
description: A task-oriented guide for Markdown and GFM authors switching to Carve.
---

# Coming from Markdown

This guide is for authors who already know CommonMark or GitHub-Flavored Markdown (GFM) and want to rewrite documents in Carve. It focuses on what to change, not on why Carve differs from Markdown - for the design rationale see [Carve vs Markdown/Djot/MDX](/comparison).

::: tip Automated conversion
The `carve` CLI includes a Markdown converter. Run it to get a first-pass Carve file you can then refine:

```bash
carve migrate input.md --from markdown --to carve > output.crv
```

The converter handles most mechanical substitutions, but review the output for emphasis and table syntax.
:::

## Syntax map

The table below covers the constructs you use most often. Items marked **same** work identically; items marked **changed** need attention.

| Construct | Markdown | Carve | Notes |
|---|---|---|---|
| Headings | `# H1` through `###### H6` | same | A trailing `{#id}` is **not** an attribute (see below) |
| Links | `[text](url)` | same | |
| Reference links | `[text][ref]` / `[ref]: url` | same | |
| Images | `![alt](src)` | same | |
| Inline code | `` `code` `` | same | |
| Fenced code | `` `code fence` `` with a language | same | No-space info string is canonical; a space is also accepted |
| Blockquotes | `> text` | same | Carve adds captions (see below) |
| Unordered lists | `- item` or `* item` | same | Carve bullets are `-`/`*`; a Markdown `+` bullet is not a Carve bullet |
| Ordered lists | `1. item` | same | |
| Task lists | `- [ ] todo` / `- [x] done` | same | |
| Thematic break | `---` | same | Contiguous `---`, `***`, or `___` (no spaced forms) |
| **Italic** | `*italic*` or `_italic_` | `/italic/` | **Changed** - see below |
| **Bold** | `**bold**` or `__bold__` | `*bold*` | **Changed** - see below |
| **Bold + italic** | `***both***` | `/*both*/` | **Changed** |
| Underline | (not standard) | `_underline_` | Carve adds this |
| Strikethrough | `~~strike~~` (GFM) | `~strike~` | Single tilde in Carve |
| Tables | GFM pipe tables with a `\|---\|` row | `\|=` header cells | **Changed** - see below (GFM delimiter row also accepted) |
| Footnotes | `[^label]` + `[^label]: text` (GFM ext.) | same | Plus inline `^[...]` |
| Raw HTML | Inline and block, on by default | Bare tags are literal; explicit `=html` passthrough only | See below |

## Emphasis: the most important change

Carve uses `/` for italic and `*` for bold - unlike Markdown's `*`/`**`. And `_`, which is italic in Markdown, means underline in Carve. This is the one change that will catch you most often.

::: code-group

```md [Markdown]
*italic text*
**bold text**
***bold and italic***
_also italic_
__also bold__
~~strikethrough~~
```

```carve [Carve]
/italic text/
*bold text*
/*bold and italic*/
_underline_
*also bold*
~strikethrough~
```

:::

::: warning Emphasis is the most common migration error
The auto-converter rewrites emphasis for you, but watch for cases where your Markdown used `_` for italics - in Carve `_underline_` renders as `<u>`, not `<em>`.
:::

The mnemonic: `/` leans like italics, `*` is strong like bold.

## Fenced code blocks

Fenced code blocks work like Markdown for the common case - a language directly after the fence, no space, which is the canonical Carve form:

````md
```python
def hello():
    print("hello")
```
````

Carve is lenient about the leading space: a space after the fence (the Djot style) is also accepted and parses identically. One difference worth knowing: Carve's info string is structured - an optional language token, then an optional `"title"`, then an optional `[label]` - rather than free-form text. For everyday `language`-only fences there is nothing to migrate.

## Tables

GFM tables use a delimiter row (`|---|`) to mark the header. Carve's native, canonical form marks header cells with `|=` and needs no delimiter row:

::: code-group

```md [Markdown (GFM)]
| Name    | Role    |
|---------|---------|
| Alice   | Author  |
| Bob     | Editor  |
```

```carve [Carve]
|= Name   |= Role   |
| Alice   | Author  |
| Bob     | Editor  |
```

:::

For convenience, Carve also accepts a GFM `|---|` delimiter row as a second line, so a pasted Markdown table still renders - but `|=` is the canonical form the converter emits.

Carve tables also support cell spanning and multi-line cells:

```carve
|= Name        |= Q1 |= Q2 |
| Alice         | 42  | 17  |
| Bob           | 9   | ^   |
| Carol and Dan | <   | 21  |
```

- `<` merges with the nearest available cell to its left (colspan)
- `^` merges with the nearest available cell above (rowspan)
- `+` begins a continuation row: each non-empty cell is appended to the corresponding cell in the row above (multi-line cells), not a span

## Blockquote captions

Carve blockquotes work the same as Markdown, but you can add a caption with a `^` line immediately after the quote:

```carve
> The art of being wise is the art of knowing what to overlook.
^ William James, /The Principles of Psychology/
```

The same caption syntax works after images and fenced code blocks.

## Things Markdown does not have

These Carve features have no Markdown equivalent. They do not collide with Markdown syntax you already know.

### Admonitions

```carve
::: note
This is a note admonition.
:::

::: warning
Dangerous operation ahead.
:::
```

The Tier-1 canonical types - `note`, `tip`, `warning`, `danger`, `info`, `success`, `example`, `quote` - render as admonition `<aside>` callouts. Any other `:::` name (e.g. `important`, `caution`, or your own) renders as a generic typed `<div>` (class `name`), or as a registered extension if one claims that name.

A custom title goes in **straight double quotes** after the type:

```carve
::: tip "Custom Title"
The quoted header renders as the admonition's title.
:::
```

If you come from VitePress or Docusaurus, note the difference: their unquoted form (`::: tip Custom Title`) is **not** a fence in Carve - the whole block degrades to a literal paragraph. Quote the title. The same happens when a CMS "smart quote" filter converts your straight quotes to typographic ones (`::: tip “Custom”`) before Carve parses the text - if you see raw `:::` lines in your output, check the quotes.

### Attributes

Attach `{#id .class key="value"}` to inline elements directly, and to block elements via a standalone line **before** the block:

```carve
A [span]{.highlight} with a class, or an attributed [link](/url){.cta}.

{#custom-id .callout}
::: note
This note has an id and a class, set by the line above it.
:::
```

A `{...}` written at the **end of a heading line is literal text**, not an attribute (a deliberate Djot-strict choice). To give a heading a custom id, put the attribute on the preceding line:

```carve
{#intro}
## Introduction
```

Without an explicit id, headings still get an auto-generated id from their text (case is preserved; a leading digit gets an `s-` prefix). Lowercasing and ASCII-folding are available as opt-in transforms.

### Math

::: code-group

```carve [Inline]
Einstein's famous equation is $`E = mc^2`.
```

```carve [Display]
$$`\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}`
```

:::

### Footnotes

Carve supports both reference-style and inline footnotes:

```carve
Reference-style[^1] and inline^[This is the footnote content.] both work.

[^1]: Content for the reference footnote.
```

### Citations

Citations are a Tier-2 extension (enable the citations extension). Cite with `[@key]` and define entries in-document with `[@key]:` lines. The generated reference list is appended at the document end, or injected wherever you place a `::: references` block:

```carve
Recent work [@smith2023] shows promising results.

[@smith2023]: Smith, J. (2023). /Example Paper/. Journal of Examples.
```

### Cross-references

```carve
{#intro}
## Introduction

See [the introduction](#intro) or the cross-reference </#intro>.
```

`</#id>` inserts a cross-reference to the target: generated link text for a heading, or an auto-updating number ("Figure 3", "Table 2", "Listing 1", "Equation 4") for a *numbered-caption* target - a figure, table, listing, or equation whose caption carries a number placeholder.

### Extension syntax

The `:name[content]` (inline) and `::: name` (block) syntax is available for custom extensions without touching core grammar. An unknown inline `:name[content]` renders as a generic inline extension (class `ext-name`, content closing at the first `]`); an unknown `::: name` block renders as a generic typed div - so documents stay readable even without the extension registered.

## Raw HTML

Bare `<span>` and `<div>` tags in your source are **always literal text** in Carve - they are never interpreted as HTML. This is the key safety difference from Markdown, which passes raw HTML through by default.

When you genuinely want verbatim HTML, use the explicit raw constructs - a ```` ```=html ```` block or `` `...`{=html} `` inline. These passthrough constructs are on by default for trusted content. For untrusted input, turn the passthrough off so even those are escaped:

```ts
import { carveToHtml } from '@markup-carve/carve'

// Untrusted input: disable the explicit raw-HTML passthrough.
const html = carveToHtml(source, { allowRawHtml: false })
```

The equivalent switch exists per engine (carve-rs `Options::with_raw_html(false)`, etc.). See [Security](/security) for the full model.

::: warning Trust boundary
Bare tags are safe (literal) regardless. The setting above only governs the explicit ```` ```=html ```` / `{=html}` passthrough - leave it disabled for user-generated content.
:::

## Migration checklist

When moving a document from Markdown to Carve:

- [ ] Run `carve migrate --from markdown` for a first-pass conversion
- [ ] Review all emphasis: `*italic*` -> `/italic/`, `**bold**` -> `*bold*`
- [ ] Check `_underline_` occurrences - these render as `<u>` in Carve, not `<em>`
- [ ] Convert GFM table delimiter rows to `|=` header cells
- [ ] Replace `~~strike~~` with `~strike~` (single tilde)
- [ ] Move any heading `{#id}` onto the line above the heading (trailing is literal)
- [ ] Decide on raw HTML: bare `<tags>` become literal text, so replace them with Carve constructs (or use the explicit `{=html}` passthrough for trusted content; disable it with `allowRawHtml: false` for untrusted input)
