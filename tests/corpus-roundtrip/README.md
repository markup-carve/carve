# Canonical-writer round-trip corpus

Pairs of `NN-slug.crv` (input) and `NN-slug.expected.crv` (the output the
canonical writer must produce), pinning [PART 11](../../resources/grammar.ebnf)
of the grammar.

Unlike `../corpus/`, which pins rendered HTML, these pin **Carve source in,
Carve source out**. That covers behavior the HTML corpus structurally cannot:
the writer's escaping decisions, and whether formatting a document preserves it.

## What each case pins

- **The minimal-escape form** where it re-parses identically (PART 11 §2). This
  is the interesting half: `50% faster: yes (ok)` must come back unchanged, not
  as `50\% faster\: yes \(ok\)`.
- **The conservative whole-line form** where the minimal form would change
  meaning (PART 11 §4 W4). `04-literal-punctuation` and
  `06-column-zero-literals` are those cases - their escapes are load-bearing,
  and a writer that drops them corrupts the document.

`04` also shows the cost the whole-line fallback accepts: the trailing `.` in
that line does not need escaping on its own, but the line falls back as a unit,
so it is escaped along with the rest. That keeps the output a function of the
line, which is what lets three engines agree byte-for-byte.

`07` covers the case that proves the candidate set has to be complete: a line
carrying both literal `\@user` / `\#tag` text and a real `@who` mention. If `@`
were missing from the set, W4 would have nothing to escape with and the literal
would silently become a mention.

## Why the byte assertions are skipped

`../roundtrip.test.mjs` asserts the PART 11 §1 invariants against the vendored
reference today - those hold, and they guard the class of bug that shipped in
carve-rs as a nested list being reformatted from tight to loose.

The byte comparisons are skipped until an engine implements minimal escaping.
Asserting them against the current over-escaping writer would either fail the
suite or, if the fixtures were generated from that writer, pin the defect as
the expected output.

## Regenerating

Do **not** regenerate expected files from an implementation's current output -
that is how a defect becomes a fixture. Derive them from PART 11: build the
minimal form, check it re-parses to the same AST, and fall back to the
conservative form only when it does not.
