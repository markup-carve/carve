---
description: What Carve 0.2 adds for authors, hosts and tools, with a link to the upgrade guide for 0.1 documents.
---

# What's new in 0.2

Carve 0.2 adds snippets, `=` headings, multi-line headings, terms and definitions, references that resolve in more places, ordered task lists, typed metadata blocks later in a document, a heading shift for page templates, safer rendering defaults and one command line shared by every engine. It is also a source break: some 0.1 documents render differently. If you keep 0.1 files, read [Upgrading from 0.1](./upgrade-0-2) and run `carve upgrade` on each one.

## For authors

### Snippets

Name a short piece of inline text once and repeat it anywhere in the document. A definition is one line at column 0, `{$name}: value`, and <code v-pre>{{ $name }}</code> copies the value in place. Alone on its own line, a use becomes its own paragraph.

````carve
{$ver}: 0.2.0

{$rel .badge}: [0.2 overview](https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md)

Install {{ $ver }} today. Read the {{ $rel }}.

{{ $rel }}
````

```html
<p>Install 0.2.0 today. Read the <span class="badge"><a href="https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md">0.2 overview</a></span>.</p>
<p class="badge"><a href="https://github.com/markup-carve/carve/blob/main/docs/whats-new-0-2.md">0.2 overview</a></p>
```

Snippets work across included files, and lint reports unknown, unused and duplicate names. See [Snippets](./snippets).

### `=` headings

`=` now starts a heading, next to `#`: `=` is level 1, `==` level 2 and so on. Lint reports a document that mixes both.

### Text that spans lines

Headings, description terms and captions are labels. A label continues on every line directly below it that is indented past its marker, so a long title no longer has to fit on one line. A backslash at the end of a line makes the break a hard line break.

````carve
= Release notes for the
  spring update

:: A term that is too long
   for one line
: Its description.

| a | b |
^ A table caption that
  runs onto a second line
````

```html
<section id="Release-notes-for-the-spring-update">
  <h1>Release notes for the
spring update</h1>
  <dl>
    <dt>A term that is too long
for one line</dt>
    <dd>Its description.</dd>
  </dl>
  <table>
    <caption>A table caption that
runs onto a second line</caption>
    <tbody>
      <tr><td>a</td><td>b</td></tr>
    </tbody>
  </table>
</section>
```

In 0.1 a heading and a term ended at the line break, and the next line became a paragraph. Captions already continued in 0.1, also on unindented lines; in 0.2 a caption line needs the indent like the other labels.

Definitions and references can span lines too. A link definition takes its title and attributes on the indented next line, an abbreviation expansion continues over indented lines, and a reference label may wrap. `carve fmt` joins the two definitions back onto one line.

```text
[docs]: https://example.com
  "The docs" {.ext}

*[HTML]: Hyper Text
  Markup Language

See [the text][a long
label].
```

### References that resolve in more places

- A shortcut reference `[text]` links when a definition `[text]:` exists. In 0.1 it stayed text.
- A full reference `[the text][My Heading]` reaches a heading, including a heading inside a quote.
- A reference in an included file resolves against the definitions of the file that includes it.

````carve
See [the docs] and [the intro][Getting started].

= Getting started

[the docs]: https://example.com "The docs"
````

### Lists

Ordered lists take task boxes, and a one-letter or roman marker needs only one space (`a. one`, `i. first`).

````carve
1. [x] Write the draft
2. [ ] Review it
````

A line indented short of an item's content column after a blank line now stays in the item instead of closing the list.

### Nested emphasis and editorial marks

Emphasis of the same kind nests: `/a /b/ c/` gives `<em>a <em>b</em> c</em>`. Editorial comments take attributes, and inserts, deletions and comments take `author` and `datetime` ([Revision metadata](/revision-metadata)):

````carve
{+new text+}{author=ann datetime=2026-11-01}
````

```html
<p><ins data-author="ann" datetime="2026-11-01">new text</ins></p>
```

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

### New library calls

- `positionOf(source, offset)` turns a byte offset into a line and column.
- `diffTree` returns a standard JSON Patch (RFC 6902), and `applyPatch` applies one. Given a `treeFingerprint`, `applyPatch` refuses a patch made against another tree. The 0.1 change format and three-way merge are gone.

## For tools

### The same command line in every engine

The 0.2 specification defines the library calls and the `carve` program that every engine offers, with the same flags, exit codes and reports. Every render option has a flag (`--url-policy`, `--heading-ids`, `--soft-break` and so on), and `--strict` on `render` and `lint` fails a file that reports anything. Next to `render`, `ast`, `fmt` and `lint`, it adds:

| Command | Does |
|---|---|
| `carve import --from html` | turns HTML into Carve source, with adapters for editors such as TipTap, CKEditor, Word and Google Docs |
| `carve flatten` | expands includes and writes one self-contained Carve document |
| `carve diagnostics` | prints the parse diagnostics |
| `carve fix` | applies the lint fixes |
| `carve migrate-ast` | converts a stored 1.x tree to AST 2.0 |

The JavaScript engine also ships `carve upgrade`, which rewrites a 0.1 document and checks each rewrite against the 0.1 HTML. See the [tooling specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md).

### Lint

Lint has 27 new rules that are on by default, such as `block-opener-without-blank-line` and `unattached-caption`. Another 16 migration notices report text that 0.1 read differently. They run with `carve lint --upgrade`, or when the frontmatter says `carve: 0.1`. See [Validation](./validation).

### AST 2.0

Trees move to AST 2.0. Lists and tables use `children` like every other container, and source spelling and positions live in a separate layout sidecar (`parseWithLayout`) instead of in tree fields. A 2.0 reader refuses another major version, and `carve migrate-ast` converts stored 1.x trees. See [AST JSON](./ast-json) and the [AST section of the upgrade guide](./upgrade-0-2#ast).

## A rewritten specification

The 0.2 specification was written fresh in ten documents: block and inline syntax, HTML rendering, the AST, extensions, source layout, writer and fmt, includes, HTML import and tooling. Every example in it is also a case of the conformance corpus that the JavaScript, PHP and Rust engines test against. Start at the [0.2 specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md).

## Next

- [Upgrading from 0.1](./upgrade-0-2): every source, render and tree change, and how to run `carve upgrade`.
- [Get Started](./get-started) if you are new to Carve.
