---
title: Source-preserving patches
description: A shared engine contract for changing Carve source without rewriting unrelated text.
---

# Source-preserving patches

Writers expect a small correction to remain a small correction. An engine must
not silently rewrite unrelated spelling, spacing, comments, attribute order, or
syntax merely because a tool fixed one part of a document.

A source patch describes exact replacements against the source the engine read.
The patch is structured data for tools; a unified diff can be derived from it
for people.

The [JSON Schema](https://markup-carve.github.io/carve/source-patch.schema.json)
is the wire-format authority shared by implementations.

## Patch shape

```json
{
  "version": 1,
  "sourceFingerprint": "fnv1a64:0123456789abcdef",
  "sourceBytes": 42,
  "edits": [
    {
      "start": 12,
      "end": 15,
      "replacement": "",
      "kind": "formatting",
      "code": "canonical-format"
    }
  ],
  "unresolved": []
}
```

`start` and `end` are zero-based UTF-8 byte offsets into the original source.
The range is half-open: it includes `start` and excludes `end`. Both offsets
must be UTF-8 character boundaries.

`kind` is one of `formatting`, `syntax-migration`, `quick-fix`, or `refactor`.
`code` is a stable machine-readable reason for the edit.

## Required behavior

- `version` is `1` for this contract.
- `sourceFingerprint` is FNV-1a 64-bit over the original UTF-8 bytes: offset
  basis `0xcbf29ce484222325`, prime `0x100000001b3`, multiplication modulo
  2^64, and lowercase hexadecimal padded to 16 digits after `fnv1a64:`. It
  detects stale input; it is not a security hash.
- `sourceBytes` is the original UTF-8 byte length.
- Edits are sorted by `start`, do not overlap, stay within `sourceBytes`, and
  use valid UTF-8 boundaries. A consumer must reject a negative or reversed
  range, an out-of-bounds or non-boundary offset, and unsorted or overlapping
  edits. Adjacent zero-width insertions at one offset apply in array order.
- Applying a patch copies every byte outside its edit ranges unchanged.
- An implementation rejects an unsupported version and rejects a patch when
  its fingerprint or byte length does not match, rather than guessing how to
  rebase it. Error classes are native to each language.
- An empty edit list is a valid no-op.
- Patch generation and application are deterministic.
- The source is valid Unicode encoded as UTF-8. A byte-order mark and original
  line endings are ordinary source bytes: the fingerprint covers them and
  edits preserve them unless their ranges explicitly replace them.

## Writer review

An engine puts a proposed change in `unresolved`, rather than `edits`, when it
cannot prove that applying it is safe. A suggestion has the same fields as an
edit plus a human-readable `message`. Applying a patch never applies unresolved
suggestions.

Canonical Carve formatting is an edit only when the engine reports no rendering
loss. A lossy proposal is one unresolved full-document suggestion. Later APIs
may narrow that suggestion as parsers retain more source spans.

## Initial API

The contract requires reference engines to provide equivalents of:

```text
createSourcePatch(source, replacement, kind, code) -> SourcePatch
applySourcePatch(source, patch) -> source
toCarvePatch(source) -> SourcePatch
```

`replacement` is the complete intended document, not an isolated snippet.
`toCarvePatch` prepares canonical formatting and routes a proposal to
`unresolved` when the engine reports rendering loss.

The initial patch creator returns the smallest single replacement by retaining
the common UTF-8 prefix and suffix. The contract permits future engines to
return several smaller edits, provided applying them produces the same result.

Applications should store the structured patch as the authority. Human-facing
tools may render it as a contextual unified diff, but a diff is presentation,
not the application protocol.

Editor adapters must convert these UTF-8 offsets explicitly; JavaScript string
indices and Language Server Protocol positions use different units.

## Fingerprint vectors

| UTF-8 source | Fingerprint |
|---|---|
| empty | `fnv1a64:cbf29ce484222325` |
| `a` | `fnv1a64:af63dc4c8601ec8c` |
| `abc` | `fnv1a64:e71fa2190541574b` |
