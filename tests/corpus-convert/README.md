# Carve converter corpus

Foreign source in, Carve out. The conformance corpus in [`../corpus/`](../corpus/)
pairs a `.crv` with an expected render, so it covers everything that READS
Carve; this directory covers what WRITES it.

The gap it closes is recorded in
[carve#1130](https://github.com/markup-carve/carve/issues/1130): six converter
fixes in one stretch of work, each found by a different engine's suite or by
differential scaffolding that was thrown away afterwards, because no shared
fixture set existed for the importers.

## Shape

One directory per case, `NN-slug/`, holding exactly two files:

```
tests/corpus-convert/
  01-markdown-an-inline-footnote-stays-text/
    input.md
    expected.html
```

`input.<ext>` names the source format. `expected.html` is the render of the
Carve the converter produced.

The directory shape rather than a flat `NN-slug.<ext>` pair is what the
extensions force: an HTML case's SOURCE and any case's expected RENDER would
both want to be `NN-slug.html`. It is also the shape
[`../html-import/`](../html-import/) already uses.

Source formats currently driven: `md`, `html`, `bbcode`.

## Why the expected file is HTML and not Carve

The three engines do not spell Carve the same way, deliberately. carve-php and
carve-js rewrite the source line by line, so their output keeps the author's
spelling; carve-rs parses to an AST and writes canonically, so a setext heading
comes back as `#` and an indented code block as a fence. Both are correct, and a
byte comparison of the produced `.crv` would call every case a failure while
carrying no information about which engine was right.

Measured, before the decision: of 4,784 generated cases, 196 produced
byte-different `.crv` that renders identically, and all 196 were the one
deliberate difference where carve-php escapes only the opening delimiter of a
pair and the other two escape both.

So the comparison is SEMANTIC: source to `.crv` by each engine, then `.crv` to
HTML by ONE engine, and the HTML is compared. Using a single engine for the
render step is what isolates a converter difference from a renderer difference.

## The dialect is CommonMark plus GFM

Ruled on carve#1130. Anything past that base - Pandoc superscript, Obsidian
highlight, dollar math - is a constructor flag that defaults to OFF, following
the precedent carve-php set with `convertMath` and `convertHighlight`.

The reasoning is that under-converting leaves readable text while inventing
markup the source did not have makes the migrated document render differently
from anything its author saw. Failing toward literal is the recoverable
direction.

That is why `a ^b^ c` and `d ==e== f` come back as text here, and why
`a ~b~ c` comes back struck: a single tilde IS GFM strikethrough.

## What runs against it

[`../corpus-convert.test.mjs`](../corpus-convert.test.mjs), on every PR, against
the build this repo pins. Two assertions per case: the render matches
`expected.html` byte for byte, AND its visible text matches what a reader of the
SOURCE language produces for the same input - `marked` in GFM mode for a
Markdown case, the source document itself for an HTML case.

The second assertion is what keeps the expectations answerable. A corpus written
by recording what an engine currently does pins that engine to itself; a second
reader can say whether the recorded answer was right.

The cross-engine half - the same cases through carve-php and carve-rs - needs
three provisioned checkouts and cannot run in this repo's per-PR CI. It is still
open on carve#1130, and this corpus is the input it needs.

## Adding a case

Write the two files and run `npm test`. Nothing generates this directory, so
there is no build step; the bytes are protected from line-ending and trailing
whitespace normalization by `.gitattributes` and `.editorconfig`, because one
case is a Markdown hard break and its two trailing spaces are the assertion.

A case whose expected text disagrees with the source reader is not a case to
adjust until it passes - it is either a converter defect or a construct the
dialect ruling puts behind a flag.
