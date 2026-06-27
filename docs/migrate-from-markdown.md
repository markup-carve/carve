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
| Headings | `# H1` through `###### H6` | same | |
| Links | `[text](url)` | same | |
| Reference links | `[text][ref]` / `[ref]: url` | same | |
| Images | `![alt](src)` | same | |
| Inline code | `` `code` `` | same | |
| Blockquotes | `> text` | same | Carve adds captions (see below) |
| Unordered lists | `- item` or `* item` | same | |
| Ordered lists | `1. item` | same | |
| Task lists | `- [ ] todo` / `- [x] done` | same | |
| Thematic break | `---` | same | |
| **Italic** | `*italic*` or `_italic_` | `/italic/` | **Changed** - see below |
| **Bold** | `**bold**` or `__bold__` | `*bold*` | **Changed** - see below |
| **Bold + italic** | `***both***` | `/*both*/` or `*text*` inside `/…/` | **Changed** |
| Underline | (not standard) | `_underline_` | Carve adds this |
| Strikethrough | `~~strike~~` (GFM) | `~strike~` | Single tilde in Carve |
| Fenced code language | ` ```python ` (no space) | ` ``` python ` (space required) | **Changed** - see below |
| Tables | GFM pipe tables with `\|---\|` separator row | `\|=` header cells, no separator row | **Changed** - see below |
| Footnotes | `[^label]` + `[^label]: text` (GFM ext.) | same | |
| Raw HTML | Inline and block, on by default | Disabled by default | See below |

## Emphasis: the most important change

Carve swaps the roles of `*` and `_` compared to Markdown. This is the one change that will catch you most often.

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

The fence token and closing fence are the same as Markdown. The only difference is a **required space** between the fence and the language tag:

::: code-group

```md [Markdown]
```python
def hello():
    print("hello")
```
```

```carve [Carve]
``` python
def hello():
    print("hello")
```
```

:::

Carve's grammar requires the space so that ` ```python ` is unambiguous with the extension syntax. Without it, the language tag is silently treated as plain text.

## Tables

GFM tables use a separator row (`|---|`) to mark the header. Carve uses `|=` on header cells instead and has no separator row:

::: code-group

```md [Markdown (GFM)]
| Name    | Role    |
|---------|---------|
| Alice   | Author  |
| Bob     | Editor  |
```

```carve [Carve]
|= Name   |= Role   |
| Alice   | Editor  |
| Bob     | Editor  |
```

:::

Carve tables also support cell spanning:

```carve
|= Name        |= Q1 |= Q2 |
| Alice        | 42  | ^   |
| Bob and Carol| <   | 17  |
```

- `<` merges with the cell to the left (colspan)
- `^` merges with the cell above (rowspan)
- `+` extends a span in both directions

## Blockquote captions

Carve blockquotes work the same as Markdown, but you can add a caption with a `^` line immediately after the closing block:

```carve
> The art of being wise is the art of knowing what to overlook.
^ William James, *The Principles of Psychology*
```

The same caption syntax works after images and fenced code blocks.

## Things Markdown does not have

These Carve features have no Markdown equivalent. They do not collide with Markdown syntax you already know.

### Admonitions

```carve
::: note
This is a note admonition.
:::

::: tip
Use admonitions for callouts and warnings.
:::

::: warning
Dangerous operation ahead.
:::

::: danger
This will delete your data.
:::
```

Any label works: `::: info`, `::: important`, `::: caution`, or your own custom names via extensions.

### Attributes

Attach `{#id .class key="value"}` to any block or inline element:

```carve
# Heading with an anchor {#custom-id}

A [link]{.highlight} with a class.

::: note {#important-note .callout}
This note has an id and a class.
:::
```

### Math

::: code-group

```carve [Inline]
Einstein's famous equation is $`E = mc^2`$.
```

```carve [Block]
``` math
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
```
```

:::

### Inline footnotes

Carve supports both reference-style and inline footnotes:

```carve
Reference-style[^1] and inline^[This is the footnote content.] both work.

[^1]: Content for the reference footnote.
```

### Citations

```carve
Recent work[@smith2023] shows promising results.

::: bibliography
[smith2023]: Smith, J. (2023). *Example Paper*. Journal of Examples.
:::
```

### Cross-references

```carve
## Introduction {#intro}

See [the introduction](#intro) or the numbered reference </#intro>.
```

`</#id>` inserts an auto-numbered cross-reference that updates when you add or remove numbered blocks.

### Extension syntax

The `:name[content]` (inline) and `::: name` (block) syntax is available for custom extensions without touching core grammar. An unknown name renders as a plain span or div, so documents remain readable even without the extension registered.

## Raw HTML

Carve disables raw HTML by default for security. Inline `<span>` and block `<div>` tags in your source will be passed through as literal text rather than HTML.

To enable raw HTML output (for trusted content only):

::: code-group

```ts [carve-js]
import { carveToHtml } from '@markup-carve/carve'

const html = carveToHtml(source, { rawHtml: true })
```

```php [carve-php]
use Carve\CarveConverter;

$html = (new CarveConverter(['rawHtml' => true]))->convert($source);
```

:::

::: warning Trust boundary
Only enable `rawHtml` for content you control. For user-generated content, leave it off and use Carve's native constructs instead.
:::

## Migration checklist

When moving a document from Markdown to Carve:

- [ ] Run `carve migrate --from markdown` for a first-pass conversion
- [ ] Review all emphasis: `*italic*` → `/italic/`, `**bold**` → `*bold*`
- [ ] Check `_underline_` occurrences - these render as `<u>` in Carve, not `<em>`
- [ ] Add a space after fenced code fence tokens: ` ```python ` not ` ```python`
- [ ] Convert GFM table separator rows to `|=` header cells
- [ ] Replace `~~strike~~` with `~strike~` (single tilde)
- [ ] Decide on raw HTML: remove it, replace with Carve constructs, or enable `rawHtml`
