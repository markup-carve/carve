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
- **The conservative form** where the minimal form would change meaning
  (PART 11 §4 W4). `04-literal-punctuation`, `06-column-zero-literals` and
  `07-mention-and-tag-literals` are those cases - their escapes are
  load-bearing, and a writer that drops them corrupts the document.

`04` shows the cost the fallback accepts: the trailing `.` needs no escape on
its own, but the decision is document-scoped, so it is escaped along with the
rest. That bluntness is deliberate - see PART 11 §4, "why document scope". A
finer rule cannot be implemented, because anything smaller than a document
loses the link-reference and footnote definitions and reports differences that
escaping never caused.

`07` proves the candidate set has to be complete: a document carrying both
literal `\@user` / `\#tag` text and a real `@who` mention. If `@` were missing
from the set, W4 would have nothing to escape with and the literal would
silently become a mention.

## What the byte assertions are worth

`../roundtrip.test.mjs` asserts the PART 11 §1 invariants and the expected bytes
against the vendored reference.

The byte comparisons were skipped while no engine implemented minimal escaping -
asserting them against an over-escaping writer would either fail the suite or,
if the fixtures had been generated from that writer, pin the defect as the
expected output. carve-js#397 implements PART 11 §4, so they now run, and the
vendored build reproduces all seven fixtures exactly.

That is worth something only because of where the fixtures came from: they were
derived from PART 11 by hand before any engine implemented it, so agreement
means the engine matches the spec, not that the spec was written down from the
engine. The other two engines still over-escape; these bytes are what they are
measured against.

## Regenerating

Do **not** regenerate expected files from an implementation's current output -
that is how a defect becomes a fixture. Derive them from PART 11: build the
minimal form, check it re-parses to the same AST, and fall back to the
conservative form only when it does not.
