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
| `duplicate-heading-id` | two headings producing the same id, either by slug collision or repeated explicit `{#id}` |
| `broken-crossref` | a `</#id>` cross-reference with no matching heading or numbered caption id |
| `unresolved-reference-link` | a `[text][label]` or `[text][]` reference link with no matching link definition or implicit heading target |
| `unresolved-footnote` | a `[^label]` footnote reference with no matching `[^label]: ...` definition |
| `duplicate-footnote-definition` | a repeated `[^label]: ...` definition; the first definition wins and later ones are ignored |
| `unused-footnote-definition` | a footnote definition that is never referenced and is omitted from rendered output |
| `heading-trailing-attribute` | a trailing `{#id}` or `{.class}` on a heading line; attributes must go on the line above the heading |
| `raw-block-syntax` | a legacy `` ```raw FORMAT `` fence; Carve raw blocks use `` ```=FORMAT `` |
| `blockquote-marker-without-space` | a line starting with `>` that is neither a bare quote marker nor `> `; it renders as prose, not a block quote |
| `block-marker-as-text` | a line that opens like a block (`:::`, `{#`, `{.`) but parsed as plain text |
| `fence-delimiter-indentation` | an indented fenced-code delimiter (`` ``` `` / `~~~`); a Carve fence is column-exact and must sit at its container's content column (column 0 at the top level), so an indented run does not open a code block |
| `carve-version-unsupported` | a document declaring a Carve spec version the processor does not implement, so constructs added after that version render as something else without any error |

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

### Which implementations provide these rules

The table above is carve-js. The other engines do not currently match it, and
`carve lint` is not the same command everywhere:

| implementation | `carve lint` | covers |
|---|---|---|
| carve-js | yes | the rules above, plus the Djot/Markdown migration checks |
| carve-php | yes | Markdown-habit checks only (`markdown-strong-asterisks`, `markdown-strong-underscores`, `markdown-strikethrough`); none of the semantic rules above |
| carve-rs | no | the binary has no `lint` command |

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
