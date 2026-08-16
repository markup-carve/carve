---
description: "The Carve linter: which rules exist, what each catches, and how to run it over a document set."
---

# Validation

Carve validation is exposed as a linter. It is designed for documents that
parse successfully but would still render as the wrong thing: broken links,
silent fallbacks, ignored definitions, and migration-era syntax that looks
valid at a glance.

## Command Line

Use the `carve lint` command from the TypeScript implementation:

```sh
carve lint doc.crv
carve lint docs/**/*.crv
carve lint < doc.crv
```

Output is one finding per line:

```txt
doc.crv:12:8 broken-crossref — Cross-reference </#missing> has no matching heading id; it renders as the literal text "</#missing>".
```

The command exits with `0` when the document is clean, `1` when it reports any
finding, and `2` for command or file-read errors. That makes it usable in CI
and pre-commit hooks:

```sh
carve lint docs/**/*.crv
```

By default `carve lint` reports the semantic rules below plus the
Djot/Markdown constructs that actually mis-render in Carve (`**bold**`,
`~~strike~~`, `^sup^`, and `+` bullets). It does **not** flag valid Carve
whose meaning merely differs from Djot — `_x_` (underline, not emphasis),
`~x~` (strikethrough, not subscript), and `{=x=}` (highlight) are intentional
in hand-written Carve, so surfacing them there is noise.

Pass `--from-djot` when the document was migrated from Djot and you want those
semantic shifts flagged too:

```sh
carve lint --from-djot doc.crv
```

Pass `--platform` when the output is destined for a host that re-linkifies bare
tokens in the text it renders. The flag is repeatable, and the rules it enables
report nothing without it:

```sh
carve lint --platform github doc.crv
```

## Programmatic API

JavaScript and TypeScript callers can use `lintCarve` directly:

```ts
import { lintCarve } from '@markup-carve/carve'

const warnings = lintCarve(source)
```

Each warning includes:

```ts
{
  rule: string
  message: string
  line: number
  column: number
  start: number
  end: number
}
```

If your renderer resolves headings with ASCII-folded ids, pass the same option
to the linter so cross-reference validation uses the same slug policy:

```ts
lintCarve(source, { asciiHeadingIds: true })
```

## Editor Diagnostics

The language server surfaces the same lint warnings as editor diagnostics, so
the command-line and editor behavior stay aligned.

## Rules

| Rule | Catches |
| ---- | ------- |
| `bidi-control-in-source` | a Trojan-Source bidi override or isolate control (U+202A–U+202E, U+2066–U+2069) that canonical Carve preserves but every presentation target strips |
| `duplicate-heading-id` | two headings producing the same id, either by slug collision or repeated explicit `{#id}` |
| `broken-crossref` | a `</#id>` cross-reference with no matching heading or numbered caption id |
| `unresolved-reference-link` | a `[text][label]` or `[text][]` reference link with no matching link definition; only the collapsed `[text][]` also falls back to the implicit heading target, so an explicit label that names no definition is unresolved even when a heading carries that text (PART 9R R1) |
| `unresolved-footnote` | a `[^label]` footnote reference with no matching `[^label]: ...` definition |
| `duplicate-footnote-definition` | a repeated `[^label]: ...` definition; the first definition wins and later ones are ignored |
| `unused-footnote-definition` | a footnote definition that is never referenced and is omitted from rendered output |
| `heading-trailing-attribute` | a trailing `{#id}` or `{.class}` on a heading line; attributes must go on the line above the heading |
| `raw-block-syntax` | a legacy `` ```raw FORMAT `` fence; Carve raw blocks use `` ```=FORMAT `` |
| `blockquote-marker-without-space` | a line starting with `>` that is neither a bare quote marker nor `> `; it renders as prose, not a block quote |
| `block-marker-as-text` | a line that opens like a block (`:::`, `{#`, `{.`) but parsed as plain text |
| `fence-delimiter-indentation` | an indented fenced-code delimiter (`` ``` `` / `~~~`); a Carve fence is column-exact and must sit at its container's content column (column 0 at the top level), so an indented run does not open a code block |
| `carve-version-unsupported` | a document declaring a Carve spec version the processor does not implement, so constructs added after that version render as something else without any error |
| `unclosed-container-fence` | a `:::` opener with no matching closer; the container runs to end of input, which is legal (PART 9 §12) and rarely what was meant |
| `fence-title-syntax` | text after a fence type word that is neither a quoted `"title"` nor a `[label]`, which makes the whole opener line plain text |
| `footnote-labels-differ-only-in-whitespace` | two footnote definitions whose labels differ only in whitespace; labels are matched exactly, so they are two separate footnotes and a reader comparing them sees no reason why |
| `table-cell-attribute-before-marker` | a table cell whose `{...}` block is written directly before a `<`, `>` or `~`, which is the order PART 9 §5 T10 retired; the block still attaches to the cell, but the marker is now literal content and the cell is not aligned. Reported and not rewritten: the retired order and the current one render different documents, so only the author can say which was meant |
| `semantic-attribute-value-ignored` | a non-empty value on a semantic span name that only selects its wrapper - `kbd` in core, and `samp`, `var`, `cite` where the SemanticSpan extension is enabled. The value reaches no output at all, so `[Dune]{cite="https://example.org/dune"}` renders `<cite>Dune</cite>` and loses the URL (PART 9 §9, §10) |
| `semantic-attribute-outside-span` | a reserved semantic name used where PART 9 §9 does not apply - a code span, link, image, block-attribute line or table row - where it stays an ordinary attribute, so `` `c`{kbd} `` is `<code kbd="">` rather than a `<kbd>`; `cite` on a block quote is exempt, see [semantic span attribute rules](#semantic-span-attribute-rules) |
| `platform-mention-token` | an at-prefixed word in text the document publishes, which a host platform re-linkifies into a user mention; opt-in and off by default, see [platform autolink rules](#platform-autolink-rules) |
| `platform-issue-reference` | a hash-number in text the document publishes, which a host platform re-linkifies into an issue reference; opt-in and off by default, see [platform autolink rules](#platform-autolink-rules) |
| `braced-comment-in-a-template-source` | a `{% … %}` comment whose content is itself a template tag (`raw`, `endraw`, `if …`, `endif`, `for …`, `endfor`, `block …`, `endblock`). Liquid and Nunjucks render before the converter runs, so a page that wraps its tags in `{% raw %}` hands Carve bare template text - and PART 9 §21a makes that text a comment. ONE warning per tag-shaped comment, so the report points at the constructs that vanish rather than at every comment in the file. Reported, never rewritten: only the author knows which of the two the document meant |
| `figure-group-nested` | a `::: figure` opener inside a composite figure's body; nesting is rejected (PART 9 §4c), so the inner fence stays a generic container |
| `figure-group-opener-metadata` | a `::: figure` opener carrying a quoted title or `[label]`; the figure production takes neither, so the fence stays a generic container with both preserved (PART 9 §4c) |
| `figure-group-panel-number` | a `#` placeholder in a PANEL caption; panels are not sequence units, so the placeholder stays a literal `#` (PART 9 §4c) - number the group caption instead |
| `figure-group-empty` | a `::: figure` group with no captionable panel; the group figure holds only the preserved content (PART 9 §4c) |
| `figure-group-single-panel` | a `::: figure` group holding a single panel; a plain captioned figure renders the same content without the group wrapper (PART 9 §4c) |
| `unattached-block-attribute` | a floating `{...}` block attribute that never reaches a block, because the document or the container holding it ended first (PART 9 §15 A4). Nothing is emitted for it, so `> {.k}` on a quote's last line renders neither on the quote nor on anything after it |

### Declaring a target version

`carve-version-unsupported` is the one rule that reads a declaration rather than
inspecting a construct. A document may state which Carve version it targets in
frontmatter:

```
---
carve-version: 0.1
---
```

The key is optional, and its absence is never a diagnostic. Frontmatter is raw
uninterpreted text to a Carve processor, so a linter reads this key without
implying that the declared frontmatter format is parsed.

A document with no frontmatter key falls back to the trailing `%% carve-version:`
provenance marker that `carve fmt --stamp` writes, so a stamped document is
covered without the author writing anything. When both are present the
frontmatter declaration wins: the two answer different questions - what the
document targets, versus what last processed it - and the rule is about intent.
See [versioning](./versioning) for what a version difference means for a stored
document.

### Semantic span attribute rules

`semantic-attribute-value-ignored` and `semantic-attribute-outside-span` read
the same reserved names, and both are scoped to the names the render being
linted actually turns into an element. PART 9 §9 reserves `abbr`, `time` and
`kbd` in core; `samp`, `var`, `cite` and `dfn` become elements only once the
`SemanticSpan` extension is registered. A name the caller's render leaves alone
is an ordinary attribute whose value reaches the output intact, so reporting it
would report a loss that is not happening.

That makes the extension selection an input to the linter, not just to the
renderer, and it is passed the way each engine already passes one:
`lintCarve(source, { extensions })` in carve-js, an `extensions` option on
`lint()` in carve-php, and `lint_carve_with_options` in carve-rs. The scoping was
settled in [carve#1167](https://github.com/markup-carve/carve/issues/1167). A
build predating it takes no such selection and treats all seven reserved names
as core, so the scoping described here is what to expect from an engine at or
after that ruling rather than from every build in circulation.

Whether an engine can register `SemanticSpan` at all is a separate question from
the scoping, and the [extension catalog](./extensions) is where it is tracked -
the reference engine does not export it yet, so its four names are what the
scoping is for rather than something every caller can switch on today.

#### The block quote exception

`cite` on a block quote MUST NOT be reported by `semantic-attribute-outside-span`.
It is not a semantic span there, but `cite` is a URL attribute of `blockquote`
and `q` in HTML, so the value the author wrote does reach the output:

```
{cite="https://example.org/dune"}
> Fear is the mind-killer.
```

```html
<blockquote cite="https://example.org/dune"><p>Fear is the mind-killer.</p></blockquote>
```

The exception is exactly that pairing. `cite` on any other off-span target still
reports, and any other reserved name on a block quote still reports. An engine
that ports the rule without the exception diverges on the first quote carrying a
citation URL.

#### What counts as an off-span target

Every node an authored `{attrs}` block can reach other than an ordinary
`[content]{attrs}` span. The size of that set is an AST fact rather than part of
the rule, so it differs between engines without either being wrong: carve-php
reaches 26 node types and carve-rs 29. carve-php folds an inline link, a
reference link and an autolink into one `link` type where carve-rs carries a
separate `autolink`, and each reaches a few types the other does not. An
implementation should test the node type against the reserved names rather than
enumerate the targets.

One shape is not a target in any engine: a table **cell** takes no attributes,
and `| a{kbd} |` leaves the braces literal. The table **row** takes them, on its
closing pipe, and that is what the rule reports.

### Platform autolink rules

`platform-mention-token` and `platform-issue-reference` are the only rules here
that read the document as text some **other** system will re-scan, rather than as
Carve. They are opt-in, platform-scoped, and **off by default**.

A host that renders published Carve output often re-scans the resulting text and
linkifies two token shapes on its own: an at-prefixed word becomes a user
mention, which notifies whoever owns that handle, and a hash-number becomes an
issue reference, which posts a backlink on whatever it resolves to. Neither was
meant as a reference in documents that merely discuss cron shortcuts, docblock
tags, decorators, package scope prefixes or numbered list items.

**No render-time construct prevents this.** The inline literal in PART 9 §27
guarantees that the *renderer* emits its content verbatim; it cannot bind a
platform that consumes the rendered HTML and re-parses the characters, because by
then the literal marker is gone and only the characters remain. Nor are inline
code spans a reliable escape: fenced code blocks survive on the hosts measured so
far, but some host surfaces linkify inside a code span. The source is the only
place the author's intent still exists, which is what makes this a linter's job
rather than the parser's.

#### Selecting a platform

A processor MUST NOT report either rule unless the caller names at least one
platform. The selection is a **list of host names**, not a boolean, so a second
host can bring its own token table without a second flag:

```ts
lintCarve(source)                              // neither rule can fire
lintCarve(source, { platforms: ['github'] })   // both rules are enabled
```

```sh
carve lint --platform github doc.crv
```

The command-line flag is repeatable. An unknown platform name is **ignored** on
the programmatic API and **refused** on the command line. The asymmetry is
deliberate: an API caller has a type checker to catch a misspelling, while a
misspelt flag that silently reported nothing would be indistinguishable from a
clean document.

`github` is the one platform name this specification defines. See
[what is left unspecified](#what-is-left-unspecified) below.

#### What each rule flags

For `github`:

`platform-mention-token` flags an `@` that is **not** preceded by a word
character, another `@`, a dot, a hyphen or a slash, followed by a name that
starts with a letter, digit or underscore and continues over letters, digits,
underscores, hyphens and interior dots. So an email address is not a mention,
while a scope prefix and a docblock tag are:

```
Write to user@example.com today.       no finding
Install @types/node now.               platform-mention-token
The @param annotation.                 platform-mention-token
```

`platform-issue-reference` flags a `#` that is **not** preceded by a word
character, another `#` or a slash, followed by **digits only** and not by a word
character or hyphen. So a heading marker, an id-shaped token and a version tag
are not issue references:

```
See #42 now.                           platform-issue-reference
See (#123) now.                        platform-issue-reference
The #a1 selector.                      no finding
The #release-1.0 tag.                  no finding
```

Both rules read **prose and inline code spans**, for the reason given above:
a code span is not reliably safe on every host.

Each finding names the host, quotes the token, and suggests moving the example
into a fenced code block, stripping the sigil and rephrasing, or rewriting an
enumerated reference as "item 1" / "point 1".

#### What neither rule flags

Neither rule fires on text a host never renders as prose. That is one principle
with several consequences, and a conforming implementation MUST apply all of
them, because a rule that reports a token nobody can see is the over-eager rule
this design exists to avoid:

- **fenced code blocks**, which are reliably safe;
- **raw blocks** and **comments**;
- **frontmatter**, which the renderer omits from the body;
- **link reference definitions** and **abbreviation definitions**, which render
  as the empty string;
- a **footnote definition that is never referenced**, which is dropped from the
  output entirely and which `unused-footnote-definition` already reports;
- an **inline link's destination**, and the path, query and fragment of a **bare
  URL**, because the host linkifies those as a URL rather than as a separate
  mention or reference.

Two surfaces that look excluded are deliberately checked, because both reach the
published page: the **caption of a captioned listing**, and the body of a
**referenced** footnote.

#### What is left unspecified

- **Which host platforms exist beyond `github`.** The signoff on
  [carve#297](https://github.com/markup-carve/carve/issues/297) settled that the
  rules are enabled per platform; it did not enumerate the platforms. Adding one
  means defining its token table with the same precision as the `github` table
  above, since the ids are shared and two engines flagging different token sets
  under one id is the portability break the next section forbids.
- **Whether a processor may offer a per-rule opt-in** rather than only a
  per-platform one. Nothing here forbids it; nothing requires it.

### Which implementations provide these rules

carve-js implements every rule in the table above. The other two engines
implement part of it, and `carve lint` is not the same command everywhere:

| implementation | `carve lint` | covers |
|---|---|---|
| carve-js | yes | every rule above, plus the Djot/Markdown migration checks |
| carve-php | yes | both semantic span attribute rules, both platform autolink rules, `bidi-control-in-source`, and Markdown-habit checks of its own (`markdown-strong-asterisks`, `markdown-strong-underscores`, `markdown-strikethrough`); none of the other rules above |
| carve-rs | no | both semantic span attribute rules, through the library entry points `lint_carve` and `lint_carve_with_options`; the binary has no `lint` command |

`semantic-attribute-value-ignored` and `semantic-attribute-outside-span` are the
first two rules all three engines carry. They share their ids, their triggers and
the block quote exception above. Their **messages** are not aligned yet: the tail
of the `semantic-attribute-outside-span` sentence quotes the attribute the
renderer actually emits in carve-php, and a fixed empty value in carve-js and
carve-rs, which is untrue whenever the author wrote one. Which spelling the
engines converge on is open and tracked in
[carve-js#1058](https://github.com/markup-carve/carve-js/issues/1058), so neither
form is canonical here. A consumer keys on the rule id, which the next section
makes binding, rather than on the sentence.

The two platform autolink rules are in carve-js and carve-php, and not in
carve-rs. They are specified here rather than left to one engine because the ids
are shared surface: a second engine implementing the same condition takes the
same two ids, the same `platforms` selection, and the same token tables, or a
`--platform` config stops being portable the moment it moves between engines.

### A rule id is a contract

**A lint rule id is spec surface.** Two implementations reporting the same
condition MUST use the same id, for the same reason two implementations parsing
the same document must use the same node type: anything keyed on the id — a CI
filter, an editor suppression, a `# carve-lint-disable` comment — is otherwise
unshareable, and a document's tooling config stops being portable the moment a
second engine touches it.

This does NOT require every engine to implement every rule. Coverage differs and
that is fine; the table above says so. What it forbids is two engines detecting
the same thing under different names.

Ids do not line up today: carve-php and carve-js both flag `**bold**` and
`~~strike~~`, under different names, so a suppression written against one is
silently inert against the other. Aligning them is a breaking change to any
existing config and is tracked in
[carve#268](https://github.com/markup-carve/carve/issues/268).

The CLI also reports Djot/Markdown delimiter collisions from the migration
checker — mis-rendering constructs by default, plus the Djot semantic shifts
under `--from-djot` — so `carve lint` is the broadest single validation
command.
