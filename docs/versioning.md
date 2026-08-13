# Versioning & Changelog

This page defines how the **Carve specification** is versioned and records every
normative change. It is the source of truth for "did the language change in a way
that affects my documents?"

## Versions

The spec carries a version (the `Version:` field in
[`grammar.ebnf`](https://github.com/markup-carve/carve/blob/main/resources/grammar.ebnf)),
currently **0.1**. It is pre-1.0: the language is still settling, so a minor bump
may include behavior changes. From 1.0 onward, behavior changes reserve a major
bump.

Implementations declare which spec version they conform to. The `carve fmt
--stamp` tool records it inside a document as a trailing
[provenance marker](/edge-cases):

```
%% carve-version: 0.1; generated-by: carve-js 0.1.0
```

So a document carries the spec version it was last processed under, and this page
tells you what changed since — together they answer whether a document needs
attention after a spec upgrade.

## Change categories

Every changelog entry is tagged with its migration impact:

- **`[behavior]`** — changes the rendered output of some existing input. These
  are the entries that can require **document migration**: a `.crv` that rendered
  one way before may render differently. Review these when upgrading.
- **`[clarification]`** — pins or documents existing behavior without changing
  output. No migration needed; impls may have converged to match.
- **`[addition]`** — new syntax or capability. Backward-compatible: existing
  documents are unaffected; only documents that opt into the new construct change.

When upgrading a document across spec versions, you only need to act on
**`[behavior]`** entries between the document's stamped `carve-version` and the
target version.

### Declaring a target version

The marker above is written by tooling. An author who wants to state which
version a document targets does it in frontmatter:

```
---
carve-version: 0.1
---
```

The key is optional. `carve lint` reads it and reports
[`carve-version-unsupported`](./validation#declaring-a-target-version) when a
document targets a version the processor does not implement, which is otherwise a
silent degradation: the constructs the author relied on parse as something else
and nothing says so. The two fields do not compete - the frontmatter key is the
author's intent, the trailing marker is what last processed the file - and a
document carrying only the marker is still checked.

### Behavior changes inside 0.1.x

A `0.1.x` release may still change what an existing document renders to, and
the semantic-span work did it more than once. The end state is three reserved
span attributes in core - `abbr`, `time`, `kbd` - and here is what moved.

**1. Three names gained a meaning as span attributes.** On an ordinary
`[content]{attrs}` span each is now consumed into its HTML element instead of
reaching the output as an attribute
([PART 9 §9](./blocks-and-attributes#semantic-spans-kbd-abbr-time)):

```carve
[x]{time="2026-01-01"}
```

```html
<span time="2026-01-01">x</span>         <!-- before -->
<time datetime="2026-01-01">x</time>     <!-- after -->
```

A document that used `abbr`, `time` or `kbd` as a plain marker attribute on a
span renders differently after upgrading.

**2. Leftover attributes moved onto the semantic element.** A consumed name
renames the span rather than wrapping it, so an id or class lands on the element:

```carve
[Tab]{#k .key kbd}
```

```html
<span id="k" class="key"><kbd>Tab</kbd></span>   <!-- before -->
<kbd id="k" class="key">Tab</kbd>                <!-- after -->
```

A stylesheet or script written against the wrapper needs a look.

**3. Four names left core for an extension.** `samp`, `var`, `cite` and `dfn`
briefly selected elements too; they are now the opt-in
[SemanticSpan extension](./extensions)'s, so a core processor leaves them as
ordinary attributes. **`cite` is the one to check** - it is a real HTML
attribute on `blockquote` and `q`, so `{cite="…"}` on a span was a reasonable
thing to write, and while the extension is enabled its value reaches no output
at all.

**4. The `:name[…]` spelling lost its handlers.** `:kbd[Tab]` renders
`<span class="ext-kbd">Tab</span>` in a core processor; the SemanticSpan
extension accepts it as a soft-deprecated form, scheduled for removal in 0.2.
This is the one break in RELEASED behavior rather than in a development window:
`:kbd[x]` has rendered `<kbd>` in carve-js since its first release. The rewrite
is mechanical - `:kbd[Tab]` becomes `[Tab]{kbd}`.

To find affected documents, search for the seven names used as attributes on a
span, and for `:name[…]` with any of them. Where a value mattered, move it to an
attribute that survives - a `title`, or a link if it was a URL.

**A captioned block quote is no longer a figure.** Its caption is the source of
the quotation, which is what it always read as, and the HTML now says so:

```carve
> To be
^ Hamlet
```

```html
<figure>                                  <!-- before -->
  <blockquote><p>To be</p></blockquote>
  <figcaption>Hamlet</figcaption>
</figure>

<blockquote>                              <!-- after -->
  <p>To be</p>
  <footer>Hamlet</footer>
</blockquote>
```

The `^` spelling does not change and no document needs editing. Two things do
change beyond the markup: a quote no longer takes a figure number, so a `#`
placeholder in its caption stays literal and a numbered cross-reference to it
stops resolving; and the AST node is a `block_quote` carrying an `attribution`
rather than a `figure` wrapping the quote, which matters to anything reading the
tree. To number a quotation as a figure, write the figure (PART 9 §4a).

### Checking documents mechanically

The marker is machine-readable, so this does not have to be done by eye. In
carve-php:

```php
use MarkupCarve\Carve\Stamp;

Stamp::read($source);        // ['version' => '0.1', 'generatedBy' => 'carve-php 0.1.0'] or null
Stamp::needsReview($source); // true when the document predates the engine's spec version
```

and from the CLI, for a repository of stored documents:

```bash
carve --stamp-info doc.crv    # report the version and the writer
carve --stamp-check doc.crv   # exit 1 when the document predates this spec version
```

An **unstamped** document counts as needing review: its provenance is unknown,
and assuming it is current is the unsafe direction. Hand-written documents are
unstamped until `carve fmt --stamp` touches them.

### Which implementations can read it

Every implementation both writes and reads the marker, behind the same two CLI
flags with the same output where there is a CLI, so any of them can check a
document another wrote.

| implementation | reads it with |
|---|---|
| carve-php | `Stamp::read` / `Stamp::needsReview`, `--stamp-info` / `--stamp-check` |
| carve-js | `readStamp` / `needsReview`, same two flags |
| carve-rs | `read_stamp` / `needs_review`, same two flags |
| carve-go | `ReadStamp` / `NeedsReview` |
| carve-rb | `Carve.read_stamp` / `Carve.needs_review?` |
| carve-py | `carve.read_stamp` / `carve.needs_review` |

The three bindings drive carve-rs, so each answers exactly what that engine
answers: carve-go reads `--stamp-check`'s exit status across the wasm boundary,
while carve-rb and carve-py call the crate directly.

The marker format is the contract, not any one API, so a document stamped by any
engine is readable by any other. That was verified rather than assumed - each
engine reads the markers the others write, in both the line and block forms, and
carve-js pins carve-php's exact bytes as test fixtures.

## Changelog

### 0.1

Initial released version. Establishes the grammar, the PART 9 semantic
constraints, the conformance corpus, and the tooling conventions (`carve fmt`,
the provenance marker, profiles, the extension contract). Everything prior to
0.1 was draft; there is no earlier released version to migrate from.

<!--
Format for future entries (newest first):

### 0.2

- [behavior] <what changed in rendered output> (#PR). Migration: <what authors do>.
- [clarification] <what was pinned> (#PR).
- [addition] <new syntax> (#PR).
-->
