---
title: Carve 0.2 specification
description: Where to find the 0.2 syntax and processing rules.
---

# Carve 0.2 specification

The Carve 0.2 specification is a set of ten documents of numbered clauses, plus
JSON tables and schemas for the rules that have the shape of a table. It lives
in `spec/0.2/` on the `main` branch of this repository. It is a freeze
candidate, not a released standard: the status page names the current
candidate, what is frozen, and what is still open.

0.2 has no single formal grammar. The 0.1 specification was a layered EBNF
grammar (`resources/spec/*.ebnf`, concatenated into `resources/grammar.ebnf`),
with an Ohm grammar for inline content and a JavaScript model of the layout and
the HTML output. None of those files exist for 0.2. They remain on the `0.1`
branch and describe 0.1 only.

::: info Why prose clauses and tables instead of one grammar?
Carve's block structure depends on indentation, container prefixes, fence
matching and which open block owns a line, and its inline structure depends on
delimiter pairing and document-wide link definitions. No single grammar notation
expresses those together with resolution and canonical writing. 0.2 states each
rule as a numbered clause in plain prose, and moves the closed sets, such as
which lines interrupt a paragraph or which options exist, into JSON tables an
engine can load or generate code from.
:::

## The ten documents

| Document | Clause prefix | Defines |
|---|---|---|
| `syntax-blocks.md` | `C2-B-` | Lines, containers, paragraphs and interrupters, lists, quotes, divs, definitions, captions, tables, frontmatter |
| `syntax-inline.md` | `C2-I-` | Delimiters and pairing, escapes, links, references, footnotes, sigils, smart punctuation |
| `html.md` | `C2-H-` | Resolution, HTML output, render options, profiles, roundtrip carriers |
| `ast.md` | `C2-A-` | The 2.0 tree, its JSON form, equality, reader checks and migration from 1.x |
| `writer.md` | `C2-W-` | The canonical writer, `carve fmt`, escaping, diagnostics and lint |
| `source-layout.md` | `C2-L-` | The optional sidecar of spelling facts beside a tree |
| `includes.md` | `C2-N-` | Include expansion, resolvers, limits and dependency reports |
| `import-html.md` | `C2-M-` | HTML to a 2.0 tree and canonical Carve source |
| `tooling.md` | `C2-T-` | The library calls and command line every engine offers, flags, exit codes and reports |
| `extensions.md` | `C2-X-` | Extension registration, transforms and the standard extensions |

The extension mechanism is provisional and may still change within 0.2.x. The
other nine documents are frozen for the candidate; a frozen text changes only by
a ruling recorded with its reason.

Beside them, `UPGRADING.md` maps every 0.1 behavior to its 0.2 counterpart for
authors, integrators and tree consumers, and `STATUS.md` records the candidate,
the rulings and the known engine gaps. Neither defines behavior.

## How a clause reads

A clause is a paragraph that starts with its id, such as `C2-B-013`. The prefix
is new in 0.2, so no 0.1 id (`CARVE-P0-003` and so on) is reused with a new
meaning. A clause that starts with the word "Exception" carves a case out of a
more general clause; each document counts its exceptions at the end.

Each example is a `compare` container with the input and the expected result,
and the line above it gives its number and its status. A *verified* or
*generated* example was produced by an engine; an *unverified* one was written
by hand from the clauses. Both are expected results: where an engine differs,
the clause decides.

Here is one rule followed from clause to table to output. The block chapter
says that a paragraph closes at a blank line, at an interrupter, or with its
container (C2-B-013), and names six interrupters. The first is a fence line: a
run of three or more backticks, colons or percent signs (C2-B-014). So a code
fence directly below paragraph text starts a code block:

<!-- carve-sample {"fmtSkip":"shows a fence without the blank line that fmt adds before it"} -->
````crv
Some text
```js
let x = 1
```
````

```html
<p>Some text</p>
<pre><code class="language-js">let x = 1
</code></pre>
```

A heading is not an interrupter, so a heading line directly below text stays in
the paragraph, and lint reports it:

<!-- carve-sample {"lint":"shows a heading line that does not interrupt a paragraph"} -->
```crv
Some text
= Not a heading
```

```html
<p>Some text
= Not a heading</p>
```

The same rule is a row of `data/interrupters.json`:

```json
{
  "name": "a",
  "label": "fence_line",
  "shapes": ["code_fence_closer", "code_fence_opener", "comment_block_closer", "comment_block_opener", "div_bare_run", "div_opener"],
  "when": ["always"],
  "not_when": ["opens_a_counted_block_while_200_are_open"],
  "clauses": ["C2-B-013", "C2-B-014", "C2-B-070", "C2-B-078", "C2-B-190", "C2-B-228"]
}
```

An engine reads that row at build time, or loads it at start, instead of copying
the list into its own code. The row cites the clauses it encodes, and where a
row and its clause disagree, the clause wins and the row is a defect.

## Data tables and schemas

`spec/0.2/data/` holds the rules that are tables, as plain JSON. Each file has a
JSON Schema in `data/schemas/` that says what every field means. Among them:

| File | Holds |
|---|---|
| `line-shapes.json` | Every line shape of the block pass, keyed by the first character after the container prefixes |
| `interrupters.json` | The six paragraph interrupters, and the shapes that are lazy lines |
| `containers.json` | Each block that owns lines: how a line continues it, what closes it, how its body is read |
| `inline-scan.json`, `inline-delimiters.json`, `inline-brackets.json`, `inline-braces.json`, `inline-atoms.json`, `inline-sigils.json` | The inline scan and the forms built on delimiters, brackets, braces and sigils |
| `table-marks.json` | Cell split, cell prefix, span marks, alignment marks and table attributes |
| `escape-contexts.json` | The cases the writer tests for an escape |
| `limits.json` | Nesting depths, include and metadata bounds, the derived-text budget |
| `options.json` | Every option, with its type, default and the stages that read it |
| `lint-rules.json` | Every diagnostic code, with its channel, severity and reference message |
| `cli.json` | The commands, flags, failure categories and library calls of the tooling document |
| `import-html.json` | What the importer makes of each HTML element and attribute, its codes, and what a render without carriers loses |
| `ast-schema.json`, `layout-schema.json` | The JSON Schemas of the 2.0 tree and of the source-layout sidecar |
| `upgrade-map.json` | The machine-readable 0.1 to 0.2 upgrade map |

The data directory's README lists every file. The schemas check the shape of a
tree, but a valid tree must also pass the reader checks that the AST document
states in prose, such as position ordering and id references.

## Conformance corpus

Every example of the ten documents is also an entry of the shared corpus in
`spec/0.2/conformance/`, next to clause cases written for inputs no example
covers, trees a 2.0 reader must refuse, and the standard extension cases. The
[conformance page](./conformance) explains the files and how an engine runs
them.

## Checks in this repository

These commands check the specification itself. None of them runs an engine:

```sh
npm run spec2:data
npm run spec2:unicode
```

`spec2:data` validates each data file against its schema, checks that every
cited clause id exists, checks the tooling document against `cli.json` in both
directions, validates the tree fixtures in `spec/0.2/trees/` against the AST
schema and the reader checks, and fails when a generated corpus file is stale.
It also prints the clauses of the syntax chapters that no data row cites, as a
review list that does not fail the run. `spec2:unicode` fetches the pinned
version of `UnicodeData.txt`, checks its hash, and fails when the regenerated
`unicode-categories.json` differs.

The engines are measured separately, by the readiness gate that replays the
corpus through the JavaScript, PHP and Rust engines; see the
[conformance page](./conformance).

## Editor grammars are not the specification

[carve-grammars](https://github.com/markup-carve/carve-grammars) ships
highlighting grammars for Carve 0.2 in TextMate, Prism, highlight.js and Shiki
form, and the playground and this site use them. They exist to color source in
an editor. They approximate the language and do not decide what a document
means; the clauses do.

## Related pages

[Implementing Carve](./implementing-carve) gives a reading order and the checks
an engine should run. The [writer escaping page](./writer-escaping-strategy)
explains one part of the writer document in detail, the
[parsing ambiguities page](./parsing-ambiguities) covers edge cases, and the
[examples](./examples) show the HTML for each construct. For 0.1 source, use the
0.1 specification on the `0.1` branch.

**Specification (external):** [the 0.2 specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md), [status and freeze candidate](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md), [what is not frozen](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md#what-is-not-frozen), [block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md), [inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md), [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md), [writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md), [source layout](https://github.com/markup-carve/carve/blob/main/spec/0.2/source-layout.md), [includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), [tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [upgrading from 0.1](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md), [data tables](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/README.md), [conformance corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md), [0.1 specification](https://github.com/markup-carve/carve/tree/0.1/resources/spec).
