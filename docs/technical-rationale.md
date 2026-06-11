---
title: Technical rationale
description: Why Carve exists, what Djot fixes in Markdown's parsing model, and which concrete ambiguities Carve resolves.
---

# Technical rationale

This page explains the technical problem Carve is trying to solve, why Djot is
the right starting point, and which concrete issues Carve resolves beyond both
Markdown and Djot.

If you want the short version:

- Markdown won by being easy to start with, but its syntax family carries real
  ambiguity, flavor drift, and parser complexity.
- Djot fixes the parser model: deterministic block parsing, linear-time inline
  resolution, delimiter-stack emphasis, and a clearer separation between syntax
  recognition and later reference resolution.
- Carve keeps that technical rigor, then changes the surface syntax and a few
  language features so the format is easier to learn, easier to remember, and
  less likely to produce accidental markup in ordinary writing.

This is not the normative spec. The canonical rules live in the
[formal grammar](./grammar) and `resources/grammar.ebnf`; this page is the
human explanation.

## The problem Markdown leaves unsolved

Markdown's success came from minimizing ceremony for common prose. That was a
good trade. The problem is that Markdown's original simplicity came partly from
underspecification.

In practice, "Markdown" means a moving family of related syntaxes:

- original Markdown
- CommonMark
- GitHub Flavored Markdown
- implementation-specific parser behavior and extensions

That creates three technical problems.

### 1. One document can have different meanings in different parsers

Tables, task lists, footnotes, raw HTML handling, autolinks, and even emphasis
details vary across implementations and flavors.

```md
~~strikethrough~~

| head | head |
| ---- | ---- |
| cell | cell |

- [x] done
```

In one environment that is fully featured markup. In another, some of it is
plain text. The author is often expected to know which Markdown they are
currently standing in.

### 2. Syntax is often reused for unrelated jobs

The same punctuation can mean different things depending on context:

- `*` can start emphasis or a list item
- `_` can be emphasis, or just part of an identifier
- `---` can be a thematic break, a setext underline, or frontmatter fencing
- `[` can start a link, an image, a footnote, or other extension syntax

That is survivable for a mature parser. It is much less friendly for:

- users trying to predict what will happen
- implementers writing a conforming parser
- editors trying to do local syntax highlighting without reading the whole file

### 3. Markdown's installed base makes deep cleanup difficult

Once trillions of existing documents exist, any real simplification collides
with compatibility. "Fix Markdown" usually means one of two things:

- keep compatibility, which preserves most of the old complexity
- break compatibility, which means you are effectively making a new language

Djot and Carve take the second route, but with different goals.

## What Djot fixes

Djot is the technical foundation Carve builds on. The central move is not
"more features"; it is a cleaner parser contract.

## What "no backtracking" means here

In this context, **backtracking** means:

- the parser commits to one interpretation
- later input shows that interpretation was wrong or incomplete
- the parser rewinds earlier input or parser state
- it then reparses the same region under a different interpretation

That is the thing Carve and Djot are trying to avoid.

By contrast, these are still allowed:

- bounded local lookahead to decide whether a delimiter can open or close
- a first pass that collects definitions and block structure
- a later resolution pass that attaches meanings using data already collected

Those operations do not require speculative parse branches or reparsing earlier
inline text under a different tokenization.

## Block-first, then inline

Carve follows Djot's two-stage model:

1. Identify block structure first.
2. Parse inline content inside those blocks.

That is the model described in
[Parsing & AST](./case-study/parsing-ast) and formalized in
`resources/grammar.ebnf` PART 8.

At a high level:

```text
First pass:  frontmatter, comments, code fences, headings, breaks, quotes,
             lists, tables, admonitions, paragraphs

Second pass: escapes, code spans, autolinks, links/images/spans, math,
             emphasis, editorial markup, extensions, mentions/tags,
             smart typography, text
```

This matters because block structure is decided before inline parsing starts.
You do not need an inline parser guessing whether a later line will turn the
current line into some different block type.

### One bounded exception: fence/`:::` closer lookahead

There is a single, deliberate departure from "decided from the line beginning
alone". Under the paragraph-interruption rule (`resources/grammar.ebnf` PART 9
§10), a fenced-code or `:::` opener interrupts an open paragraph **only when a
matching closer exists ahead** in the same context; an unterminated opener stays
paragraph text instead of swallowing the rest of the block. Deciding that needs
a forward scan over later lines — so for fences and divs, a *later* line does
co-determine whether the current line is a block opener or prose.

This is a conscious trade, not an oversight:

- It is **not backtracking** in the sense above: the scan peeks ahead, it never
  parses the paragraph and then rewinds to reparse it under a new interpretation.
- It stays **linear-time** because the block pre-pass already walks every line
  once; "does a matching closer follow?" is memoized during that single walk
  rather than rescanned per opener. Without that memo a naive implementation is
  O(n²), so the pre-scan is the load-bearing detail.
- It is **not** the "bounded local lookahead" the inline layer uses; it is a
  bounded *block-level* forward scan, bounded by the enclosing container.

The payoff is a usability guarantee neither CommonMark nor Djot give: a stray
` ``` ` or `:::` inside prose can never eat the remainder of the document. Carve
accepts the narrower parser contract to buy that. Everything else in block
structure — headings, quotes, bullet lists, thematic breaks, table rows — is
still decided from the line beginning alone, with no lookahead.

## No backtracking for emphasis resolution

Djot-style inline parsing uses a delimiter stack and resolves spans in a single
left-to-right pass. In Carve's grammar the rule is explicit:

- prefer literal text when a delimiter has no valid match
- match an opener to the nearest valid same-type closer
- allow different delimiter types to nest
- do not allow same-type spans to nest

That yields deterministic behavior without repeatedly revisiting earlier input.
More precisely: the parser may inspect nearby characters to decide whether a
delimiter is valid, but once it has classified the token stream, it does not
rewind and try a second parse tree for the same delimiter sequence.

A useful example is:

```carve
/usr/local/
```

The intended parse is:

```html
<em>usr/local</em>
```

not:

```html
<em>usr</em>local/
```

Why? Because the inner slash is treated as literal content, not as the end of a
shorter earlier span. The grammar calls this out directly, and the same rule is
what lets mixed delimiters nest cleanly:

```carve
*bold /italic/*
/italic *bold*/
```

A backtracking-oriented design would be more like:

1. treat the first `/` as an opener
2. try the next `/` as its closer
3. discover that this breaks the larger structure you want
4. rewind and try a later `/` instead

Carve's rule avoids that whole class of parser behavior. Same-type delimiters
inside the span are literal content, so there is no alternate same-type parse
tree to explore.

## Two-pass reference resolution without backtracking

Some constructs depend on definitions that may appear later:

```carve
Read the [intro][]

[intro]: https://example.com/intro
```

Carve and Djot handle that by collecting definitions in the first pass, then
resolving references later. That is still linear-time parsing. It is not
backtracking, because inline token recognition does not need to keep rewinding
when it discovers a later definition.

The distinction is important:

- **not backtracking:** classify `[intro][]` as a collapsed reference form, then
  later fill in its target from the collected definition table
- **would be backtracking:** initially treat `[intro][]` as plain text, then
  after seeing a later definition, rewind and reinterpret the earlier brackets
  as link syntax

Carve and Djot do the first, not the second.

This distinction matters for tooling:

- syntax highlighting can stay local
- parsers stay predictable
- later definitions still work

Another way to say it: later definitions affect **semantic resolution**, not
earlier **lexing/tokenization**.

## What the parser is allowed to do

The contract is intentionally narrow:

- decide block structure before inline parsing
- use local context to validate delimiters
- maintain a delimiter stack during inline parsing
- collect reference-like definitions before semantic expansion
- resolve references, abbreviations, and cross-references from the collected table

What it should not need to do:

- reinterpret block structure after inline parsing has started
- try multiple competing parse trees for the same emphasis run
- rescan earlier inline content because a later definition appeared
- use document-end knowledge to decide whether earlier punctuation was even a token

## Why these things are bad

This matters because parser ambiguity is not just an implementer inconvenience.
It leaks outward into author experience, tooling quality, and cross-implementation
consistency.

### 1. Earlier text becomes provisional

If a parser may later rewind and reinterpret what it already saw, then the
meaning of earlier punctuation is unstable until more of the document has been
read. That makes the language harder to reason about, because the user cannot
reliably say "this character sequence means X here" from local context alone.

### 2. Tooling gets worse

Editors, syntax highlighters, linters, and incremental parsers work best when
they can assign a stable local interpretation without needing to speculate about
 distant future input.

If earlier text may later be reclassified, tooling either:

- becomes more complex because it must model the parser's speculative behavior
- becomes less accurate because it settles for heuristics
- or becomes less responsive because it waits for more context than should be necessary

### 3. Independent implementations diverge more easily

Once a language depends on subtle reparsing behavior, edge cases multiply.
Implementers start making slightly different decisions about:

- when to treat something as literal first
- how much lookahead is allowed
- which alternative interpretation wins
- when a failed interpretation should trigger reparsing

That is one of the main ways a language turns into a family of near-compatible
flavors instead of a stable shared format.

### 4. Performance guarantees get weaker or less obvious

The problem is not only raw speed. The larger issue is that complexity becomes
harder to explain and harder to trust.

A deterministic single-pass delimiter model is easy to reason about. A parser
that may revisit earlier regions based on later discoveries is harder to bound,
harder to optimize, and harder to explain precisely in a spec.

### 5. User-facing rules become harder to teach

When a syntax rule depends on distant context or parser fallback behavior, the
human explanation gets ugly fast. Instead of saying:

- "this delimiter opens here because these local conditions hold"

you end up saying things more like:

- "it usually means this, unless a later structure causes the parser to reinterpret it"

That is exactly the kind of rule that expert users eventually internalize and
everyone else mistrusts.

## What Carve does better

Carve's improvement is not just "different syntax." It is a tighter contract
between source text, parser behavior, and user expectation.

### 1. Block structure is fixed before inline parsing

Carve decides whether something is a heading, list, table, quote, fence, or
paragraph before inline parsing starts. That reduces the chance that inline
details can destabilize block interpretation later.

### 2. Inline tokenization is local and stable

Delimiter validity is decided from bounded local context. Once the parser has
classified the token stream, it does not keep alternative inline parse trees in
reserve waiting for later input to choose among them.

### 3. Later definitions resolve meaning without changing tokenization

References, abbreviations, and cross-reference targets may depend on definitions
that appear later, but that later information affects semantic resolution, not
whether the earlier characters counted as tokens in the first place.

That is the important separation:

- earlier text is tokenized once
- later tables of definitions enrich it
- earlier punctuation is not retroactively reclassified

### 4. Some ambiguous legacy forms are removed instead of accommodated

Carve does not try to preserve every historically familiar spelling when that
spelling damages parser clarity. Setext headings are the clearest example:
removing them is simpler and cleaner than inventing another layer of conflict
resolution around `---`.

### 5. Carve further biases toward literal interpretation in technical prose

Djot already improves the parser architecture. Carve goes further by choosing
surface rules that reduce accidental markup in everyday technical writing.

Examples:

- stricter boundary rules for `/` and `_`
- explicit caption placement rules
- explicit disambiguation of `^` in captions, superscripts, and tables
- clearer separation between headings and tags

### 6. The language is easier to implement and easier to trust

The goal is not merely elegance. The goal is that a second implementation can
read the spec and corpus and reach the same result without importing a pile of
historical parser folklore.

That improves:

- conformance
- editor support
- parser portability
- explainability to users
- long-term maintainability of the language

## Why Carve still exists if Djot already fixes the parser

Djot solves the parser architecture well. Carve's claim is that parser rigor is
necessary but not sufficient.

Djot is easier to implement and reason about than Markdown, but it still leaves
some human-facing issues open:

- several constructs still look programmer-oriented rather than writer-oriented
- some syntax is technically clean but not memorable
- some edge cases important to everyday writing need stronger bias toward
  "obviously literal unless clearly markup"

Carve's job is to preserve Djot's implementation model while reshaping the
surface language around human factors.

## What Carve changes on top of Djot

### 1. Visual mnemonics instead of arbitrary emphasis punctuation

Carve uses:

```carve
/italic/
*bold*
_underline_
~strikethrough~
^super^
,sub,
=highlight=
```

The goal is not novelty for its own sake. The goal is that the delimiter gives
the user a cue about the output:

- `/` leans like italics
- `*` feels heavy
- `_` sits below the baseline
- `~` reads as a strike line
- `^` points upward
- `,` pulls downward

That makes the syntax easier to recover after time away from the language.

### 2. Stricter word-boundary rules for accidental markup

Carve is intentionally stricter than Djot for `/` and `_`.

This is a core example:

| Input | Carve result | Why |
|------|------|------|
| `/italic/` | emphasis | clear delimiter pair |
| `a/b/c` | literal | slash is intraword |
| `snake_case` | literal | underscore is intraword |
| `/ spaced /` | literal | whitespace invalidates the span |
| `` `/etc/nginx/` `` | code | code wins before emphasis |

This is one of the places where Carve is not merely "Djot with different
spelling." The language deliberately tries harder to avoid accidental markup in
technical prose.

### 3. Removing or refusing ambiguous legacy forms

Carve avoids syntax that would reintroduce block ambiguity. A good example is
setext headings:

```md
Heading
---
```

That familiar Markdown form collides with:

- thematic breaks
- frontmatter fencing at document start

Carve keeps ATX headings:

```carve
# Heading
```

and drops the underline form specifically to keep block parsing simpler and
less surprising.

### 4. Making common semantics native instead of workaround-driven

Carve promotes several things to first-class syntax because they recur in real
documents and otherwise force awkward workarounds:

- captions for images, block quotes, and tables
- abbreviations
- table rowspans, colspans, and multi-line cells
- mentions and tags
- a generic inline extension form

Example:

```carve
![Photo](img.jpg)
^ Figure 1: Caption text

*[HTML]: HyperText Markup Language

Press :kbd[Ctrl+C].
```

The technical point is not merely convenience. Native syntax gives the parser a
clear semantic target and gives implementations a common contract.

## Concrete ambiguities Carve resolves

## Paths vs italics

The obvious objection to `/italic/` is file paths.

Carve's answer is not "slashes are never risky." It is:

- intraword slashes stay literal
- whitespace-sensitive boundary rules decide whether a slash can open or close
- paths in code position should still be written as `/fenced/path/`

Examples:

```carve
Use /italic/ for emphasis.
Open `docs/index.md` for the homepage.
The route is a/b/c.
The path /usr/local/ italicizes because it is in emphasizing position.
```

That last case is deliberate. If a path sits exactly where valid emphasis would
sit, Carve treats it as emphasis. The rule stays simple, and technical content
still has a straightforward escape hatch: code spans.

## `^` meaning "caption" vs "superscript" vs "rowspan"

Carve reuses `^`, but only with hard contextual boundaries:

- line-start `^` after a figure-like block means caption
- table-cell `^` as the sole cell content means rowspan
- inline `^text^` means superscript

Examples:

```carve
x^2^

| Topic | Item |
| ^     | A    |

![Photo](img.jpg)
^ Figure 1
```

Each form is resolved from local structure, not from speculative lookahead over
the rest of the document.

## `*[` meaning abbreviation vs bold containing a link

This is another place where Carve pins the distinction to a stable rule.

At line start, with a `WORD]:` pattern:

```carve
*[HTML]: HyperText Markup Language
```

Inside normal inline content:

```carve
See *[the docs](https://example.com) first*.
```

The construct is not left vague and implementation-defined. The grammar tells
you which one it is.

## `#` meaning heading vs tag

Markdown users already expect:

```md
# Heading
```

Carve keeps that, but also treats inline social tags as first-class:

```carve
Track this under #parsing.
```

The split is local and mechanical:

- line-start `# ` is a heading
- inline boundary `#name` is a tag

Again, the language is trying to preserve a simple parser contract while
matching modern writing conventions.

## Examples where the parser contract matters

These examples show why the parser model matters more than individual syntax
choices.

### Example 1: nested emphasis without shortest-span guessing

```carve
*bold /italic/*
```

Expected structure:

```html
<strong>bold <em>italic</em></strong>
```

This works because different delimiter types may nest and same-type nesting is
not part of the language.

### Example 2: later definitions without reparsing earlier text

```carve
The [spec][]

[spec]: https://example.com/spec
```

The parser does not need to reinterpret the earlier line character by
character. It collects the definition table, then resolves the reference.

### Example 3: headings without setext collision

```carve
# Intro

---
```

This is unambiguous:

- first line is a heading
- second is a thematic break

The underline heading form is absent, so the parser does not need to ask
whether `---` belongs to the previous line or stands alone.

## What this buys implementers

If you are writing a parser, syntax highlighter, linter, formatter, or editor
support, the language's discipline matters as much as its user-facing syntax.

Carve is designed so implementers can rely on:

- a block-then-inline parser pipeline
- linear-time delimiter handling
- stable disambiguation rules
- a normative grammar plus conformance corpus
- fewer "special cases because Markdown did it that way"

That should lower the cost of building a second implementation that actually
matches the first one.

## What this buys authors

The same design helps writers, even if they never think in parser terms.

Authors get:

- fewer accidental interpretations
- syntax that is easier to remember from shape alone
- clearer expectations about what is literal and what is markup
- less dependence on which Markdown flavor a tool happened to embed

## Relationship to the rest of the docs

Use this page as the overview, then drill down:

- [Parsing & AST](./case-study/parsing-ast) for the parser model
- [Edge cases](./edge-cases) for tricky concrete scenarios
- [Design](./case-study/design) for the "why not just fix Markdown?" argument
- [Formal grammar](./grammar) for the canonical rules
- [Examples](./examples) for source-to-HTML behavior
