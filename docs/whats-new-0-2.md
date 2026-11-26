---
description: What Carve 0.2 adds for authors, hosts and tools, with a link to the upgrade guide for 0.1 documents.
---

# What's new in 0.2

Carve 0.2 adds snippets, typed metadata blocks later in a document, a heading shift for page templates, safer rendering defaults and one command line shared by every engine. It is also a source break: some 0.1 documents render differently. If you keep 0.1 files, read [Upgrading from 0.1](./upgrade-0-2) and run `carve upgrade` on each one.

## For authors

### Snippets

Name a short piece of inline text once and repeat it anywhere in the document. A definition is one line at column 0, `{$name}: value`, and <code v-pre>{{ $name }}</code> copies the value in place. Alone on its own line, a use becomes its own paragraph.

````carve
{$ver}: 0.2.3

{$rel .badge}: [release notes](https://github.com/markup-carve/carve/releases/v0.2.3)

Install {{ $ver }} today. Read the {{ $rel }}.

{{ $rel }}
````

```html
<p>Install 0.2.3 today. Read the <span class="badge"><a href="https://github.com/markup-carve/carve/releases/v0.2.3">release notes</a></span>.</p>
<p class="badge"><a href="https://github.com/markup-carve/carve/releases/v0.2.3">release notes</a></p>
```

Snippets work across included files, and lint reports unknown, unused and duplicate names. See [Snippets](./snippets).

### Metadata blocks after line 1

The first block of a document may still start with bare `---`. Later in the file, a typed opener such as `---yaml`, `---toml` or `---json` at column 0 starts another metadata block, for example one per chapter. Hosts find these blocks in the tree; HTML rendering writes nothing for them.

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

See [Metadata blocks](./metadata-blocks).

### One spelling per construct

0.2 drops several 0.1 spellings that meant the same thing as another one or surprised authors. A list or quote directly under a paragraph line needs a blank line before it, `~~~` fences, `+` continuation lines and GFM separator rows are gone, and only `/` and `*` pair as bare emphasis delimiters. These are the changes `carve upgrade` rewrites; [Upgrading from 0.1](./upgrade-0-2) lists each one with the old and the new source.

## For hosts

### Headings under a page title

When the page template writes the document title as the `<h1>`, the render option `headingShift` moves every heading down by up to 5 levels. With `headingShift: 1`, `=` renders as `<h2>`. Ids and cross-references do not change. It replaces the 0.1 `headingLevelShift()` extension.

```sh
carve render --heading-shift=1 document.crv > document.html
```

See [headings under a page title](./static-rendering-recipes#headings-under-a-page-title).

### Raw HTML is off by default

Explicit raw HTML now needs `rawHtml: true` or `carve render --raw-html`; in 0.1 the matching option was on unless a host turned it off. Bare HTML tags in the source render as text. See [Security](./security).

### Soft breaks and code highlighting

`softBreak` writes a line break inside a paragraph as a line break, one space or `<br>`, for chat and other output that shows source line breaks (`--soft-break`). `codeBlockRenderer(node, defaultHtml)` hands every code block to the host, so a highlighter can replace the default `<pre>` HTML. See [static rendering recipes](./static-rendering-recipes).

## For tools

### The same command line in every engine

The 0.2 specification defines the library calls and the `carve` program that every engine offers, with the same flags, exit codes and reports. Next to `render`, `ast`, `fmt` and `lint`, it adds:

| Command | Does |
|---|---|
| `carve import --from html` | turns HTML into Carve source, with adapters for editors such as TipTap, CKEditor, Word and Google Docs |
| `carve flatten` | expands includes and writes one self-contained Carve document |
| `carve diagnostics` | prints the parse diagnostics |
| `carve fix` | applies the lint fixes |
| `carve migrate-ast` | converts a stored 1.x tree to AST 2.0 |

The JavaScript engine also ships `carve upgrade`, which rewrites a 0.1 document and checks each rewrite against the 0.1 HTML. See the [tooling specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md).

### AST 2.0

Trees move to AST 2.0. Lists and tables use `children` like every other container, and source spelling and positions live in a separate layout sidecar (`parseWithLayout`) instead of in tree fields. A 2.0 reader refuses another major version, and `carve migrate-ast` converts stored 1.x trees. See [AST JSON](./ast-json) and the [AST section of the upgrade guide](./upgrade-0-2#ast).

## A rewritten specification

The 0.2 specification was written fresh in ten documents: block and inline syntax, HTML rendering, the AST, extensions, source layout, writer and fmt, includes, HTML import and tooling. Every example in it is also a case of the conformance corpus that the JavaScript, PHP and Rust engines test against. Start at the [0.2 specification](https://github.com/markup-carve/carve/blob/next2/spec/0.2/README.md).

## Next

- [Upgrading from 0.1](./upgrade-0-2): every source, render and tree change, and how to run `carve upgrade`.
- [Get Started](./get-started) if you are new to Carve.
