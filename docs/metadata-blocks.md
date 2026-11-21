# Metadata blocks

Carve 0.2 keeps a document's first metadata block and permits typed metadata blocks later in the file. They carry opaque text for a host to interpret. The core parser preserves the format word and payload; HTML rendering writes nothing for them.

<!-- carve-sample {"skip":"The pinned engine has not yet implemented typed metadata blocks."} -->
````carve
---
title: Book
---

= Chapter 1

{#chapter-1}
---yaml
author: Ada
---

Text.
````

The first block may start with bare `---`. After line 1, use a format name such as `---yaml`, `---toml`, or `---json` at column 0. Separate a later block with a blank line or put top-level attribute lines directly above its opener. An indented opener or one inside a quote, list item, or div stays text. A bare `---` after line 1 also stays text. An unclosed block consumes to the end of the document and reports `unclosed-frontmatter`.

## Read the tree

```js
const tree = parse(source)
const blocks = tree.children.filter((n) => n.type === 'frontmatter')
const chapter = blocks.find((n) => n.attrs?.id === 'chapter-1')
console.log(chapter?.format, chapter?.value)
```

A key is for lookup in the tree. It creates no HTML id or link target; a cross-reference to it is a lint error. Duplicate ids are reported as usual. `carve ast` exposes the same nodes. The `carve` and `carve-version` keys are read from the line-1 block only. The core does not parse, merge, or render metadata payloads.

[Block syntax](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#frontmatter) defines the opener and [the AST contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md) defines the node.
