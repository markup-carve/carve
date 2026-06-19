# Divergence from Djot

Carve starts from [Djot](https://djot.net) - John MacFarlane's predictable,
backtracking-free reimagining of Markdown - and keeps almost all of it: the
linear parse model, generic containers, arbitrary attributes, footnotes, math,
definition lists, and smart typography all carry over unchanged.

So why diverge at all? Because a handful of Djot's choices optimize for
"Markdown-compatible" over "unambiguous to author and read." Carve is willing to
break source-compatibility in a few specific places to remove footguns and make
the common case correct by default. This page lists every deliberate break and
the reasoning behind it.

::: tip
For the parser-level rationale (why no backtracking, two-pass resolution, etc.)
see [Technical Rationale](/technical-rationale). For the feature matrix against
Markdown and MDX too, see [Carve vs Markdown, Djot & MDX](/comparison).
:::

## 1. Case-preserving heading ids with case-insensitive cross-references

**Djot:** heading ids preserve case and non-ASCII, with no Unicode
normalization (`# Getting Started` → `Getting-Started`). Cross-references are
not a core Djot feature.

**Carve:** the default id is the same shape - **case-preserving, no Unicode
normalization, non-ASCII kept verbatim** (`# Getting Started` →
`Getting-Started`, `# Über uns` → `Über-uns`). This is deliberately aligned
with Djot and is fully portable: the slug is a pure ASCII run-replacement over
the raw code points, with no case-folding or normalization tables, so every
implementation (php, js, rust) produces a byte-identical id.

Where Carve goes further is **resolution**: `</#id>` and `[Heading][]`
cross-references match their target **case-insensitively** and link to the
target's actual (case-preserved) id. So a lowercase reference still resolves
even though the emitted id keeps its original case:

```
# My API Reference        →  id="My-API-Reference"
See </#my-api-reference>  →  resolves to href="#My-API-Reference",
                              link text cloned from the heading
```

**Why.** Case-preserving ids need no Unicode case-folding in the slug, so the
algorithm stays zero-dependency and byte-identical across implementations (a
whole-string lowercase would even diverge on Greek final-sigma). Folding at
*resolution* time keeps the emitted id Djot-shaped while still letting authors
write references in whatever case they like.

**Opt-in transforms.** GitHub/SSG-style lowercase anchors and share-safe
ASCII fragments remain available as opt-in, orthogonal options
(`lowercaseHeadingIds`, `asciiHeadingIds` in carve-js; the
`LowercaseHeadingIdsExtension` / `AsciiHeadingIdsExtension` in carve-php; the
`lowercase_heading_ids` option in carve-rs):

| `lowercase` | `asciiFold` | `# Über uns` → |
|:-:|:-:|---|
| off | off | `Über-uns` (default) |
| on | off | `über-uns` (GitHub-style) |
| off | on | `Uber-uns` (ascii, case kept) |
| on | on | `uber-uns` (share-safe) |

ASCII-folding is not available in carve-rs (it would require a transliteration
table, which the zero-dependency Rust crate avoids); attach an explicit `{#id}`
there when an ASCII fragment is required.

Smart-typography substitutions are also reversed to their ASCII source before
the id is computed, so an id never depends on presentational typography:
`# Don't repeat yourself` slugs to `Don-t-repeat-yourself` (not a curly `’`),
and `# Step 1 -> done...` to `Step-1-done`. A literally-typed em dash is
likewise normalized; a genuine non-typography symbol such as `•` is kept.

## 1b. Heading-id punctuation model

**Djot:** removes a fixed ASCII blocklist of punctuation, so characters such as
`;` and `:` that are not in the list survive in the id (`# a; b: c` →
`a;-b:-c`).

**Carve:** keeps only ASCII alphanumerics plus every non-ASCII code point, and
replaces every other ASCII run with a single `-` (`# a; b: c` → `a-b-c`,
`# C++ & Rust` → `C-Rust`). An allowlist gives cleaner, more predictable
anchors than enumerating punctuation to drop.

## 2. A list marker must have content

**Djot / CommonMark:** a bare `-` (or `- ` with only trailing whitespace) starts
an empty list item.

**Carve:** a marker is a list item **only when followed by a space and non-empty
content**. A content-less `-`, `- `, or `-   ` is ordinary paragraph text.

**Why.** Two footguns disappear:

- A lone dash used as a prose separator or placeholder no longer silently becomes
  a one-item bullet list.
- A trailing space stops being load-bearing. Editors that strip trailing
  whitespace can't change the meaning of `- ` vs `-`.

```
-            →  paragraph text "-"        (not an empty list)
- item       →  a list item
```

## 3. `+` is the continuation marker, not a bullet

**Djot / CommonMark:** `+`, `-`, and `*` are all bullet markers.

**Carve:** bullets are `-` and `*` only. `+` is reserved as the **list
continuation marker** - a lone `+` on its own line attaches the next flush-left
block to the current list item, keeping the list tight instead of breaking it.

**Why.** Freeing `+` makes a lone `+` unambiguous and gives lists a clean way to
own a following block (a note, a quote, a code fence) without deep indentation:

```
- step one
+
  > a note that belongs to step one
- step two
```

A `+ text` line is just paragraph text, so nothing is lost for authors who never
used `+` as a bullet (most don't).

## 4. Visual-mnemonic emphasis

**Djot:** `_emphasis_` (italic), `*strong*` (bold).

**Carve:** the delimiter looks like its effect.

| Effect | Djot | Carve |
|--------|------|-------|
| Italic | `_text_` | `/text/` (slashes lean) |
| Bold | `*text*` | `*text*` (heavy) |
| Bold italic | `_*text*_` | `/*text*/` |
| Underline | (none; `{+text+}` is insert → `<ins>`) | `_text_` (line underneath) |
| Highlight | `{=text=}` | `=text=` |
| Subscript | `~text~` | `,text,` (comma pulls down) |

**Why.** Carve targets non-technical authors too. Syntax that resembles its
output is learnable in seconds and memorable after weeks away - the "ten-second
rule." It is a source-compatibility break with Djot, but a small, teachable one.

::: warning One delimiter flips meaning
`~text~` is **subscript** in Djot but **strikethrough** in Carve (the tilde looks
like a line through text). Carve writes subscript as `,text,`. This is the one
inline delimiter whose meaning differs between the two languages - worth knowing
when porting Djot source.
:::

## 5. No parenthesized ordered markers

**Djot:** `(1)`, `(a)`, `(i)` are valid ordered-list markers.

**Carve:** ordered lists use the `.` and `)` delimiters only (`1.` / `1)`).
`(1)` stays literal paragraph text.

**Why.** A leading `(1)` is far more often a prose parenthetical than a list. In
technical writing especially, biasing toward the literal reading avoids
surprise lists.

## 6. Plain-text comments

**Djot:** `{% comment %}`.

**Carve:** `%%` to end of line, `text %% trailing`, or a `%%%` fenced block.

**Why.** `%%` is faster to type, reads like a comment in many config formats, and
needs no closing delimiter for the common single-line case.

## 7. Block openers interrupt paragraphs (Markdown-like)

**Djot:** an open paragraph runs until a blank line. A line that begins with a
block marker - a `-`/`*` bullet, `>` quote, `#` heading, a `|` table row, or a
fence - stays part of the paragraph; the block needs a blank line before it.

**Carve:** a **visible** block interrupts an open paragraph with no blank line
before it - the Markdown / CommonMark rule. The exception is **list markers**:
neither a bullet (`-`/`*`, task) nor an ordered marker interrupts a paragraph -
a list still needs a blank line before it (matching Djot). Both list-marker
classes behave identically here; fence and `:::` closers and bare images are
also excluded (PART 9 §10).

```
intro
# Heading

Djot:   <p>intro\n# Heading</p>                  (one paragraph)
Carve:  <p>intro</p><h1>Heading</h1>             (paragraph + heading)
```

A list marker is the exception - it does NOT interrupt:

```
intro
- item

Carve:  <p>intro\n- item</p>                     (one paragraph; add a blank line to start a list)
```

**Why.** Djot's blank-line rule is hard-wrap-safe, but it surprises authors
coming from Markdown more often than it helps: a heading or quote written
directly under a line of prose silently stayed prose. Carve follows the
near-universal Markdown expectation for those blocks. Lists keep Djot's
blank-line rule on purpose: an ordered marker is common in prose ("see step
2.") and a hard-wrapped line that happens to begin with a bullet should not
silently become a list. Escape a marker (`\# H`, `\- item`) or add a blank line
to control it. This block-interruption rule is one of Carve's larger
block-level breaks from Djot, and part of why the project frames itself as
post-Markdown rather than post-Djot.

## What Carve adds on top (not breaks)

These aren't divergences - Djot has no equivalent - but they're why Carve exists
as more than restyled Djot:

- **Cross-references** - `</#id>` auto-fills its link text from the target heading.
- **Implicit heading references** - `[Heading][]` resolves to a heading with no
  separate `[label]: url` definition (the wiki-style `[[Heading]]` form is a
  separate opt-in extension, not core syntax).
- **Tables with rowspan / colspan / multi-line cells** and captions on images,
  quotes, and tables.
- **Native admonitions**, editorial/critic markup, `@mentions`, and `#tags`.
- **Inline footnotes** - `^[content]` carries a note in place (pandoc-style),
  numbered into the same endnotes as a reference `[^label]`. Canonical djot has
  only reference footnotes; `^[…]` is a carve addition (grammar §16).
- **Boolean attributes** - a bare word in `{…}` (`[Tab]{kbd}`, `{.note open}`)
  is a value-less attribute rendered `name=""`. Canonical djot rejects bare
  words (the whole block stays literal); carve accepts them, following djot-php
  (grammar §14).
- **Target-aware rendering** - one parsed document, multiple renderers (HTML,
  ANSI, Markdown, plain text) behind a single extension contract.

## Porting Djot to Carve

Most Djot source needs only mechanical changes:

1. `_italic_` → `/italic/`, and check every `*…*` (Djot strong stays `*…*`).
2. `~sub~` → `,sub,`; if you used `~` for strikethrough-by-convention, it's now
   native.
3. Replace `+` bullets with `-` or `*`.
4. `{% comment %}` → `%%`.
5. Heading anchors are case-preserving (Djot-shaped), so hand-written
   `</#Anchor>` links work as written - cross-references resolve
   case-insensitively. For lowercase anchors, enable the opt-in
   `lowercaseHeadingIds` transform.
6. A marker line (`- `, `> `, `# `, a table row, a fence) directly under a line
   of prose now starts a block. Where you relied on Djot keeping it in the
   paragraph, add a blank line or escape the marker.

The bundled `markdownToCarve` helper and Djot migration warnings flag most of
these automatically.
