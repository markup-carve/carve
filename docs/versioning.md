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

Writing the marker is universal; reading it back is not yet. The mechanical check
above works in carve-php ([#473](https://github.com/markup-carve/carve-php/pull/473))
and carve-js ([#436](https://github.com/markup-carve/carve-js/pull/436)), which
expose the same two CLI flags and the same output, so either can check a document
the other wrote.

| implementation | writes | reads |
|---|---|---|
| carve-php | yes | yes - `Stamp::read` / `Stamp::needsReview`, `--stamp-info` / `--stamp-check` |
| carve-js | yes | yes - `readStamp` / `needsReview`, same two flags |
| carve-rs | yes (`--stamp`, `--stamp-block`) | not yet |
| carve-go, carve-rb, carve-py | via the engine | not yet - they wrap carve-rs |

carve-rs is the one that matters most for coverage: the Go, Ruby and Python
bindings all drive it, so a reader there reaches four implementations at once.

The marker format is the contract, not any one API, so a document stamped by any
engine is readable by any engine that has a reader. That was verified across
carve-php and carve-js in both directions, in both the line and block forms, and
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
