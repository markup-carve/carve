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

`09` and `10` pin **container fence width**, which is the other thing a writer
can get wrong without touching a single character of text. A colon fence closes
on an EXACT length match, so fence width is a depth count: the outermost
container is `:::` and each level inward adds a colon. `09` nests three of them
(div, admonition, line block) and pins that count.

`10` pins where the count STOPS. Its innermost container sits under a list item,
and a list item is a prefix/indent host: the fence lines inside it are indented,
and the closer pattern is anchored at the start of the line, so an indented bare
fence cannot close anything above it. The depth therefore restarts inside the
host - that container comes back as `:::`, not as the sixth level it sits at.

Both inputs are written the OTHER way round, widest-outer, which is how these
documents were written before the closer rule became exact. That is deliberate:
they parse identically under exact matching, so the pair proves the writer
normalizes an old-direction document into the canonical inward-widening form
rather than leaving whatever it was given.

## What the byte assertions are worth

`../roundtrip.test.mjs` asserts the PART 11 §1 invariants and the expected bytes
against the vendored reference. The §1 comparisons run MODULO ESCAPING, as §1
requires: an escape both retypes a text node and splits the run it sat in, so a
raw AST comparison would report a difference for every escape the writer emitted
- the one thing these fixtures exist to pin.

Two byte assertions are reported as PENDING rather than passing: `04` and `07`
are the conservative-form cases, and the engines currently emit a MIXED form,
escaping a candidate only where leaving it bare would change the parse. That is
the §2-versus-§4 tension in carve#374. The fixtures keep the form PART 11 pins
and the assertion stays visible; re-pinning them to the engines' output would
settle an open spec question by accident, which is exactly what "Regenerating"
below warns against.

The byte comparisons were skipped while no engine implemented minimal escaping -
asserting them against an over-escaping writer would either fail the suite or,
if the fixtures had been generated from that writer, pin the defect as the
expected output. carve-js#397 implements PART 11 §4, so they now run, and the
vendored build reproduces the fixtures exactly, the two noted below aside.

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
