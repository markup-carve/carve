---
layout: home

hero:
  name: Carve 0.2
  text: Structured documents in plain text
  tagline: Write headings, lists, tables, captions, references, and includes.
  image:
    src: /logo.svg
    alt: Carve logo
  actions:
    - theme: brand
      text: Get Started
      link: /get-started
    - theme: alt
      text: Upgrade from 0.1
      link: /upgrade-0-2

features:
  - title: Defined syntax
    details: The 0.2 specification defines source, trees, HTML, and canonical writing.
  - title: HTML output
    details: Render documents to HTML with explicit handling of links and raw content.
  - title: Reusable documents
    details: Includes can select sections, lines, regions, or code from other files.
description: Carve 0.2 authoring guide and reference.
---

## Write a document

```crv
= Release notes

This has /emphasis/ and *strong text*.

- [x] Publish the release
- [ ] Update the package

|= Package |= Version |
| carve-js | 0.2 |
^ Published packages
```

Start with [Get Started](./get-started), then use the [cheat sheet](./cheatsheet) or [examples](./examples). Authors moving from 0.1 should read [Upgrading from 0.1](./upgrade-0-2): some old source still parses but changes meaning.

## Scope

Carve 0.2 is a development version. Its [freeze status](https://github.com/markup-carve/carve/blob/next2/spec/0.2/STATUS.md) identifies the current candidate. The [block](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md) and [inline](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-inline.md) chapters define source syntax. The [HTML chapter](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md) defines output.

A `.crv` file is Carve source. The 0.2 output contract is HTML. Every engine also exports Markdown, plain text, and ANSI, but that output is engine behavior outside the specification. Bare HTML is text. Raw HTML needs an explicit raw form and a host that enables it. See [security](./security) and [tooling](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md).
