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
`carve-rs`. `carve-php` is the reference for profile golden fixtures; cross-impl
parity is verified by those fixtures, not the corpus.

## Node-type vocabulary (normative)

A profile's allow/deny lists use these exact type strings. They are stable
identifiers, independent of a renderer's output tag.

Type identifiers are **`snake_case`**, always. A hyphenated or camelCased
identifier is a defect in the implementation that emits it, not an alternate
spelling.

**Block:** `paragraph`, `heading`, `code_block`, `block_quote`, `list`,
`list_item`, `table`, `table_row`, `table_cell`, `thematic_break`, `div`,
`admonition`, `raw_block`, `footnote`, `frontmatter`, `definition_list`,
`definition_term`, `definition_description`, `section`, `line_block`,
`comment`, `figure`, `caption`.

**Inline:** `text`, `emphasis`, `strong`, `underline`, `strike`,
`inline_extension`, `mention`, `code`, `link`, `autolink`, `image`,
`soft_break`, `hard_break`, `raw_inline`, `escaped_text`, `footnote_ref`,
`inline_footnote`, `heading_ref`, `citation_group`, `caption_number`,
`span`, `superscript`, `subscript`, `highlight`, `insert`, `delete`,
`substitution`, `critic_comment`, `symbol`, `math`, `abbreviation`.

An **`autolink`** is its own type, not a `link`. The two differ in what the
author wrote and in what a formatter must be able to reproduce: an autolink
carries no label, shows its own target, and drops an added `mailto:` scheme
when displayed. Folding it into `link` loses the authored form, so a
round-trip could not restore it.

A **`critic_comment`** is its own type rather than a `comment`, for the same
reason `autolink` is not a `link`: the two are written differently and a
formatter has to be able to reproduce which one the author used. It is also
what makes editorial comments deniable on their own - a profile that accepts
the other editorial marks but not side commentary has no way to say so if the
type is shared with structural comments.

An **`admonition`** is likewise its own type rather than a `div` carrying a
class. A profile that wants to deny callouts while allowing generic
containers has no way to express that if the kind lives in a class string.

### The AST has more node types than a profile can deny

This page answers "what can a profile deny", which is a smaller set than "what
appears in the tree". A serialized AST (PART 12) therefore carries type names
this vocabulary does not list - `tag`, `abbreviation_def`, `smart_punctuation`,
`literal_inline`, `raw_text` and the `document` root - because denying them would
mean nothing: they are either folded into another trust class, render nothing at
all, or serve a formatter rather than the document. A consumer reading an AST should expect them; a profile author should not
look for them here.

A **`tag`** node - the AST form of `#tag` - is deliberately **NOT** its own
vocabulary entry: it is classified as **`mention`**, and all three
implementations agree on that. `@user` and `#tag` are parsed by the same
boundary rules (PART 9 §7) and render through the same inert-span mechanism, so
they are one trust class rather than two. Denying `mention` denies both:

```js
const p = Profile.minimal()
p.denyInline(['mention'])
applyProfile(parse('hi @user'), p).violations  // [{ nodeType: 'mention', ... }]
applyProfile(parse('hi #tag'), p).violations   // [{ nodeType: 'mention', ... }]
```

The consequence is worth stating plainly, because it is a real limit: a host
CANNOT allow mentions while denying tags. `tag` is not addressable, so naming it
in `allowedInline` or `deniedInline` does nothing at all - silently, since an
unrecognized identifier is not an error. A host that needs one without the other
has to deny `mention` and reintroduce the wanted construct through an extension.

A **`smart_punctuation`** node - the AST form of a typographic substitution,
carrying the resolved kind and the author's source run (PART 9 §8) - is
classified as **`text`**. It is ordinary visible prose with no capability of its
own: an em dash is not a different trust level from the words around it. Denying
it would express nothing a `text` denial does not already express, so it is not
separately nameable here.

Types serving a formatter rather than a document are **not** in this
vocabulary and cannot be named in a profile. An implementation may carry a
node preserving literal source for round-trip formatting (carve-php calls it
`raw_text`); denying it would break `fmt` while expressing nothing about the
document's content.

The inline literal of PART 9 §27 (`` !`…` ``) is classified as **`code`** for
profiles — it is a code span with the `<code>` wrapper dropped, sharing code's
verbatim capture, escaping, and trailing-attribute surface, so it is allowed
exactly where `code` is and denied where `code` is. (Types are trust classes,
not one per AST node: `inline_footnote` and `footnote_ref` likewise fold into
`footnote`.) It is not classified as `text`: with attributes it renders a
`<span>` carrying class/id/style just as an attributed code span does, which is
`code`'s trust level, not plain text's.

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

These three steps are exhaustive. A node whose type is **not** in the
vocabulary above resolves through them unchanged: it cannot appear in a deny
list, so step 1 never matches; step 2 excludes it whenever an allow list is
set; and step 3 allows it otherwise. An implementation MUST NOT add a fourth
step denying unrecognized types.

The consequence is the point: a profile that denies nothing and sets no allow
list is **lossless**, for every document, including documents using node types
the implementation's vocabulary predates. A vocabulary gap makes a type
un-nameable, never invisible. An allow list still excludes unknown types, so a
restrictive profile loses no safety.

`document` is always allowed and cannot be denied. Deny always beats allow;
an allowlist is a closed set.

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

### Some types are deniable in the tree but invisible in rendered output

`comment` and `frontmatter` render nothing. Denying either removes the node
from the tree and reports a violation, but the rendered HTML is **byte-identical
either way**:

```
carveToHtml("%% hidden\n\nBody.\n")                   -> "<p>Body.</p>"
carveToHtml("%% hidden\n\nBody.\n", denyBlock:comment) -> "<p>Body.</p>"
```

This is not a no-op, and the distinction matters because the two look the same
from the render path. Denying them changes:

- **the serialized AST** - the node is gone from `children`, which is what a
  consumer of `parse()` sees. A pipeline that hands untrusted documents to a
  PDF renderer, an LSP, or a converter gets the tree, not the HTML.
- **the violation report** - under `error`, a host learns the document carried
  metadata or side commentary it did not ask for, and can refuse it.

Frontmatter is the case where this is load-bearing rather than tidy. Carve's own
renderers never emit it, but hosts routinely do - a title into a template, an
author into a byline - which is why [Security](/security) PART 9 §25 requires a
safe loader for it and escaping for any value later rendered. A profile that
denies `frontmatter` keeps untrusted metadata out of that path entirely.

**`escaped_text` reaches the same place by a different route.** It is not that
it renders nothing - it renders the character. It is that `to_text` degrades it
to that same character, so a denial and an allowance produce identical output:

```
carveToHtml("a \\* b")                          -> "<p>a * b</p>"
carveToHtml("a \\* b", denyInline:escaped_text) -> "<p>a * b</p>"   + a violation
```

What a host learns by denying it is that the document used escapes at all -
authoring intent the rendered character does not carry. The escape is syntax;
the character is content.

A caller who denies any of these and diffs the HTML will see no change. Check
the tree or the violations instead.

### A profile is not a substitute for disabling raw-HTML passthrough

A profile restricts node **types**; it does **not** by itself turn off raw-HTML
passthrough. The built-in `article`, `comment`, and `minimal` presets DO deny
`raw_block` / `raw_inline`, so they are safe for untrusted input. But a CUSTOM
profile that leaves `raw_block` / `raw_inline` allowed will still emit live HTML
if the renderer's raw passthrough is on (the default, see
[Security](/security) PART 9 §25). For untrusted input a host MUST therefore
either select/author a profile that DENIES `raw_block` and `raw_inline`, OR
disable raw-HTML passthrough on the renderer (`allowRawHtml: false`), ideally
both. The two controls are independent: the profile gates AST node types; the
renderer flag gates whether raw content is serialized verbatim or escaped.

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
- `maxLength`: `100000` (100 KB) input-size cap; override via `setMaxLength(0)` to disable.
- (So: no headings, images, tables, footnotes, divs/sections, def-lists,
  thematic breaks, line blocks, spans, symbols, math, abbreviations, raw HTML.)

  Inline literals (`` !`…` ``) ARE permitted here: they classify as `code`,
  which this preset allows, and an attributed literal carries the same
  class/id/style an attributed code span already does under this preset. A host
  that wants to forbid them must deny `code`.

### `minimal`
Chat/micro-posts: non-destructive inline formatting, paragraphs and lists.
- `allowedInline`: `text`, `emphasis`, `strong`, `underline`, `strike`,
  `inline_extension`, `mention`, `code`, `delete`, `insert`, `superscript`,
  `subscript`, `soft_break`, `hard_break`. (**No** `link`, **no** `highlight`,
  **no** `image`.)
- `allowedBlock`: `paragraph`, `list`, `list_item`.
- `maxNesting`: `2`.
- `maxLength`: `10000` (10 KB) input-size cap; override via `setMaxLength(0)` to disable.

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
