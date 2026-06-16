# Profiles Contract

A **profile** restricts which node types a document may contain, so a host can
render untrusted input safely (comments, chat, articles). It is applied as an
**AST transform after parsing and before rendering**: a disallowed node is
replaced or removed per the profile's action, so the restriction holds across
**every** renderer (HTML, Markdown, plain text, ANSI).

Profiles are **configuration, not syntax** — they are not pinned by the
conformance corpus. This page is therefore the **normative contract**: every
implementation MUST expose the same node-type vocabulary, the same resolution
rule, the same four presets, and the same link-policy semantics, so a given
profile produces the same allow/deny decision in `carve-js`, `carve-php`, and
`carve-rs`. `carve-php` is the reference; cross-impl parity is verified by golden
fixtures, not the corpus.

## Node-type vocabulary (normative)

A profile's allow/deny lists use these exact type strings. They are stable
identifiers, independent of a renderer's output tag.

**Block:** `paragraph`, `heading`, `code_block`, `block_quote`, `list`,
`list_item`, `table`, `table_row`, `table_cell`, `thematic_break`, `div`,
`raw_block`, `footnote`, `definition_list`, `definition_term`,
`definition_description`, `section`, `line_block`, `comment`, `figure`,
`caption`.

**Inline:** `text`, `emphasis`, `strong`, `underline`, `strike`,
`inline_extension`, `mention`, `code`, `link`, `image`, `soft_break`,
`hard_break`, `raw_inline`, `escaped_text`, `footnote_ref`, `inline_footnote`,
`span`, `superscript`, `subscript`, `highlight`, `insert`, `delete`, `symbol`,
`math`, `abbreviation`.

The `document` root is always allowed and cannot be denied.

## The profile model

A profile carries:

| Field | Meaning | Default |
|-------|---------|---------|
| `allowedInline` / `allowedBlock` | allowlist of types; `null` = "all" | `null` |
| `deniedInline` / `deniedBlock` | denylist of types | empty |
| `linkPolicy` | a `LinkPolicy` (see below), or none | none |
| `maxNesting` | max block-container depth (0 = unlimited) | `0` |
| `maxLength` | max output length in bytes (0 = unlimited) | `0` |
| `disallowedAction` | what to do with a disallowed node | `to_text` |

### Resolution (normative)

For a node of type `T`, in its axis (inline or block):

1. If `T` is in the **deny list** for that axis → **denied** (deny wins).
2. Else if the **allow list** for that axis is set (non-`null`) → allowed **iff**
   `T` is in it.
3. Else → **allowed**.

A type that is neither a known block nor inline type is **denied**. `document`
is always allowed. Deny always beats allow; an allowlist is a closed set.

### Actions on a disallowed node

`disallowedAction` is one of:

- **`to_text`** (default) — replace the node with its rendered text content
  (children flattened to text). Non-destructive: the words survive, the markup
  does not. A disallowed `link` keeps its label text; a disallowed `image`
  keeps its alt text.
- **`strip`** — remove the node and its subtree entirely.
- **`error`** — abort and report a profile violation (type + reason).

`maxNesting` / `maxLength` are enforced during the same pass; exceeding either
follows `disallowedAction` (`error` reports a violation; `to_text`/`strip`
truncate/flatten).

## Presets (normative)

Four presets MUST exist with exactly these definitions.

### `full`
All features allowed. No allow/deny lists, no link policy, no limits. For
**trusted** content only.

### `article`
Blogs/articles: all formatting, **no raw HTML**.
- `deniedBlock`: `raw_block`
- `deniedInline`: `raw_inline`
- everything else allowed.

### `comment`
User comments: basic formatting, `nofollow`/`ugc` links.
- `allowedInline`: `text`, `emphasis`, `strong`, `underline`, `strike`,
  `inline_extension`, `mention`, `code`, `link`, `soft_break`, `hard_break`,
  `delete`, `insert`, `highlight`, `superscript`, `subscript`.
- `allowedBlock`: `paragraph`, `list`, `list_item`, `block_quote`, `code_block`.
- `linkPolicy`: unrestricted + `rel` attributes `nofollow ugc`.
- `maxNesting`: `4`.
- (So: no headings, images, tables, footnotes, divs/sections, def-lists,
  thematic breaks, line blocks, spans, symbols, math, abbreviations, raw HTML.)

### `minimal`
Chat/micro-posts: non-destructive inline formatting, paragraphs and lists.
- `allowedInline`: `text`, `emphasis`, `strong`, `underline`, `strike`,
  `inline_extension`, `mention`, `code`, `delete`, `insert`, `superscript`,
  `subscript`, `soft_break`, `hard_break`. (**No** `link`, **no** `highlight`,
  **no** `image`.)
- `allowedBlock`: `paragraph`, `list`, `list_item`.
- `maxNesting`: `2`.

## Link policy

A `LinkPolicy` filters every clickable sink (link `href`, image `src`) and may
add `rel` attributes. It is independent of the URL-scheme sanitization the HTML
renderer always applies (see [Security](/security)); a profile's link policy is
an additional, renderer-independent gate evaluated during the filter pass.

| Field | Meaning | Default |
|-------|---------|---------|
| `allowedSchemes` | scheme allowlist (lowercased); `null` = all | `null` |
| `deniedSchemes` | scheme denylist | empty |
| `allowedDomains` / `deniedDomains` | host allow/deny | `null` / empty |
| `allowExternal` / `allowInternal` | permit off-site / same-host links | `true` / `true` |
| `relAttributes` | `rel` tokens added to every link | empty |

A URL is allowed iff its scheme passes (allowlist if set, then denylist) **and**
its host passes (internal vs external per `allowInternal`/`allowExternal`, then
the domain allow/deny lists), evaluated against an optional base host. A denied
URL follows the profile's `disallowedAction` (the `link`/`image` node is
to_text'd, stripped, or raises a violation).

Presets: **`unrestricted`** (all schemes/hosts), **`internalOnly`**
(`allowExternal = false`), **`allowlist(domains)`** (only the listed hosts).

## Implementation notes

- Profiles are a **core** capability in every implementation (a safety feature,
  not an opt-in plugin).
- The filter runs **once, on the parsed AST**, before any renderer — so the
  guarantee is renderer-agnostic.
- `to_text` is the safe default: it never silently deletes content, only its
  markup.
- Parity is byte-checked against `carve-php` via golden fixtures (the presets
  and the resolution rule above are the shared source of truth).

## Parity battery

`tests/profile-fixtures.json` is the **shared golden battery**: a set of
`{carve, profile, html}` fixtures rendered by carve-php (the reference) covering
the four presets, the disallowed-node actions, and the link policy. carve-js and
carve-rs assert their own profile output against this file (comparing
trailing-newline-insensitively, since renderers differ on a trailing `\n`), so a
profile divergence in any implementation is caught. Regenerate with
`tests/gen-profile-fixtures.php` from a carve-php checkout.
