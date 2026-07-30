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
