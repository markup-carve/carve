# Syntax Specification

> **Non-normative.** This page is explanatory prose. The normative
> specification is [`resources/grammar.ebnf`](../../resources/grammar.ebnf)
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

Keep what works. The `#` convention is universal.

**Alternative (Setext-style for h1/h2 only):**
```
Heading 1
=========

Heading 2
---------
```

#### Automatic Identifiers

Every heading has an identifier. If the heading carries an explicit
`{#id}` attribute, that value is the identifier and is used **verbatim**
(no normalization). Otherwise the identifier is generated from the
heading text by the following algorithm, applied in order:

1. Take the heading's rendered plain text (inline markup removed:
   `# *Setup* guide` yields `Setup guide`).
2. NFC-normalize, then **transliterate non-ASCII to ASCII** via a baked
   Unicode→ASCII map covering Latin / IPA / combining marks / Cyrillic /
   Latin-Extended-Additional / punctuation / super- and sub-script /
   currency / letterlike ranges. Code points not in the map — Greek
   (context-sensitive in ICU, deliberately excluded), CJK, Arabic — pass
   through unchanged.
3. Lowercase it (Unicode-aware; only matters for any letters that
   survived step 2 unmapped).
4. Trim leading and trailing whitespace.
5. Delete every CSS-unsafe punctuation character: `'` `"` `;` `:`
   (so `What's New` becomes `whats-new`, not `what-s-new`).
6. Replace each maximal run of characters that are not Unicode letters,
   Unicode digits, `_`, or `-` — spaces included — with a single `-`.
7. Unicode letters, Unicode digits, `_` and `-` are preserved. `_` and
   `-` are valid CSS identifier characters and meaningful in technical
   headings, so they are kept rather than folded into `-`.
8. Collapse runs of `-`, then trim leading and trailing `-`.
9. If the result starts with a digit, prefix `section-`
   (`2024 Recap` becomes `section-2024-recap`). A CSS identifier may not
   start with a digit, and generated IDs must be usable as CSS selectors
   and `querySelector` arguments, not only as URL fragments.
10. If the result is empty, the identifier is `section`.
11. Deduplicate against the document's identifier namespace. Explicit
    `{#id}` values are reserved first, in document order; generated IDs
    are reserved as headings are processed. The first use of an
    identifier is kept bare; each later collision takes the next numeric
    suffix, 1-based (the second is `-2`, the third `-3`). Explicit and
    generated identifiers share one namespace.

| Heading | Identifier |
|---|---|
| `# Getting Started` | `getting-started` |
| `# Café & Crème` | `cafe-creme` |
| `# Über uns` | `uber-uns` |
| `# Привет мир` | `privet-mir` |
| `# RFC 2119: Key Words` | `rfc-2119-key-words` |
| `# 2024 Recap` | `section-2024-recap` |
| `# What's New?` | `whats-new` |
| `# user_id field` | `user_id-field` |
| `# 日本語の見出し` | `日本語の見出し` (unmapped script — pass-through) |
| `# Καλημέρα` | `καλημέρα` (Greek pass-through, deliberately) |
| `# !!!` | `section` |
| `# Setup` then `# Setup` | `setup`, then `setup-2` |
| `# Introduction {#intro}` then `# Intro` | `intro`, then `intro-2` |

Identifiers are lowercased, ASCII-safe, and CSS-selector-safe by design.
The rendered `id` is consumed by code Carve does not control: anchor
highlighting, `:target` rules, `document.querySelector('#' + id)`, and
crucially **URL-fragment autolinkers in chat / email / aggregators that
routinely truncate or mis-encode non-ASCII fragments**. The ASCII step
makes the slug survive being shared as `https://…/page#some-id`. A
predictable lowercase ASCII slug is also what an author must be able to
guess when writing a `</#id>` cross-reference.

For scripts the baked map does not cover (CJK, Arabic, Greek), the slug
keeps the Unicode letters. If a share-safe slug is required for those
headings, attach an explicit `{#share-safe-id}`.

### 4.2 Inline Formatting

```
This is /italic/ text.
This is *bold* text.
This is /*bold italic*/ text.
This is _underline_ text.
This is ~strikethrough~ text.
This is `code` text.
This is ^superscript^ text.
This is ,,subscript,, text.
This is ==highlighted== text.
```

#### Rationale

| Syntax   | Visual Mnemonic                              |
|----------|----------------------------------------------|
| `/text/` | Slashes lean like italic letters             |
| `*text*` | Asterisks are heavy/bold looking             |
| `_text_` | Underscore is literally underneath           |
| `~text~` | Tilde looks like a strikethrough             |
| `^text^` | Caret points up                              |
| `,,t,,`  | Commas pull down                             |
| `==t==`  | Double equals like highlighter on both sides |

The `/italic/` syntax comes from Org-mode, where it has worked well for decades.

#### Rule: No Nesting of Same Type
```
/This /does not/ nest/    --> Invalid
/This *does* nest/        --> Valid: italic with bold inside
```

### 4.3 Links

**Standard form:**
```
See the [documentation](https://docs.example.com) for more.
```

**With title:**
```
Visit [Google](https://google.com "Search engine") today.
```

**Reference style:**
```
Read the [introduction][intro] first.

[intro]: https://example.com/intro "Introduction"
```

**Bare URLs (auto-linked):**
```
Check out https://example.com for details.
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
# Introduction {#intro}

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

#### Wiki-Style Links
For internal documents, use collapsed reference links:
```
See [Other Page][] for details.
```

The empty `[]` signals "use the link text as the target". A wiki processor
converts this to the appropriate URL (e.g., `other-page.html`).

For custom display text, use regular link syntax:
```
See [click here](Other Page) for details.
```

**Why not `[[...]]`?** It conflicts with valid nested spans:
`[[inner]{.attr} outer]{.attr}` is valid djot. The `[[` is ambiguous.

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

**Alternative bullets:**
```
* Also works
+ And this
```

Use whichever marker you prefer for a given list. The three markers are
**not interchangeable within one list**: changing the marker character
starts a new list (matching djot, see PART 9 §11). So

```
- a
- b
+ c
+ d
```

renders as two separate `<ul>`s, not one merged list. The same rule
applies to task-list markers: a `- [ ] x` line followed by a `+ [ ] y`
line produces two single-item task lists, not one. This keeps the
parser stateless about "which marker came first" and matches the
reader's intuition that the visual change signals a structural break.

To consolidate visually-mixed bullets into a single list, normalize the
markers in the source.

#### Ordered
```
1. First item
2. Second item
   a. Sub-item
   b. Another
      i. Roman numeral sub-sub
3. Third item
```

**Auto-numbering:**
```
1. First
1. Second (auto-increments)
1. Third
```

#### Task Lists
```
- [ ] Unchecked task
- [x] Completed task
- [-] Cancelled task
- [>] Deferred task
- [?] Question/uncertain
```

Inspired by Org-mode TODO states but simplified.

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

With language hint:
```
The `SELECT * FROM users`{sql} query returns all users.
```

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

**With attributes:**
~~~
```python {linenos=true highlight="3,5-7"}
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

`|=` marks header cells (from Creole). No separator row needed.

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
|--------|---------------------|-------|
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
# Heading {#intro .important}

This paragraph {lang=en} has inline attributes.

![](image.jpg){width=500 .float-right}
```

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

**Why keep Djot's syntax:**
- Already familiar to Djot users
- Attributes are a power feature anyway
- Frees `@` for mentions (universal expectation)
- No ambiguity with URLs or other syntax

### 4.11 Footnotes

**Inline definition:**
```
The theory[^Published in 1905 and changed physics forever.] was groundbreaking.
```

**Reference style:**
```
The theory[^einstein] revolutionized physics.

[^einstein]: Published in 1905 by Albert Einstein.
```

**Sidenotes (alternative display):**
```
The theory[>Published in 1905.] was groundbreaking.
```

`[>note]` suggests content pushed to the side/margin.

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

**Canonical types:** `note`, `tip`, `warning`, `danger`, `info`,
`success`, `example`, `quote`, `details`. The carve VitePress theme
and most third-party themes ship CSS targeting these exact class
names. Render as:

```html
<aside class="admonition note">
  <p>Heads up — this is important.</p>
</aside>
```

**Custom types** render to the same shape — no prefix, no
special-casing:

```
::: hint "Pro tip"
Project-specific call-out.
:::

::: glossary
A custom type without an explicit title renders without one.
:::
```

→

```html
<aside class="admonition hint">
  <p class="admonition-title">Pro tip</p>
  <p>Project-specific call-out.</p>
</aside>
<aside class="admonition glossary">
  <p>A custom type without an explicit title renders without one.</p>
</aside>
```

A `<p class="admonition-title">…</p>` line is emitted **only** when an
explicit `quoted_title` is given. Carve does **not** synthesize a
default title from the type name — `::: note` without `"…"` produces
no title element at all (canonical and custom types alike).

The §4.20 extension registry MAY in a future revision intercept a
matching type identifier before the admonition fallback fires (e.g.
`::: youtube` rendering via a registered handler). Today every `:::`
block goes through the admonition rule above; see PART 9 §12.

> **No bare `:::` blocks.** Every `:::` block must declare a type
> identifier. Carve does not accept djot's "generic fenced div with no
> class" form (`:::\n…\n:::`); use `::: note` or `::: info` for the
> unstyled case.

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
This is {=highlighted=} text.
This is text{# with a comment #}.
```

Useful for:
- Document review workflows
- Showing revisions
- Editorial collaboration

### 4.15 Raw/Passthrough Content

~~~
```raw html
<div class="custom">
  <p>Raw HTML here</p>
</div>
```

```raw latex
\begin{equation}
  E = mc^2
\end{equation}
```
~~~

### 4.16 Includes

```
{{ path/to/file.md }}
{{ path/to/file.md#section-id }}
{{ ./snippet.crv @indent:2 }}
```

### 4.17 Math

```
Inline math: $E = mc^2$ renders in-line.

Block math:
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

**Alternative for dollar sign conflicts:**
```
Inline: \(E = mc^2\)

Block:
\[
\int_0^\infty e^{-x^2} dx
\]
```

### 4.18 Smart Typography

Auto-converted by default (can be disabled):

| Input       | Output | Description      |
|-------------|--------|------------------|
| `--`        | –      | En dash          |
| `---`       | —      | Em dash          |
| `...`       | …      | Ellipsis         |
| `"text"`    | "text" | Smart quotes     |
| `'text'`    | 'text' | Smart apostrophe |
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
| `1/2`       | ½      | Fractions        |
| `1/4`       | ¼      | Fractions        |
| `3/4`       | ¾      | Fractions        |

Escape with backslash: `\->` = literal `->`

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
  mentions: github    # @user links to GitHub
  tags: true          # #tag creates tag links
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
| `math`         | `$...$`                    | `$$...$$`          | LaTeX math       |

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
$converter = new DjotConverter(profile: Profile::full());      // Everything
$converter = new DjotConverter(profile: Profile::article());   // No raw HTML
$converter = new DjotConverter(profile: Profile::comment());   // Basic only
$converter = new DjotConverter(profile: Profile::minimal());   // Text + emphasis

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
$html = DjotConverter::convert($userDoc);

// Frontend comments: restricted
$converter = new DjotConverter(profile: Profile::comment());
$html = $converter->convert($userComment);

// API with custom rules
$profile = Profile::create()
    ->allowInline(['emphasis', 'strong', 'link'])
    ->allowBlock(['paragraph'])
    ->setLinkPolicy(LinkPolicy::allowlist(['docs.example.com']));

$converter = new DjotConverter(profile: $profile);
```

#### Combining with SafeMode

`Profile` (feature restriction) and `SafeMode` (XSS prevention) are complementary:

```php
$converter = new DjotConverter(
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
- Variable substitution (`{{name}}`)
- Conditionals (`{% if %}`)
- Loops (`{% for %}`)

These are **templating** concerns, not markup. Use a templating engine
(Liquid, Jinja, Mustache) as a separate processing step if needed.
Keeping them separate means:
- Simpler parser
- Cleaner specification
- Users choose their own templating tool
- No reinventing the wheel

---

