---
title: Technical rationale
description: Why 0.2 separates syntax, trees, rendering and writing.
---

# Technical rationale

This page explains the technical problem Carve is trying to solve, why Djot is
the right starting point, and which concrete issues Carve resolves beyond both
Markdown and Djot.

If you want the short version:

- Markdown won by being easy to start with, but its syntax family carries
  ambiguity, flavor drift, and parser complexity.
- Djot fixes the parser model: deterministic block parsing, linear-time inline
  resolution, delimiter-stack emphasis, and a clearer separation between syntax
  recognition and later reference resolution.
- Carve keeps that technical rigor, then changes the surface syntax and a few
  language features so the format is easier to learn, easier to remember, and
  less likely to produce accidental markup in ordinary writing.
- Carve 0.2 adds a portable tree, a source-layout sidecar, a canonical writer
  and a shared conformance corpus, so that the stages from source to HTML and
  back each have a contract of their own.

This is not the normative spec. The canonical rules live in the
[0.2 specification](./grammar), ten documents of numbered clauses; this page is
the human explanation. Most of the reasoning below was written for 0.1 and still
holds. Where 0.2 changed a rule, the text says so.

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

```markdown
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

Markdown's large installed base makes syntax changes a compatibility problem.
"Fix Markdown" usually means one of two things:

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

That is the model described in [Parsing & AST](./case-study/parsing-ast). In
0.2 it is a clause of its own: inline content is parsed one content at a time,
after the block pass has settled every line of the document, so no block
decision depends on inline content, and every definition and heading is known
when the first content is read.

At a high level:

```text
First pass:  frontmatter, comments, code fences, headings, breaks, quotes,
             lists, description lists, tables, divs and admonitions,
             definitions, paragraphs

Second pass: escapes, code spans, autolinks, links/images/spans, math,
             emphasis, editorial markup, extensions, mentions/tags,
             smart typography, text
```

This matters because block structure is decided before inline parsing starts.
You do not need an inline parser guessing whether a later line will turn the
current line into some different block type.

### Fences open without looking for a closer

A code fence, div or comment block opener interrupts an open paragraph whether
or not a closer follows, and an unclosed fence runs to the end of its
container. So every block opener, fences included, is decided from the line
beginning alone. A missing closer costs the rest of the container, as in
CommonMark. The fence never turns back into text, and lint reports it as
`unclosed-code-fence`, `unclosed-container-fence` or `unclosed-comment-fence`
with severity error.

## No backtracking for emphasis resolution

Djot-style inline parsing uses a delimiter stack and resolves spans in a single
left-to-right pass. In the 0.2 inline chapter the rule is explicit:

- a delimiter opens only when the character before it is not a word character
  and the character after it is not whitespace, and closes in the mirrored case
- a delimiter that can close, with an open entry of its kind on the stack,
  closes the nearest such entry; the entries above it become text
- otherwise a delimiter that can open is pushed, also while an entry of its
  kind is open, so a kind nests in itself
- a delimiter with no valid match is text

That yields deterministic behavior without repeatedly revisiting earlier input.
More precisely: the parser may inspect nearby characters to decide whether a
delimiter is valid, but once it has classified the token stream, it does not
rewind and try a second parse tree for the same delimiter sequence.

A useful example is:

::: compare
```crv
/a /b/
```
```html
<p>/a <em>b</em></p>
```
:::

The first `/` can open and is pushed. The second can open too (the space before
it rules out closing), so it is pushed as well. The third can close, and it
closes the nearest open entry: the span is `b`, and the first slash, never
closed, is text.

This is a 0.2 change. 0.1 kept a bare same-type opener inside an active span
literal, so the same source gave `<em>a /b</em>`, and same-type nesting needed
explicit braces. In 0.2 a kind nests in itself, and `carve fmt` writes nested
same-type spans braced so the boundaries stay visible:

::: compare
```crv
{/a {/b/} c/}
```
```html
<p><em>a <em>b</em> c</em></p>
```
:::

Different delimiter types nest the same way:

::: compare
```crv
*bold and /italic/ text*
/italic and *bold* text/
```
```html
<p><strong>bold and <em>italic</em> text</strong>
<em>italic and <strong>bold</strong> text</em></p>
```
:::

A backtracking-oriented design would be more like:

1. treat the first `/` as an opener
2. try the next `/` as its closer
3. discover that this breaks the larger structure you want
4. rewind and try a later `/` instead

Carve resolves delimiters without trying alternate parse trees. Each delimiter
is decided once, from its neighbors and the stack as it stands.

## Two-pass reference resolution without backtracking

Some constructs depend on definitions that may appear later:

::: compare
```crv
Read the [intro][].

[intro]: https://example.com/intro
```
```html
<p>Read the <a href="https://example.com/intro">intro</a>.</p>
```
:::

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

0.2 resolves references in more places with the same mechanism: a shortcut
reference `[text]` links when a definition `[text]:` exists, and a full
reference can reach a heading by its text. Both are lookups in the collected
table; neither changes how the brackets were tokenized.

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

Carve's improvement is a tighter contract between source text, parser behavior,
and user expectation.

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
resolution around `---`. 0.2 goes one step further and removes `---` as a
thematic break too: the break is `***`, a hyphen run in prose is text (smart
typography turns it into a dash), and `---` keeps a single job, fencing
frontmatter.

### 5. Carve further biases toward literal interpretation in technical prose

Djot already improves the parser architecture. Carve goes further by choosing
surface rules that reduce accidental markup in everyday technical writing.

Examples:

- stricter boundary rules for `/`, and in 0.2 no bare `_` delimiter at all
- explicit caption placement rules
- explicit disambiguation of `^` in captions, footnotes, and tables (inline
  superscript is braced-only, so a bare `^` never competes)
- clearer separation between headings and tags

### 6. The language is easier to implement and easier to trust

The goal is that a second implementation can read the spec and corpus and reach
the same result without importing a pile of historical parser folklore.

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

```crv
/italic/
*bold*
{_underline_}
{~strikethrough~}
{=highlight=}
{^super^}
{,sub,}
```

The goal is that the delimiter gives the user a cue about the output:

- `/` leans like italics
- `*` feels heavy
- `_` sits below the baseline
- `~` reads as a strike line
- `=` reads as a marker band
- `^` points upward
- `,` pulls downward

That makes the syntax easier to recover after time away from the language.

In 0.1, underline, strike and highlight were bare pairs, `_underline_`,
`~strike~` and `=highlight=`. 0.2 keeps the same characters but only inside
braces: only `/` and `*` pair as bare delimiters, so `snake_case`, `~/config`
and `x = 1` can never turn into markup.

### 2. Stricter word-boundary rules for accidental markup

Carve is intentionally stricter than Djot for `/` and `_`.

This is a core example:

| Input | Carve result | Why |
|------|------|------|
| `/italic/` | emphasis | clear delimiter pair |
| `a/b/c` | literal | slash is intraword |
| `snake_case` | literal | a bare underscore is text in 0.2 (in 0.1: intraword) |
| `/ spaced /` | literal | whitespace invalidates the span |
| `` `/etc/nginx/` `` | code | code wins before emphasis |

This is one of the places where Carve is not merely "Djot with different
spelling." The language deliberately tries harder to avoid accidental markup in
technical prose.

### 3. Removing or refusing ambiguous legacy forms

Carve avoids syntax that would reintroduce block ambiguity. A good example is
setext headings:

```markdown
Heading
---
```

That familiar Markdown form collides with:

- thematic breaks
- frontmatter fencing at document start

Carve keeps prefix headings. In 0.2 the canonical marker is `=`, and `#` stays
valid for authors coming from Markdown:

```crv
= Heading
```

and drops the underline form specifically to keep block parsing simpler and
less surprising. In 0.2 the two lines above are one paragraph, `Heading` and a
dash, and lint reports `setext-heading-underline`.

### 4. Making common semantics native instead of workaround-driven

Carve promotes several things to first-class syntax because they recur in real
documents and otherwise force awkward workarounds:

- captions for images, block quotes, and tables
- abbreviations
- table rowspans, colspans, and multi-line cells
- mentions and tags
- a generic inline extension form
- in 0.2, named snippets of repeated inline text

Example:

::: compare
```crv
![Photo](img.jpg)
^ Figure 1: Caption text

*[HTML]: HyperText Markup Language

Press [Ctrl+C]{kbd} in HTML.
```
```html
<figure>
  <img src="img.jpg" alt="Photo">
  <figcaption>Figure 1: Caption text</figcaption>
</figure>
<p>Press <kbd>Ctrl+C</kbd> in <abbr title="HyperText Markup Language">HTML</abbr>.</p>
```
:::

Native syntax gives the parser a clear semantic target and gives implementations
a common contract.

## Where the parts come from

Carve takes its parsing rationale from Djot and its authoring ergonomics from
Markdown. Neither is a fork: the ideas were adopted deliberately and the
divergences are recorded in [Divergence from Djot](./divergence-from-djot) and
[Coming from Markdown](./migrate-from-markdown).

**From Djot** - linear parsing with no backtracking, local inline
tokenization, single-character emphasis, arbitrary `{#id .class key=value}`
attributes on any element, generic `:::` containers, and the rule that content
means the same thing inside a container as outside it. The parser contract
above is Djot's model, kept.

**From Markdown** - paragraph interruption, in a narrower form in 0.2. Six
kinds of line end an open paragraph without a blank line: a fence line, a list
marker that continues an open list, a description or term mark at an open
description list's column, a caption line under a lone block image or display
math line, a table row and a thematic break. A heading, a quote, an attribute
line, a definition and a list marker that starts a new top-level list are lazy
lines of the paragraph and need a blank line before them; lint reports them as
`block-opener-without-blank-line`. In 0.1 more openers interrupted. See
[Paragraphs and interruption](./divergence-from-djot#paragraphs-and-interruption)
and the [ownership procedure](./ownership-procedure) for the context rules.

**From Creole** - `|=` for table headers. The wiki markup got this right:
marking the header cells themselves needs no separator row under the first row,
so a table stays readable in source and a header can appear anywhere a row can.
0.2 puts alignment on the same mark, `|={>}`, and drops the GFM separator row
that 0.1 still accepted.

Carve's own additions - visual mnemonics, captions, cross-references,
references that resolve to headings, admonitions, abbreviations, comments,
mentions and tags, snippets, and target-aware rendering - are the subject of
the section above and of the [Case Study](./case-study/). 0.1 also had a `+`
list continuation line; 0.2 removes it, and a block that belongs to an item is
indented under the item instead.

## What 0.2 adds to the design

0.1 specified syntax and HTML in one grammar. 0.2 splits the path from source to
output into stages, each with its own document and its own contract.

### Separate the stages

The block chapter decides line ownership and block nodes. The inline chapter
reads the text inside them. Definitions resolve after parsing without changing
the token boundaries already read. The HTML chapter then defines output from
the resolved tree. This separation makes a rendering difference traceable to a
stage and clause.

### Reduce punctuation collisions

In 0.2 an authored heading begins with `=`, while a thematic break is `***`.
That leaves a line of hyphens to be read by its own rule instead of treating
the same line as several unrelated constructs. Likewise, underline, strike and
highlight use braced forms rather than bare delimiter runs.

The goal is a rule that remains readable when prose, code-like identifiers and
markup meet. A parser still has to follow the exact boundary clauses;
familiarity with Markdown or 0.1 is not enough to predict a 0.2 result.

### Make the tree portable

AST 2.0 defines node types, fields, equality, positions, reader checks and
migration. Author spelling that should not affect tree equality belongs in the
source-layout sidecar. The writer produces canonical source from a tree and
reports when a supplied tree has no faithful source spelling. This gives
editors and converters a clear boundary between meaning and source layout. See
[AST JSON](./ast-json) and [Source layout](./ast-source-layout).

### Keep a single output contract

HTML is the specified rendering target. The [HTML import](./html-import)
mapping defines the path back into a tree, including losses. Markdown, plain
text and ANSI writers are outside 0.2.0. [Includes](./includes) and
[extensions](./extensions) have explicit boundaries so a host can decide what
it permits. The extension interface is still provisional for this candidate.

### Make claims testable

The ten documents have numbered clauses and a shared corpus of examples, extra
clause cases and refused trees. Data tables state finite sets such as options
and lint codes. The specification checks internal consistency, while each
engine tests its own result against those cases. A passing case is narrow
evidence, not proof for every possible document. See
[Conformance](./conformance).

## Concrete ambiguities Carve resolves

### Paths vs italics

The obvious objection to `/italic/` is file paths.

Carve's answer is not "slashes are never risky." It is:

- intraword slashes stay literal
- whitespace-sensitive boundary rules decide whether a slash can open or close
- paths in code position should still be written as `` `/code/path/` ``

Examples:

::: compare
```crv
Use /italic/ for emphasis.
Open `docs/index.md` for the homepage.
The route is a/b/c.
```
```html
<p>Use <em>italic</em> for emphasis.
Open <code>docs/index.md</code> for the homepage.
The route is a/b/c.</p>
```
:::

A span holding its own delimiter between two word characters does not form, so a
path with two or more segments is never italics. A single segment such as
`/etc/` has the shape of an italic word and cannot be told apart without
context, so it needs a code span. In 0.1 the same rule kept `_my_var_` from
being underlined; in 0.2 a bare underscore is text, so the question no longer
arises.

### `^` meaning "caption" vs "footnote" vs "rowspan"

Carve reuses `^`, but only with hard contextual boundaries:

- line-start `^` after a figure-like block means caption
- table-cell `^` as the sole cell content means rowspan
- `^[` opens an inline footnote
- superscript is the braced `{^text^}` only: a bare inline `^` is literal
  text, so it never competes with the channels above

Examples:

::: compare
```crv
x{^2^}

| Topic | Item |
| ^ | A |

![Photo](img.jpg)
^ Figure 1
```
```html
<p>x<sup>2</sup></p>
<table>
  <tbody>
    <tr><td rowspan="2">Topic</td><td>Item</td></tr>
    <tr><td>A</td></tr>
  </tbody>
</table>
<figure>
  <img src="img.jpg" alt="Photo">
  <figcaption>Figure 1</figcaption>
</figure>
```
:::

Each form is resolved from local structure, not from speculative lookahead over
the rest of the document.

### `*[` meaning abbreviation vs bold containing a link

This is another place where Carve pins the distinction to a stable rule.

At line start, with a `WORD]:` pattern:

```crv
*[HTML]: HyperText Markup Language
```

Inside normal inline content:

::: compare
```crv
See *[the docs](https://example.com) first*.
```
```html
<p>See <strong><a href="https://example.com">the docs</a> first</strong>.</p>
```
:::

The construct is not left vague and implementation-defined. The grammar tells
you which one it is.

### `#` meaning heading vs tag

Markdown users already expect:

```markdown
# Heading
```

Carve keeps that, but also treats inline social tags as first-class:

::: compare
```crv
Track this under #parsing.
```
```html
<p>Track this under <span class="tag"><strong>#parsing</strong></span>.</p>
```
:::

The split is local and mechanical:

- line-start `# ` is a heading
- inline boundary `#name` is a tag

0.2 adds `=` as the canonical heading marker next to `#`. The split above still
holds for `#`; `carve fmt` writes headings with `=`, and lint reports a document
that mixes both markers as `heading-marker-mixed`.

Again, the language is trying to preserve a simple parser contract while
matching modern writing conventions.

## Examples where the parser contract matters

These examples show why the parser model matters more than individual syntax
choices.

### Example 1: nested emphasis without shortest-span guessing

::: compare
```crv
*bold /italic/ text*
```
```html
<p><strong>bold <em>italic</em> text</strong></p>
```
:::

Different delimiter types may nest. In 0.2 the same type nests too, and each
closer takes the nearest open entry of its kind; in 0.1 same-type children
needed explicit braced openers.

### Example 2: later definitions without reparsing earlier text

::: compare
```crv
The [spec][]

[spec]: https://example.com/spec
```
```html
<p>The <a href="https://example.com/spec">spec</a></p>
```
:::

The parser does not need to reinterpret the earlier line character by
character. It collects the definition table, then resolves the reference.

### Example 3: headings without setext collision

::: compare
```crv
= Intro

***
```
```html
<section id="Intro">
  <h1>Intro</h1>
  <hr>
</section>
```
:::

This is unambiguous:

- first line is a heading
- second is a thematic break

The underline heading form is absent, so the parser does not need to ask
whether a run of break characters belongs to the previous line or stands alone.
The 0.1 version of this example used `---` for the break; in 0.2 that line is a
dash in a paragraph.

## What this buys implementers

If you are writing a parser, syntax highlighter, linter, formatter, or editor
support, the language's discipline matters as much as its user-facing syntax.

Carve is designed so implementers can rely on:

- a block-then-inline parser pipeline
- linear-time delimiter handling
- stable disambiguation rules
- numbered normative clauses plus a shared conformance corpus
- fewer "special cases because Markdown did it that way"

That should lower the cost of building a second implementation that
matches the first one.

## What this buys authors

The same design helps writers, even if they never think in parser terms.

Authors get:

- fewer accidental interpretations
- syntax that is easier to remember from shape alone
- clearer expectations about what is literal and what is markup
- less dependence on which Markdown flavor a tool happened to embed

## Reasons behind specific rules

The notes below explain individual clauses. They were written against the 0.1
grammar and cite its clause ids (`CARVE-P9-...` to `CARVE-P12-...`); the 0.2
specification renumbers its clauses as `C2-...` and maps most 0.1 clauses to
their 0.2 successors. Where 0.2 ported a rule, the note names the 0.2 clause;
where 0.2 changed or removed it, the note says what 0.2 does instead.

### HTML serialization (0.1 PART 10) {#html-serialization}

- §1: rewriting a table's `align` placement as `text-align` would change the
  document, not modernize an equivalent spelling. 0.2 decides it the other
  way: column alignment is written on each cell as `style="text-align: ..."`,
  and so is an authored `align` key on a paragraph, div or heading (C2-H-015).
- CARVE-P10-009 `data-task-state` (C2-H-032, C2-H-033 in 0.2): on the box, the
  attribute would put the selector one level below the content it wants to
  reach. It is what lets a document survive a render-and-import cycle: without
  it `[-]` comes back as `[ ]`, silently, because both spellings render the
  same box and no diagnostic can see a difference that is not there. Naming the
  state in the `aria-label` would invent copy the author did not write; the
  states are an author's shorthand rather than a vocabulary the spec can
  translate.
- CARVE-P10-015, raw blocks: a preservation mode that loses a block silently
  is worse than a default one that says so, so the option never suppresses
  the diagnostic. A carrier for a raw block would put arbitrary foreign
  content into an attribute or a comment, the target can never render those
  bytes, and roundtrip import is not a trust decision (CARVE-P10-017). In 0.2
  a raw HTML block with `rawHtml` off is written as a code block with the
  language `html` (C2-H-050), and no carrier exists for raw blocks.
- CARVE-P10-016, no `data-carve-src` row: the verbatim-source carrier is not
  awaiting a field. CARVE-P11-013 rules the glued opener canonical and the
  tree records no padding, fence length or fence character, so the one
  distinction such a carrier is observed to move, the space in
  ```` ``` php ````, is a spelling the specification already ruled against
  keeping. A field for it would reverse that clause rather than add to it.
  0.2 keeps the name reserved and never writes it (C2-H-114), and ports the
  glued-opener rule (C2-W-040).
- CARVE-P10-016, the width bound: this bullet bounded the 0.1
  `data-carve-col-widths` carrier, which held the dash widths of a GFM
  separator row. 0.2 removed the separator row and that carrier with it
  (C2-H-114), so the bound has nothing left to protect.
- CARVE-P10-016, content-escaped carriers: written unescaped, a
  `data-carve-raw` payload of `<b>` opens a tag the span never closes and the
  rest of the paragraph disappears into it. Reading the serialized markup back
  escapes the payload a second time, so a raw inline holding `&` returns
  holding `&amp;`. One escape per element because a span holding `abc` would
  import as `\a\b\c`, which is not Carve. The carrier stays in 0.2 and is
  written under `roundtrip` (C2-H-051).

### AST contract (0.1 PART 12 §5 to §16) {#ast-contract}

AST 2.0 is ported from the contract 2.0 draft of 0.1 PART 12. Several fields
these notes discuss changed on the way.

- CARVE-P12-023: a table of contents, a go-to-definition jump and a
  cross-document index each need the exact generated heading id, not a
  plausible one. AST 2.0 publishes it in the heading field `generatedId`,
  never in `attrs.id` (C2-A-134).
- CARVE-P12-026: hoisting reads like a violation of PART 11 §6 (a spelling the
  AST records is the author's), and is not one. It is accepted for footnotes
  because a footnote definition renders as a footnote either way, so the move
  costs the author placement and nothing else. 0.2 removes the need: a
  definition stands only at the top level of its file and keeps its place in
  source order, and no definition is moved or collected (C2-A-052).
- CARVE-P12-027: `loose` is what makes a definition list unlike a `list`,
  where `tight` is required and states the whole axis; for a definition list
  the derivation covers everything except the case the derivation cannot
  see. The name is `loose` and not `tight` on purpose: an absent `tight` read
  as false would say loose, the opposite of the default, while an absent
  `loose` means derived, which is the truth. It follows `list.bareMarker`, the
  other field that records an authored distinction the default spelling
  cannot express. AST 2.0 drops the field: a `definition_list` has no spacing
  field, and a renderer reads the blocks of each description (C2-A-064).
- CARVE-P12-068 (c): refusing `{"type":"widget"}` inside `attrs.keyValues`
  would refuse a document the engine's own parser produced.
- CARVE-P12-034: refusing a partition with no bodies would make a head-only
  table the one shape the field cannot describe. Holding counts keeps `rows`
  as the single sequence every consumer reads. The three parts are required
  together because a partition missing one of them describes no structure:
  the omission would have to be read as a zero, and a zero head is a claim
  rather than a silence. An absent `rowGroups` is why the field breaks
  nothing. AST 2.0 chose the other shape: the partition is held by
  `table_head`, `table_body` and `table_foot` nodes and the rows each holds,
  and no node carries a count of head rows (C2-A-086, C2-A-088).
- CARVE-P12-035 `figure_group`: a `panels` array repeating the children would
  let the two disagree, the same contradiction CARVE-P12-034's
  counts-not-copies rule makes unrepresentable. A consumer telling a group from
  a `figure` by probing for the missing `target` would break silently the day
  either shape grows a field, which is why the group is a new type rather than
  a target-less `figure`. AST 2.0 keeps `figure_group` as its own block type,
  with its caption in its own slot (C2-A-082).

### Carve writer (0.1 PART 11 §6 to §8) {#carve-writer}

- §6 combined form: `/*x*/` is the spelling Carve teaches, so normalizing it
  away would rewrite the documented form into one documented nowhere. 0.2 has
  no combined token at all: each order of the two delimiters is plain nesting,
  in the order written (C2-I-052), and `carve fmt` keeps both orders.
- CARVE-P11-014 (C2-W-062 in 0.2): an unprefixed cell was always padded
  (`| a | b |`), and the padded side is the one a reader can scan, so prefixed
  cells take the same padding.
- CARVE-P11-015 (C2-W-063): the rule is stated as a test rather than as the two
  characters `^` and `<`, because an enumeration goes stale the next time a
  cell-level marker is added.
- CARVE-P11-041: `X` and `x` spell one state, nothing downstream can tell
  them apart, and §1 holds because both parse to the same AST, so the field
  admits eight characters rather than nine. 0.2 simplifies the rule
  (C2-W-046): a parsed `X` becomes `x` in the tree.
- CARVE-P11-016 (C2-W-021): indenting a blank line inside a list item to the
  content column would keep the block structure visible in the source, but a
  whitespace-only line is not stable. Editors that strip trailing whitespace
  on save, `git apply --whitespace=fix` and CI whitespace checks all rewrite
  it, so a formatter emitting one produces output that ordinary tooling
  changes behind it, and is not idempotent in practice.
- CARVE-P11-017: normalizing a whitespace-only element to a space keeps a
  node while discarding the one property that distinguishes U+00A0 from a
  space. The paragraph it leaves is unspellable, so it vanishes the moment
  the writer runs, the two exits disagree about the same import, and §1
  breaks on a document the importer built itself. In 0.2 this is a rule of
  the HTML importer, not of the writer.
- CARVE-P11-020 (C2-W-080): the depth half of the line-block rule matters. A
  reading under which a boundary inside an emphasis run stays soft removes the
  permission's premise, and the writer would then lose the break on `*a\`
  over `b*`. The permission is stated as the property it rests on rather
  than as a list of the places it runs out; it is §7 applied where §7's
  condition does not hold, not a new principle.

The 0.1 note on CARVE-P11-022 M2 explained an escape rule of the Markdown
writer. That writer is outside 0.2.0, so the note went with it (see "Writer
targets" below).

### Writer invariants (0.1 PART 11 §1 to §5) {#writer-invariants}

- CARVE-P11-003 (C2-W-012 in 0.2): a block that contributes nothing is not a
  side, so the rule is written over contributed tokens rather than over
  sibling positions.
- CARVE-P11-004 (C2-W-013): a contract that promises the invariant without
  qualification, while carrying an exception nothing declares, is worse than
  a narrower contract that is true as written, because every reader of the
  first one is entitled to rely on it. The rule is stated over what a shape
  spells because the two shapes share no node type: `image` is in the inline
  vocabulary and `comment` in the block one (see [Profiles](./profiles)), so a
  rule over types would have to name them one at a time. A writer that
  consulted resolution would write the same paragraph differently depending on
  whether a definition appears elsewhere in the document, which is why the
  writer does not read whether a paragraph resolved to a block image (in 0.1
  the field `paragraph.blockImage`). Uniformity is the half of the rule that
  decides the shape rather than merely describing it.
- CARVE-P11-005 (C2-W-014): the clause states what it does not forgive because
  a checker asserting `parse(fmt(x)) == parse(x)` has to encode both halves.
- CARVE-P11-010: a lone bracket is in the always-escaped set because of the
  search, not the output. A page with one such bracket per link, such as a
  wiki's `[edit]` markers, would otherwise drive CARVE-P11-009's halving to
  single units and spend its whole budget there. 0.2 simplifies both clauses
  (C2-W-010, C2-W-091); see [Writer escaping strategy](./writer-escaping-strategy).

### Writer targets (0.1 PART 11 §8 to §10) {#writer-targets}

The 0.1 notes in this section explained rules of the Markdown, plain-text and
terminal writers and of the Markdown importer. Those targets are outside the
0.2 specification: every engine still offers them, as engine behavior,
and the 0.2 writer chapter lists their 0.1 clauses as out of scope. The notes
remain on the `0.1` branch.

### Block semantics (0.1 PART 9 §12 to §15) {#block-semantics}

- §12 Tier 1: CSS frameworks target the eight admonition class names, which
  is why the set is fixed. Tier 2 is the fenced-div primitive the
  block-extension mechanism builds on (`::: mermaid`, `::: codepen`); an
  unregistered type renders as a plain div so the document stays readable.
  0.2 keeps both: an admonition is `<aside class="admonition KIND">`
  (C2-H-154), and any other div name is the first class of a `<div>`.
- CARVE-P9-018: an unnamed landmark is an anonymous row in a screen reader's
  landmark list. `aria-labelledby` keeps the visible and accessible name one
  string. When the author names the aside, a second naming attribute would
  leave the name undefined, and the author's is the more specific statement.
- §13: the skipped-level nesting falls out of the stack-close test
  (`top.level >= N`). Attributes other than the id stay on the heading
  because they describe it, not the section. Headings in containers do not
  wrap because a `<section>` models this document's outline: quoted material
  carries another document's outline, and a div or list item groups within
  one section. With `sections` off the top-level shape equals the
  in-container one, so id and attribute placement follow one rule. A fragment
  URL resolves to a `<section id>` as it does to an `<h* id>`. 0.2 keeps
  sections on by default, wraps top-level headings only, and moves only the id
  to the section (C2-H-026, C2-H-027).
- CARVE-P9-021: the empty attribute block exists so a default-attribute
  processor can target the span. In 0.2 `word[x]{}` still writes
  `word<span>x</span>`.

## Relationship to the rest of the docs

Use this page as the overview, then drill down:

- [Parsing & AST](./case-study/parsing-ast) for the parser model
- [Parsing ambiguities](./parsing-ambiguities) for tricky concrete scenarios
- [Design](./case-study/design) for the "why not just fix Markdown?" argument
- [Feature design notes](./native-features-analysis) for specific syntax choices
- [Dismissed syntax](./dismissed-syntax) for ideas that were rejected
- [Specification decision history](./spec-history) for 0.1 design history
- [0.2 specification](./grammar) for the canonical rules
- [Examples](./examples) for source-to-HTML behavior

**Specification (external):** [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-011 to C2-B-024 interrupters, C2-B-111 unclosed fences, headings, thematic break, tables), [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-001, C2-I-046 to C2-I-053 emphasis, braced delimiters, reference resolution), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (C2-H-015, C2-H-026, C2-H-027, C2-H-032, C2-H-033, C2-H-050, C2-H-051, C2-H-114, C2-H-154), [AST](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md) (C2-A-052, C2-A-064, C2-A-082, C2-A-086, C2-A-088, C2-A-134), [Source layout](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md), [Writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) (C2-W-010 to C2-W-014, C2-W-021, C2-W-040, C2-W-046, C2-W-062, C2-W-063, C2-W-080, C2-W-091, and the table of PART 11 clauses), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [Conformance corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md).
