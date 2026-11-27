---
layout: home

hero:
  name: Carve 0.2
  text: Plain text documents
  tagline: Headings, tables, captions, references, snippets, and includes in plain text, with one specification and three engines.
  image:
    src: /logo.svg
    alt: Carve logo
  actions:
    - theme: brand
      text: Playground
      link: /playground
    - theme: alt
      text: Get Started
      link: /get-started
    - theme: alt
      text: Cheat Sheet
      link: /cheatsheet
    - theme: alt
      text: What's new
      link: /whats-new-0-2

features:
  - title: Specified behavior
    details: Ten specification documents define source, trees, HTML, includes, and canonical writing. Every example in them is a test case for the engines.
  - title: Three engines
    details: JavaScript, PHP, and Rust engines share the same test cases and the same carve command line, with the same flags and exit codes.
  - title: HTML and exports
    details: HTML is the specified output. Every engine also exports Markdown, plain text, and ANSI terminal text.
  - title: Reuse without copying
    details: Snippets repeat a value inside a document. Includes pull in sections, lines, regions, or code from other files.
  - title: Safe by default
    details: Bare HTML renders as text. Raw HTML needs an explicit raw form and a host that turns it on.
  - title: Tools included
    details: The shared command line covers fmt, lint, fix, flatten, and HTML import. The JavaScript engine's carve upgrade rewrites 0.1 documents.
description: Carve 0.2 authoring guide and reference.
---

## Write a document

```crv
= Release notes

This has /emphasis/, *strong text*, and {=highlight=}.

- [x] Publish the release
- [ ] Update the package

|= Package |= Version |
| carve-js | 0.2 |
^ Published packages

::: note
Containers hold admonitions and application-defined blocks.
:::
```

| Construct | Syntax |
|---|---|
| Heading | `= Heading`, `== Section` |
| Emphasis, strong | `/emphasis/`, `*strong*` |
| Underline, strike, highlight | `{_text_}`, `{~text~}`, `{=text=}` |
| Superscript, subscript | `{^2^}`, `{,2,}` |
| Link | `[text](https://example.com)` |
| Image | `![alt](image.png)` |
| Cross-reference | `</#heading-id>` |
| Footnote | `[^note]` |
| Inline math | `` $`x + y` `` |
| Attributes | `{#id .class key=value}` on the line above a block |
| Definition | `:: Term` then `: Definition` |
| Admonition | `::: note` |
| Snippet | `{$ver}: 0.2.0`, then <code v-pre>{{ $ver }}</code> |
| Inline extension | `:name[content]` |

The [cheat sheet](./cheatsheet) lists every construct. [Examples](./examples) show Carve source beside its HTML output. Try any of it in the [playground](./playground).

## Why Carve

- Cross-references and numbered captions keep labels and link text in sync.
- Tables have captions, alignment, rowspan, and colspan without HTML.
- Headings, terms, and captions can run over several lines.
- The JavaScript, PHP, and Rust engines are tested against the same Carve inputs and expected HTML.
- One `carve` command line works the same in every engine: `render`, `ast`, `fmt`, `lint`, `fix`, `flatten`, `diagnostics`, and `import --from html`.
- If a host does not recognize an extension, its content stays in an ordinary span or div.
- Bare HTML is literal text. Raw HTML is off unless the host enables it.

## Coming from 0.1

Carve 0.2 is a source break: some 0.1 documents render differently. [What's new in 0.2](./whats-new-0-2) lists the additions, and [Upgrading from 0.1](./upgrade-0-2) lists each change with the old and the new source. `carve upgrade` rewrites a 0.1 document for you.

## Scope

Carve 0.2 is a development version. Its [freeze status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md) identifies the current candidate. The [block](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) and [inline](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) chapters define source syntax. The [HTML chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) defines output.

A `.crv` file is Carve source. The 0.2 output contract is HTML. Every engine also exports Markdown, plain text, and ANSI, but that output is engine behavior outside the specification. See [security](./security) and [tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md).

## Influences

- **Markdown**: the common baseline
- **[Djot](https://djot.net/)** (John MacFarlane): rigorous parsing and attributes
- **Org-mode**: `/emphasis/` syntax
- **Creole**: `|=` table headers
- **AsciiDoc**: admonitions and document structure
- **CriticMarkup**: editorial marks

## Reference

- [Extensions](./extensions)
- [Security](./security)
- [Implementation comparison](./implementation-comparison)
- [Ecosystem](./ecosystem)
- [Terms used in this documentation](./terms)
