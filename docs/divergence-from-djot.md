---
description: Every place Carve 0.2 reads or renders a Djot document differently from Djot, with the rule behind each one - the reference for porting Djot content or a Djot parser.
---

# Divergence from Djot

Carve shares much of its syntax with [Djot](https://djot.net): the paragraph and quote model, `:::` divs, `[text]{.attrs}` spans, `{+ins+}`, `{-del-}` and `{=mark=}`, footnotes, math, raw passthrough and smart typography. This page lists every place where the same bytes mean something else in Carve 0.2. Each row names the clause of the [0.2 specification](https://github.com/markup-carve/carve/tree/next2/spec/0.2) that decides it.

Outputs were measured against djot.js 0.3.2 and the `carve-js` reference engine. HTML is shortened to the part that differs; `⏎` marks a line break in a one-line input.

## Changes you will not see as errors

These eight change a Djot document without a parse error, and most of them get no lint finding with the default options, so check them by hand.

1. `---`, `- - -` and `* * *` are not thematic breaks. Only `***` is. A `---` on line 1 opens frontmatter, and an unclosed one takes the rest of the document.
2. A Djot definition list (`: term`, blank line, indented definition) becomes plain paragraphs. Carve writes `:: term` and then `: definition`.
3. An attribute block after a bare word (`word{.c}`) is printed as text. Wrap the word in a span: `[word]{.c}`. The hint `unattached-inline-attribute` reports it.
4. `~x~` is text and `{~x~}` is strikethrough. Djot reads both as subscript. Carve subscript is `{,x,}`.
5. `{_x_}` is underline. In Djot it is emphasis.
6. `#word` and `@word` are tags and mentions.
7. `-->`, `==>`, `!=`, `<=`, `>=`, `+-` and `(tm)` become `→`, `⇒`, `≠`, `≤`, `≥`, `±` and `™`.
8. `::: note`, `::: warning` and the other admonition names render as `<aside>`, and `::: toc`, `::: footnotes` and `::: figure` are directives, not plain divs.

With `--rules` turning them on by id, the `djot-` hints report items 2, 5, 6 and 7 and the `(1)` and `A. x` list markers: `djot-definition-list`, `djot-emphasis-underscore-braced`, `djot-tag-mention`, `djot-typography-sign` and `djot-ordered-marker`. Item 4 has `djot-` rules too, item 1 is reported under `--upgrade`, and item 3 by default. Item 8 has no migration notice.

## Inline marks

| Djot | Carve 0.2 | Why |
|---|---|---|
| `_em_` is emphasis | `_em_` is text; emphasis is `/em/` | Only `/` and `*` are bare delimiters (C2-I-046). |
| `{_em_}` is emphasis | `{_em_}` is underline | The braced underscore is the underline mark (C2-I-043). |
| `*strong*` is strong | the same | |
| `**x**` is nested strong | text, and `markdown-strong-double-star` reports it | A run of two or more bare delimiters is text (C2-I-049). |
| `foo*bar*baz` is strong inside a word | text; write `foo{*bar*}baz` | A bare delimiter opens only after a non-word character and closes only before one (C2-I-047, C2-I-048). |
| a no-break space next to `*` does not block it | a no-break space counts as whitespace | C2-I-011. |
| `~x~` and `{~x~}` are subscript | `~x~` is text, `{~x~}` is strikethrough, `{,x,}` is subscript | C2-I-046, C2-I-062. |
| `^x^` is superscript | text; `{^x^}` is superscript | C2-I-046. |
| `{+x+}`, `{-x-}`, `{=x=}` | the same | |
| `` ` x ` `` keeps both spaces | one space is removed from each end | C2-I-016. |
| an unclosed `` ` `` runs to the end of the paragraph as code | the backtick is text | A form opens only when its closer is in the same content (C2-I-017). |
| spaces before a hard break `\` are dropped | they are kept | Pinned by clause case CC-156. |

## Attributes

| Djot | Carve 0.2 | Why |
|---|---|---|
| `word{.c}` makes a span around the word | text | An attribute block attaches only to a span, link, image, code span, math, footnote reference, symbol or closed emphasis (C2-I-036). |
| an attribute block with nothing to attach to is dropped | it stays in the output as typed | C2-I-035. |
| an attribute block may span lines and hold `% comments %` | one line, no comments | C2-I-028, C2-I-029. |
| `{}` is an empty attribute block | text, except `[a]{}` | C2-I-040. |
| `{.c}`, a blank line, then a block: the attributes attach (newer Djot drops them) | `{.c}` is a paragraph of text | An attribute line applies only to the block on the next line (C2-B-091, C2-B-092). |
| `{.c}` inside an open paragraph is consumed and vanishes | it is a line of the paragraph | C2-B-024. |
| `{.c}` directly above a block | the same | |

## Links, images and references

| Djot | Carve 0.2 | Why |
|---|---|---|
| a destination may wrap; the lines are joined | the destination stays on one line with no whitespace, or there is no link | C2-I-067, C2-I-069. |
| `[t](u "T")`: the quotes are part of the URL | `"T"` is the link title | C2-I-068. |
| every backslash escape works in a destination | only `\(`, `\)` and `\\` | C2-I-013. |
| `[[a](b)](c)` nests two links | one link to `c` | Links do not nest (C2-I-071). |
| an unresolved reference renders `<a>` without `href` | the brackets and label stay as text | C2-I-085. |
| an unresolved footnote reference makes an empty note | `[^x]` stays as text | C2-I-088. |
| a label matches the text of the reference | a label matches its source, so `[a _b_][]` needs `[a _b_]:` | C2-I-079. |
| image alt text is the plain text of the content | alt text is the source of the content | C2-I-074. |
| an image alone on a line is `<p><img></p>` | a bare `<img>`; with a `^ caption` line below it, a `<figure>` | C2-B-197, C2-H-020. |
| raw `{=html}` is passed through | escaped, unless the host turns on `rawHtml` | C2-H-050, C2-H-051. |

## Smart typography

| Djot | Carve 0.2 | Why |
|---|---|---|
| `'tis` gives `’tis` | `‘tis` | A quote opens at the start of the content or after whitespace or opening punctuation (C2-I-104). Write `’` where you need it. |
| `{"x"}` forces quote direction | `{“x”}`, with the braces as text | No forced quote form (C2-I-043). |
| 13 hyphens give 3 em and 2 en dashes | 1 em and 5 en dashes | C2-I-111. |
| `-->`, `==>`, `<=`, `!=`, `+-`, `(tm)` stay as typed | arrows and signs | C2-I-115, C2-I-117. |
| `--`, `---`, `...` | the same | |

## Headings

| Djot | Carve 0.2 | Why |
|---|---|---|
| `#` marks a heading | `=` and `#` both do | C2-B-151, C2-B-152. |
| the next unindented line, or a line with the same `#` count, folds into the heading | only lines indented past the marker fold in | C2-B-154. `djot-heading-continuation` reports it. |
| `##` alone is an empty heading | text | C2-B-151. |
| `# a; b: c` gets the id `a;-b:-c` | `a-b-c` | The slug keeps only letters, digits and non-ASCII characters (C2-H-143 to C2-H-148). |
| `# 123` gets `123` | `s-123` | C2-H-148. |
| a duplicate id gets `-1` | `-2` | C2-H-024. |
| `<section>` wrapping, the id on the section | the same | |

<a id="_7-block-openers-interrupt-paragraphs-markdown-like"></a>

## Paragraphs and interruption

A paragraph ends at a blank line in both languages, and a heading, quote or list marker below a paragraph line is text of that paragraph in both. Carve adds three interrupters that Djot does not have: a fence line (backticks, `:::` or `%%%`), a table row and `***` (C2-B-014, C2-B-019, C2-B-200).

```
Paragraph text
::: note
Body
:::
```

Djot gives one paragraph. Carve gives the paragraph and an admonition.

## Lists

| Djot | Carve 0.2 | Why |
|---|---|---|
| `+` is a bullet | text | Bullets are `-` and `*` (C2-B-034, C2-B-059). |
| `-` alone is an empty item | text | A marker needs content (C2-B-033). |
| `(1)`, `(a)`, `(IV)` are markers | text | Delimiters are `.` and `)` (C2-B-036). |
| `A. Smith` is a list | text; an uppercase marker with a dot needs two spaces | C2-B-040. |
| `i.` then `j.` makes one alphabetic list | a roman list, then an alphabetic list | The first marker fixes the style (C2-B-042, C2-B-044). |
| `. a` is text | an auto-numbered item | C2-B-043. |
| a nested list needs a blank line before it | it does not | C2-B-015. |
| a blank line anywhere in a list makes it loose | only a blank line between two items does | C2-B-062. |
| any number of blank lines keeps one list | three blank lines end it | C2-B-052. |
| `1)` lists | the same, plus `data-delim=")"` on `<ol>` | C2-H-031. |

## Thematic breaks, fences and divs

| Djot | Carve 0.2 | Why |
|---|---|---|
| `---`, `***`, `- - -`, `* * *` are breaks | only three or more `*` | C2-B-159, C2-B-160. |
| `---` on line 1 is a break | it opens frontmatter | C2-B-161. |
| `~~~` opens a code block | text | C2-B-108. |
| `` ``` a b `` with spaces in the info is inline code | a code block with language `a`; lint reports the extra words | C2-B-122. |
| a colon fence shorter than the open div is text | it opens a nested div | C2-B-108. |
| `:::` closes every open div | it closes the innermost one | C2-B-109. |
| `:::note` opens a div | text; write `::: note` | C2-B-119. |
| `::: note` is `<div class="note">` | `<aside class="admonition note">` for `danger`, `example`, `info`, `note`, `quote`, `success`, `tip` and `warning` | C2-H-154. |
| `::: toc`, `::: footnotes`, `::: figure` are divs | directives and figure groups | C2-B-127. |

## Definitions and footnotes

| Djot | Carve 0.2 | Why |
|---|---|---|
| `: term`, then an indented definition | `:: term`, then `: definition` | C2-B-067, C2-B-074. |
| `[r]:` with the URL on the next line | text; the URL goes on the definition line | C2-B-083. |
| `[r]: /u`, then an indented line: the line is joined onto the URL | an indented title or attribute block (`  "T" {.c}`) belongs to the definition; any other indented line is a paragraph | C2-B-083. |
| `: term`, then an unindented line: the line continues the term | after `:: term`, only a line indented past the column of the `::` continues the term; an unindented line ends it and starts a paragraph | C2-B-234, C2-B-071. |
| `[^n]:` with the body on the next lines | text; the body starts on the marker line | C2-B-082. |
| definitions inside a quote or list | text; definitions stand at column 0 | C2-B-081. |

## Tables

| Djot | Carve 0.2 | Why |
|---|---|---|
| a `\|---\|` separator row makes a head and sets alignment | the separator row is a data row | Header cells start with `\|=`, alignment is `\|={<}`, `\|={~}`, `\|={>}` (C2-B-171, C2-B-182). |
| a caption may follow a blank line | `^ caption` must stand directly below the table | C2-B-146. |
| an unindented line below a caption continues it | only a line indented past the column of the `^` continues it; an unindented line starts a paragraph | C2-B-234. Under `--upgrade`, `continuation-reading-changed` reports the line. |
| a row of a pipe, a backtick and a pipe is a paragraph with code | a one-cell table row | C2-B-166, C2-B-169. |

## HTML output

The same tree renders with a few fixed differences: tables have `<thead>` and `<tbody>`, math spans carry `role="math"`, task items carry `class="task"`, an `aria-label` and `data-task-state`, and the footnote section has an `aria-label`, one backlink per reference and the ids `fnref1-2` for repeated references.

## What Carve adds that can capture Djot text

These forms are text in Djot and syntax in Carve, so Djot text that happens to contain them changes:

- `@name` mentions and `#name` tags;
- `%%` line comments, `{%...%}` comments (the same in Djot) and `%%%` comment blocks;
- `{#...#}` editorial comments;
- `^[...]` inline footnotes, `</#id>` cross-references and `*[ABBR]: expansion` definitions;
- `::: |` line blocks and `::: \` hard-break blocks;
- frontmatter on line 1 and <code v-pre>{{ path }}</code> includes.

## Porting checklist

1. Run `carve lint --upgrade` on the Djot file. It reports `_x_`, `~x~`, `^x^`, `{~x~}`, `+` bullets, folded headings and the removed thematic-break spellings; `carve fix` rewrites the ones that have one replacement. The reference engine also offers `carve import --from djot`, which is outside the specification.
2. Replace `---` breaks with `***`, and check line 1.
3. Rewrite definition lists as `::` and `:`, and indent every line that continues a term, a caption or a heading. Only a paragraph takes unindented lines; every other block but a fenced one continues only on lines indented past its marker.
4. Move attributes off bare words into spans, and remove blank lines between an attribute line and its block.
5. Check the admonition and directive names of item 8; no migration notice reports them.
6. Escape `#` and `@` before words that are not tags or mentions.
7. Put each link destination and footnote body on its definition line.
8. Replace `~~~` fences with backticks, `(1)` markers with `1.` or `1)`, and `+` bullets with `-`.
9. Render both versions and compare the HTML.
