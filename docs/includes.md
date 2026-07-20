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

`@shift` takes **either** a signed integer **or** the literal value `auto`,
never both. `@shift:N` increases the level of **every** heading in the included
content by `N`:

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
#### Context-relative shift (`@shift:auto`)

With `@shift:auto` the processor **computes** the shift instead of taking it
from the author. Two quantities define it:

- **Context level `C`** is the level of the nearest **preceding** heading, in
  document order, that sits in the directive's own block container or in an
  **enclosing** (ancestor) container. A heading inside a **sibling** container
  that has already closed does **not** set the context. If no such heading
  exists, `C = 0`.
- **Top level `T`** is the **minimum** heading level present in the resolved
  content, **after** any `#section` or line-range selection has been applied.
  Using the minimum rather than the first heading's level preserves the included
  document's internal relative structure.

The computed shift is:

```
N = (C + 1) - T
```

`N` is then applied exactly as a literal shift under the rules above: the
resulting level is clamped to `[1, 6]` with a Warning on clamp, the heading is
kept and never dropped, ids and slugs are unchanged so cross-references still
resolve, and section auto-numbering renumbers at the new level.

Worked example - the including document has a `## Chapters` heading before the
directive, so `C = 2`:

```carve
## Chapters

{{ chapter-one.crv @shift:auto }}
```

`chapter-one.crv` starts at `# Chapter One`, so `T = 1` and
`N = (2 + 1) - 1 = 2`. The child's `h1` renders as an `h3`, one level below the
`## Chapters` heading that contains it.

- **Content with no headings.** If the resolved content contains no headings,
  `auto` is a **no-op** (`N = 0`) and emits **no** Warning.
- **Nested includes.** `auto` resolves against the document **as assembled at
  that point**, so a shift already applied by an ancestor include is in effect
  when a nested `auto` is computed. Expansion proceeds **outside-in**, which
  makes the result deterministic.
- **Inline includes.** Inline content cannot contain headings, so `auto` on an
  inline include is a no-op.

`auto` makes a chapter file **portable**: the same file can be included at any
depth without editing its heading levels. And because the author writes
`@shift:auto` explicitly at the include site, the position-dependence is
**opt-in per directive** rather than ambient behavior.

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

An inline include is constrained to **inline-only content**: the resolved
source MUST parse (as a [self-contained
fragment](#merge-mechanism-and-source-mapping)) to a single paragraph, or to
nothing. Its inlines are then spliced into the surrounding inline sequence. If
the resolved content carries any other block structure - multiple paragraphs, a
heading, a list, a fence - the directive is an **error**: the processor emits a
Warning and leaves the directive **literal**, like the other error cases (see
[Errors](#errors)). Block-shaped content belongs in a block include.

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

### Recognition operates on a run, not on one node

Grammar-level recognition does **not** mean "one parsed text node matches the
directive grammar". A directive's own syntax overlaps constructs the core
already parses: `#section` is tag syntax, `@key:value` is mention syntax, and a
double-quoted path is rewritten by smart quotes. By the time the include pass
runs, <code v-pre>{{ chapter.crv #intro @shift:1 }}</code> is therefore several
adjacent nodes - text, a tag, a mention - not one.

A processor MUST therefore recognize a directive over a **contiguous run of
inline nodes that carry only literal text content** (text, tag, mention, and any
other node whose source form is recoverable verbatim), reassembling the run's
source before matching, and replacing only the matched span. Recognizing single
nodes silently drops every directive that carries `#section` or an option, and
every directive that appears mid-sentence.

The run stops at any node that is **not** literal-text-shaped. A directive
interrupted by emphasis, a link, or a code span is therefore **not** recognized
and stays literal - the same rule that keeps a bare-path directive with active
inline markers literal.

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

### The containment root

Every resolved path is checked against a single **containment root**. Where that
root comes from depends on whether the entry point carries a path at all.

- **File-based entry points** - a CLI invocation on a document path, or a
  convert-from-file API - **SHOULD** default the containment root to the
  **directory of the top-level document**. A document path is already known
  there, so requiring the host to name a root explicitly is not necessary. The
  root **MUST NOT** default to the process working directory: that directory is
  arbitrary with respect to the document and may be `/` or a home directory.
- **String-input APIs** have no document path, so no root can be inferred. A host
  **MUST** supply the root explicitly; otherwise inclusion stays disabled and
  directives remain literal. This preserves the opt-in posture for embedders: an
  application that converts a string never gains filesystem reach by accident.
- **One root for the whole expansion.** Relative include paths resolve relative
  to the **including file** (I1), but containment is checked against the single
  **top-level** root. The root **MUST NOT** re-base per included file. A re-based
  root would shrink at every level of nesting, so a nested document could never
  reference a sibling directory of the project.

```
book/            <- root (default: directory of the top-level document)
  main.crv
  chapters/ch1.crv
  shared/glossary.crv
```

From `chapters/ch1.crv`, the include `../shared/glossary.crv` is **allowed**: it
canonicalizes to `book/shared/glossary.crv`, which is inside the root, even
though the path contains a `..` segment. From the same file,
`../../../etc/passwd` is **denied**: it canonicalizes outside `book/`.

## Merge mechanism and source mapping

The specification is normative on the **outcome** and permissive on the
**mechanism**:

- The observable result MUST be **as if** the resolved content had appeared
  inline at the directive site, subject to **fragment containment**: included
  content is parsed as a **self-contained fragment**. A construct still open at
  the end of the included content **closes at child EOF**, exactly as it would
  at the end of a standalone document. Included content can therefore **never
  capture or reinterpret parent content** that follows the directive.
- An implementation MAY splice the resolved **source** before parsing, or parse
  the child and **merge events / AST** into the parent - but only where the
  result equals the fragment-containment outcome. The two diverge exactly when
  the child ends inside an unterminated construct: a naive textual splice of a
  child ending in an **unclosed fence** would let that fence swallow the rest
  of the parent document. That result is **non-conformant** - the fence ends
  with the included content. A splice-based implementation must compensate
  (e.g. synthesize the missing closer, or fall back to fragment parsing) to
  stay conformant.
- Fragment containment matters doubly for `@lines:N-M`: a physical line slice
  can cut a fence or a div in half and manufacture exactly such a torn
  construct. The tear is bounded to the fragment; the parent document is never
  affected.
- Source positions **SHOULD** be remapped so that source-mapped hosts (editors,
  highlighters, error reporters) can attribute an included span to the child
  file rather than to the directive. Carve's AST already carries the machinery:
  a `Position` distinguishes original-document coordinates from snippet-local
  offsets for re-parsed nested content (`carve-js` `src/ast.ts`, the `Position`
  interface). Included content is the same shape of problem as a re-parsed
  container snippet.

Worked example - `snippet.crv` ends inside an unclosed fence:

~~~carve
Some text.

```js
let x = 1;
~~~

<code v-pre>{{ snippet.crv }}</code> yields a paragraph and a code block whose fence closes at
the end of `snippet.crv`. The parent content after the directive is parsed
normally - it is **not** pulled into the code block.

## Reported dependencies

Expansion has a second output besides the document and its Warnings. A processor
that expands includes **MUST** report the **set of include targets it touched**
during the expansion.

- **Whole expansion, de-duplicated.** The set covers the entire recursive
  expansion including nested children, with duplicates collapsed, in a
  **deterministic** order.
- **Identity.** Each target is identified by the resolver's **canonical id**
  where the resolver supplies one - the same identity the cycle guard uses (see
  [Limits](#limits)) - and otherwise by the resolved path.
- **Attempted targets are included, not just successful ones.** The set MUST
  contain targets that were **attempted but not resolved**: missing or
  unreadable, binary, containment-denied, cycle-broken, and depth- or
  size-exceeded. The reason is invalidation: a host that watches only the files
  it successfully read never learns that a previously-missing target now
  **exists**, so a preview would stay stale at exactly the moment the author
  fixes the problem.
- **Resolved versus attempted is observable.** Each entry MUST be
  distinguishable as **resolved** or **attempted-but-unresolved**, so a host can
  drive file watching from the whole set while driving diagnostics from the
  failures.

Hosts use this set for **invalidation** (file watching) and for **diagnostics**.
It is a **cross-implementation contract**: an editor can rely on it regardless
of which engine backs it. Without it, preview invalidation cannot be implemented
correctly - see
[Requirements for live preview](#requirements-for-live-preview).

## Cross-file collisions

How an identifier behaves when expansion merges files depends on whether it is
**document-visible** or **file-local**.

### Document-visible identifiers are renamed on collision

**Explicit heading ids** (the link targets of `</#id>` cross-references) and
**footnote labels** (footnotes are collected and numbered globally in the
assembled document) are exposed by the assembled document and can be targeted
across file boundaries. The processor MUST resolve duplicates of either
**deterministically** by **rename-on-collision**:

1. **Ordering.** Read the fully expanded document top to bottom: parent before
   child, and an earlier include before a later include. The **first**
   occurrence in that order keeps its label / id.
2. **Rename scheme.** Each later duplicate is renamed by appending the least
   `-N` (integer `N >= 2`) that is not already taken in the same namespace:
   first `-2`, then `-3`, and so on. Footnote labels and explicit heading ids
   are separate namespaces. References to a renamed target follow the rename,
   so the renamed target's own cross-references and footnote references still
   resolve to it.
3. **Warning per rename.** Every rename emits a Warning so the collision is
   visible and debuggable.

### File-local identifiers are scoped, not renamed

A **reference-definition label** is file-local metadata: it is resolved **within
the document that defines it, before that document is merged** into its parent.
Two files may therefore use the same label with different destinations, and each
file's references resolve to its own definition:

```carve
%% parent.crv
See [a][].

[a]: /PARENT
```

```carve
%% child.crv
See [a][].

[a]: /CHILD
```

The parent's `[a][]` resolves to `/PARENT` and the child's to `/CHILD`. This is
**not** a collision: it MUST NOT emit a Warning and MUST NOT rename anything.

**Rationale.** A reference-definition label is never addressable from another
file, so renaming it would be pure churn plus a spurious warning. An explicit
heading id or a footnote label genuinely is document-visible, so a duplicate
there must be resolved and surfaced.

### Scope and ordering

The include-time rename pass is scoped to **explicit heading ids and footnote
labels only**. Auto-generated (slug) heading-id collisions are **not** part of
this pass: they continue to be de-duplicated by the existing heading-id tracker
(PART 9 §13, which already appends `-2`, `-3`, … to duplicate slugs once the
files are merged into one document). Two `## Introduction` headings from
different included files are therefore suffixed by §13, not here.

**Ordering.** The include-time explicit-id / footnote rename runs **before** the
§13 slug dedup. Fixing this order keeps ids deterministic: the explicit-id
namespace is settled first, and §13 then dedups the auto-slug ids against the
already-final set. See PART 9 §13.

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
| Block-structured content in inline position (inline include) | Warning + literal directive |
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
- **Containment is canonical, not lexical.** A processor **MUST** canonicalize
  the candidate path, resolving symbolic links, and then verify that the
  canonical result is contained within the canonical root. A `..` segment is
  permitted exactly when the canonical result stays inside the root. Rejecting
  `..` lexically is wrong in **both** directions: it is too strict, because it
  rejects legitimate sibling-directory layouts such as a document in `chapters/`
  including `../shared/glossary.crv` whose target is inside the project root; and
  it is too weak, because symbolic links and absolute paths escape a root with no
  `..` present at all.
- **The root defaults to the top-level document's directory** for file-based
  entry points, is supplied explicitly for string input, and is fixed for the
  whole expansion - see [The containment root](#the-containment-root).
- **Symlink / escape policy.** A symlink whose real target escapes the root is
  rejected the same as a literal traversal.
- **Absolute paths and schemes MAY be denied.** Absolute paths remain denied
  unless they canonicalize inside the root. Remote fetches (`file:`, `http:`,
  `data:`, …) are off unless explicitly allowlisted.
- **Same-sanitization parsing.** Included content is parsed under the **same**
  raw-HTML, URL-scheme, attribute, and Trojan-Source sanitization as any Carve
  content. Inclusion is a source-merge, **not** a privilege boundary: there is
  **no privilege escalation via include**.
- **Non-filesystem hosts.** With no resolver, every directive is literal.

Threats addressed: path traversal, symlink escape, include cycles, zip-bomb /
size amplification, and DoS by depth.

## Editor and IDE integration

This section is **guidance**, not new parsing rules: it describes how a host
SHOULD apply the normative model above. Carve's editor and host surfaces fall
into three **trust classes**, and inclusion policy follows the class.

### Class 1: local editors on the user's own files

Editor integrations (`vscode-carve`, `intellij-carve`, `zed-carve`,
`helix-carve`, `emacs-carve`, `vim-carve`, `sublime-carve`) have both a document
path and a trust signal, which is the most favorable position for inclusion.

- **Gate on workspace trust.** Inclusion SHOULD be enabled only when the
  workspace or project is **trusted** (VS Code Workspace Trust, JetBrains
  Trusted Projects). In untrusted or restricted mode, directives stay literal.
  The host SHOULD show a visible hint in that state rather than failing
  silently: a document that quietly renders <code v-pre>{{ … }}</code> as text
  looks like a syntax error to the author.
- **Root at the workspace, not the document.** The containment root SHOULD be
  the **workspace / project root** rather than the individual document's
  directory, so that a document in `chapters/` can reference `shared/` without
  each file needing its own root. This **refines** the file-based default of
  [The containment root](#the-containment-root) for the editor case: the
  document's directory remains the fallback for a file opened outside any
  workspace.
- **Expose the policy as a setting.** Hosts SHOULD offer an explicit setting -
  `enabled: auto | on | off`, where the default `auto` means *on if and only if
  the workspace is trusted* - plus a root override for projects whose content
  root is not the workspace root.

### Class 2: browser hosts with no filesystem

Browser-embedded hosts (`carve-components`, `carve-wysiwyg`, the docs
playground) have no filesystem and a string-input API. No root can be inferred,
so includes cannot resolve at all (see
[The containment root](#the-containment-root)).

- Such hosts SHOULD surface an **explicit affordance** that includes are not
  resolved, rather than silently rendering the directive as literal text.
- They MAY accept a **virtual resolver**: an in-memory map from path to source.
  That lets sandboxes, demos, and documentation exercise inclusion end to end
  with no filesystem access, while the host stays inert by construction.

### Class 3: server-side rendering of attacker-influencable content

Server-side hosts that render content supplied by users (CMS and e-commerce
field rendering, for example `wp-carve` and `shopware-carve`) are the dangerous
class.

- Inclusion **MUST remain disabled** on these paths. A post body or a product
  description is user-controlled input, so enabling a file-read capability there
  is a **file-disclosure vulnerability**, not a feature.
- If such a host ever offers inclusion, it MUST be an explicit,
  **administrator-only**, explicitly-rooted opt-in, and that opt-in MUST NOT be
  inherited by front-end rendering paths.

### Requirements for live preview

These are **host obligations** for an editor preview that expands includes.

1. **Dependency tracking and invalidation.** A preview MUST re-render when an
   **included** file changes, not only when the open document changes. A preview
   that watches only the open file will silently show stale output, which is the
   most common inclusion bug in practice. Hosts do not have to infer the
   dependency set themselves: a processor that expands includes **MUST** report
   the targets it **resolved** and those it merely **attempted** (see
   [Reported dependencies](#reported-dependencies)). Watch the whole reported
   set, failures included - creating a previously-missing target has to
   invalidate the preview too.
2. **Diagnostics.** The Warnings the spec already requires - unresolved target,
   cycle, containment denial, depth exceeded, size exceeded (see
   [Errors](#errors) and [Limits](#limits)) - SHOULD be surfaced as editor
   diagnostics. Leaving them as silent literal text hides a real error behind
   something that looks like plain prose.
3. **Navigation.** Hosts MAY offer go-to-definition on an include path. Because
   positions carry child-file attribution (see
   [Merge mechanism and source mapping](#merge-mechanism-and-source-mapping)), a
   preview-to-source jump SHOULD land in the correct **child** file rather than
   on the directive line.
4. **Caching.** Hosts SHOULD cache child parses keyed by **target identity plus
   modification time**, rather than re-reading every target on every keystroke.

### Implement it once, in the language server

Implementing resolution in a **language server** (`carve-lsp`) rather than per
editor gives the thin integrations (`helix-carve`, `emacs-carve`, `vim-carve`,
`zed-carve`, `sublime-carve`) both inclusion and include diagnostics with no
per-editor work. The server's `rootUri` is the natural containment root, and it
already owns the document lifecycle that dependency tracking and caching need.

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
