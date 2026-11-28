---
description: How Carve 0.2 differs from related document languages.
---

# Markup languages

::: info Who this is for
**Anyone surveying the field.** A neutral tour of lightweight markup languages, Carve included but not centered. For the Carve-centric take, see [Carve, Markdown, Djot, and MDX](./comparison).
:::

Carve, Djot, Markdown, AsciiDoc, reStructuredText and the other languages on this page all turn readable source into structured documents. They differ in syntax, interchange contracts and tooling. The Carve column describes Carve 0.2 as specified on `main`, which is authoritative for Carve; the other languages follow their own versions and implementations.

## Overview

The overview below is chronological. Later comparison tables group related syntaxes together instead.

| Language | Author | Year | Focus |
|---|---|---|---|
| AsciiDoc | Stuart Rackham | 2002 | Technical documentation |
| reStructuredText (reST) | David Goodger | 2002 | Python documentation |
| Textile | Dean Allen | 2002 | Web publishing |
| MediaWiki | Magnus Manske | 2002 | Wikipedia |
| Org Mode | Carsten Dominik | 2003 | Emacs, outlining |
| Markdown | John Gruber | 2004 | Simplicity, email-style |
| Creole | WikiCreole | 2007 | Wiki standardization |
| CommonMark | John MacFarlane et al. | 2014 | Standardized Markdown |
| GitHub Flavored Markdown (GFM) | GitHub | 2017 (formal spec; the flavor dates to about 2009) | Extended CommonMark |
| Gemtext | Solderpunk | 2019 | Minimalism (Gemini protocol) |
| Djot | John MacFarlane | 2022 | Predictable parsing |
| Carve | Mark Scherer | 2026 | Simple and predictable parsing |

## Feature comparison

| Feature | Markdown | CommonMark | GFM | Djot | AsciiDoc | reST | **Carve 0.2** |
|---|---|---|---|---|---|---|---|
| Heading | `# text` | `# text` | `# text` | `# text` | `= text` | underline | `= text` (or `# text`) |
| Strong | `**text**` | `**text**` | `**text**` | `*text*` | `*text*` | `**text**` | `*text*` |
| Emphasis | `*text*` | `*text*` | `*text*` | `_text_` | `_text_` | `*text*` | `/text/` |
| Code inline | `` `code` `` | `` `code` `` | `` `code` `` | `` `code` `` | `` `code` `` | ``` ``code`` ``` | `` `code` `` |
| Underline | - | - | - | - | `[.underline]#text#` | - | `{_text_}` |
| Strikethrough | - | - | `~~text~~` | - | `[.line-through]#text#` | - | `{~text~}` |
| Highlight | - | - | - | `{=text=}` | `#text#` | - | `{=text=}` |
| Subscript | - | - | - | `{~text~}` | `~text~` | - | `{,text,}` |
| Superscript | - | - | - | `{^text^}` | `^text^` | - | `{^text^}` |
| Tables | varies | - | `\| col \|` | `\| col \|` | `\|===` | directives | `\| col \|`, `\|=` header cells, spans |
| Task lists | - | - | `- [x]` | `- [x]` | `* [x]` | - | `- [x]`, also `1. [x]` |
| Footnotes | varies | - | `[^1]` (deployed; not in the formal spec) | `[^1]` | `footnote:[]` | `[1]_` | `[^1]`, `^[inline]` |
| Attributes | - | - | - | `{.class #id}` | `[.class]` | `:class:` | `{.class #id}` |
| Divs and admonitions | - | - | - | `:::` | `====` | `.. note::` | `::: note` |
| Smart quotes | varies | - | - | auto | explicit (`` "`text`" ``) | - | auto |

**Notes on the Djot column:**

- **Strikethrough:** Djot has no strikethrough. Its nearest elements are *delete* `{-text-}` (`<del>`) and *insert* `{+text+}` (`<ins>`), which Carve shares. Djot reads `~text~` and `{~text~}` as subscript; in Carve `~text~` is plain text and `{~text~}` is strikethrough.
- **Subscript and superscript:** the braces are optional in Djot: `~text~` and `^text^` work as shorthand, and the `{~ ~}` and `{^ ^}` forms are only needed when the span contains spaces or ambiguous boundaries. In Carve the braces are mandatory: `{,text,}` and `{^text^}` are the only subscript and superscript forms, and a bare `,` or `^` is always literal.

**Notes on the Carve column:**

- **Bare delimiters:** only `/` and `*` pair without braces. Underline, strikethrough and highlight are always braced, so `_`, `~` and `=` in prose and identifiers stay text. Carve 0.1 also accepted bare `_text_`, `~text~` and `=text=`; 0.2 dropped them.
- **Headings:** `=` is level 1, `==` level 2 and so on, as in AsciiDoc. `#` through `######` still work; lint reports a document that mixes both.
- **Tables:** a GFM separator row such as `|---|` is a data row in Carve 0.2. Header cells start with `|=`, and alignment is a brace prefix such as `|={>}`.

::: compare
```crv
= Fruit

|= Name |={>} Qty |
| Apples | 3 |
```
```html
<section id="Fruit">
  <h1>Fruit</h1>
  <table>
    <thead>
      <tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Qty</th></tr>
    </thead>
    <tbody>
      <tr><td>Apples</td><td style="text-align: right;">3</td></tr>
    </tbody>
  </table>
</section>
```
:::

## Syntax examples

### Headings

```text
# Markdown/CommonMark/GFM/Djot (Carve also accepts #)

= Carve and AsciiDoc Level 1
== Carve and AsciiDoc Level 2

Title
=====    (reST)

* Org Mode Level 1
** Org Mode Level 2
```

### Links

```text
[text](url)                    # Markdown/CommonMark/GFM/Djot/Carve
https://url[text]              # AsciiDoc
`text <url>`_                  # reST
[[url][text]]                  # Org Mode
"text":url                     # Textile
[[Page|text]] / [url text]     # MediaWiki (internal page / external URL)
[[url|text]]                   # Creole
=> url text                    # Gemtext
```

### Images

```text
![alt](src)                    # Markdown/CommonMark/GFM/Djot/Carve
image::src[alt]                # AsciiDoc
.. image:: src                 # reST
   :alt: alt text
[[file:src]]                   # Org Mode
!src(alt)!                     # Textile
[[File:src|alt]]               # MediaWiki
{{src|alt}}                    # Creole
```

In Carve an image alone on its line is a block image, written as a bare `<img>` rather than inside a paragraph, and a `^ caption` line directly below it makes a figure.

### Code blocks

````text
```language                    # Markdown/GFM/Djot/Carve
code
```

[source,language]              # AsciiDoc
----
code
----

.. code-block:: language       # reST
   code

#+BEGIN_SRC language           # Org Mode
code
#+END_SRC
````

Carve 0.2 fences code with backticks only; a `~~~` line, which Markdown and Djot also accept, is text in Carve.

### Lists

```text
- item                         # Markdown/CommonMark/GFM/Djot/Carve
* item                         # AsciiDoc/Org Mode
- item                         # reST (with blank lines)
* item                         # Textile/MediaWiki/Creole
```

In Carve, as in Djot, a list directly under a line of paragraph text needs a blank line before it.

## Philosophy comparison

| Language | Philosophy |
|---|---|
| **Markdown** | "Easy to read, easy to write": minimal syntax for common cases |
| **CommonMark** | Standardize Markdown with an unambiguous spec |
| **GFM** | Extend CommonMark for developer workflows (tables, task lists, code) |
| **Djot** | Predictable parsing, consistent rules, no edge cases |
| **AsciiDoc** | Technical documentation with semantic markup |
| **reST** | Extensible, explicit, Python ecosystem standard |
| **Org Mode** | Notes, tasks and literate programming in one format |
| **Gemtext** | Radical simplicity, one link per line, no inline formatting |
| **Carve** | Djot-like predictability with built-in document features and one specified HTML output and tree shared by every engine |

## Strengths and weaknesses

### Markdown
- **Pros**: Ubiquitous, simple, familiar
- **Cons**: Ambiguous spec, many incompatible flavors

### CommonMark
- **Pros**: Standardized, well-specified
- **Cons**: Missing features (tables, footnotes), complex spec

### GFM
- **Pros**: Tables, task lists, autolinks, widely supported
- **Cons**: GitHub-specific extensions, still has edge cases

### Djot
- **Pros**: Predictable, rich features, clean spec
- **Cons**: New, less tooling and adoption

### AsciiDoc
- **Pros**: Feature-rich, suited to books and docs
- **Cons**: Complex syntax, steep learning curve

### reST
- **Pros**: Extensible, semantic, Python standard
- **Cons**: Verbose, whitespace-sensitive

### Org Mode
- **Pros**: Supports literate programming and task management
- **Cons**: Emacs-centric, complex

### Gemtext
- **Pros**: Simple, fast to parse
- **Cons**: Very limited formatting

## Adoption and ecosystem

| Language | Primary use | Notable users |
|---|---|---|
| Markdown | General writing | GitHub, Stack Overflow, Reddit, Discord |
| CommonMark | Standardized docs | Discourse, Swift, many parsers |
| GFM | Developer docs | GitHub, GitLab |
| Djot | Modern alternative | Growing adoption |
| AsciiDoc | Technical books | O'Reilly, Spring, Asciidoctor |
| reST | Python docs | Sphinx, Read the Docs, Python |
| Org Mode | Personal knowledge | Emacs users, researchers |
| MediaWiki | Wikis | Wikipedia, Fandom |

## Parsing complexity

| Language | Parser complexity | Spec size |
|---|---|---|
| Gemtext | Trivial | about 1 page |
| Creole | Simple | about 10 pages |
| Markdown | Ambiguous | informal syntax essay, no formal spec |
| CommonMark | Complex | large prose spec, about 650 conformance examples |
| Djot | Moderate | compact prose spec plus reference implementation |
| GFM | Complex | CommonMark plus extensions |
| AsciiDoc | Complex | Large spec |
| reST | Complex | Large spec |
| Carve 0.2 | Moderate | ten documents of numbered clauses, JSON data tables and a conformance corpus that every example belongs to |

A familiar spelling does not guarantee the same parse: container ownership, delimiter pairing and fallback rules belong to each language's specification. Carve 0.2 also defines a JSON document tree (AST 2.0), a canonical writer, an HTML import path and a command line that every engine offers.

## Recommendations

| Use case | Recommended |
|---|---|
| Quick notes | Markdown |
| GitHub READMEs | GFM |
| Technical books | AsciiDoc |
| Python documentation | reST |
| Personal knowledge base | Org Mode |
| New projects wanting consistency | Djot |
| Rich documents with predictable parsing and built-in constructs | Carve |
| Extreme minimalism | Gemtext |
| Wiki content | MediaWiki or Creole |

## Choosing a format

Use the format required by the system that will publish or edit the document. For existing Markdown, see [Coming from Markdown](./migrate-from-markdown); the 0.2 migration path goes through HTML and the HTML importer, with engine-specific import helpers for Markdown, GFM and Djot. Read [Upgrading from 0.1](./upgrade-0-2) before converting 0.1 Carve documents. For a new Carve implementation, start with [Implementing Carve](./implementing-carve), and see the [0.2 specification index](./grammar).

**Specification (external):** [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md), [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-151, C2-B-171, C2-B-182), [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), [Upgrading from 0.1](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md).
