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

## 1. Lowercase heading ids (GitHub-style)

**Djot:** heading ids preserve case and non-ASCII (`# Getting Started` →
`Getting-Started`).

**Carve:** ids are lowercased, Unicode-preserving (`# Getting Started` →
`getting-started`, `# Über uns` → `über-uns`). ASCII-folding is available
opt-in for share-safe URL fragments.

**Why.** We first mirrored Djot's case-preserving rule. It broke cross-references:
`# Getting Started` produced the id `Getting-Started`, so a `</#getting-started>`
reference no longer resolved - the reference and the id differed only in case.
Lowercasing makes ids and the common `</#id>` / `[[Heading]]` references
case-insensitive with **no special lookup logic** - the universal
GitHub / Hugo / Jekyll / MDN convention authors already expect for anchors.

```
# My API Reference        →  id="my-api-reference"
See </#my-api-reference>  →  resolves, link text cloned from the heading
```

The cost: Carve's id default deliberately differs from Djot's. For a language
whose headline feature is cross-references, predictable case-insensitive anchors
are worth it.

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
| Highlight | `{=text=}` | `==text==` |
| Subscript | `~text~` | `,,text,,` (commas pull down) |

**Why.** Carve targets non-technical authors too. Syntax that resembles its
output is learnable in seconds and memorable after weeks away - the "five-second
rule." It is a source-compatibility break with Djot, but a small, teachable one.

::: warning One delimiter flips meaning
`~text~` is **subscript** in Djot but **strikethrough** in Carve (the tilde looks
like a line through text). Carve writes subscript as `,,text,,`. This is the one
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
before it - the Markdown / CommonMark rule. Ordered lists are the main exception:
they still need a blank line (an ordered marker in prose is too common to treat
as a list); fence and `:::` closers and bare images are also excluded (PART 9 §10).

```
intro
- item

Djot:   <p>intro\n- item</p>                    (one paragraph)
Carve:  <p>intro</p><ul><li>item</li></ul>      (paragraph + list)
```

**Why.** Djot's blank-line rule is hard-wrap-safe, but it surprises authors
coming from Markdown more often than it helps: a list or heading written
directly under a line of prose silently stayed prose. Carve follows the
near-universal Markdown expectation and accepts the cost - a hard-wrapped prose
line that happens to begin with a marker becomes a block. Escape the marker
(`\- item`) or add a blank line to keep it prose. This is Carve's largest
block-level break from Djot, and the reason the project frames itself as
post-Markdown rather than post-Djot.

## What Carve adds on top (not breaks)

These aren't divergences - Djot has no equivalent - but they're why Carve exists
as more than restyled Djot:

- **Cross-references** - `</#id>` auto-fills its link text from the target heading.
- **Implicit heading references** - `[[Heading]]` resolves to a heading with no
  separate `[label]: url` definition.
- **Tables with rowspan / colspan / multi-line cells** and captions on images,
  quotes, and tables.
- **Native admonitions**, editorial/critic markup, `@mentions`, and `#tags`.
- **Target-aware rendering** - one parsed document, multiple renderers (HTML,
  ANSI, Markdown, plain text) behind a single extension contract.

## Porting Djot to Carve

Most Djot source needs only mechanical changes:

1. `_italic_` → `/italic/`, and check every `*…*` (Djot strong stays `*…*`).
2. `~sub~` → `,,sub,,`; if you used `~` for strikethrough-by-convention, it's now
   native.
3. Replace `+` bullets with `-` or `*`.
4. `{% comment %}` → `%%`.
5. Heading anchors are now lowercase - update any hand-written `</#Anchor>` links.
6. A marker line (`- `, `> `, `# `, a table row, a fence) directly under a line
   of prose now starts a block. Where you relied on Djot keeping it in the
   paragraph, add a blank line or escape the marker.

The bundled `markdownToCarve` helper and Djot migration warnings flag most of
these automatically.
