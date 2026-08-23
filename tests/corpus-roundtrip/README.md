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

## 11-two-footnotes-in-source-order

Not an escaping case. §7 orders collected definitions by source position and
PART 11 §6 binds the writer to the order the tree holds, and nothing here pinned
it: every fixture had at most one definition.

The cost showed up in all three engines at once (carve#787). Each writer used a
FIXED order - carve-js and carve-rs appended footnotes last, carve-rs also
sorted them by label, carve-php emitted them first - and each looked correct on
exactly the documents whose source order happened to match its rule. The corpus
had one shape (`202-a-definition-on-a-footnote-body-s-continuation-line-is-
collected`, footnote written first), so footnotes-first passed there for as long
as it existed.

Two footnotes written `[^b]` then `[^a]` separate the rules with nothing else in
play: source order says `[^b]` first, label order says `[^a]`, and position is
the only thing that distinguishes them.

The MIRROR shape - a link definition written before a footnote - belongs here
too and is not, because the pinned build predates carve#642 and inlines the
resolved reference, so its fmt output drops the definition entirely. It lives in
the corpus instead (`a link definition written before a footnote stays before
it`), where `compare:impls` checks the three engines against each other on the
`carve` target. Once the pin moves past that fix, it can be added here as bytes.

## 12-thematic-break-spellings

Not an escaping case either. PART 11 §6 leaves a construct's spelling alone
because the AST records it, and `thematic_break` recorded no marker until
carve#976 gave it one - so all three writers normalized `***` and `___` to
`---`, which §6a pinned as the interim answer while the field was missing.

The document writes all three spellings, and writes two of them where a writer
is most likely to lose the mark: inside a block quote and inside a list item,
both of which re-emit their children through a prefix. Expected output is the
input, byte for byte.

It also pins the interaction with §1a, which is why the document OPENS with a
break. Frontmatter is a `---` at byte 0 plus a bare `---` closer below it, so a
writer that normalizes the leading `___` manufactures frontmatter out of a
document that had none, and §1a licenses a respelling to escape it. Measured
before the field landed, the three engines took three different routes through
that: carve-js and carve-php respelled EVERY break to `***`, carve-rs respelled
only the leading one. Reproducing the author's `___` removes the collision
instead of paying for it, and the three converge on the identity.

## 13-definition-list-after-a-list and 14-footnote-definition-inside-a-container

Neither is an escaping case. Both exist because the comparison this corpus is
read through used to be the wrong object, and no document here could see it
(carve#1616).

`../roundtrip.test.mjs` compared carve-js's INTERNAL `parse()` return rather
than the published PART 12 tree. An internal tree carries fields the schema
never declares - `footnoteDefPos` on the root, and `termSpans`,
`definitionSpans` and `definitionLines` on a definition-list item - and every
one of them records where a node was WRITTEN. Moving blocks is most of what the
writer does, so the reading reported a difference for 74 of the 1371 corpus
documents that say nothing different afterwards. This corpus stayed green on it
by luck: none of `01` through `12` holds a definition list, and the one that
holds footnote definitions (`11`) has them at document level already, so no
recorded span moved.

`13` is the smallest document whose spans move. `:: term` is a first-class block
opener, so it interrupts the list above it, and the writer separates the two
blocks with a blank line - which shifts every term and definition span down one
line. `14` is the same failure through the other field: the definition is
authored inside a container, §7 collects it to document level, and its recorded
position moves with it. The container is left empty, which is what faithfully
writing a tree whose only child was hoisted out looks like.

Both expected files were derived the way this README requires, from PART 11 and
§7 rather than from the writer: definitions are collected to document level and
written in source order, sibling blocks are separated by one blank line. The
pinned build then reproduces both byte for byte.

The pair also fails LOUDLY under the old reading - two assertions each, the §1
invariant and the fixture's own self-check - so the object being compared cannot
quietly revert.

## Regenerating

Do **not** regenerate expected files from an implementation's current output -
that is how a defect becomes a fixture. Derive them from PART 11: build the
minimal form, check it re-parses to the same AST, and fall back to the
conservative form only when it does not.
