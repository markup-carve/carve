---
title: Terms used in this documentation
description: Definitions for Carve-specific and markup-language terms.
---

# Terms used in this documentation

Most pages use the terms below. Pages about parser implementation use additional
programming terms and define them where they appear.

## Language and specification

**Core syntax**
: Syntax every Carve parser must support. It is available without enabling an
optional feature.

**Optional feature**
: Behavior that an application must enable or provide. Citations and automatic
links for `@mentions` are examples. The specification calls widely implemented
optional features **Tier 2** and implementation-specific features **Tier 3**.
Those tier names are used only where the distinction matters.

**Specification**
: The rules that define valid Carve input and its meaning. A page marked
**normative** is part of those rules. Explanations, tutorials, and design notes
are not normative.

**Conformance tests**
: Carve input paired with the exact output an implementation must produce. The
repository sometimes calls the complete set a **conformance corpus**.

**Standard form**
: The spelling written by the formatter. The specification uses **canonical
form** for the same concept.

## Parsing and output

**Abstract syntax tree (AST)**
: The structured document produced by a parser. Application developers may use
it to inspect or change a document before rendering it. Authors do not need to
understand the AST to write Carve.

**Render**
: Convert a parsed Carve document to an output format such as HTML, Markdown,
plain text, or ANSI terminal text.

**Output warning**
: A report that identifies content an output format cannot represent. API
reference pages may call this a **render loss**.

**Fallback output**
: The non-interactive or simpler representation used when an output format
cannot reproduce a feature. For example, a diagram may become its source text.
Some specification pages call this **graceful degradation**.

**Round trip**
: Convert a document to another representation and back, then compare the
result with the original.

**Raw HTML passthrough**
: The explicit `` ```=html `` block and `` `...`{=html} `` inline forms, whose
contents may be emitted as HTML. Ordinary HTML tags are always text. Disable
raw HTML passthrough when processing untrusted input.

## Extensions

**Extension**
: Optional code that recognizes a named inline form or block and controls its
output. Inline extensions use `:name[content]`; block extensions use
`::: name`. If no extension handles the name, Carve keeps the content in an
ordinary span or div.

**Profile**
: A set of content restrictions applied by an application. A profile can, for
example, reject images in comments while allowing them in articles.

**Host application**
: The program that calls a Carve parser or renderer. It supplies configuration,
optional extensions, and application-specific URLs.

## Similar terms that are not interchangeable

- **Parse** reads Carve and creates a structured document.
- **Format** writes that document back as Carve source.
- **Render** writes it in another output format.
- **Convert** moves between Carve and another document format or editor model.
