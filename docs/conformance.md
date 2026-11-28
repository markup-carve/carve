---
description: How the 0.2 conformance corpus checks implementations.
---

# Conformance

Carve 0.2 is still a freeze candidate, and no engine has a 0.2 release yet, so
this page has no table of released engines and match rates. The table that
stood here for 0.1 measured 0.1 engines against the 0.1 conformance pack, a
different corpus with different rules, and does not describe 0.2. What 0.2 has
instead is one shared corpus that every engine runs, and a readiness gate in this
repository that replays it through the JavaScript, PHP and Rust engines.

## The corpus

The corpus is plain JSON in `spec/0.2/conformance/`, with one JSON Schema
(`schema.json`) for its three main files:

| File | Holds | Made by |
|---|---|---|
| `examples.json` | Every example of the ten specification documents | Generated from the documents; not edited by hand |
| `clause-cases.json` | Inputs a clause decides that no example covers | Curated by hand |
| `refused-trees.json` | Trees a 2.0 reader must refuse | Generated from the tree fixtures |
| `extensions.json` | The HTML of the standard extensions | Curated by hand; outside the schema |

An engine needs a JSON reader and a loop: for each entry, run the operation its
`kind` names with its `options`, compare the result with each field of
`expected` that the engine implements, and report the `id` of each entry that
differs.

### Examples

An example entry has an `id` made of the document and the example number, such
as `syntax-blocks-12`, the clauses it belongs to, and a `kind`:

| `kind` | Input | Expected |
|---|---|---|
| `render` | Carve source | HTML, and the tree where the tree fixtures hold one |
| `write` | Carve source | The canonical Carve the writer gives |
| `lint` | Carve source | The diagnostic codes lint reports |
| `include` | An entry document and the files a resolver serves | HTML |
| `import` | HTML | The imported tree and the canonical Carve |

Each example also has a `status`. *Verified* means an engine produced the
expected output. For the syntax, HTML and writer documents, that is the 0.1
reference engine on an input whose 0.2 rule equals 0.1 behavior; for HTML
import, it is the reference importer at the commit the import document names.
*Unverified* means the output was written by hand from the clauses and no engine
has confirmed it yet. An unverified example is still the expected result: where
an engine differs, the clause decides, not the engine.

### Clause cases

A clause case covers an input that a clause decides and that no example holds.
Each one quotes the sentence that decides it, so a reader can check the
expectation against the text. Here is a case from `clause-cases.json`:

```json
{
  "id": "CC-004",
  "clauses": ["C2-B-225", "C2-B-105"],
  "why": "C2-B-225: Where it is not a space, a valid attribute block there is an attribute block (C2-B-105), and any other character, a brace block that is no valid attribute block included (C2-I-028 to C2-I-034), starts further words (C2-B-122).",
  "summary": "attribute block glued to div name not applied",
  "input": "::: word{k=v}\ntext\n:::",
  "options": {},
  "expected": {
    "html": "<div class=\"word\">\n  <p>text</p>\n</div>",
    "children": [{"type": "div", "children": [{"type": "paragraph", "children": [{"type": "text", "value": "text"}]}], "attrs": {"classes": ["word"]}}]
  },
  "from": ["js:R4", "php:R4", "rs:R4"]
}
```

The input is this source:

<!-- carve-sample {"lint":"the case input glues an attribute block to a div name, which lint reports","fmtSkip":"fmt drops the glued brace block, which is what the case is about"} -->
```crv
::: word{k=v}
text
:::
```

```html
<div class="word">
  <p>text</p>
</div>
```

The attribute block glued to the div name is part of the name's further words,
not attributes, so the div gets the class `word` and no `k`. `carve lint`
reports the glued block as `fence-opener-fallback`, and `carve fmt` writes the
opener as `::: word`. `from` names the
engine test files the case was merged from; it is empty for a case written from
the clauses alone.

A clause case can exercise more than rendering. Its `kind` names the library
call or command it runs: `render`, `parse`, `lint`, `format`, `layout`, `write`,
`tree`, `migrate`, `import`, `cli`, `position`, `diff`, `patch`,
`fingerprint` or `export`. A `cli` case runs the `carve` program in a directory
that holds exactly the case's files and compares the exit status, standard
output and the failure category on standard error. A case marked `engineLocal`
depends on a choice that a clause leaves to the engine; another engine may
differ on it without failing.

### Refused trees

Each refused tree has the clauses it breaks, a reason, and `refusedBy`: `schema`
when the AST JSON Schema refuses it, or `reader` when only a reader check beyond
the schema does. A 2.0 reader must refuse every one with `CarveTreeError`, and
where the entry gives a `path`, the error must point at that node or a field
below it.

## How results are compared

- **HTML and Carve source** are compared byte for byte.
- **Trees** are compared under the tree equality of the AST document, or with
  positions where the engine claims position support. In a clause case,
  `expected.children` is compared field by field, resolution fields included,
  so a case can pin a field by stating it and its absence by leaving it out.
- **Diagnostics** are compared by code, and by line, column, severity, channel
  or path where the case states them. Messages are not compared, except where a
  case names the message variant it expects. `diagnosticsComplete` says the
  record holds exactly the listed entries; otherwise it holds at least them.
  `notReported` lists codes that must not appear.
- **Refusals** are compared by the typed error, such as `CarveOptionError` or
  `CarveTreeError`, and the path it names.
- **Options** use the names of the options table. Options that take host code,
  such as extensions and renderers, are named by their standard extension
  names, and the runner registers the real thing.

A minimal runner for the render cases, against the JavaScript engine, looks like
this. A real runner also handles the other kinds, refusals, resolver files and
the host registrations some cases need:

```js
import { readFileSync } from 'node:fs'
import { render } from '@markup-carve/carve'

const { cases } = JSON.parse(readFileSync('spec/0.2/conformance/clause-cases.json', 'utf8'))
for (const c of cases) {
  if ((c.kind ?? 'render') !== 'render' || c.expected.html === undefined || c.files || c.host) continue
  let html
  try { html = render(c.input, c.options) } catch (error) { html = `refused: ${error.name}` }
  if (html.trimEnd() !== c.expected.html.trimEnd()) console.log(c.id)
}
```

## The readiness gate

`scripts/next2-readiness.mjs` replays the clause cases, the examples, the tree
fixtures and the extension cases through the JavaScript, PHP and Rust 0.2
engines, and compares each engine's outcome with a stored baseline. The baseline
records a fingerprint of everything the runner feeds an engine for each case,
and each engine's non-passing cases. Every case then falls in one class:

| Class | Meaning | Fails the job |
|---|---|---|
| Regression | The case is unchanged and an engine now does worse | Yes |
| Expected gap | The case is new or changed, and an engine does not pass it yet | No, reported |
| Known failure | The case is unchanged and fails as in the baseline | No, reported |
| Newly passing | The case is unchanged and an engine now passes it | No; advance the baseline to keep it |

Expected gaps are split into those the status page lists under its "Engine gaps"
sections and unlisted ones; an unlisted gap is a prompt to record it or fix the
case. On pull requests the gate replays the engine commits the baseline names,
so a red run means the pull request broke spec data, a generator or the runner.
On pushes and on a daily schedule it also replays the engines' current heads, and
reports their regressions as warnings. Aggregate counts and percentages appear in
the report but do not fail the job, because adding a case moves them without
anything getting worse.

The gate also replays the 0.1 conformance pack and the 0.1 examples through the
JavaScript upgrade tool, to measure how much 0.1 source upgrades cleanly. That
is a check of the upgrade path, not a 0.1 conformance score.

## What the corpus does not measure

- Inputs no example or case is near. The corpus grows from the specification and
  from engine findings, so a cause no case touches can stay unseen.
- Engine behavior outside the specification: the Markdown, GFM, Djot and BBCode
  importers, the Markdown, plain-text and ANSI exports beyond the few `export`
  cases, the `upgrade` command, and any engine-specific flag or call.
- Speed and memory. See [performance](./performance).

For how to read and compare engine results, see
[Implementation comparison methodology](./implementation-comparison-methodology).
`npm run spec2:data` checks the corpus itself: it fails when a generated file is
stale, when a file does not match the schema, when a clause case cites a clause
no document defines or quotes text that is not in that clause, or when an
expected tree is not valid. It does not run an engine.

**Specification (external):** [conformance corpus](https://github.com/markup-carve/carve/blob/main/spec/0.2/conformance/README.md), [AST equality](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#equality), [tooling library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library), [exit codes](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#exit-codes), [status and engine gaps](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md).
