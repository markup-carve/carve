# Escaper corpus

Paired `(input, expected)` cases for the ONE function every migration converter
runs before it writes Carve: the escaper that makes text which is literal in the
source language stay literal in the output.

This is the byte-exact subset of the converter corpus proposed in carve#1130.
It needs no semantic comparison: the question a case asks is "this text,
escaped, is exactly this Carve source", and the answer is a string.

## Why this exists

The conformance corpus pairs a `.crv` input with expected output per render
target, so `compare:impls` covers everything that READS Carve. Nothing covered
what writes it. Every converter fix therefore had to be ported by hand with
nothing to catch a miss, and carve#1130 lists six times in one stretch of work
that a miss was caught only by accident - four of them inside this escaper.

## What the cases pin

| engine | function | consumer |
| --- | --- | --- |
| carve-js | `escapePlainCarveInlineSyntax` in `src/carve-escape.ts` | `test/escape-corpus.test.ts` |
| carve-php | `escapePlainCarveInlineSyntax` in the `EscapesCarveConstructs` trait | `tests/TestCase/Converter/EscaperCorpusTest.php` |
| carve-rs | `escape_plain_carve_syntax` in `src/djot_migrate.rs` | the `escape_corpus` module in the same file |

All three read `cases.json` itself, so the corpus has one set of expectations
rather than three transcriptions of it.

## Profiles

The escaper takes a set of HANDLED delimiters: the constructs the calling
converter's own language owns and rewrites itself, which must NOT be frozen as
text before that rewrite happens. A profile is one such set, and each is taken
from a real call site rather than invented here.

| profile | handled braced | handled bare | callers |
| --- | --- | --- | --- |
| `plain` | none | none | HTML and BBCode text, whose languages own none of these delimiters |
| `markdown` | `*_` | `*_~` | the Markdown converters |
| `djot` | `=+-*_^~` | `~*_` | the Djot converters |

An engine runs every case under every profile its converters can produce.

## The two rules a case obeys

**A case is one line.** The escaper's unit is a line: both implementations take
one and return one. A rule that only shows across lines is still stated in the
case comment - see `braced-unclosed` - but the fixture stays line-shaped.

**No input carries a backslash.** This function escapes CONSTRUCTS. A literal
backslash in the source text is a separate stage, spelled
`escapeLiteralBackslashes` in carve-js and carve-php and called only by the
converters whose own language has no backslash escape - HTML and BBCode text,
where a backslash is a character the author typed. carve-rs has no such stage,
because its HTML and Markdown importers build an AST and let the canonical
writer emit the source. Feeding backslash-bearing text to this function asks a
question it does not answer, and which stage would answer it differs by engine.

The check in `tests/escape-corpus.check.mjs` enforces both, plus the invariant
that makes a fabricated expectation impossible to hide: an expected string with
every backslash removed must equal the input exactly. Escaping only ever INSERTS
backslashes.

## Consuming it from an engine

Read `cases.json`, and for each case and each profile the engine supports, call
the escaper with that profile's handled set and compare byte for byte:

```js
for (const c of cases) {
  for (const [profile, expected] of Object.entries(c.expected)) {
    assert.equal(escapePlainCarveInlineSyntax(c.input, profiles[profile]), expected)
  }
}
```

An engine that cannot produce a profile skips it, the way the render corpus
already skips a target an engine does not implement.

## carve-rs

carve-rs consumes the corpus the same way the other two do. Its escaper takes
the handled set as a parameter, the `escape_corpus` module in
`src/djot_migrate.rs` reads `tests/spec/tests/corpus-escape/cases.json`
directly, and all three profiles are declared, so every case runs under every
profile (markup-carve/carve-rs#995).

What is still one-sided is the CALLER set, not the corpus: `djot_to_carve` is
the crate's only text-level converter, so `djot` is the only profile with a call
site today. `markdown` and `plain` are declared anyway, because the handled set
is a parameter now, and the engine's own
`a_profile_with_no_caller_is_named` test says which profile is proven ahead of
its caller and asserts the parameter is load-bearing - a hardwired set would
make every profile return the same answer and every case would still pass.

## Divergences

No engine diverges from the corpus today. Measured at carve-js `1568546`,
carve-php `5d8d9ab` and carve-rs `d948992`, each pinning this repo at
`3fdfd6e`: all three run the whole file, 57 cases under 3 profiles, and all 171
comparisons agree.

Where the engines DID disagree, `cases.json` carried the answer that survives a
render rather than a transcript of what an engine happened to print, and the
reasoning is what the fixtures still encode. All three below are settled; the
rows are kept because they say why the expectation is what it is, not because a
divergence is open.

| case | profile | the answer that lost | corpus | why |
| --- | --- | --- | --- | --- |
| `braced-highlight` | `djot` | `a {\=x=} b` | `a {=x=} b` | `{=x=}` is a highlight in Djot too, which is why the profile names `=` as handled. Escaping the inner `=` behind the brace renders `a {=x=} b` where the source meant `a <mark>x</mark> b`. |
| `braced-unclosed` | `plain`, `markdown` | `a {^x b` | `a \{^x b` | A braced run spans a soft break: `a {^x` on one line and `y^} b` on the next renders `a <sup>x\ny</sup> b`. A line-oriented escaper that leaves an unclosed opener bare therefore lets the NEXT line close it, turning two lines of literal text into a superscript. |
| `a-symbol-shortcode` | all | `a :rocket: b` | `a \:rocket: b` | `:name:` is a construct opener, so the bare form re-parses as a `symbol` node and, under a configured symbol map, renders the glyph where the source held text. PART 11 §5 lists `:` in the candidate set. Pinned end to end by the `symbol-sigil-escape` HTML import fixture. |

`a-colon-that-closes-no-shortcode` is the last row's negative: a colon that opens
nothing is left bare, because escaping it would be the over-escaping PART 11 §2
calls a defect rather than a safe default.

A row here is history, and a claim about an engine's current behavior is not.
Anything about what an engine does today belongs in a ledger a run can fail on -
`resources/converter-drift.txt` is the pattern - rather than in this page, which
went on saying that carve-rs could not read the corpus and that carve-js was the
divergent engine for a week after both were fixed, because a page has no run to
fail.

## The escaper is not idempotent

Escaped output is not safe to feed back in. `a {=x=} b` escapes to
`a \{\=x=} b`, and running that through again escapes more. This is a property
of the rule, not a defect: the bare passes deliberately run inside an already
escaped brace, because `\{=x=}` still renders `{<mark>x</mark>}` and only
escaping the inner delimiter as well makes the whole run literal. A converter
applies the escaper exactly once, to text it has not escaped before.
