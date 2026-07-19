# File inclusion (NORMATIVE)

This document is normative. It specifies Carve's file-inclusion (transclusion)
directive, <code v-pre>{{ … }}</code>. The directive is **processor-level**: it is not part of
the core parser, and a conformant core leaves it literal. The authority for the
syntax is `resources/grammar.ebnf` PART 6; the authority for the semantics is
PART 9 §19, which this page states in full with worked examples.

## What inclusion is (and is not)

File inclusion pulls the source of another Carve (or text) file into the current
document at the point of the directive, as if its content had been authored
inline. It is the one feature that introduces *source you did not write inline*,
so its contract is deliberately strict about resolution, collisions, limits, and
security.

- **Processor-level.** The core parser performs **no file I/O**. Expansion is a
  host-driven pass layered on top of the parser.
- **The core leaves it literal.** Because the directive is unreachable from the
  `block` and `inline` grammars, a core that does not implement includes never
  recognizes <code v-pre>{{ … }}</code>. It parses those bytes under ordinary inline rules, so a
  bare-path directive with no active inline markers renders **verbatim**. This
  is corpus-pinned (see [Core behavior](#core-behavior-no-resolver-no-expansion)).
- **Text-only.** <code v-pre>{{ … }}</code> includes Carve or text sources. A binary or image
  target is **not** an include (images use `![]()`); a binary or unreadable
  target yields a Warning and a literal directive.

## Directive syntax

```
{{ path }}
{{ path #section }}
{{ path @key:value }}
{{ path #section @key:value }}
{{ path @shift:N }}
```

- **`path`** is either **bare** (it stops at the first space, `#`, `@`, or
  `}`) or **double-quoted** (`"my chapter.crv"`) when it contains spaces. The
  path is resolved **relative to the including file**; resolution is the host's
  job (see [The host resolver](#the-host-resolver)).
- **`#section`** includes only the subtree rooted at the heading whose id equals
  `section`: that heading through the content up to (but not including) the next
  heading of the **same or higher** level. The id is matched the same way a
  `</#id>` cross-reference matches (explicit `{#id}` or the auto-generated slug).
- **`@key:value`** is an extensible option slot. Options are space-separated.
  - **`@lines:N-M`** includes the 1-based, inclusive physical-line range `N`
    through `M` of the resolved source.
  - **`@shift:N`** shifts the level of every included heading by the signed
    integer `N` (see [Heading-level shift](#heading-level-shift-shift)).
  - Every other `@key` is **reserved**. A processor that does not recognize an
    option SHOULD treat the directive as unresolvable (Warning, literal).

### Selection vs transform options

Directive options fall into two disjoint kinds:

- **Selection options** choose *which* content is pulled in: `#section`
  (semantic - a heading's subtree) and a line-range `@lines:N-M` (physical - raw
  source lines).
- **Transform options** reshape content that has already been selected:
  `@shift:N` (heading-level shift). Future transform options join this kind.

The two **selection** mechanisms are **mutually exclusive**: a single directive
MUST select content by `#section` **or** by a line-range, never both. Combining
them is ambiguous, and neither use case - reusing a chapter by heading, or
quoting a code snippet by line - needs both. A directive that specifies both
`#section` and `@lines` is an **error**: the processor emits a Warning and leaves
the directive **literal**, exactly like the other error cases (see
[Errors](#errors)).

**Transform** options are orthogonal to selection. `@shift` is **not** a
selection option: it MAY accompany `#section`, a line-range, or neither, and it
composes with whichever selection (if any) the directive uses.

### Heading-level shift (`@shift`)

`@shift:N` takes a **signed** integer and increases the level of **every**
heading in the included content by `N`:

```carve
{{ chapter.dj @shift:2 }}
```

- With `@shift:2`, an included `h1` becomes an `h3`, an `h2` becomes an `h4`, and
  so on. A **negative** `N` raises headings toward the top level: `@shift:-1`
  turns an `h2` into an `h1`.
- The option is **optional**; an omitted `@shift` is equivalent to `@shift:0`
  (no shift, the default behavior).
- **Clamp to `[1, 6]`.** The shifted level is clamped to the valid heading range.
  If a shift would push a heading below level 1 or above level 6, the processor
  clamps it to the nearest bound (1 or 6) and emits a Warning. The heading is
  **kept**, never dropped.
- **Ids and slugs are unchanged.** `@shift` changes only a heading's *level*,
  never its id or slug (ids are name-based, not level-based), so `</#id>`
  cross-references into a shifted heading still resolve.
- **Auto-numbering follows the new level.** If section auto-numbering (the
  [HeadingNumbers](/extensions#_9-headingnumbers-tier-3) feature) is enabled,
  shifted headings renumber at their **new** level as a consequence of the shift.
- **`@shift:auto` is reserved.** A context-relative auto-shift (inferring the
  shift from the include site's heading level) is **reserved** for a future
  version and is **not** specified here: Carve headings are a flat stream, so
  inferring the include-site level is deferred.

## Block vs inline includes

Inclusion follows Carve's block/inline split (PART 9 §10):

- A directive that is **alone on its own line** (in block context) is a **block
  include**. Its resolved content merges as **blocks** at the directive site.
- A directive that appears **within inline content** is an **inline include**.
  Its resolved content merges as **inline**.

```carve
Intro paragraph.

{{ chapter-2.crv }}

See {{ snippet.crv }} for the short form.
```

The first directive is a block include (its file becomes sibling blocks between
the paragraphs); the second is an inline include (its content is spliced into
the surrounding sentence).

## The directive is inert in code (verbatim protection)

An include directive is recognized **only** where inline and block constructs
are recognized. Inside a code span, a fenced or raw code block, or any other
verbatim context, <code v-pre>{{ … }}</code> is ordinary literal text and is
**never** resolved. This is a consequence of Carve's general invariant that
**code is verbatim** - no construct transforms inside a code span or code block,
and the include directive is no exception. It means a literal directive can
always be written and displayed by placing it in code:

~~~carve
```
{{ path }}
```
~~~

renders the fenced line verbatim; it is not an include. The same holds for an
inline code span: <code v-pre>`{{ path }}`</code> is literal. Because recognition
is grammar-level, a processor MUST NOT resolve includes by blind textual
substitution over the raw source (which would clobber a directive a user wrote
inside a code block); it recognizes the directive only in directive position.

## The host resolver

The **resolution model** keeps the parser pure and pushes all filesystem
knowledge into the host. This mirrors the bibliography loader precedent, where
"the extension does not perform file I/O ... the host resolves the path and
passes the parsed data in as a processor option" (see
[Extensions §6.1](/extensions#_6-1-data-source)). Carve implementations are not
all filesystem-capable (browser, WASM, sandboxed hosts), so mandating `fopen`
would break cross-implementation parity.

The host supplies a **resolver** with this contract:

> Given `(path, section?, options?, includingFileContext)`, return the resolved
> Carve source text, **or** an error.

- **No resolver configured** means the directive is left **literal**: the
  processor emits the verbatim <code v-pre>{{ … }}</code> text. This is the default state, and it
  is what keeps browser / WASM builds inert by construction.
- The resolver is **opt-in** and MUST be off for untrusted input unless the host
  has satisfied the [Security](#security) requirements.

## Merge mechanism and source mapping

The specification is normative on the **outcome** and permissive on the
**mechanism**:

- The observable result MUST be **as if** the resolved content had appeared
  inline at the directive site.
- An implementation MAY splice the resolved **source** before parsing, or parse
  the child and **merge events / AST** into the parent. Either is conformant as
  long as the outcome rule holds.
- Source positions **SHOULD** be remapped so that source-mapped hosts (editors,
  highlighters, error reporters) can attribute an included span to the child
  file rather than to the directive. Carve's AST already carries the machinery:
  a `Position` distinguishes original-document coordinates from snippet-local
  offsets for re-parsed nested content (`carve-js` `src/ast.ts`, the `Position`
  interface). Included content is the same shape of problem as a re-parsed
  container snippet.

## Cross-file collisions

Merging documents can collide **footnote labels**, **reference-definition
labels**, and **explicit heading ids**. The processor MUST resolve these
**deterministically** by **rename-on-collision**:

1. **Ordering.** Read the fully expanded document top to bottom: parent before
   child, and an earlier include before a later include. The **first**
   occurrence in that order keeps its label / id.
2. **Rename scheme.** Each later duplicate is renamed by appending the least
   `-N` (integer `N >= 2`) that is not already taken in the same namespace:
   first `-2`, then `-3`, and so on. Footnotes, reference definitions, and
   heading ids are separate namespaces.
3. **Warning per rename.** Every rename emits a Warning so the collision is
   visible and debuggable.

The include-time rename pass is scoped to **explicit heading ids, footnote
labels, and reference-definition labels only**. Auto-generated (slug) heading-id
collisions are **not** part of this pass: they continue to be de-duplicated by
the existing heading-id tracker (PART 9 §13, which already appends `-2`, `-3`, …
to duplicate slugs once the files are merged into one document). Two `##
Introduction` headings from different included files are therefore suffixed by
§13, not here.

**Ordering.** The include-time explicit-id / footnote / reference rename runs
**before** the §13 slug dedup. Fixing this order keeps ids deterministic: the
explicit-id namespace is settled first, and §13 then dedups the auto-slug ids
against the already-final set. See PART 9 §13.

## Limits

Inclusion is bounded to keep expansion linear and terminating:

- **Cycles.** The processor MUST detect an inclusion **cycle** (a file that
  transitively includes itself). The offending directive is left **literal**
  (not expanded) and a Warning is emitted. Detection is over the include graph,
  not a single edge, so `A -> B -> A` is caught.
- **Depth.** Implementations MUST enforce a **finite** include-depth limit; the
  RECOMMENDED default is **at least 16**, and the host MAY configure it. This is a
  small, human-scale nesting bound, well under the structural `MAX_NESTING = 200`
  of [Security](/security#resource-limits-denial-of-service). Cycle detection
  remains the **primary** guard; the depth limit is the **secondary** DoS bound.
  A directive deeper than the limit is left literal with a Warning.
- **Size.** Total expanded output is charged against the same per-render byte
  budget as other amplifying features, `max(1 MB, 8 × input length)`. Once a
  render would exceed it, further expansion degrades to the literal directive
  with a Warning. This stops an **include bomb** (a small file included `N`
  times, transitively) the same way the abbreviation / index budget stops
  output amplification.

## Errors

Every failure path is **visible**, never a silent drop. Each of these emits a
**Warning** and leaves the directive **literal**:

| Condition | Result |
|---|---|
| Unreadable / missing path | Warning + literal directive |
| Binary / non-text content | Warning + literal directive |
| Both `#section` and a line-range (`@lines`) present | Warning + literal directive |
| Inclusion cycle | Warning + literal directive |
| Depth exceeds the include-depth limit | Warning + literal directive |
| Expanded size exceeds the byte budget | Warning + literal directive |
| No resolver configured | Literal directive (no Warning required) |

A `@shift:N` whose result would leave the valid heading range is the one
degrade that does **not** go literal: the heading is **kept** with its level
clamped to `[1, 6]` and a Warning is emitted (see
[Heading-level shift](#heading-level-shift-shift)).

## Security

Inclusion is a §25 / security-model concern. The full treatment is on the
[Security](/security#file-inclusion) page; the requirements in brief:

- **The parser stays pure.** No inclusion makes the core touch the filesystem or
  the network. Absent a resolver, the directive is inert text.
- **The host resolver MUST enforce path containment.** Resolve `..` and symlinks
  **first**, then reject any target that lands outside a configured root. A path
  is contained only after canonicalization.
- **Symlink / escape policy.** A symlink whose real target escapes the root is
  rejected the same as a literal traversal.
- **Absolute paths and schemes MAY be denied.** Remote fetches (`file:`,
  `http:`, `data:`, …) are off unless explicitly allowlisted.
- **Same-sanitization parsing.** Included content is parsed under the **same**
  raw-HTML, URL-scheme, attribute, and Trojan-Source sanitization as any Carve
  content. Inclusion is a source-merge, **not** a privilege boundary: there is
  **no privilege escalation via include**.
- **Non-filesystem hosts.** With no resolver, every directive is literal.

Threats addressed: path traversal, symlink escape, include cycles, zip-bomb /
size amplification, and DoS by depth.

## Core behavior: no resolver, no expansion

A conformant **core** never expands includes; it renders the directive as
literal text. This is the one behavior pinned in the conformance corpus:

```carve
See {{ chapter-2.crv }} here.
```

renders as

```html
<p>See {{ chapter-2.crv }} here.</p>
```

verified byte-identical across the executable-spec oracle and every engine.
