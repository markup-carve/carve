---
title: Terms used in this documentation
description: Definitions for Carve-specific and markup-language terms.
---

# Terms Used in This Documentation

Most pages use the terms below. Pages about parser implementation use further
programming terms and define them where they appear. The terms follow the 0.2
specification; where a page uses an older 0.1 name, it says so.

## Language and specification

- **Core syntax**: source forms every 0.2 parser recognizes without an
  extension, such as headings, lists, tables, `/emphasis/`, `*strong*` and the
  braced forms `{_underline_}`, `{~strike~}` and `{=highlight=}`.
- **Optional feature**: behavior a host enables through an option or a
  registered extension; the source alone does not require the host to provide
  it. Citations and links for `@mentions` are examples: a mention is core syntax
  and renders without a link until the host gives a URL template for it. The
  specification calls some optional features, such as citations, Tier 2
  extensions.
- **Specification**: the rules that define valid Carve input and what it means.
  For 0.2 these are ten documents of numbered clauses (ids such as `C2-B-013`)
  plus JSON data tables; see [the specification overview](./grammar). Only the
  specification is normative. Explanations, tutorials and design notes,
  including these documentation pages, are not.
- **Clause**: one numbered rule of the specification. A clause that starts with
  "Exception" carves a case out of a more general one. Where a data table and its
  clause disagree, the clause wins.
- **Freeze candidate**: a version of the 0.2 specification text that is frozen
  for review but not released. A frozen text changes only by a recorded ruling.
- **Conformance tests**: Carve input, or HTML or a tree, paired with the exact
  output an implementation must produce. The repository calls the complete set
  the 0.2 corpus; see [conformance](./conformance).
- **Standard form**: the spelling the formatter writes. The specification calls
  it the **canonical form**, and the writer that produces it the canonical
  writer.

## Parsing and output

- **Source**: the authored `.crv` text.
- **Block**: a part of a document that owns lines, such as a paragraph, list,
  table or div.
- **Inline**: content inside a block, such as text, a link or emphasis.
- **Abstract syntax tree (AST)**: the typed 2.0 document tree a parser returns
  after parsing and resolution. Application developers use it to inspect or
  change a document before rendering it, or to exchange it with another tool as
  JSON. Authors do not need to understand it to write Carve. See
  [the AST JSON page](./ast-json).
- **Envelope**: the JSON object that wraps a tree for storage or exchange, with
  the AST version and the extensions the tree declares.
- **Layout sidecar**: facts about how the source was spelled, such as whether an
  ordered list wrote its numbers, stored beside the tree instead of in it. Two
  documents that differ only in their sidecar are the same document. See
  [source layout](./ast-source-layout).
- **Render**: convert a parsed document to an output format. The specified
  output is HTML; every engine also exports Markdown, plain text and ANSI
  terminal text.
- **Diagnostic**: one structured finding in the record beside the tree. Each has
  a code, a severity (`hint`, `warning` or `error`) and a channel: `parse` for
  what the parser noticed, `render-loss` for what an output or the writer could
  not keep, and `lint` for style and migration advice.
- **Output warning**: a diagnostic, usually in the render-loss channel, that
  reports content an output format, the importer or the writer could not
  represent; the record gives its code and severity. API reference pages call
  it a **render loss**.
- **Fallback output**: the core rendering of an extension node's fallback, used
  when no renderer for that extension is registered. An inline extension such as
  `:kbd[Ctrl]` renders its content in a span when nothing handles it. Some pages
  call the wider idea **graceful degradation**; see
  [graceful degradation](./graceful-degradation).
- **Round trip**: convert a document to another representation and back, then
  compare the result with the original. For HTML, a render with the `roundtrip`
  option writes **carriers**, `data-carve-*` attributes that let the importer
  rebuild facts plain HTML cannot hold. See [format conversion](./format-bridges).
- **Raw HTML passthrough**: the explicit ```` ```=html ```` block and
  `` `...`{=html} `` inline forms, whose contents are emitted as HTML only when
  the host enables raw HTML. Without that, a raw block renders as escaped code
  and a raw span as escaped text. Ordinary HTML tags in text are always text.
  Keep raw HTML off when processing untrusted input; see [security](./security).
- **Include resolver**: host code that reads a file an include directive names,
  from a root the host allows. Includes expand only when the host provides one.
  See [includes](./includes).

## Extensions and hosts

- **Extension**: a versioned behavior with a qualified name, such as `carve.tabs`,
  that claims a core node after parsing and controls how it renders. It never adds
  new source syntax. An inline extension claims a form such as `:name[content]`;
  a block extension claims a div or a code block, such as `::: tabs`. If no
  extension handles the name, the content stays an ordinary span or div. The
  extension interface is still provisional in 0.2; see
  [extensions](./extensions).
- **Standard extension**: an extension the specification names and gives a
  standard renderer, such as `carve.tabs`, `carve.cite` or `carve.toc`. A host
  enables it by name.
- **Profile**: a set of content restrictions a host applies when rendering:
  `full`, `article`, `comment` or `minimal`. A construct outside the profile
  renders in a simpler form and is reported. The `comment` profile, for example,
  does not accept images, while `article` does. See
  [profiles](./profiles).
- **Host application**: the program that calls a Carve parser or renderer. It
  supplies options, extensions, an include resolver, a URL policy and
  application-specific URLs.

A syntax feature of the core language needs no extension registration. A host
option changes processing or output without changing what the source means as
written. An included file is authored source, while a layout sidecar is a record
of how source was written.

## Similar terms that are not interchangeable

- **Parse** reads Carve and creates the tree.
- **Format** writes that tree back as canonical Carve source (`carve fmt`).
- **Render** writes it in another output format (`carve render`).
- **Import** reads another format, such as HTML, into a tree and Carve source
  (`carve import`). Older pages call this **convert** or **migrate**.
- **Lint** reports findings about the source without changing it; `carve fix`
  applies the fixes lint can name.
- **Flatten** writes one Carve file with every include expanded
  (`carve flatten`).

**Specification (external):** [the 0.2 specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md), [AST contract](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), [tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [source layout](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md), [writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md), [diagnostics and reports](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#diagnostics-and-reports), [includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [HTML options](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#options).
