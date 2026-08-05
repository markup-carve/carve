# Syntax Specification

> **Non-normative.** This page is explanatory prose. The normative
> specification is [`resources/grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf)
> (PART 9 for semantic constraints); `docs/examples.md` + `tests/corpus`
> are the conformance contract. On any disagreement, the grammar wins.

## Part 4: Carve Syntax Specification

### 4.1 Document Structure

#### Frontmatter (Optional)
```
---
title: My Document
author: Jane Doe
date: 2024-01-15
---
```

YAML frontmatter at document start. Well-established convention.

#### Headings
```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

Keep what works. The `#` convention is universal. Carve has **ATX
headings only** — setext (underline) headings are intentionally absent,
matching djot: a `---` underline collides with the thematic break and
the frontmatter delimiter, reintroducing the ambiguity djot removed.

#### Section wrapping

Every heading emits a `<section id="…">` wrapper around itself and the
content that follows it (paragraphs, lists, blockquotes, …) until the
next heading at the same or shallower level. The id derived from the
heading text (or the explicit `{#id}` attribute) lives on the
`<section>` element, not on the `<h*>`. This matches djot and lets
authors target sections directly with CSS, JavaScript, and `:target`
selectors:

```
# Intro

A paragraph.

## Background

Another paragraph.

# Next chapter

Body.
```

renders as

```html
<section id="intro">
  <h1>Intro</h1>
  <p>A paragraph.</p>
  <section id="background">
    <h2>Background</h2>
    <p>Another paragraph.</p>
  </section>
</section>
<section id="next-chapter">
  <h1>Next chapter</h1>
  <p>Body.</p>
</section>
```

Skipped levels nest by the heading number — a `# H1` followed by
`### H3` puts the H3 section two levels deep inside the H1 section,
without synthesizing an intermediate H2.

The fragment URL `https://example.com/page#intro` resolves the same
way whether the id is on `<h1>` or `<section>` — browsers locate the
first element matching the id. Existing `</#id>` cross-references and
`[Heading][]` implicit references keep working unchanged. See PART 9
§13 of the grammar for the full algorithm.

#### Automatic Identifiers

Every heading has an identifier. If the heading carries an explicit
`{#id}` attribute, that value is the identifier and is used **verbatim**
(no normalization). Otherwise the identifier is generated from the
heading text by the following algorithm, applied in order:

1. Take the heading's rendered plain text (inline markup removed; symbols
   `:name:` and footnote references excluded): `# *Setup* guide` yields
   `Setup guide`.
2. **NFC normalization.** The text is normalized to NFC first, so a precomposed
   `é` and a decomposed `e` + combining acute yield the SAME slug.
3. Replace each maximal run of **non-alphanumeric ASCII** characters
   (spaces, punctuation, `_`, and runs of `-`) with a single `-`.
4. Trim leading and trailing `-`.
5. **Preserve case and non-ASCII characters** — the slug keeps the heading's
   original letter case and any non-ASCII characters verbatim
   (`Über café` → `Über-café`, `日本語` stays `日本語`). This matches
   djot.js / djot-php. Cross-references resolve **case-insensitively**, so a
   lowercase `</#über-café>` still finds it.
6. If the result starts with a digit, prefix `s-` (a bare leading digit
   is a valid HTML id but an invalid CSS selector). If the result is
   empty, the identifier is `s`.
7. Deduplicate against the document's identifier namespace. Explicit
   `{#id}` values are reserved first (verbatim, case preserved), in
   document order; generated IDs are reserved as headings are processed.
   The first use is kept bare; each later collision takes the next
   numeric suffix (`-2`, `-3`), skipping suffix candidates that are
   already reserved. Extension-generated ids (tabs `tabset-N`, code
   groups `codegroup-N`, citation anchors `cite-{key}-{n}`, ...) join
   this same namespace and deduplicate with the same mechanism - see
   the [extensions contract, section 2.6](/extensions).

| Heading | Identifier |
|---|---|
| `# Getting Started` | `Getting-Started` |
| `# Café & Crème` | `Café-Crème` |
| `# Über uns` | `Über-uns` |
| `# Привет мир` | `Привет-мир` |
| `# RFC 2119: Key Words` | `RFC-2119-Key-Words` |
| `# 2024 Recap` | `s-2024-Recap` |
| `# user_id field` | `user-id-field` |
| `# 日本語の見出し` | `日本語の見出し` |
| `# !!!` | `s` |
| `# Setup` then `# Setup` | `Setup`, then `Setup-2` |

Identifiers **preserve case and non-ASCII characters** — matching djot.js /
djot-php (per [jgm/djot#393](https://github.com/jgm/djot/pull/393)). Cross-references
resolve **case-insensitively**, so a lowercase `</#id>` still finds a capitalized
heading and links to the target's actual (case-preserved) id. The rendered `id` is
consumed by anchor highlighting, `:target` rules, `document.querySelector('#' + id)`,
and URL fragments; a leading digit gets the `s-` prefix so it is always a valid bare
CSS selector. Processors MAY apply the opt-in `lowercaseHeadingIds` /
`asciiHeadingIds` transforms for lowercase or ASCII-folded fragment portability.

Non-ASCII ids are valid HTML5 and resolve in browsers (the fragment is
percent-encoded when shared, e.g. `…/page#%C3%BCber-uns`). For **ASCII-only**
anchors — no percent-encoding, friendlier to legacy autolinkers — implementations
offer an opt-in fold: carve-js's `asciiHeadingIds` parse option and carve-php's
`AsciiHeadingIdsExtension`, which transliterate the id (`Über uns` → `uber-uns`). It
is never the default; attach an explicit `{#id}` to pin any specific anchor.

### 4.2 Inline Formatting

```
This is /italic/ text.
This is *bold* text.
This is /*bold italic*/ text.
This is _underline_ text.
This is ~strikethrough~ text.
This is `code` text.
This is {^superscript^} text.
This is {,subscript,} text.
This is =highlighted= text.
```

#### Rationale

| Syntax   | Visual Mnemonic                              |
|----------|----------------------------------------------|
| `/text/` | Slashes lean like italic letters             |
| `*text*` | Asterisks are heavy/bold looking             |
| `_text_` | Underscore is literally underneath           |
| `~text~` | Tilde looks like a strikethrough             |
| `{^t^}`  | Caret points up (braced only)                |
| `{,t,}`  | Comma pulls down (braced only)               |
| `=t=`    | Equals like a highlighter                    |

The `/italic/` syntax comes from Org-mode, where it has worked well for decades.

#### Rule: No Nesting of Same Type
```
/This /does not/ nest/    --> Invalid
/This *does* nest/        --> Valid: italic with bold inside
```

A direct consequence: a **doubled** bare delimiter never opens nested
same-type emphasis, so it stays literal text — uniformly across all five
single-character delimiters.
```
**x**   --> **x**     (literal, not nested bold)
~~x~~   --> ~~x~~     (literal)
==x==   --> ==x==     (literal)
//x//   --> //x//     (literal)
__x__   --> __x__     (literal)
```

### 4.3 Links

**Standard form:**
```
See the [documentation](https://docs.example.com) for more.
```

**With title:** titles accept double **or** single quotes (a deliberate
enhancement over djot, which has no single-quote titles and would fold
`'…'` into the URL). The two forms are equivalent:
```
Visit [Google](https://google.com "Search engine") today.
Visit [Google](https://google.com 'Search engine') today.
```
Each quote style may contain the other (`"it's"`, `'say "hi"'`); a
literal quote in the rendered `title`/`alt` is escaped (`&apos;`,
`&quot;`). The same applies to image titles: `![alt](img.png 'caption')`.

**Reference style:**
```
Read the [introduction][intro] first.

[intro]: https://example.com/intro "Introduction"
```

**Bare URLs are not auto-linked** (matching djot and the reference
implementations). A plain `https://example.com` in text stays literal;
wrap it in angle brackets for an explicit autolink:
```
See <https://example.com> for details.
```

**Email:**
```
Contact [support](mailto:help@example.com) for help.
```

#### Why `[text](url)`?
- Universal convention from Markdown/Djot ecosystem
- Tooling support is ubiquitous
- Square brackets clearly delimit link text
- Parentheses naturally group the URL
- No learning curve for existing users

#### Cross-References (Auto-Text Links)

```
{#intro}
# Introduction

...later in the document...

See </#intro> for background.
→ Renders as: See "Introduction" (linked to #intro)
```

The `</#id>` syntax auto-fills link text from the target heading.
No need to repeat yourself or keep text in sync.

`</#id>` resolves against the document's full identifier namespace —
both explicit `{#id}` attributes and the automatic identifiers defined
under "Automatic Identifiers" above. So `# Getting Started` is reachable
as `</#getting-started>` without an explicit attribute. When a bare
identifier is ambiguous because of duplicate headings, it resolves to
the first occurrence; target a later one explicitly with its numeric
suffix (`</#setup-2>`).

#### Numbered Cross-References

A `#` placeholder in a caption turns it into a numbered figure, table,
listing, or equation. The label is the text before the `#`; the number is
injected in its place and runs per label, 1-based, in document order:

```
{#fig-sun}
![A sunset](sun.jpg)
^ Figure #: A sunset
→ <figcaption>Figure 1: A sunset</figcaption>

See </#fig-sun> for the colors.
→ See <a href="#fig-sun">Figure 1</a> for the colors.
```

A `</#id>` to a numbered caption auto-fills "label + number" ("Figure 1"),
markup preserved, not the caption prose. Notes:

- The label is your own text, so other languages number independently:
  `^ Abbildung #: …` produces "Abbildung 1" in its own counter.
- A `#word` stays a tag, `\#` is a literal number sign, and only the first
  bare `#` in the caption's top-level text is a placeholder. A `#` inside
  inline markup (`^ *Figure #*:`) is literal; write `^ *Figure* #:` instead.
- Numbering is independent of referencing: a `#`-caption is numbered whether
  or not anything links to it; an `{#id}` only makes it a target.

#### Citations (Tier-2 extension)

A bracket containing a `@key` is a citation; a bare `@key` stays a mention.
Define entries in-document, like footnote definitions:

```
Smith [@smith2020] and others [see @jones2019, p. 4] agree.

[@smith2020]: {author="Smith" year="2020"} Smith, J. (2020). *A Study*. Pub.
[@jones2019]: {author="Jones" year="2019"} Jones, A. (2019). *Notes*. Pub.
```

- **Forms:** `[@key]`, `[@key, p. 33]` (locator), `[see @key]` (prefix),
  `[@a; @b]` (multiple), `[-@key]` (suppress author in author-date mode).
- **Integral (author-in-text):** a single leading `+` after `[` marks the
  whole cluster integral: `[+@smith2020]`, `[+see @smith2020, p. 12]`.
  Wraps the rendered citation in
  `<span class="citation" data-cite-mode="integral">`. Mode is group-level;
  there is no per-item integral flag.
- **Typed locators:** the locator after `,` is parsed into a CSL `{label,
  value}` pair. Recognized labels include `p.` / `pp.` (page), `chap.`
  (chapter), `sec.` / `§` (section), `vol.` (volume), `no.` (issue), and
  more (full vocabulary in `../extensions.md` §4.2). A leading digit defaults
  to `page`. Trailing separators (`,`, `&`, `-`, `.`) are trimmed from the
  value; the remainder is the suffix. Examples:
  - `[@key, p. 12]` - label `page`, value `12`
  - `[@key, chap. 3, conclusion]` - label `chapter`, value `3`, suffix `conclusion`
  - `[@key, 42]` - label `page` (default), value `42`
- **`data-*` on anchors:** `data-cite-key`, `data-suppress-author`,
  `data-cite-prefix`, `data-locator-label`, `data-locator`, `data-suffix`
  (each only when present). This gives a host CSL processor the structure it
  needs without any Carve-side style resolution.
- **Output** is processor-configured: numbered (default) renders `[1]` with an
  ordered references list; author-date renders `(Smith 2020)`. The `{author=
  year=}` attributes feed author-date and are optional for numbered.
- The references list is appended at the end or injected into a `::: references`
  block. This is a Tier-2 extension (off by default; enable in your processor).
- **Disambiguation:** the bracket must be tail-less - `[@k](url)` is a link,
  `[@k][ref]` a reference link, `[@k]{.c}` a span. A `[@key]` whose key has no
  definition renders as the verbatim source text (no broken reference).
- **Out of scope (v1):** same-author-year disambiguation letters (`2020a`) are
  not generated, and a `;` inside a locator is unsupported. See
  `../extensions.md` for the normative contract.

#### Wiki-Style Links
For internal documents, use collapsed reference links:
```
See [Other Page][] for details.
```

The empty `[]` signals "use the link text as the target". A wiki processor
converts this to the appropriate URL (e.g., `other-page.html`).

For custom display text, use regular link syntax:
```
See [click here](other-page.html) for details.
```

**Why not `[[...]]`?** It conflicts with valid nested spans:
`[[inner]{.attr} outer]{.attr}` is valid djot. The `[[` is ambiguous.

#### Inline Spans

A bracketed inline run immediately followed by an attribute block
attaches those attributes to a `<span>`:

```
[some text]{.highlight #note key=val}
```

→

```html
<p><span class="highlight" id="note" key="val">some text</span></p>
```

The character right after `]` decides the construct (PART 9 §14):

| After `]` | Construct |
|---|---|
| `(` | inline link — `[text](url)` |
| `[` | reference link — `[text][ref]` / `[text][]` |
| `{` | **inline span** — `[text]{attrs}` |
| anything else | literal `[text]` (carve has no shortcut reference links) |

The content is full inline content, parsed recursively
(`[a /b/ c]{.x}` → `<span class="x">a <em>b</em> c</span>`). The
attribute block must directly abut `]`: `[text] {.x}` (with a space) is
literal text, not a span.

### 4.4 Images

Use djot's standard image syntax:
```
![Alt text](photo.jpg)
![A sunset over the ocean](photo.jpg)
```

**With caption:**
```
![A sunset over the ocean](photo.jpg)
^ Figure 1: Taken in Hawaii, 2024.
```

The `^` prefix on the following line creates a `<figure>` with `<figcaption>`.

**Linked images:**
```
[![Preview](thumb.jpg)](https://gallery.com)
```

**With attributes:**
```
![Photo](image.jpg){#fig-1 .hero width=800}
^ The main hero image for the article.
```

### 4.5 Lists

#### Unordered
```
- Item one
- Item two
  - Nested item
  - Another nested
    - Deep nesting
- Back to top
```

**Alternative bullet:**
```
* Also works
```

Carve bullets are `-` and `*` only. Unlike Markdown and Djot, `+` is **not**
a bullet in Carve — it is the list-continuation marker (PART 9 §17), so a
`+ x` line is paragraph text, never a list item.

Use whichever of `-`/`*` you prefer for a given list. The two markers are
**not interchangeable within one list**: changing the marker character
starts a new list (matching djot, see PART 9 §11). So

```
- a
- b
* c
* d
```

renders as two separate `<ul>`s, not one merged list. The same rule
applies to task-list markers: a `- [ ] x` line followed by a `* [ ] y`
line produces two single-item task lists, not one. This keeps the
parser stateless about "which marker came first" and matches the
reader's intuition that the visual change signals a structural break.

To consolidate visually-mixed bullets into a single list, normalize the
markers in the source.

#### Ordered
```
1. First item
2. Second item
   1. Sub-item
   2. Another
3. Third item
```

Ordered lists support **decimal, alphabetic (`a.`/`A.`), and roman
(`i.`/`I.`)** markers, with either the `.` or `)` delimiter. The first item
fixes the dialect, the `<ol type>`, and `start`; a marker outside that
dialect (or the other delimiter) starts a new list (PART 9 §11).

Unlike the other blocks, a **list marker does not interrupt a paragraph** (the
§10 paragraph rule): a list — bullet (`- `/`* `, task) or ordered (`1.`, `2.`,
`1985.`, `a.`, `i.`, any value) — needs a blank line before it. Both marker
classes behave identically here. An ordered marker is too common in prose
("step 2.", "version 1985.", "upgrade to 1. today") to interrupt, and a
hard-wrapped prose line that happens to begin with a bullet should not silently
become a list; the only way to allow either would be the CommonMark `1.`-only
heuristic Djot removed, so Carve keeps both on the blank-line rule. (`+` is the
continuation marker, not a bullet.) Inside an existing list item, indentation
alone still nests a sublist.

A bullet opens a list at **any indentation** at the top level, not only at
column 0: a `- `/`* ` line is always a bullet, so even an indented one opens a
list rather than becoming indented code (unlike CommonMark). The leading
indentation becomes the new list's base column. (Nesting *inside* an existing
item is gated by the content column - see below.)

```
  - item        →  a list (indented; no column-0 requirement)
```

A marker requires a single space after it (`- x`, not a tab), since the space is
a syntax delimiter, not indentation. Directly under a line of prose with no
blank line, though, a bullet does not start a list - it folds into the paragraph
like any list marker (the §10 rule above).

**Auto-numbering:**
```
1. First
1. Second (auto-increments)
1. Third
```

#### Indentation and nesting

Every list item has a **content column**: where its content begins, after the
marker: `- ` / `* ` → column 2, `1. ` → 3, `10. ` → 4. A **task** item's checkbox
is content, not marker, so its content column is the **bullet width (2)**, not
the full `- [x] ` width.

How a deeper marker inside an open list item is read - this is sub-list nesting,
a different axis from the §10 paragraph rule (no list marker interrupts a
paragraph; both need a blank line):

A **list marker** (bullet or ordered) is **gated by the content column** - and
bullet and ordered behave identically here. A marker **at or past** the parent's
content column opens a sub-list; one **below** it is lazy paragraph text that
folds into the item:

```
- a
  - b          →  nested            (column 2 = content column)

- a
 - b           →  "- b" is lazy text of item a   (column 1, below it)

1. a
   1. b        →  nested            (column 3 = content column)

1. a
  1. b         →  "1. b" is lazy text of item a  (column 2, below it)
```

Every *other* block opener (quote, heading, fence, table) does nest at any
indent past the parent's base column - those are unambiguous as blocks and never
fold as lazy text. (Rule B's "a bullet opens a list at any indentation" is about
the **top level** - no column-0 requirement, unlike CommonMark - not about
sub-list nesting depth.)

Carve does not require a blank line before a sub-list (unlike djot); indentation
alone nests it. Structure comes from indentation only; the literal marker numbers
are auto-renumbered and never create nesting.

#### Task Lists
```
- [ ] Unchecked task
- [x] Completed task
```

The marker holds exactly one character (PART 9 `task_state`). `x` / `X` render a
**checked** box; ` `, `-`, `_`, `>`, `?` all render an **unchecked** box. The
non-space markers are recognized (for author conventions like cancelled/
deferred) but produce the same output as `[ ]` — there is no distinct rendering,
and a character outside that set is not a task marker at all.

#### Tight vs loose

A list is **tight** unless a blank line separates its items, or an item
holds a second *paragraph*; then it is **loose**. A tight item renders its
text directly (`<li>text</li>`); a loose item wraps each paragraph in `<p>`
(PART 9 §17).

**Compact list blocks** (Carve deviation from djot): a blank line before an
item's sub-*block* — a sub-list, block quote, fenced code, fenced div,
heading or table — does **not** loosen the list. The item stays tight with the
block attached, so checklists-with-notes and steps-with-code stay compact. Only
a real second paragraph (or a blank between items) loosens. The blank line is
still required to start the block, so block structure and the uniformity
principle are unchanged — only the tight/loose rendering differs from djot.

**List continuation marker** (Carve addition): a lone `+` at the marker column
attaches the following flush-left block to the current item with no blank line,
keeping the list tight — handy for code/tables you would rather not indent.
Because `+` is not a Carve bullet (unlike Markdown/djot, which treat `+` as a
list marker), this is unambiguous: there is no `+` list it could be mistaken
for. See the [examples](/examples) and PART 9 §17.

#### Definition Lists

**Basic syntax:**
```
:: Term
:  Definition here.

:: Another term
:  Its definition.
```

- `::` (double colon) marks terms
- `:  ` (colon + 2 spaces) marks definitions

> **`::` vs `:::`.** A term is *exactly two* colons; *three* colons is a
> div/admonition (§4.12). The parser keys on the colon count with no
> lookahead — `:: x` is always a term, `::: x` always a fenced block —
> so the one-keystroke visual difference is never ambiguous to the
> parser. (Carve keeps the explicit `::` term marker rather than djot's
> bare-line-plus-`:` form precisely to avoid the setext-style lookahead
> Carve dropped in §4.1.)

**Multiple terms sharing a definition:**
```
:: color
:: colour
:  The visual property of objects.
```

Output:
```html
<dl>
<dt>color</dt>
<dt>colour</dt>
<dd>The visual property of objects.</dd>
</dl>
```

**Multiple definitions for the same term(s):**
```
:: color
:: colour
:  The visual property of objects.
:  A pigment or paint.
```

Output:
```html
<dl>
<dt>color</dt>
<dt>colour</dt>
<dd>The visual property of objects.</dd>
<dd>A pigment or paint.</dd>
</dl>
```

**Multi-line terms:**
```
:: This is a long term \
   that spans two lines
:  Definition here.
```

**Multi-line definitions:**
```
:: Term
:  This definition continues \
   on the next line.
:  Second definition.
```

Or with indentation:
```
:: Term
:  This definition has
   multiple lines through
   indentation continuation.
```

**Rules:**
- `::` starts a term (`<dt>`)
- `:  ` starts a definition (`<dd>`)
- Consecutive `::` lines are grouped as multiple terms
- Consecutive `:  ` lines create multiple definitions
- `\` at line end continues the current term/definition
- Indented continuation lines also work for definitions
- Blank line ends the definition list entry

**Rationale:**
- Unambiguous: `::` vs `:  ` are visually and syntactically distinct
- Multi-line support via `\` continuation or indentation
- Matches dictionary structure (synonyms + multiple meanings)
- No confusion with other `:` uses (like blockquote attribution)

### 4.6 Code

#### Inline
```
Use the `print()` function.
```

Code spans have no language hint. A trailing `{…}` is the generic
inline-attribute block (not a language tag); use a fenced block with a
language info string when you need highlighting.

#### Blocks

**Fenced:**
~~~
```python
def hello():
    print("Hello, World!")
```
~~~

Keep triple backtick - it's universal and well-established:
- Works in Markdown, Djot, GitHub, everywhere
- Syntax highlighting support is ubiquitous
- No reason to change what works

**With a label:** the fence info string is a single language token plus an
optional bracketed label (PART 9 §11). A multiword or `{…}` info string is
**not** a fence — it falls back to an inline code span — so attributes go in a
label, not braces:
~~~
```python [Example 1]
def hello():
    print("Hello!")
```
~~~

### 4.7 Blockquotes

```
> Simple one-line quote.

> Multi-line quote continues
> as long as the prefix is present.

>> Nested quotes
>> for replies.
```

**With attribution (using caption syntax):**
```
> To be or not to be, that is the question.
^ William Shakespeare, Hamlet
```

The `^` prefix creates a `<figure>` wrapper with `<figcaption>` for attribution.

**Multi-paragraph quote with attribution:**
```
> The only thing we have to fear is fear itself.
>
> Nameless, unreasoning, unjustified terror.
^ Franklin D. Roosevelt, 1933
```

### 4.8 Tables

#### Simple Tables
```
|= Name     |= Age |= City     |
| Alice     | 28   | New York  |
| Bob       | 34   | London    |
```

`|=` marks header cells (from Creole). No separator row is required - `|=` is the
canonical Carve header, and what migration tooling (`MarkdownToCarve`) emits.

#### Row Headers

Because `|=` marks a *cell*, it is honored in any row, not only in an all-header
row. A `|=` cell in a body row is a **row header**: it renders as `<th>` inside
`<tbody>` while the row itself stays a body row. This expresses a leading
first-column header per data row - something a separator row cannot describe.

```
|=         |= Diameter (km) |= Size vs Earth |
|= Mercury | 4,879.4         | 38%            |
|= Venus   | 12,104          | 95%            |
```

Header-section detection is unchanged: only the *leading* run of all-header rows
forms `<thead>`. A later row that merely contains a row header is not pulled into
the header section, and a table whose first cell of every row is a `|=` row
header has no `<thead>` at all.

#### GFM Header Separator

For compatibility with imported Markdown, a **GFM-style separator row is also
accepted**: when the **second** row of a table is a *delimiter row* - every cell
a run of dashes with optional alignment colons (`---`, `:--`, `--:`, `:-:`) - the
first row becomes the header and the colons set per-column alignment for the
whole column (`:--` left, `--:` right, `:-:` center). The separator row is
dropped.

```
| Name | Age |
|:-----|----:|
| Alice | 28  |
```

The separator is recognized **only as the second row**. A delimiter row anywhere
else - leading, or after the body - is an ordinary data row, so its dashes render
as literal content (smart-punctuation may turn `---` into an em dash). The `|=`
form and the separator form are equivalent; `|=` is preferred for new content.

#### With Caption
```
|= Month    |= Sales  |
| January   | $10,000 |
| February  | $12,000 |
^ Table 1: Monthly sales figures for Q1 2024
```

The `^` prefix adds a `<caption>` element to the table.

#### Alignment

Alignment is set by an explicit marker glued **directly** to the cell-opening
pipe — no whitespace between the pipe and the marker. Whitespace *inside* a
cell is cosmetic padding only and never affects alignment.

| Marker            | On          | Alignment                              |
|-------------------|-------------|----------------------------------------|
| `\|=<` `\|=>` `\|=~` | header cell | column default: left / right / center  |
| `\|<` `\|>` `\|~`    | body cell   | this cell only: left / right / center  |

Mnemonics: `<` left, `>` right, `~` center.

```
|= Name |=> Age |=~ City |
| Alice  |   28   | NYC     |
| Bob    |   34   | London  |
```

The `Age` column is right-aligned, `City` centered, `Name` left (default).
The ragged source whitespace above is irrelevant — only the markers matter.

**Disambiguation.** A `<`, `>`, or `~` *immediately* after `|` or `|=` (no
space) is an alignment marker. A lone `<` or `^` that is a cell's
whitespace-delimited *content* (`| < |`, `| ^ |`) is a colspan / rowspan
marker (see below) and is unchanged. Exactly one optional marker character is
recognized; a repeated character (`|=<<`) is content. An escaped pipe (`\|`)
never opens a cell and so never carries a marker.

**Rules.**

- A header marker sets the whole column's default (its `<th>` and every
  `<td>` in that column).
- A body-cell marker overrides the column default for that cell only. This
  per-cell override is a **Carve extension beyond djot-php**, which is
  column-only.
- Headerless tables have no column default; a body cell's own marker is the
  only alignment available.
- With multiple header rows, the column default is the marker on the last
  header row that specifies one for that column (later wins; omission does
  not reset).
- A spanning (colspan / rowspan) cell uses its own marker, otherwise the
  default of its origin (leftmost) column.
- `+` multi-line continuation lines carry no markers; alignment follows the
  originating cell. The caption (`^`) line is never aligned.

**Rendered HTML.** An aligned cell renders with an inline style; a cell with
no effective alignment renders with **no** `style` attribute.

```
|=> Price |
| 9        |
```

renders as:

```html
<table>
  <thead><tr><th style="text-align: right;">Price</th></tr></thead>
  <tbody>
    <tr><td style="text-align: right;">9</td></tr>
  </tbody>
</table>
```

`VALUE` is exactly one of `left`, `right`, `center`, serialized as
`text-align: VALUE;` (one space after the colon, trailing semicolon) — the
same output as djot-php.

#### Colspan (`<`)

The `<` marker means "this cell belongs to the cell on the left":
```
|= Name  |= Contact Info       |  <    |
| Alice  | alice@example.com   | x5234 |
```

"Contact Info" header spans 2 columns.

#### Rowspan (`^`)

The `^` marker means "this cell belongs to the cell above":
```
|= Category |= Item   |= Price |
| Fruits    | Apple   | $1.00  |
| ^         | Banana  | $0.50  |
| ^         | Orange  | $0.75  |
| Veggies   | Carrot  | $0.30  |
```

"Fruits" spans 3 rows. Both markers point toward their source cell.

#### Multi-line Cells (`+`)

The `+` line prefix continues the previous row's cell content:
```
|= Feature |= Description               |
| Complex  | A long description         |
+          | that continues             |
+          | across multiple lines.     |
| Simple   | Single line description.   |
```

The `+` keeps pipes aligned while clearly marking continuation.

#### Combined: Rowspan + Multi-line
```
|= Category       |= Item   |
| Fresh Fruits    | Apple   |
+ from local      |         |
+ farms           |         |
| ^               | Banana  |
| ^               | Orange  |
```

"Fresh Fruits from local farms" spans 3 rows with multi-line content.

#### Headerless Tables
```
| Cell | Cell |
| Cell | Cell |
```

No special syntax needed - absence of `|=` means no headers.

### 4.9 Horizontal Rules

```
---
***
___
```

Any of these, at least 3 characters, alone on a line.

### 4.10 Attributes

Use Djot-style `{...}` syntax - it's proven and keeps `@` free for mentions:

```
{#intro .important}
# Heading

[This phrase]{lang=en} has inline attributes.

![](image.jpg){width=500 .float-right}
```

A heading line carries no trailing `{…}` block (djot-strict): block
attributes always come from a preceding attribute line.

**Syntax:**
```
{#id}                   --> id attribute
{.class}                --> class attribute
{.one .two}             --> multiple classes
{key=value}             --> arbitrary attribute
{key="value with spaces"}  --> quoted values
{#id .class key=value}  --> combined
```

**Block-level attributes (before block):**
```
{#special .note}
This entire paragraph gets these attributes.
```

A leading `{...}` line does not render — it attaches to the next block
element. Several rules apply (PART 9 §15):

- **Reach:** the attributes float forward to the next block, even across
  a blank line. A run with no following block (e.g. at end of document)
  is dropped.
- **Accumulation:** consecutive attribute lines merge in source order —
  `id` last-wins, `key=value` last-wins per key, and **classes
  accumulate** (no de-duplication):

  ```
  {#id}
  {key=val}
  {.foo .bar}
  {key=val2}
  {.baz}
  {#id2}
  Okay
  ```
  →
  ```html
  <p id="id2" key="val2" class="foo bar baz">Okay</p>
  ```

- **Multi-line:** a single block may wrap — the `}` need not be on the
  opening line:
  ```
  {#id
   .foo}
  Text
  ```

> Cross-impl status: carve-php, carve-js, and carve-rs all implement
> block-attribute lines. Attributes attach on the line above the block (the
> uniform rule), so an explicit `#id` on a heading is written `{#id}` on the
> preceding line.

**Why keep Djot's syntax:**
- Already familiar to Djot users
- Attributes are a power feature anyway
- Frees `@` for mentions (universal expectation)
- No ambiguity with URLs or other syntax

### 4.11 Footnotes

A `[^label]` reference points at a `[^label]: …` definition. References
are numbered by document order; the definitions render in an endnotes
section with backlinks, using djot-compatible roles.

```
The theory[^einstein] revolutionized physics.

[^einstein]: Published in 1905 by Albert Einstein.
```

renders as

```html
<p>The theory<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> revolutionized physics.</p>
<section role="doc-endnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Published in 1905 by Albert Einstein.<a href="#fnref1" role="doc-backlink">↩</a></p>
    </li>
  </ol>
</section>
```

**Rules** (PART 9 §16):
- Definitions may appear anywhere (order-independent); the first
  definition for a label wins. A body is the def line plus any indented
  continuation lines (parsed as blocks).
- A reference with no matching definition stays literal `[^label]`; an
  unreferenced definition is dropped.
- A label referenced twice keeps one number and gets a backlink per
  reference.

> **Inline footnotes** (`^[content]` — a caret immediately before `[`) are
> implemented and corpus-pinned (Tier-1, grammar PART 9 §16; see the *Inline
> footnotes* examples). The note text is carried in place and numbered into the
> same endnote pool as reference footnotes. These two are the only note forms:
> **sidenotes** (`[>content]`) were proposed and *dismissed*, since a margin
> note is footnote content positioned by CSS. `[>` is unclaimed, and `[>foo]`
> is literal text. See [dismissed syntax](../dismissed-syntax).

### 4.12 Special Blocks (Admonitions)

```
::: note
This is informational content.
:::

::: warning
Be careful with this operation!
:::

::: tip "Pro Tip"
Here's a helpful suggestion.
:::

::: danger
This action cannot be undone.
:::
```

Carve renders a `:::` block by a **two-branch rule** on the type
identifier (PART 9 §12). (This is a rendering-strategy split *within* the
core `:::` mechanism — unrelated to the Tier-1/2/3 conformance tiers; both
branches are Tier-1 core.)

**Canonical admonition types** render as a semantic `<aside>`
with the `admonition` marker class. The canonical set is `note`, `tip`,
`warning`, `danger`, `info`, `success`, `example`, `quote`. The carve
VitePress theme and most third-party themes ship CSS targeting these
exact class names:

```html
<aside class="admonition note">
  <p>Heads up — this is important.</p>
</aside>
```

**Custom types — any other type** render as a generic block-level
`<div>` carrying the verbatim type as its class. This is the carve
fenced-div primitive that the block-extension mechanism (§4.20) builds
on (`::: tabs`, `::: mermaid`, `::: codepen` → `<div class="tabs">`
etc., post-processed by a registered extension; an unregistered type
still renders as its plain `<div class="{type}">`):

```
::: hint "Pro tip"
Project-specific call-out.
:::

::: tabs
...
:::
```

→

```html
<div class="hint">
  <p class="admonition-title">Pro tip</p>
  <p>Project-specific call-out.</p>
</div>
<div class="tabs">
  ...
</div>
```

A `<p class="admonition-title">…</p>` line is emitted **only** when an
explicit `quoted_title` is given (both tiers). The quote characters are
delimiters and are stripped — they never appear in the rendered title,
and the title is never folded into the class. Carve does **not**
synthesize a default title from the type name; `::: note` without `"…"`
produces no title element at all.

> **Design note — a conscious exception.** Whether `::: x` renders as an
> `<aside>` (canonical) or a `<div>` (custom) depends on whether `x` is in
> the canonical set — i.e. the *meaning* of the construct is
> context-dependent, in mild tension with Design Principle 1 ("one
> syntax, one meaning"). This is deliberate: both branches share the same
> `<div>`-shaped fenced-container primitive, and the canonical names are
> a curated styling convention layered on top, not a separate syntax.
> The *parse* is never ambiguous (every `::: word` is a fenced block);
> only the wrapper element/class differs by name.

#### Generic divs (no type word)

A `:::` opener with **no type word** — bare `:::` or an attributes-only
`::: {…}` — is djot's generic container: a plain `<div>` carrying only
the opener's attributes (no class added). This is the no-class case the
two tiers above don't cover.

```
:::
A plain box.
:::

::: {#s .sidebar}
A div with attributes.
:::
```

→

```html
<div>
  <p>A plain box.</p>
</div>
<div id="s" class="sidebar">
  <p>A div with attributes.</p>
</div>
```

So `::: word` is a typed block (canonical admonition / custom div); bare
`:::` or `::: {…}` is a generic `<div>` (PART 9 §12).

**Nesting by fence length.** A fence is a run of three or more colons. A
block is closed only by a bare fence of *equal-or-greater* length, so a
longer opener nests shorter blocks — a `:::` inside a `::::` block is
content, not a closer. (Equal-length fences do not nest; use a longer
outer fence.) This applies to admonitions and generic divs alike:

```
:::: note
Outer.

::: tip
Nested — the inner ::: does not close the :::: block.
:::
::::
```

renders the `tip` aside inside the `note` aside.

### 4.13 Comments

**Line comment:**
```
%% This is a line comment, not rendered.
%% Another line comment.
```

**Block comment:**
```
%%%
This is a block comment.

It can span multiple paragraphs.
Contains anything safely: // or /* or whatever.
%%%
```

**Nesting (use more `%` characters):**
```
%%%%
This block can contain %%% markers.
%%%%
```

**Rules:**
- `%%` at line start = line comment (rest of line ignored)
- `%%%` on its own line = block comment delimiter
- Use more `%` characters to nest (like code fences with more backticks)
- Comments are not rendered in output

### 4.14 Editorial Markup (CriticMarkup-inspired)

```
This is {+added+} text.
This is {-removed-} text.
This is {~old~>new~} replacement.
This is text{# with a comment #}.
```

Highlight is the single-char `=text=` (§4.2); a doubled `==text==` is literal by
the same-delimiter-adjacency rule. The brace form `{=text=}` is forced intraword
highlight (PART 9 §22), the same escape hatch every emphasis mark gets.

Useful for:
- Document review workflows
- Showing revisions
- Editorial collaboration

### 4.15 Raw/Passthrough Content

~~~
```=html
<div class="custom">
  <p>Raw HTML here</p>
</div>
```

```=latex
\begin{equation}
  E = mc^2
\end{equation}
```
~~~

A raw block opens with `=FORMAT` (a leading `=` immediately followed by the
format name). Inline raw passthrough is its inline parallel: a code span tagged
with `{=format}`. The verbatim content is emitted unescaped when the format
matches the output, and dropped otherwise. Any *other* trailing `{…}` on a code
span is a generic attribute block, not raw passthrough (PART 9 §20).

```
Use `<br>`{=html} to force a break, and `\foo`{=latex} is dropped in HTML.
```

### 4.16 Includes

Includes are a **processor-level** directive, not part of the core
parser. A conformant core MAY leave <code v-pre>{{ … }}</code> as literal text; a
processor that implements them MUST forbid path traversal outside the
project root, bound recursion depth, and treat includes as opt-in
(PART 9 §19).

```
{{ path/to/file.md }}
{{ path/to/file.md#section-id }}
{{ ./snippet.crv @indent:2 }}
```

### 4.17 Math

Math uses djot's form: inline `` $`…` `` and display `` $$`…` ``. The
backtick (verbatim) span removes any ambiguity with a literal `$`, so
currency like `$5` stays literal. There is no bare `$…$` input form.

```
Inline math: $`E = mc^2` renders in-line.

Display math on its own line:

$$`\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}`
```

→

```html
<p>Inline math: <span class="math inline">\(E = mc^2\)</span> renders in-line.</p>
<p>Display math on its own line:</p>
<p><span class="math display">\[\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}\]</span></p>
```

Escape a literal dollar with `\$`. See PART 9 §18.

### 4.18 Smart Typography

On by default in the conformant core; a processor MAY disable it
(PART 9 §19). Conversions:

| Input       | Output | Description      |
|-------------|--------|------------------|
| `--`        | –      | En dash          |
| `---`       | —      | Em dash          |
| `...`       | …      | Ellipsis         |
| `"text"`    | “text” | Smart double quotes |
| `'text'`    | ‘text’ | Smart single quotes |
| `(c)`       | ©      | Copyright        |
| `(r)`       | ®      | Registered       |
| `(tm)`      | ™      | Trademark        |
| `->`        | →      | Right arrow      |
| `<-`        | ←      | Left arrow       |
| `<->`       | ↔      | Bi-arrow         |
| `=>`        | ⇒      | Double arrow     |
| `!=`        | ≠      | Not equal        |
| `<=`        | ≤      | Less or equal    |
| `>=`        | ≥      | Greater or equal |
| `+-`        | ±      | Plus/minus       |

Escape with backslash: `\->` = literal `->`.

Single quotes are contextual (matching djot): a `'` is an apostrophe /
closing quote `’` when the preceding character is alphanumeric (`it's`,
`John's`) **or the next character is a digit** (`'70s` → `’70s`, and a
digit pair `'24'` → `’24’`); otherwise it opens `‘` in an open context
(`'word'` → `‘word’`, `rock 'n' roll` → `rock ‘n’ roll`).

Fractions (`1/2`, `3/4`, …) are **not** converted — they collide with
dates (`1/2/2024`) and paths, and djot has none (see
[dismissed syntax](../dismissed-syntax), PART 9 §8).

### 4.19 Abbreviations

Define abbreviations that are automatically expanded throughout the document:

```
The HTML specification defines how browsers render WWW content.

*[HTML]: HyperText Markup Language
*[WWW]: World Wide Web
```

**Output:**
```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> specification
defines how browsers render <abbr title="World Wide Web">WWW</abbr> content.</p>
```

**Rules:**
- Definitions can appear anywhere (typically at document end)
- Case-sensitive matching
- Word boundary matching only (`HTML` won't match inside `HTMLX`)
- Not applied inside code spans or code blocks
- `*[` is unambiguous (not valid in other contexts)

**Value:** Essential for technical documentation and accessibility.

### 4.20 Extensions (Custom Elements)

> Non-normative narrative. The normative taxonomy + extension contract are in
> [`../extensions`](../extensions).

Carve needs a generic extension mechanism for domain-specific elements that
don't belong in core (embeds, mentions, custom widgets, etc.).

#### Inline Extensions: `:name[content]{attrs}`

```
Check out :youtube[dQw4w9WgXcQ] for the tutorial.


Hey :mention[john]{service=github} check this out!

This is :abbr[HTML]{title="HyperText Markup Language"}.

The color is :color[red]{hex=#ff0000}.
```

**Structure:** `:type[content]{attributes}`
- Colon prefix signals "extension"
- Type name identifies the handler
- Content in brackets
- Optional attributes in braces

#### Block Extensions: `::: name`

Already exists for admonitions, extends naturally:

```
::: youtube dQw4w9WgXcQ {width=560 height=315 autoplay=false}
:::

::: tweet
https://twitter.com/example/status/123456789
:::

::: codepen {user=johndoe slug=abcdef height=400}
:::
```

#### Common Shorthand Patterns

Some extensions are common enough to deserve shorthand:

```
@john                     --> :mention[john]
#project-x                --> :tag[project-x]
:emoji[rocket]  or  :rocket:  --> 🚀
```

**Parser behavior:**
- `@word` at word boundary → mention (configurable)
- `#word` at word boundary → tag (configurable)
- `:word:` → emoji shortcode (optional)

These are **opt-in** per document or processor config:
```
---
extensions:
  mentions: github    # renderer may map @user to GitHub
  tags: true          # renderer may map #tag to application routes
  emoji: true         # :smile: converts
---
```

#### Extension Registry (Recommendations)

Standard extensions that processors SHOULD support:

| Extension      | Inline                     | Block              | Purpose          |
|----------------|----------------------------|--------------------|------------------|
| `youtube`      | `:youtube[ID]`             | `::: youtube ID`   | YouTube embed    |
| `vimeo`        | `:vimeo[ID]`               | `::: vimeo ID`     | Vimeo embed      |
| `video`        | -                          | `::: video`        | Generic video    |
| `audio`        | -                          | `::: audio`        | Audio player     |
| `mention`      | `:mention[user]{service}`  | -                  | User mention     |
| `tag`          | `:tag[name]`               | -                  | Hashtag/label    |
| `abbr`         | `:abbr[ABBR]{title}`       | -                  | Abbreviation     |
| `kbd`          | `:kbd[Ctrl+C]`             | -                  | Keyboard key     |
| `mark`         | `:mark[text]`              | -                  | Highlight        |
| `spoiler`      | `:spoiler[text]`           | `::: spoiler`      | Hidden content   |
| `embed`        | -                          | `::: embed URL`    | Generic oEmbed   |
| `iframe`       | -                          | `::: iframe`       | Iframe embed     |
| `diagram`      | -                          | `::: mermaid`      | Mermaid diagrams |
| `math`         | `` $`...` ``               | `` $$`...` ``      | LaTeX math       |

#### Unknown Extensions

When a processor encounters an unknown extension:

1. **Inline**: Render content as plain text, ignore type
   - `:unknown[content]` → `content`

2. **Block**: Render as generic div with class
   - `::: unknown` → `<div class="unknown">...</div>`

3. **Emit warning** (optional): "Unknown extension: unknown"

This ensures documents remain readable even without all extensions.

#### Custom Extension Definition (Advanced)

Processors may allow defining extensions:

```yaml
# carve.config.yaml
extensions:
  mywidget:
    type: block
    render: |
      <div class="widget" data-id="{content}">{children}</div>
```

Or via code:
```javascript
carve.registerExtension('youtube', {
  inline: (id, attrs) => `<iframe src="https://youtube.com/embed/${id}"></iframe>`,
  block: (id, attrs, content) => { /* render block version */ }
});
```

### 4.21 Profiles (Feature Restriction)

Different contexts need different feature sets:

| Context | Needs | Should Block |
|---------|-------|--------------|
| Full document | Everything | Nothing |
| Blog post | Most features | Raw HTML |
| Comments | Basic formatting | Images, HTML, headings, code blocks |
| Chat/notes | Minimal | Almost everything |

#### Profile Configuration

```php
// Built-in profiles
$converter = new CarveConverter(profile: Profile::full());      // Everything
$converter = new CarveConverter(profile: Profile::article());   // No raw HTML
$converter = new CarveConverter(profile: Profile::comment());   // Basic only
$converter = new CarveConverter(profile: Profile::minimal());   // Text + emphasis

// Custom profile
$profile = new Profile()
    ->allowInline(['emphasis', 'strong', 'code', 'link'])
    ->allowBlock(['paragraph', 'list'])
    ->denyInline(['image', 'raw_html'])
    ->denyBlock(['heading', 'code_block', 'table', 'raw_block'])
    ->setLinkPolicy(LinkPolicy::internalOnly())  // or ::allowlist(['example.com'])
    ->setMaxNesting(3);  // prevent deeply nested structures
```

#### Profile: Comment Mode Example

```php
Profile::comment()
    // Allowed inline
    ->allowInline([
        'text',
        'emphasis',      // /italic/
        'strong',        // *bold*
        'code',          // `code`
        'link',          // [text](url) - validated
        'soft_break',
        'hard_break',
    ])
    // Allowed block
    ->allowBlock([
        'paragraph',
        'list',          // bullet lists only
        'blockquote',    // quotes
    ])
    // Security
    ->setLinkPolicy(
        LinkPolicy::create()
            ->allowSchemes(['https', 'http', 'mailto'])
            ->denySchemes(['javascript', 'data', 'file'])
            ->requireNofollow(true)  // add rel="nofollow"
            ->allowInternalLinks(true)
            ->denyExternalLinks(false)  // or set allowlist
    )
    // Limits
    ->setMaxLength(10000)      // character limit
    ->setMaxNesting(2)         // no deep nesting
    ->setMaxListItems(20)      // prevent abuse
    ->stripDisallowed(true);   // remove vs error
```

#### Link Policies

```php
// Internal links only (same domain)
LinkPolicy::internalOnly()

// Allowlist specific domains
LinkPolicy::allowlist(['github.com', 'example.com'])

// Block specific domains
LinkPolicy::denylist(['malware.com', 'spam.site'])

// Add nofollow/ugc to external links
LinkPolicy::create()
    ->addRelAttribute('nofollow')
    ->addRelAttribute('ugc');
```

#### Handling Disallowed Elements

**Option A: Strip silently**
```php
$profile->onDisallowed(Profile::STRIP);
// "# Heading\n\nText" → "Text" (heading removed)
```

**Option B: Convert to text**
```php
$profile->onDisallowed(Profile::TO_TEXT);
// "# Heading" → "# Heading" (literal, not rendered as h1)
```

**Option C: Error/warning**
```php
$profile->onDisallowed(Profile::ERROR);
// Throws exception or adds to warnings array
```

#### Implementation Approach

Two strategies:

**1. Parse-time filtering (efficient)**
- Parser skips disallowed constructs
- Never creates AST nodes for them
- More efficient, but less flexible

**2. Post-parse filtering (flexible)**
- Parse everything into AST
- Walk AST and remove/transform disallowed nodes
- Can provide detailed error messages
- Can show "preview" with violations highlighted

**Recommendation:** Post-parse filtering for flexibility:

```php
class ProfileFilter
{
    public function filter(Document $doc, Profile $profile): Document
    {
        $walker = new NodeWalker($doc);

        foreach ($walker as $node) {
            if (!$profile->isAllowed($node)) {
                match ($profile->getDisallowedAction()) {
                    Profile::STRIP => $node->remove(),
                    Profile::TO_TEXT => $this->convertToText($node),
                    Profile::ERROR => throw new DisallowedElementException($node),
                };
            }
        }

        return $doc;
    }
}
```

#### Usage Examples

```php
// Backend: full power
$html = CarveConverter::convert($userDoc);

// Frontend comments: restricted
$converter = new CarveConverter(profile: Profile::comment());
$html = $converter->convert($userComment);

// API with custom rules
$profile = Profile::create()
    ->allowInline(['emphasis', 'strong', 'link'])
    ->allowBlock(['paragraph'])
    ->setLinkPolicy(LinkPolicy::allowlist(['docs.example.com']));

$converter = new CarveConverter(profile: $profile);
```

#### Combining with SafeMode

`Profile` (feature restriction) and `SafeMode` (XSS prevention) are complementary:

```php
$converter = new CarveConverter(
    profile: Profile::comment(),    // Feature restriction
    safeMode: SafeMode::strict(),   // Security sanitization
);
```

- **Profile**: "What features are allowed?"
- **SafeMode**: "How do we prevent XSS in allowed features?"

### 4.22 File Extension

Carve documents use the `.crv` extension:

```
document.crv
README.crv
notes.crv
```

### 4.23 Frontmatter (Metadata Only)

```
---
title: My Document
author: Jane Doe
date: 2024-01-15
tags: [tutorial, beginner]
---
```

Frontmatter provides document metadata for processors. That's it.

**Explicitly NOT in scope:**
- Variable substitution (<code v-pre>{{name}}</code>)
- Conditionals (`{% if %}`)
- Loops (`{% for %}`)

These are **templating** concerns, not markup. Use a templating engine
(Liquid, Jinja, Mustache) as a separate processing step if needed.
Keeping them separate means:
- Simpler parser
- Cleaner specification
- Users choose their own templating tool
- No reinventing the wheel

### 4.24 HTML Serialization

The exact bytes a conformant renderer emits — attribute order, escaping,
indentation, void elements, tight/loose `<p>` wrapping, table styles —
are pinned normatively in **`resources/grammar.ebnf` PART 10** (HTML
Serialization Conventions). They exist so a second implementation (for
example carve-php) can match the corpus without copying the reference
renderer byte-for-byte. The corpus wins on any disagreement.

---
