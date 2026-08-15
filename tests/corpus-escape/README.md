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

| engine | function |
| --- | --- |
| carve-js | `escapePlainCarveInlineSyntax` in `src/carve-escape.ts` |
| carve-php | `escapePlainCarveInlineSyntax` in the `EscapesCarveConstructs` trait |
| carve-rs | no shared entry point - see "carve-rs" below |

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
backslash in the source text is a separate stage, which carve-php spells
`escapeLiteralBackslashes` and carve-js does not have at all
(markup-carve/carve-js#1085). Feeding backslash-bearing text to this function
asks a question it does not answer, and the two engines answer it differently
because of that gap, not because of this one.

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

carve-rs cannot consume this corpus today. Its escaper is a fourth spelling of
the rule - `escape_plain_carve_syntax`, private inside `src/djot_migrate.rs`,
with the Djot handled set hardwired rather than passed in - and its Markdown
importer builds an AST instead, so it never escapes text at all.

It was still measured for this corpus, end to end through
`carve migrate --from djot`: it agrees with carve-php on every `djot`-profile
case whose input is inert in Djot (46 of 55; the other 9 inputs are Djot markup,
so what came back was conversion rather than escaping). Exposing the function
and passing the handled set in is tracked in markup-carve/carve-rs#995.

## Known divergences

Where the engines disagree, `cases.json` carries the answer that survives a
render, not a transcript of what an engine happens to print. Both open
divergences are carve-js:

| case | profile | carve-js | corpus | why |
| --- | --- | --- | --- | --- |
| `braced-highlight` | `djot` | `a {\=x=} b` | `a {=x=} b` | `{=x=}` is a highlight in Djot too, which is why the profile names `=` as handled. carve-js leaves the brace and escapes the inner `=` anyway, and the result renders `a {=x=} b` where the source meant `a <mark>x</mark> b`. carve-php and carve-rs both leave it alone. |
| `braced-unclosed` | `plain`, `markdown` | `a {^x b` | `a \{^x b` | A braced run spans a soft break: `a {^x` on one line and `y^} b` on the next renders `a <sup>x\ny</sup> b`. A line-oriented escaper that leaves an unclosed opener bare therefore lets the NEXT line close it, turning two lines of literal text into a superscript. |

Both are filed as markup-carve/carve-js#1084.

## The escaper is not idempotent

Escaped output is not safe to feed back in. `a {=x=} b` escapes to
`a \{\=x=} b`, and running that through again escapes more. This is a property
of the rule, not a defect: the bare passes deliberately run inside an already
escaped brace, because `\{=x=}` still renders `{<mark>x</mark>}` and only
escaping the inner delimiter as well makes the whole run literal. A converter
applies the escaper exactly once, to text it has not escaped before.
