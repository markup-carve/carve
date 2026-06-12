# Modern Markup Languages Comparison

A comparison of lightweight markup languages available today.

## Overview

The overview below is chronological. Later comparison tables group related
syntaxes together instead.

| Language                       | Author                 | Year | Focus                        |
|--------------------------------|------------------------|------|------------------------------|
| AsciiDoc                       | Stuart Rackham         | 2002 | Technical documentation      |
| reStructuredText (reST)        | David Goodger          | 2002 | Python documentation         |
| Textile                        | Dean Allen             | 2002 | Web publishing               |
| MediaWiki                      | Magnus Manske          | 2002 | Wikipedia                    |
| Org Mode                       | Carsten Dominik        | 2003 | Emacs, outlining             |
| Markdown                       | John Gruber            | 2004 | Simplicity, email-style      |
| Creole                         | WikiCreole             | 2007 | Wiki standardization         |
| CommonMark                     | John MacFarlane et al. | 2014 | Standardized Markdown        |
| GitHub Flavored Markdown (GFM) | GitHub                 | 2017 (formal spec; the flavor dates to ~2009) | Extended CommonMark |
| Gemtext                        | Solderpunk             | 2019 | Minimalism (Gemini protocol) |
| Djot                           | John MacFarlane        | 2022 | Predictable parsing          |
| Carve                          | Mark Scherer           | 2026 | Simple & predictable parsing |

## Feature Comparison

| Feature | Markdown | CommonMark | GFM | Djot | AsciiDoc | reST | **Carve** |
|---------|----------|------------|-----|------|----------|------|-----------|
| Strong | `**text**` | `**text**` | `**text**` | `*text*` | `*text*` | `**text**` | `*text*` |
| Emphasis | `*text*` | `*text*` | `*text*` | `_text_` | `_text_` | `*text*` | `/text/` |
| Code inline | `` `code` `` | `` `code` `` | `` `code` `` | `` `code` `` | `` `code` `` | ``` ``code`` ``` | `` `code` `` |
| Strikethrough | - | - | `~~text~~` | - | `[.line-through]#text#` | - | `~text~` |
| Highlight | - | - | - | `{=text=}` | `#text#` | - | `=text=` |
| Subscript | - | - | - | `{~text~}` | `~text~` | - | `,text,` |
| Superscript | - | - | - | `{^text^}` | `^text^` | - | `^text^` |
| Tables | varies | - | `\| col \|` | `\| col \|` | `\|===` | directives | `\| col \|` + spans |
| Task lists | - | - | `- [x]` | `- [x]` | `* [x]` | - | `- [x]` |
| Footnotes | varies | - | `[^1]` (deployed; not in the formal spec) | `[^1]` | `footnote:[]` | `[1]_` | `[^1]`, `^[inline]` |
| Attributes | - | - | - | `{.class #id}` | `[.class]` | `:class:` | `{.class #id}` |
| Divs/Admonitions | - | - | - | `:::` | `====` | `.. note::` | `::: note` |
| Smart quotes | varies | - | - | auto | explicit (`` "`text`" ``) | - | auto |

**Notes on the Djot column:**

- **Strikethrough:** Djot has no strikethrough. Its nearest elements are *delete* `{-text-}` (`<del>`) and *insert* `{+text+}` (`<ins>`); plain `~text~` is subscript, not a line-through.
- **Subscript / Superscript:** the braces are optional in Djot — `~text~`/`^text^` work as shorthand, and the `{~ ~}`/`{^ ^}` forms are only needed when the span contains spaces or ambiguous boundaries.

## Syntax Examples

### Headings

```
# Markdown/CommonMark/GFM/Djot/Carve

= AsciiDoc Level 1
== AsciiDoc Level 2

Title
=====    (reST)

* Org Mode Level 1
** Org Mode Level 2
```

### Links

```
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

```
![alt](src)                    # Markdown/CommonMark/GFM/Djot/Carve
image::src[alt]                # AsciiDoc
.. image:: src                 # reST
   :alt: alt text
[[file:src]]                   # Org Mode
!src(alt)!                     # Textile
[[File:src|alt]]               # MediaWiki
{{src|alt}}                    # Creole
```

### Code Blocks

````
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

### Lists

```
- item                         # Markdown/CommonMark/GFM/Djot/Carve
* item                         # AsciiDoc/Org Mode
- item                         # reST (with blank lines)
* item                         # Textile/MediaWiki/Creole
```

## Philosophy Comparison

| Language | Philosophy |
|----------|------------|
| **Markdown** | "Easy to read, easy to write" - minimal syntax for common cases |
| **CommonMark** | Standardize Markdown with unambiguous spec |
| **GFM** | Extend CommonMark for developer workflows (tables, task lists, code) |
| **Djot** | Predictable parsing, consistent rules, no edge cases |
| **AsciiDoc** | Comprehensive technical documentation with semantic markup |
| **reST** | Extensible, explicit, Python ecosystem standard |
| **Org Mode** | Everything-in-one: notes, todos, literate programming |
| **Gemtext** | Radical simplicity, one link per line, no inline formatting |

## Strengths & Weaknesses

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
- **Cons**: New, less tooling/adoption

### AsciiDoc
- **Pros**: Feature-rich, great for books/docs
- **Cons**: Complex syntax, steep learning curve

### reST
- **Pros**: Extensible, semantic, Python standard
- **Cons**: Verbose, whitespace-sensitive

### Org Mode
- **Pros**: Incredibly powerful, literate programming
- **Cons**: Emacs-centric, complex

### Gemtext
- **Pros**: Dead simple, fast to parse
- **Cons**: Very limited formatting

## Adoption & Ecosystem

| Language | Primary Use | Notable Users |
|----------|-------------|---------------|
| Markdown | General writing | GitHub, Stack Overflow, Reddit, Discord |
| CommonMark | Standardized docs | Discourse, Swift, many parsers |
| GFM | Developer docs | GitHub, GitLab |
| Djot | Modern alternative | Growing adoption |
| AsciiDoc | Technical books | O'Reilly, Spring, Asciidoctor |
| reST | Python docs | Sphinx, Read the Docs, Python |
| Org Mode | Personal knowledge | Emacs users, researchers |
| MediaWiki | Wikis | Wikipedia, Fandom |

## Parsing Complexity

| Language | Parser Complexity | Spec Size |
|----------|-------------------|-----------|
| Gemtext | Trivial | ~1 page |
| Creole | Simple | ~10 pages |
| Markdown | Ambiguous | informal syntax essay, no formal spec |
| CommonMark | Complex | large prose spec, ~650 conformance examples |
| Djot | Moderate | compact prose spec + reference implementation |
| GFM | Complex | CommonMark + extensions |
| AsciiDoc | Complex | Large spec |
| reST | Complex | Large spec |
| Carve | Moderate | EBNF grammar + semantic constraints + executable corpus |

## Recommendations

| Use Case | Recommended |
|----------|-------------|
| Quick notes | Markdown |
| GitHub READMEs | GFM |
| Technical books | AsciiDoc |
| Python documentation | reST |
| Personal knowledge base | Org Mode |
| New projects wanting consistency | Djot |
| Extreme minimalism | Gemtext |
| Wiki content | MediaWiki or Creole |

## Conclusion

The markup landscape has evolved significantly since Markdown's introduction in 2004. While Markdown remains dominant due to familiarity, alternatives like Djot offer cleaner semantics and predictable parsing. AsciiDoc and reST serve well for comprehensive documentation needs. The choice depends on your ecosystem, complexity requirements, and how much you value specification clarity over ubiquity.
