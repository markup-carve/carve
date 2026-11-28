---
description: "Frontmatter on line 1 and typed metadata blocks later in a Carve 0.2 file: opener rules, format names, keys, the AST node, fmt and lint behavior, and common mistakes."
---

# Metadata blocks

A metadata block holds data about the document, not content for the reader: a title, an author, tags, build settings, or settings for one chapter. Carve keeps the payload as opaque text and hands it to the host (a static site generator, a build script, an editor plugin), which parses it as YAML, TOML, JSON or whatever the block names. HTML rendering writes nothing for a metadata block.

Carve 0.2 has two places for one:

- **Document frontmatter** on line 1, the classic `---` block that most Markdown tools also read.
- **Typed metadata blocks** later in the file, for data that belongs to a part of the document, such as one chapter or one recipe.

Both become the same `frontmatter` node in the tree. Use a metadata block when a program needs the data. Text the reader should see belongs in ordinary content.

## Document frontmatter

Put three hyphens on line 1, the payload on the lines below, and three hyphens again to close. Nothing may stand before the opener except a byte order mark, and the opener stands at column 0.

::: compare
```crv
---
title: Field notes
author: Ada
---

The body starts here.
```

```html
<p>The body starts here.</p>
```
:::

The block renders nothing. Blank lines inside it are part of the payload and stay as written:

::: compare
```crv
---
title: Notes


draft: true
---

Body.
```

```html
<p>Body.</p>
```
:::

A bare `---` means YAML. To use another format, name it on the opener:

::: compare
```crv
---toml
title = "Field notes"
tags = ["travel", "birds"]
---

Body.
```

```html
<p>Body.</p>
```
:::

The closer is a line of exactly `---`, optionally followed by spaces or tabs. The parser does not look ahead for it: once the opener matches, the block runs until a closer or the end of the file.

## Format names

The format name is one word of ASCII letters and digits, in any case: `yaml`, `toml`, `json`, `JSON` and `1` are all format names, while `x-y`, `x_y` and `é` are not. Write it glued to the hyphens (`---toml`, the canonical form) or after one space (`--- toml`). The word must be the only thing on the line. A second word, any other character, or two spaces before the word leave the line as plain text.

The name is kept exactly as written, so `---JSON` has the format `JSON`, which a host comparing against `json` will not match. The parser never reads the payload for any format.

## Typed metadata blocks later in the file

After line 1, a metadata block needs a format name on its opener. Bare `---` after line 1 is never a metadata block. The opener stands at column 0 and needs one of two things directly above it:

- a blank line, or
- one or more top-level attribute lines.

::: compare
```crv
---
title: Book
---

= Chapter 1

{#chapter-1}
---yaml
author: Ada
---

Text.
```

```html
<section id="Chapter-1">
  <h1>Chapter 1</h1>
  <p>Text.</p>
</section>
```
:::

A typed opener does not interrupt a paragraph. An opener that is indented, or that stands inside a block quote, list item, description, footnote or div, is text. Metadata blocks live only at the top level of the document (or of an included file).

The attribute line can carry classes and key-value pairs as well as an id. The host sees them on the node; the HTML sees nothing:

::: compare
```crv
= Recipes

{#pizza .recipe}
---toml
serves = 4
time = "2h"
---

Mix the dough.
```

```html
<section id="Recipes">
  <h1>Recipes</h1>
  <p>Mix the dough.</p>
</section>
```
:::

When attribute lines start on line 1, a typed opener right below them is the document frontmatter, even though the opener itself is not on line 1:

::: compare
```crv
{#doc}
---yaml
title: x
---

Body.
```

```html
<p>Body.</p>
```
:::

## Keys are for lookup only

An id on a metadata block lets a program find that block in the tree. It creates no HTML id, no link target and no cross-reference target, so `</#chapter-1>` pointing at a metadata block is a lint error (see the common mistakes below). The id still takes part in the duplicate-id check, so two metadata blocks with the same id, or a metadata block and a heading with the same id, get a `duplicate-id` warning.

## The Carve version keys

The keys `carve` and `carve-version` declare which Carve version the document is written for. Carve reads them only from the line-1 block. The same keys in a later block set nothing and override nothing.

::: compare
```crv
---
carve: 0.2
---

Body.
```

```html
<p>Body.</p>
```
:::

## In the AST

Every metadata block, leading or later, is a `frontmatter` node among the top-level children of the document. It carries `format` (the word on its opener, or `"yaml"` for a bare opener), `value` (the payload exactly as written, ending with a line break), and `attrs` when attribute lines stand above it. The core never publishes parsed keys. Here is `npx carve ast` on the book example above, with the `pos` fields removed:

```json
[
  {"type": "frontmatter", "format": "yaml", "value": "title: Book\n"},
  {"type": "heading", "level": 1, "generatedId": "Chapter-1", "children": [{"type": "text", "value": "Chapter 1"}]},
  {"type": "frontmatter", "format": "yaml", "value": "author: Ada\n", "attrs": {"id": "chapter-1"}},
  {"type": "paragraph", "children": [{"type": "text", "value": "Text."}]}
]
```

The node's `pos` begins at its first attribute line. From JavaScript, filter the tree and parse the payload yourself:

```js
import { parse } from '@markup-carve/carve'

const tree = parse(source)
const blocks = tree.children.filter((n) => n.type === 'frontmatter')
const chapter = blocks.find((n) => n.attrs?.id === 'chapter-1')
console.log(chapter?.format, chapter?.value) // yaml author: Ada
```

## Included files

When an [include](./include-files) takes an included file from line 1, that file's leading frontmatter becomes the first child of the include node. Later typed metadata blocks that the selection takes stay among the include's children in source order. None of them renders anything, and none of them becomes metadata of the including document. A selection that starts after line 1 cannot open leading frontmatter, but it can contain typed metadata blocks.

## How fmt writes it

`carve fmt` writes leading YAML frontmatter without attributes with the bare `---` opener, also when the source wrote `---yaml`. Every other block gets its format glued to the opener: `---yaml`, `---toml`, `---json`, so `--- toml` becomes `---toml`. Attribute lines go directly above the opener. The payload is data and is written exactly as it was, blank lines included. An unclosed block gets its missing `---` closer at the end of the file, which keeps the parse the same.

## How lint reports problems

| Code | Severity | When |
|------|----------|------|
| `unclosed-frontmatter` | error | a metadata block has no closer and runs to the end of the file |
| `frontmatter-crossref` | error | a cross-reference names the id of a metadata block |
| `frontmatter-shaped-thematic-break` | warning | line 1 is `---` but the block holds no key line, so a thematic break was probably meant |
| `duplicate-id` | warning | a metadata block id repeats another id |
| `carve-version-unsupported` | warning | the line-1 block declares a Carve version this engine does not implement |

## Common mistakes

### No blank line above a later block

A typed opener right after a paragraph line does not interrupt the paragraph. The lines become paragraph text, each `---` turns into an em dash, and lint warns about the closing line:

<!-- carve-sample {"lint":"setext-heading-underline: the opener did not interrupt the paragraph"} -->
::: compare
```crv
Intro text.
---yaml
author: Ada
---
```

```html
<p>Intro text.
—yaml
author: Ada
—</p>
```
:::

Fix: put a blank line, or an attribute line, directly above `---yaml`.

### A bare `---` after line 1

Only line 1 may use the bare opener. Later in the file it is text, even after a blank line:

<!-- carve-sample {"lint":"setext-heading-underline: bare --- after line 1 is text"} -->
::: compare
```crv
Intro text.

---
author: Ada
---
```

```html
<p>Intro text.</p>
<p>—
author: Ada
—</p>
```
:::

Fix: name the format, `---yaml`.

### A block inside a container

Metadata blocks exist only at the top level. Inside a block quote, list item or div the lines are text:

<!-- carve-sample {"lint":"setext-heading-underline: an opener in a quote is text"} -->
::: compare
```crv
> quote
>
> ---yaml
> a: 1
> ---
```

```html
<blockquote>
  <p>quote</p>
  <p>—yaml
a: 1
—</p>
</blockquote>
```
:::

Fix: move the block out of the container to column 0.

### A missing closer

An unclosed block swallows everything up to the end of the file, headings and paragraphs included:

<!-- carve-sample {"lint":"unclosed-frontmatter","fmtSkip":true} -->
::: compare
```crv
Intro.

---yaml
author: Ada

= Chapter 2

More text.
```

```html
<p>Intro.</p>
```
:::

Lint reports `unclosed-frontmatter` as an error. `carve fmt` only appends the closer at the end of the file, so the rest of the document stays inside the block until you add a `---` where the block should end.

### Linking to a metadata block

An id on a metadata block is no target. The cross-reference stays literal text and lint reports an error:

<!-- carve-sample {"lint":"frontmatter-crossref"} -->
::: compare
```crv
{#meta}
---yaml
a: 1
---

See </#meta>.
```

```html
<p>See &lt;/#meta&gt;.</p>
```
:::

Fix: link to a heading or a block that renders, and read the metadata through the tree.

### Starting a document with `---` as a thematic break

Three hyphens on line 1 always open frontmatter. A document meant to start with a break loses everything up to the next `---`:

<!-- carve-sample {"lint":"frontmatter-shaped-thematic-break"} -->
::: compare
```crv
---
= Welcome
---

Body.
```

```html
<p>Body.</p>
```
:::

Fix: write a thematic break as `***`.

### A second word on the opener

`---yaml config` is not an opener: the format name must be the only word. The lines become a paragraph:

<!-- carve-sample {"lint":"setext-heading-underline: two words on the opener make it text"} -->
::: compare
```crv
---yaml config
a: 1
---
```

```html
<p>—yaml config
a: 1
—</p>
```
:::

### The Carve version in a later block

`carve` and `carve-version` count only on line 1. In a later block they are ordinary payload: there is no finding, and the version is not set.

::: compare
```crv
Body.

---yaml
carve-version: 0.1
---
```

```html
<p>Body.</p>
```
:::

Fix: declare the version in the line-1 block.

**Specification (external):** [Block syntax, Frontmatter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md#frontmatter), clauses C2-B-161 to C2-B-165 and C2-B-231 to C2-B-233; [AST](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), clauses C2-A-049 and C2-A-218; [HTML output](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md), clause C2-H-070; [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), clauses C2-N-020 and C2-N-021; [Writer and lint](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md), clauses C2-W-052 and C2-W-153.
