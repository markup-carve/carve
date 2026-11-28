---
description: Every place Carve 0.2 reads or renders a Djot document differently from Djot, with the rule behind each one - the reference for porting Djot content or a Djot parser.
---

# Divergence from Djot

::: info Who this is for
**Implementers porting a Djot parser**, and authors coming from Djot who hit a surprise. This is the list of places where the same bytes mean something else in Carve 0.2, with the reasoning behind each. It is not an introduction to Carve; start at [Get Started](./get-started) for that.
:::

Carve starts from [Djot](https://djot.net), John MacFarlane's predictable reworking of Markdown, and keeps much of it: the paragraph and quote model, `:::` divs, `[text]{.attrs}` spans, `{+ins+}`, `{-del-}` and `{=mark=}`, footnotes, math, raw passthrough and smart typography. Carve breaks source compatibility in a few specific places where a Djot choice favors Markdown familiarity over a reading that is unambiguous to write and to read. Each table row below names the clause of the 0.2 specification that decides it; the clause list is collected at the end of the page.

Outputs were measured against djot.js 0.3.2 and the `carve-js` reference engine. HTML is shortened to the part that differs; `⏎` marks a line break in a one-line input. Rendered Carve samples on this page are the exact output of the pinned 0.2 engine.

::: tip
For the parser-level rationale see [Technical rationale](./technical-rationale). For a feature matrix against Markdown and MDX as well, see [Carve, Markdown, Djot, and MDX](./comparison). Several rules on this page changed between Carve 0.1 and 0.2; [Upgrading from 0.1](./upgrade-0-2) lists each one.
:::

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
| an unclosed `` ` `` runs to the end of the paragraph as code | the backtick is text | A form opens only when its closer is in the same content (C2-I-017). |
| spaces before a hard break `\` are dropped | they are kept | Pinned by clause case CC-156. |

### Emphasis that looks like its effect

| Effect | Djot | Carve 0.2 |
|---|---|---|
| Italic | `_text_` | `/text/` (the slashes lean) |
| Bold | `*text*` | `*text*` |
| Bold italic | `_*text*_` | `/*text*/` |
| Underline | none (`{+text+}` is an insert, `<ins>`) | `{_text_}` |
| Strikethrough | none (`{-text-}` is a deletion, `<del>`) | `{~text~}` |
| Highlight | `{=text=}` | `{=text=}` |
| Subscript | `~text~` or `{~text~}` | `{,text,}` (the comma pulls down) |
| Superscript | `^text^` or `{^text^}` | `{^text^}` |

::: compare
```crv
/italic/, *bold*, {_under_}, {~struck~}, {=marked=}, H{,2,}O and mc{^2^}
```
```html
<p><em>italic</em>, <strong>bold</strong>, <u>under</u>, <s>struck</s>, <mark>marked</mark>, H<sub>2</sub>O and mc<sup>2</sup></p>
```
:::

`/*both*/` is bold italic too, and the hint `comment-shaped-emphasis` points out that it looks like a C comment.

**Why.** The slash in `/italic/` leans, and the comma and caret in the braced forms suggest down and up. Only `/` and `*` work bare, so `_`, `~` and `=` in prose, file names and identifiers are always text. In 0.1 Carve also took bare `_x_`, `~x~` and `=x=`; 0.2 requires the braces for underline, strikethrough and highlight, the same way Djot requires them for insert, delete and mark. These choices break source compatibility with Djot, so a port must rewrite emphasis, subscript and superscript.

::: warning One spelling flips meaning
`{~text~}` is **subscript** in Djot and **strikethrough** in Carve. Carve writes subscript only as the braced `{,text,}`. Bare `~text~` is subscript in Djot and plain text in Carve.
:::

Superscript and subscript have **no bare delimiter** in Carve: `^text^` and `,text,` are literal text, and only the braced `{^text^}` and `{,text,}` forms mark. The common uses, such as H₂O and mc², sit inside a word, which a word-boundary delimiter could never express, and a bare comma would collide with prose punctuation: `typo ,oops, happens` must not become a subscript.

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
| `-{.c} x` is a paragraph | a list item with the class `c` | C2-B-101. |

### Attribute names are strict

Djot leaves attribute keys largely unconstrained, so `[x]{12=v}` is a span with the attribute `12`. Carve accepts digit-leading class and id values, because HTML permits them, but a key, a bare key and an inline extension name must begin with an ASCII letter or `_` (C2-I-030). A block with one part that fits no shape is no attribute block at all, so it stays visible as text instead of being dropped.

::: compare
```crv
[x]{12=v} and [y]{.123}
```
```html
<p>[x]{12=v} and <span class="123">y</span></p>
```
:::

Generated heading ids stay conservative: a digit-leading slug still gets the `s-` prefix.

### A list marker takes attributes

In Djot, `-{.c} x` is a paragraph: the `-` is text carrying a span, because a bullet needs its separator before anything else. In Carve the attribute block binds to the marker and the line is a list item. It is item metadata, not marker width: later lines of the item are measured from the bare marker.

::: compare
```crv
-{.c} x
```
```html
<ul>
  <li class="c">x</li>
</ul>
```
:::

Attributing the item is what an author writing this wants, and Djot's reading turns a would-be list into prose with a stray dash in it. The same bytes give a different block structure, so this is a source break.

### An attribute line inside a paragraph stays visible

Djot consumes a `{...}` line inside an open paragraph as attributes on the soft break, and those bytes leave no trace in the output. Carve 0.2 reads the line as text of the paragraph, like any other line that is not an interrupter (C2-B-024):

```djot
intro
{.c}
# H
```

Djot gives `<p>intro # H</p>`: the attributes are gone and the heading is text.

<!-- carve-sample {"lint":"The attribute line and the heading below a paragraph line are text of the paragraph."} -->
::: compare
```crv
intro
{.c}
= H
```
```html
<p>intro
{.c}
= H</p>
```
:::

The heading is text in both languages, but in Carve nothing the author typed disappears. Silently discarding authored bytes is the failure that is hardest to notice, because the output is well-formed and merely missing something. Add a blank line after `intro` to get a heading with the class `c`. Carve 0.1 instead ended the paragraph and put the attributes on the heading; 0.2 stopped headings from interrupting a paragraph (see [Paragraphs and interruption](#paragraphs-and-interruption)).

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

### Raw passthrough is routed by output format

Djot and Carve share the raw passthrough syntax: `` `content`{=format} `` inline and a ```` ```=format ```` block carry `content` for the renderer whose output is `format`. This is the `RawInline` and `RawBlock` model that Pandoc-flavored Markdown has used for years (`` `\alpha`{=latex} ``), and Djot inherits it to feed Pandoc, which is where `{=latex}`, `{=typst}` and `{=docx}` actually render.

Carve differs in two ways:

- **Raw HTML is off by default.** With the render option `rawHtml` off, a raw `html` span is written as its escaped payload and a raw `html` block as an `html` code block. A host passes `rawHtml: true`, or `carve render --raw-html`, to write them verbatim. See [Security](./security).
- **HTML is the only specified output.** Raw content in any other format renders nothing in HTML and is reported as the render loss `raw-format-dropped`. It stays in the tree as a `raw_inline` or `raw_block` node with its `format`, for a host writer or a bridge.

::: compare
```crv
`\alpha`{=latex} and `<b>x</b>`{=html}
```
```html
<p> and &lt;b&gt;x&lt;/b&gt;</p>
```
:::

::: warning Do not pipe a whole Carve document through Pandoc's Djot reader
Only the raw passthrough construct is shared byte for byte. A full Carve document is not valid Djot: Pandoc's Djot reader reads `/italic/` as literal text and `{_underline_}` as emphasis. Convert the document through the Carve tree instead.
:::

The [pandoc-carve](./format-bridges) bridge converts a Carve tree to Pandoc's JSON AST, so one document can reach Pandoc's LaTeX, Typst and DOCX writers, with the emphasis mapped and raw spans routed by Pandoc itself.

## Smart typography

| Djot | Carve 0.2 | Why |
|---|---|---|
| `'tis` gives `’tis` | `‘tis` | A quote opens at the start of the content or after whitespace or opening punctuation (C2-I-104). Write `’` where you need it. |
| `{"x"}` forces quote direction | `{“x”}`, with the braces as text | No forced quote form (C2-I-043). |
| 13 hyphens give 3 em and 2 en dashes | 1 em and 5 en dashes | C2-I-111. |
| `-->`, `==>`, `<=`, `!=`, `+-`, `(tm)` stay as typed | arrows and signs | C2-I-115, C2-I-117. |
| `--`, `---`, `...` | the same | |

### One leaf node, not three node types

Both languages agree that a typographic substitution has to be represented in the tree, or a formatter cannot reproduce what the author typed. The tree shape differs.

**Djot:** three types. `double_quoted` and `single_quoted` are containers that wrap the quoted content, and `smart_punctuation` is a leaf that keeps the source text of dashes and ellipses.

**Carve:** one type. `smart_punctuation` is always a leaf. It carries the resolved `kind` (`ellipsis`, `em_dash`, `left_double_quote` and so on), the `glyph` and the author's `source` (`...`, `--`, `"`). A dash run becomes one node per glyph, each holding the hyphens it came from, so `----` writes back as exactly four hyphens. The HTML renderer writes the glyph, and the canonical writer writes the source, which is why `carve fmt` leaves `He said "hello"` as typed instead of curling it.

**Why one leaf.** A container says the quotes have a scope, and in Carve they do not. Quote direction is decided per character from what comes before it, so an unpaired quote is ordinary and `a"b` is a right quote inside a word, with no span to wrap. Quote containers would make every tree walker handle a node whose children are the quoted prose, turn a link label holding a quote into a nested container, and raise the question of what an unmatched opener contains.

### Forced quote direction

Djot supports `{"`, `"}`, `{'` and `'}` to force an opening or closing quote. Carve does not: the brace stays literal, and the straight quote follows the contextual rule.

::: compare
```crv
a {"b c
```
```html
<p>a {“b c</p>
```
:::

Djot renders the same line as `<p>a “b c</p>`. Write `“`, `”`, `‘` or `’` directly where you need a specific direction; typed curly quotes are kept as written.

### Turning it off

The render option `smartTypography` is on by default. Turned off, each `smart_punctuation` node is written as its source, so the output carries the author's ASCII for dashes, ellipses, quotes, arrows, comparison signs, `(tm)` and `+-`. Parsing and the tree do not change, escapes still work (`\"` gives a straight quote either way), `:name:` symbols are untouched, and heading ids are the same in both modes, because the id is computed from the ASCII source of each glyph (see [Heading ids](#heading-ids-keep-their-case-and-match-exactly)).

In 0.2 the option is a boolean. The 0.1 value `{ quotes: false }`, straight quotes with the other substitutions on, has no 0.2 spelling; a library host registers the `smartQuotes()` extension with straight quote characters instead. The command line has no spelling for it.

The switch is document-global on purpose. A default per output target was considered and rejected: one source must carry the same text on every target. Turn it off for machine-facing output, such as text a model reads or generated documentation that must stay diff-stable, and leave it on for human readers.

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

### A heading continues only on indented lines

**Djot:** a heading's text runs on until a blank line. A following plain line folds in, and so does a line carrying the same number of `#`.

**Carve:** a heading is a label. It continues on each line directly below it that is indented past its marker, and any other line ends it.

<!-- carve-sample {"fmtSkip":"fmt separates the heading and the paragraph with a blank line"} -->
::: compare
```crv
= Title
Some text.
```
```html
<section id="Title">
  <h1>Title</h1>
  <p>Some text.</p>
</section>
```
:::

Djot gives one `<h1>` holding both lines, with the id `Title-Some-text`. To wrap a long heading in Carve, indent the second line:

::: compare
```crv
= Release notes for the
  spring update
```
```html
<section id="Release-notes-for-the-spring-update">
  <h1>Release notes for the
spring update</h1>
</section>
```
:::

**Why.** An unindented line under a heading is almost always the first line of the body, and in Djot it silently becomes part of the title. The indent makes the wrap visible. Terms and captions follow the same label rule, so one rule covers all three. Carve 0.1 ended a heading at the line break with no way to wrap it; 0.2 added the indented form.

### Heading ids keep their case and match exactly

**Djot:** heading ids keep case and non-ASCII characters (`# Getting Started` gives `Getting-Started`). Reference labels and implicit heading references match case-sensitively.

**Carve:** the same on both counts. With the default `headingIds` value `keep-case`, `= Getting Started` gives `Getting-Started` and `= Über uns` gives `Über-uns`. The slug is computed from the heading's plain text in fixed steps: normalize to NFC, remove invisible and bidirectional control characters, replace each smart-typography glyph with its ASCII source, replace each run of characters that are not an ASCII letter, an ASCII digit or a character at or above U+0080 with one hyphen, and trim hyphens from the ends. There is no case-folding table in the default, so every engine gives a byte-identical id.

Every name lookup is exact. A `</#id>` cross-reference, a `[Heading][]` reference, a `[text][label]` label and a footnote label compare case as written; labels fold only runs of whitespace.

::: compare
```crv
= My API Reference

See </#My-API-Reference>.
```
```html
<section id="My-API-Reference">
  <h1>My API Reference</h1>
  <p>See <a href="#My-API-Reference">My API Reference</a>.</p>
</section>
```
:::

`</#my-api-reference>` in the same document matches no id and stays literal text, and the lint rule `broken-crossref` names the id `My-API-Reference` that differs only in case.

**Why.** One rule for every lookup, with no Unicode case-folding table anywhere: a whole-string lowercase disagrees between implementations on Greek final sigma and Turkish dotted I. It matches the browser too: `href="#Plan"` does not reach `id="plan"`, so a `</#plan>` that resolved while `[x](#plan)` broke would be inconsistent. And `{#Tip}` and `{#tip}` stay two ids that each reference reaches unambiguously.

**Opt-in transforms.** Lowercase anchors in the style of GitHub and static site generators, and ASCII-only fragments, are values of the same `headingIds` option (`carve render --heading-ids`):

| `headingIds` | `= Über uns` | `= Ωmega` |
|---|---|---|
| `keep-case` (default) | `Über-uns` | `Ωmega` |
| `lower` | `über-uns` | `ωmega` |
| `ascii` | `Uber-uns` | `Ωmega` |
| `ascii-lower` | `uber-uns` | `ωmega` |
| `ascii-strict` | `Uber-uns` | `mega` |
| `ascii-strict-lower` | `uber-uns` | `mega` |
| `off` | no generated id | no generated id |

The transliteration table covers Latin and several other scripts but not Greek, so the `ascii` values keep what they cannot map and the heading keeps a usable anchor, while the `ascii-strict` values drop it so that the id contains only ASCII. `lint` reads the same option, so it checks fragments against the ids the host renders.

Smart-typography glyphs are turned back into their ASCII source before the slug is computed, so an id never depends on presentation: `= Don't repeat yourself` gives `Don-t-repeat-yourself`, not a curly `’`. A typed glyph from the same list is treated the same way; a symbol outside the list, such as `•`, is kept.

### Punctuation in ids

**Djot** removes a fixed list of ASCII punctuation, so characters that are not on the list, such as `;` and `:`, survive in the id: `# a; b: c` gives `a;-b:-c`.

**Carve** keeps only ASCII letters and digits plus every character at or above U+0080, and replaces every other ASCII run with one hyphen: `= a; b: c` gives `a-b-c`, and `= C++ & Rust` gives `C-Rust`. Listing what to keep gives cleaner and more predictable anchors than listing what to drop.

### Only the id moves to the section

Both languages wrap a top-level heading, and the content following it, in a `<section>` that carries the heading's id. They disagree about the heading's other attributes.

**Djot:** the resolution recorded in `jgm/djot.js#43` is that all of a heading's attributes move to the section. The implementation applies that only when the heading has an explicit `{#id}`; with a generated id the other attributes stay on the heading, so the two cases disagree with each other (`jgm/djot.js#144`, open).

**Carve:** the id moves to the section, every other attribute stays on the heading, and the two id cases agree:

::: compare
```crv
{.c a=b}
= abc

{#x .c a=b}
= abc
```
```html
<section id="abc">
  <h1 class="c" a="b">abc</h1>
</section>
<section id="x">
  <h1 class="c" a="b">abc</h1>
</section>
```
:::

The id is the one attribute about the region: it names what a `#fragment` URL scrolls to, and that is the section. The other attributes describe the heading the author attached them to; an author who wants to style the whole section writes a div around it. The rule does not depend on how the id was produced, and it survives turning the wrapper off: with `sections` off no heading opens a section, so the id stays on the heading and nothing else moves.

<a id="_7-block-openers-interrupt-paragraphs-markdown-like"></a>

## Paragraphs and interruption

A paragraph ends at a blank line in both languages, and a heading, quote or list marker below a paragraph line is text of that paragraph in both. Carve adds three interrupters that Djot does not have: a fence line (backticks, `:::` or `%%%`), a table row and `***` (C2-B-014, C2-B-019, C2-B-200).

```djot
Paragraph text
::: note
Body
:::
```

Djot gives one paragraph. Carve gives the paragraph and an admonition:

<!-- carve-sample {"fmtSkip":"shows the fence line directly under the paragraph line"} -->
::: compare
```crv
Paragraph text
::: note
Body
:::
```
```html
<p>Paragraph text</p>
<aside class="admonition note" aria-label="Note">
  <p>Body</p>
</aside>
```
:::

The other interrupters continue a structure that is already open: a list marker at an open list's column, a description or term mark at an open description list's column, and a caption line below a paragraph that is exactly one image or one display math line (C2-B-015 to C2-B-017). Every other line is a lazy line of the open paragraph, including a heading, a quote, an attribute line, a definition and an include directive (C2-B-024).

<!-- carve-sample {"lint":"A heading marker directly under a paragraph line is text."} -->
::: compare
```crv
intro
= Heading
```
```html
<p>intro
= Heading</p>
```
:::

`block-opener-without-blank-line` reports such a line, and `list-marker-without-blank-line` reports a list marker. Escape the marker (`\= H`, `\- item`) or add a blank line to control the reading.

**Why.** A fence line, a table row and `***` have no reading as prose, so ending the paragraph there cannot surprise anyone. A heading, quote or list marker can: a hard-wrapped line that happens to start with `#`, `>`, `-` or `2.` should not restructure the paragraph above it. Carve 0.1 let headings, quotes and table rows interrupt in the Markdown way, with a separate answer for each block kind, so a wrapped line that only looked like a marker changed the document. 0.2 went back to Djot's blank-line rule for everything that could be prose and kept the interruption only for lines that cannot be.

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

### A list marker needs content

**Djot and CommonMark:** a bare `-`, or `- ` with only trailing whitespace, starts an empty list item.

**Carve:** a marker is a list item only when one space and at least one further character follow it on its line. A bare `-`, `- ` or `-   ` is paragraph text.

::: compare
```crv
-

- item
```
```html
<p>-</p>
<ul>
  <li>item</li>
</ul>
```
:::

**Why.** Two traps disappear. A lone dash used as a separator or placeholder no longer becomes a one-item list, and trailing whitespace stops carrying meaning, so an editor that strips it cannot change `- ` into something else.

### `+` is text

Djot and CommonMark accept `+` as a third bullet. Carve bullets are `-` and `*` only. Carve 0.1 used a lone `+` as a continuation marker that attached the next block to a list item; 0.2 removed it, and a line starting with `+` is text unless it continues a table row (C2-B-059). Later blocks of an item are indented under its text instead, as in Djot. [Upgrading from 0.1](./upgrade-0-2) shows the rewrite.

### No parenthesized ordered markers

**Djot:** `(1)`, `(a)` and `(i)` are ordered-list markers.

**Carve:** ordered lists use the `.` and `)` delimiters only (`1.`, `1)`), and `(1)` stays paragraph text.

**Why.** A leading `(1)` is far more often a parenthetical in prose than a list. In technical writing especially, the literal reading avoids surprise lists.

### Bare-dot markers

`. item` is a decimal ordered item that takes the next number, the AsciiDoc-style shorthand for a list nobody numbers by hand. It is a spelling of decimal with a dot, so it mixes with `1.` in one list. Only `.` may drop its value, since a leading `) ` collides with prose parentheticals far more often. The constant marker width keeps nested content at the same indent when the count passes 9, 99 or 999. Use numbered markers when the source must stay readable as Djot or Markdown.

::: compare
```crv
. first
. second
```
```html
<ol>
  <li>first</li>
  <li>second</li>
</ol>
```
:::

### List continuation

**Djot:** a block indented anywhere past a list marker belongs to the item, even one space under a `-`.

**Carve 0.2:** the same. With no paragraph open, a line belongs to the innermost item whose marker it is indented past (C2-B-025), and the item's content is stripped by at most its content column. Carve 0.1 required a block to reach the item's content column (`- ` at 2, `1. ` at 3), so this is no longer a difference.

<!-- carve-sample {"lint":"list-item-body-below-content-column reports a block short of the item's text","fmtSkip":"fmt indents the quote to the item's text"} -->
::: compare
```crv
1. one

  > two
```
```html
<ol>
  <li>one
    <blockquote><p>two</p></blockquote>
  </li>
</ol>
```
:::

### A blank line loosens a list only between items

**Djot:** a blank line inside an item makes the item loose, so its lead text becomes a `<p>`, except before a nested list: djot.js keeps that item tight.

**Carve:** a list is loose only when a blank line stands between two of its items (C2-B-062). A blank line between two blocks of one item changes nothing:

::: compare
```crv
- a

  > q
- c
```
```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
  <li>c</li>
</ul>
```
:::

Djot makes this item loose and wraps `a` and `c` in `<p>`. Carve 0.1 loosened it too; 0.2 ties tightness to the blank lines between items only, so every block kind is treated alike and a list stays tight until two of its items are separated.

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

### Colon fences

Both languages spell a div `:::`, close it with a bare colon fence at least as long as its opener, and close a div that never got a closer at the end of its container. Carve 0.1 required a closer of exactly the opener's length; 0.2 returned to Djot's rule (C2-B-109). Three differences remain.

**A bare closer closes one div.** Djot's closes every div open above it at once:

```djot
::: a
::: b
X
:::
after
```

Djot ends both `a` and `b` at the single `:::`, so `after` is outside both. Carve closes only `b`; `a` is still open, so `after` belongs to it:

<!-- carve-sample {"lint":"The outer div has no closer.","fmtSkip":"fmt widens the outer fence and adds its closer"} -->
::: compare
```crv
::: a
::: b
X
:::
after
```
```html
<div class="a">
  <div class="b">
    <p>X</p>
  </div>
  <p>after</p>
</div>
```
:::

Give each div its own closer. `unclosed-container-fence` reports the one that has none.

**A fence shorter than the innermost div.** Under `:::: a`, a bare `:::` is content in Djot, and the div runs to the end of the input. In Carve it is too short to close `a`, so it opens an anonymous div, and `colon-fence-length-mismatch` reports it.

**The glued name.** Djot accepts `:::note` with no space before the name. Carve requires the space and reads the glued form as a paragraph.

The canonical writer gives each div the shortest colon run of at least three that is longer than the run of every div inside it (C2-W-039), so the outermost fence is the widest, the form both languages read the same way.

### Typed divs are admonitions

**Djot:** `::: note` is a div with a class.

**Carve:** a recognized name renders as an `<aside>` with the admonition class, and any other name still renders as a div.

::: compare
```crv
::: note
body
:::
```
```html
<aside class="admonition note" aria-label="Note">
  <p>body</p>
</aside>
```
:::

Djot gives `<div class="note"><p>body</p></div>`.

**Why.** An admonition is a landmark for assistive technology, and `<aside>` carries that where a `<div>` does not. The tree shape is the same in both languages; only the element differs. The landmark comes with a name, because an unnamed one is an anonymous entry in a reader's landmark list. Without a title the `<aside>` carries `aria-label` (`Note` by default). An admonition with a title is named by that title instead, through `aria-labelledby` pointing at its `<p class="admonition-title">`, so the visible name and the spoken one are the same string.

### A block marker's separator is a literal space

**Djot:** a block marker accepts any whitespace as its separator, so `>` followed by a tab and `q` is a quote.

**Carve:** the quote mark is `>` followed by a space or the end of the line (C2-B-031), and a list marker needs one space (C2-B-033). A tab does not count, so the same line is paragraph text. Leading indent before an opener behaves as in Djot, and `carve lint` reports it as `block-opener-overindented`.

```text
>⟨tab⟩q

Djot:  <blockquote><p>q</p></blockquote>
Carve: <p>&gt;⟨tab⟩q</p>
```

**Why.** A tab's width depends on the column it starts at, so a tab separator would make whether a marker opens depend on where the line sits. Testing for one space gives the same answer at every column and in every container.

## Definitions and footnotes

| Djot | Carve 0.2 | Why |
|---|---|---|
| `: term`, then an indented definition | `:: term`, then `: definition` | C2-B-067, C2-B-074. |
| `[r]:` with the URL on the next line | text; the URL goes on the definition line | C2-B-083. |
| `[r]: /u`, then an indented line: the line is joined onto the URL | an indented title or attribute block (`  "T" {.c}`) belongs to the definition; any other indented line is a paragraph | C2-B-083. |
| `: term`, then an unindented line: the line continues the term | after `:: term`, only a line indented past the column of the `::` continues the term; an unindented line ends it and starts a paragraph | C2-B-234, C2-B-071. |
| `[^n]:` with the body on the next lines | text; the body starts on the marker line | C2-B-082. |
| definitions inside a quote or list | text; definitions stand at column 0 | C2-B-081. |

### Description lists use explicit marks

Djot description lists are scoped by indentation: a single-colon term line, a blank line, then an indented body that can hold several paragraphs and nested blocks.

```djot
: term

  First paragraph of the definition.

  Second paragraph.
```

Carve changes the marks and keeps the indented body:

- A **term** starts with `:: ` (two colons). Like a heading it is a label, so a long term continues on lines indented past the `::`.
- A **description** starts with `: ` (one colon). Further blocks of a description are indented past its mark, as in Djot.

::: compare
```crv
:: color
:: colour
: The visual property of objects.
: A pigment or paint.
```
```html
<dl>
  <dt>color</dt>
  <dt>colour</dt>
  <dd>The visual property of objects.</dd>
  <dd>A pigment or paint.</dd>
</dl>
```
:::

A description holds as many blocks as a Djot body does:

::: compare
```crv
:: term
: First paragraph.

  Second paragraph.
```
```html
<dl>
  <dt>term</dt>
  <dd>
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
  </dd>
</dl>
```
:::

The marks of the two languages do not mix: a Djot `: term` line followed by a blank line is a description line with no term above it in Carve, which is text, and `djot-definition-list` can report it. Two colons for a term and one for a description leave three colons for a div. Carve 0.1 also attached a following block with a lone `+`; 0.2 removed that, and the indented form is the only one.

### Footnote labels

Djot and Carve both trim the ends of a label and fold runs of whitespace for lookup. In 0.2 a Carve label folds every run of spaces, tabs and one line break to one space (C2-I-079), so a label holding a tab and a label that wraps onto the next line both find their definition, as in Djot. Case matters in both. Carve 0.1 folded spaces only and required a reference to stay on one line, so this is no longer a difference.

<!-- carve-sample {"fmtSkip":"fmt joins the wrapped label onto one line"} -->
::: compare
```crv
see[^two
words].

[^two words]: foo
```
```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>foo<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```
:::

When two definitions fold to the same key, the first footnote definition wins and the later one is reported, so folding never creates two competing definitions silently.

## Comments

**Djot:** `{% comment %}`.

**Carve:** `%%` to the end of the line, at the start of a line or after text, a `%%%` fenced comment block, and Djot's `{% comment %}` for a comment with text after it on the same line.

::: compare
```crv
%% a line comment

text %% a trailing comment

a {% inline %} b
```
```html
<p>text</p>
<p>a  b</p>
```
:::

**Why.** `%%` is quick to type, reads like a comment in many configuration formats, and needs no closing delimiter for the common one-line case. It runs to the end of the line, so prose cannot resume after it; for that Carve takes Djot's `{% ... %}` unchanged, and a Djot document's comments keep working as written. An unclosed `%%%` opens a comment block that runs to the end of its container, as an unclosed Djot code block or div does, so `%%%` followed by a line `x` renders nothing where Djot, which has no comment block, renders both lines as text.

## Symbols

Djot and Carve both parse `:name:` as a symbol, a named placeholder that renders as typed unless the application maps it. Djot leaves the mapping to filters; in Carve the symbol table belongs to the HTML renderer and its host, with the same literal fallback. Carve tightens two things Djot leaves loose:

- **Name shape.** djot.js matches `:[\w_+-]+:`, so a name with a leading `_` parses. Carve requires the first character to be a letter, a digit, `+` or `-`, followed by letters, digits, `_`, `+` and `-`, not ending in a hyphen (C2-I-093). The reaction shortcodes `:+1:` and `:-1:` parse, and `:_x:` stays literal.
- **Word boundary.** Djot opens a symbol anywhere, so `a:b:c` holds the symbol `b` and `10:30:` holds `30`; with a mapping active these substitute inside words and times. Carve applies the rule it uses for mentions and tags: a sigil starts a form only at the start of the content or after a character that is not a Unicode letter or number (C2-I-090).

An attribute block on a symbol renders a `<span>` around it, so the attributes have an element:

::: compare
```crv
:rocket:{.big}
```
```html
<p><span class="big">:rocket:</span></p>
```
:::

## Tables

| Djot | Carve 0.2 | Why |
|---|---|---|
| a `\|---\|` separator row makes a head and sets alignment | the separator row is a data row | Header cells start with `\|=`, alignment is `\|={<}`, `\|={~}`, `\|={>}` (C2-B-171, C2-B-182). |
| a caption may follow a blank line | `^ caption` must stand directly below the table | C2-B-146. |
| an unindented line below a caption continues it | only a line indented past the column of the `^` continues it; an unindented line starts a paragraph | C2-B-234. Under `--upgrade`, `continuation-reading-changed` reports the line. |
| a row of a pipe, a backtick and a pipe is a paragraph with code | a one-cell table row | C2-B-166, C2-B-169. |

::: compare
```crv
|= Item |={>} Qty |
| Apples | 3 |
^ Stock
```
```html
<table>
  <caption>Stock</caption>
  <thead>
    <tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Qty</th></tr>
  </thead>
  <tbody>
    <tr><td>Apples</td><td style="text-align: right;">3</td></tr>
  </tbody>
</table>
```
:::

## HTML output

The same tree renders with a few fixed differences: tables have `<thead>` and `<tbody>`, math spans carry `role="math"`, task items carry `class="task"`, an `aria-label` and `data-task-state`, and the footnote section has an `aria-label`, one backlink per reference and the ids `fnref1-2` for repeated references.

## What Carve adds

These forms are text in Djot and syntax in Carve, so Djot text that happens to contain them changes:

- `@name` mentions and `#name` tags;
- `%%` line comments, `{%...%}` comments (the same in Djot) and `%%%` comment blocks;
- `{#...#}` editorial comments;
- `^[...]` inline footnotes, `</#id>` cross-references and `*[ABBR]: expansion` definitions;
- `::: |` line blocks and `::: \` hard-break blocks;
- frontmatter on line 1 and <code v-pre>{{ path }}</code> includes;
- `{$name}: value` snippet definitions and <code v-pre>{{ $name }}</code> snippet uses.

Beyond those, Carve has features Djot does not, which are why it is more than restyled Djot:

- **Cross-references.** `</#id>` takes its link text from the target heading.
- **Heading references.** `[Heading][]` and `[text][Heading]` reach a heading with no separate `[label]: url` definition, and a shortcut `[text]` links when a definition `[text]:` exists.
- **Tables with row and column spans** (a `<` or `^` cell joins the cell to its left or above) and **captions** on images, tables, code blocks, quotes, math blocks and figure groups.
- **Native admonitions**, editorial marks, mentions and tags.
- **A fenced block quote.** `::: >` is a block quote written without a mark on every line. Same node, same HTML, and `carve fmt` writes back the form the author used. Djot has only the marker form; the proposal for a fenced one is `jgm/djot#401`.
- **Inline footnotes.** `^[content]` carries a note in place, as in Pandoc, numbered into the same endnotes as a `[^label]` reference.
- **Bare-dot ordered markers**, described [above](#bare-dot-markers).
- **Boolean attributes.** A bare key in `{...}`, as in `[text]{featured}`, is an attribute with an empty value and renders as `featured=""`. Djot rejects bare words and leaves the whole block as text.
- **Semantic span keys.** `kbd`, `abbr` and `time` on a span select an HTML element instead of an attribute, so `[Tab]{kbd}` is `<kbd>Tab</kbd>`. The values of `abbr` and `time` become `title` and `datetime`. In Djot the same span is `<span kbd="">`.

::: compare
```crv
Press [Tab]{kbd} and see [this]{featured}.
```
```html
<p>Press <kbd>Tab</kbd> and see <span featured="">this</span>.</p>
```
:::

## Porting checklist

1. Run `carve lint --upgrade` on the Djot file, with the `djot-` rules turned on by id in `--rules` (for example `djot-superscript-caret`, `djot-subscript-tilde`, `djot-subscript-tilde-braced`, `djot-plus-bullet` and `djot-heading-continuation`). `--upgrade` reports bare `_x_` and `~x~` and the removed thematic-break spellings; the `djot-` rules report `^x^`, `{~x~}`, `+` bullets and folded headings. `carve fix` rewrites the ones that have one replacement. The reference engine also offers `carve import --from djot`, which is outside the specification.
2. Rewrite emphasis: `_italic_` to `/italic/`, `~sub~` to `{,sub,}`, `^sup^` to `{^sup^}`. Djot strong `*...*` stays. Check every `{~x~}`, which is strikethrough in Carve.
3. Replace `---` breaks with `***`, and check line 1.
4. Rewrite definition lists as `::` and `:`, and indent every line that continues a term, a caption or a heading. Only a paragraph takes unindented lines; every other block but a fenced one continues only on lines indented past its marker.
5. Move attributes off bare words into spans, and remove blank lines between an attribute line and its block. Rename attribute keys that start with a digit (`{12=v}`); digit-leading classes and ids such as `{.123}` still work.
6. Check the admonition and directive names of item 8; no migration notice reports them.
7. Escape `#` and `@` before words that are not tags or mentions.
8. Put each link destination and footnote body on its definition line.
9. Replace `~~~` fences with backticks, `(1)` markers with `1.` or `1)`, and `+` bullets with `-`.
10. Give each div its own closer where one bare `:::` used to close several, and write `::: note` with a space.
11. Search for a tab after a block marker: `>` and a tab is prose in Carve. A tab is invisible in most editors, so search rather than read for it.
12. `-{.c} x` becomes a list item with attributes. Nothing is lost, but the block structure changes.
13. Heading anchors keep their case as in Djot, so hand-written `</#Anchor>` links work as written. For lowercase anchors, render with `headingIds: lower`.
14. Render both versions and compare the HTML.

**Specification (external):** [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-011 to C2-I-117), [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-013 to C2-B-234), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (C2-H-020 to C2-H-155), [Writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) (C2-W-039), [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md) (C2-A-098), [Upgrading from 0.1](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md).
