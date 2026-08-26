---
title: Specification decision history
description: Retired readings and compatibility evidence kept outside the current normative rules.
---

# Specification decision history

The normative grammar states the current language. This page keeps the history
needed to understand source-compatibility changes without making readers walk
through retired rules before finding the active one.

## Colon fences

The original prose said a wider bare fence could close a shorter opener and
that equal-width typed fences could not nest. The formal guard and all engines
instead used exact-width closing, while a typed equal-width line opened a nested
container. The exact-width rule became normative in carve#770.

The same prose treated a bare opener without a later closer as literal text.
That conflicted with the general container rule and with all engines. Bare and
typed unclosed containers now both close with their host, with end of input as
the top-level case. The bare form is pinned by carve#1717.

One copy of the retired literal reading survived in the nested-list guidance.
It claimed an unclosed fence inside an item degraded and exposed its marker
lines as an ordinary nested list. The host-closing rule has no such exception:
the nested list remains the container body, with or without an explicit closer.
That correction is pinned by carve#1722.

## Container columns

Carve originally described list items, definition bodies and footnote bodies
with separate indentation rules. The current model uses one minimum content
column, one authored local block base, and the innermost eligible container as
owner. The compatibility measurements remain in the experiment reports; the
active rule is PART 1 S4 and PART 9 §24.

## Specification and executable checkers

Executable checkers once became accidental authorities instead of tests of the
grammar. In carve#645 the layout checker leaked internal lazy state into code
text; carve#646 produced a fourth answer while the three engines already
disagreed. A related satellite compared itself with a stale pinned engine and
reported nine false grammar defects (tree-sitter-carve#160).

The current rule is deliberately short: the grammar decides, reviewed corpus
pairs pin its consequences, and executable artifacts check those decisions.

## Input normalization

The layout description formerly enumerated `\n` and `\r\n` while the newline
production and all engines also accepted a lone `\r` (carve#872). It now cites
the production instead of duplicating it. The same audit exposed two previously
unstated transforms: one leading byte-order mark is stripped, and every U+0000
is replaced by U+FFFD (carve#872, carve#1523).

## Container ownership

Before carve#1730, case notes often inferred whether a container survived from
whether a paragraph remained open. Implementations consequently disagreed on
empty quotes and other non-paragraph first blocks inside list items, including
character-specific behavior in carve-php (carve#561, carve#572,
carve-php#683).

The current automaton selects the owner first. Paragraph state controls only
whether the selected line continues or starts a leaf; it never keeps a
container alive by itself.

## Floating attributes and invisible constructs

The phrase “next block” once left it unclear whether a floating attribute
stopped at a reference definition, footnote definition, abbreviation
definition or comment. The three engines answered differently, and individual
engines were inconsistent between kinds (carve#529). They later converged on
floating past every invisible construct (carve#857), with one claim per kind
retained so that convergence cannot regress unnoticed.

Class merging had a separate stale rule: the prose required duplicate class
names although no engine preserved duplicates. The executable checker briefly
became the only implementation following that prose. The rule now de-duplicates
classes in first-seen order (carve#615).

## Invisible lines inside line blocks

Implementations formerly registered, exposed or duplicated definitions and
comments inside line blocks in different combinations (carve#510, carve#573,
carve-php#691). A later edge involved a comment-only verse line swallowed by an
unclosed verbatim run and then reconstructed as a misplaced comment node
(carve#1282, carve#1472).

The current rule classifies comment-only lines at the block layer before inline
runs exist. Other block-looking lines remain literal verse. Empty verse lines
are represented by their boundary and canonicalized according to PART 11 §7c.

## Canonical colon-fence width

Canonical formatting writes nested colon fences from three colons outward,
adding one colon per level. This makes fence choice local and deterministic but
uses d² + 5d marker bytes at depth d. At the nesting cap of 200, the adversarial
fixture expanded from 2,032 to 42,435 bytes, or 20.9x. Its widest fence was 202
colons and 41,012 bytes, 96.6% of the result, were colon markers. An ordinary
three-level nest spends 24 marker bytes. The trade was measured and retained
because alternative minimal-width strategies require subtree inspection and
would churn existing canonical output (carve#1546, carve#1553).

## Canonical writer corrections

Several writer rules were tightened after renderer equality hid source and AST
changes:

- Wrapper-dissolution mutations showed why the permitted wrapper set needs an
  independent bound rather than only a whole-corpus round-trip check.
- Writers applied conservative escaping to whole units. Per-occurrence testing
  reduced the shared residue from 25 documents and 59 escapes to 5 documents
  and 12 escapes (carve-js#1327, carve-php#1578, carve-rs#1254).
- A historical document-scoped conclusion conflated the scope needed to resolve
  references with the smaller unit that actually needs conservative output.
  The current W4/W5 procedure compares documents but escalates only the
  smallest failing unit.
- Differential fuzzing found writers substituting comment and continuation
  constructs that rendered alike but produced different ASTs (carve#544).
- Markdown escaping changes must land together across engines because partial
  adoption immediately creates byte-level target divergence (carve#961,
  carve#970).

These measurements explain the current invariants but are not themselves part
of the writer algorithm.

## Inline spacing roles

The grammar once widened padding slots to general whitespace because padding
does not help recognize the surrounding construct (carve#878). That confused
the slot's role with its position: inline padding remains ASCII space-only even
when it is semantically optional (carve#901, carve#905).

Four padding slots were also implemented as space runs while their productions
required one exact space. The productions were retained and the implementations
narrowed (carve#912). Inline attributes and table cells were reconciled to the
same space-only model in carve#904 and carve#906. Marker separators remain a
different role and take the cardinality their own productions declare
(carve#892).

## AST position implementation history

Position coverage used to be reported inside PART 12 with per-engine counts and
an implementation backlog. Those figures became stale as engines shipped fixes.
The lasting rule is structural: a contiguous authored node has an exact span; a
node reassembled from discontiguous source may omit it; invented spans are never
conformant.

The original measurements found legitimate reassembly in line blocks and
multi-line table cells, plus separate implementation gaps in capped containers,
autolinks and reference-image captions (carve#490, carve#672). Carve-rb exposes
carve-rs positions through its serializer, so a stale Rust pin can also appear
as a Ruby conformance failure (carve-rb#41). Current status belongs in generated
conformance reports, not the normative grammar.

## NUL values at AST ingest

All engines once accepted escaped or in-memory U+0000 values through AST ingest
and then disagreed across render and canonical-write targets. This also exposed
internal-sentinel collisions in footnote placement and abbreviation keys
(carve-rs#1217, carve-js#1294). The current rule normalizes U+0000 to U+FFFD at
every ingest boundary, matching source parsing. Raw U+0000 in JSON remains an
RFC 8259 syntax error before Carve sees the value.
