# Carve

Carve is a markup language for documents. Its file extension is `.crv`.

```carve
# Release notes

This has /italic/, *bold*, _underline_, ~strikethrough~, and =highlight=.

- [x] Publish the release
- [ ] Update the package

|= Package |= Version |
| carve-js | 0.1 |
^ Published packages

::: note
Carve also has fenced containers, footnotes, math, and attributes.
:::
```

## Syntax

````text
INLINE
  /italic/  *bold*  /*bold italic*/
  _underline_  ~strikethrough~  =highlight=
  {^superscript^}  {,subscript,}  `code`

HEADINGS AND LINKS
  # Heading
  [text](https://example.com)  ![alt](image.jpg)
  [Heading][]                  link to a heading
  </#heading-id>               cross-reference with generated text

LISTS
  - unordered item
  1. ordered item
  - [ ] task  - [x] done

CODE AND CONTAINERS
  ```js
  const value = 1
  ```

  ::: warning
  Container content
  :::

TABLES
  |= Name |= Value |           header cells start with |=
  | One    | 1     |
  ^ Table caption

CAPTIONS AND ATTRIBUTES
  ![alt](image.jpg)
  ^ Figure caption

  {#id .class key=value}

OTHER
  $`inline math`  [^note]  @user  #tag
  %% comment
  :name[extension content]
````

See the [complete cheat sheet](https://markup-carve.github.io/carve/cheatsheet)
for definition lists, table spans and alignment, references, metadata,
editorial markup, raw content, includes, and extension syntax.

## Why Carve

- Cross-references and numbered captions keep labels and link text in sync.
- Tables support captions, alignment, rowspan, colspan, and multiline cells
  without HTML.
- JavaScript, PHP, and Rust are tested with the same Carve inputs and expected
  outputs.
- A document can be rendered as HTML, Markdown, plain text, or ANSI terminal
  text. Rendering methods can warn when an output format omits content.
- If an application does not recognize an extension, its content remains in an
  ordinary span or div.
- Bare HTML is literal text. Explicit `=html` passthrough can be disabled for
  untrusted input.

## Install

Use the [playground](https://markup-carve.github.io/carve/playground) without
installing anything, or install one of the three reference implementations:

```bash
npm install @markup-carve/carve
composer require markup-carve/carve-php
cargo install carve-lang
```

JavaScript:

```ts
import { carveToHtml } from '@markup-carve/carve'

const html = carveToHtml('/italic/, *bold*, and _underline_')
```

PHP:

```php
use MarkupCarve\Carve\CarveConverter;

$html = (new CarveConverter())->convert('/italic/, *bold*, and _underline_');
```

Rust CLI:

```bash
carve input.crv
```

Python, Ruby, Go, WebAssembly, editors, and framework integrations are listed
in [Get Started](https://markup-carve.github.io/carve/get-started) and the
[Ecosystem](https://markup-carve.github.io/carve/ecosystem).

## Compatibility and scope

Carve is not Markdown. Some familiar constructs have different meanings:

| Construct | Markdown | Carve |
|---|---|---|
| `*text*` | italic | bold |
| `/text/` | plain text | italic |
| `_text_` | italic | underline |
| `~text~` | plain text in CommonMark | strikethrough |
| `|= Head |` | plain table text | header cell |

Converters from Markdown, HTML, Djot, and BBCode are available, but a `.crv`
file should not be passed to a Markdown parser. See [Migration from
Markdown](https://markup-carve.github.io/carve/migrate-from-markdown) and the
[format bridges](https://markup-carve.github.io/carve/format-bridges) for the
supported interchange paths.

Core syntax is always available. Citations, automatic URL linking, diagrams,
and some application features must be enabled separately. The [optional feature
table](https://markup-carve.github.io/carve/extensions#feature-tiers-quick-reference)
lists their availability.

Bare HTML is literal text, but explicit `=html` passthrough is enabled by
default in the JavaScript and Rust renderers. Disable it for untrusted input.
Renderers also restrict unsafe URL schemes and attributes; see the [security
model](https://markup-carve.github.io/carve/security).

## Specification and implementations

Carve 0.1 is specified. Before 1.0, minor releases may change the grammar.

- [Formal grammar](resources/grammar.ebnf)
- [Conformance examples](tests/corpus)
- [Versioning policy](VERSIONING.md)
- [JavaScript implementation](https://github.com/markup-carve/carve-js)
- [PHP implementation](https://github.com/markup-carve/carve-php)
- [Rust implementation](https://github.com/markup-carve/carve-rs)
- [Documentation](https://markup-carve.github.io/carve/)

The three reference implementations use the same tests. More than 1,500 core
input/output tests and 49 optional input/output tests cover the language and its
shared optional features. Current differences are recorded in the
[implementation comparison](https://markup-carve.github.io/carve/implementation-comparison).

## Development

This repository contains the specification, corpus, and documentation site.

```bash
npm install
npm test
npm run docs:build
```

See [MAINTAINING.md](MAINTAINING.md) for release and cross-implementation work.
