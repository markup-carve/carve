---
description: "The Carve 0.2 linter and diagnostics record: every lint rule with an example, the parse and render-loss codes, and how to run, suppress and fix findings."
---

# Validation

A Carve document can parse without error and still render as something other
than what its author meant: a link to a heading that does not exist, Markdown
`**bold**` that stays literal text, a list marker one column off that folds
into the paragraph above. Carve validation finds these. It is exposed as a
linter, `carve lint`, and as a diagnostics record that every parse, render,
write and lint call returns beside its result.

## The diagnostics record

Every finding is one entry in one record. An entry has:

- a **code**, such as `broken-crossref`. A code is listed once in the shared
  catalog and is never renamed or reused, so tools can key on it;
- a **severity**: `hint`, `warning` or `error`;
- a **channel**: `parse` for what the parser met while reading the source
  (an unclosed fence, an include that failed), `lint` for what a lint rule
  found in a document that parsed, and `render-loss` for what a render or a
  write could not express in its target;
- a **message** for people;
- a **position**: a byte range in the source, a JSON Pointer path into the
  tree, or both. A command line shows the range as `line:column`.

Lint never changes the tree and never changes what `carve fmt` writes. It
only reports.

## Command line

```sh
carve lint doc.crv
carve lint docs/*.crv
carve lint < doc.crv
```

Each finding is one line: file, line, column, severity, code and message.

```txt
$ carve lint doc.crv
doc.crv:3:1: warning heading-level-skip This heading skips from level 1 to 3; use the next heading level for a continuous outline.
doc.crv:5:1: warning empty-link-destination This link has an empty destination.
doc.crv:7:6: warning bare-html-tag This bare HTML tag is escaped as text; use a raw HTML block if markup is intended.
```

The exit status makes the command usable in CI and pre-commit hooks:

- `0` when no entry has severity `warning` or `error`. A run with hints only
  also ends with `0`;
- `1` when an entry has severity `warning` or `error`, or with `--strict`
  when any entry was written, a hint included;
- `2` for a usage error or unreadable input. The first line on standard
  error then starts with `carve[usage]:` or `carve[input-unreadable]:`.
  Scripts can test that token; the wording after the colon may differ
  between implementations.

The flags of `carve lint`:

| Flag | Effect |
| --- | --- |
| `--json` | writes a JSON report instead of lines (see below) |
| `--rules '{"rule-id":"on"}'` | turns single rules on or off; a rule that is off by default is turned on by its id |
| `--upgrade` | turns on the migration notices (see [Migration notices](#migration-notices)) |
| `--platforms '["github"]'` | selects the platform rules (see [Platform autolink rules](#platform-autolink-rules)) |
| `--fix` | rewrites the findings that have a fix (see [Automatic repair](#automatic-repair)) |
| `--write`, `-w` | with `--fix`, replaces each file instead of writing to standard output |
| `--strict` | ends with status 1 when any entry was written, a hint included |
| `--ignore FILE` | drops the entries of that file; repeatable |
| `--include-root DIR`, `--includes` | where and whether includes are expanded (see [Included content](#included-content)) |
| `--heading-ids MODE` | lints with the heading ids the render uses, so fragment links compare against the same ids |
| `--extensions`, `--extension-options` | lints with the extensions the render uses |

`carve lint --json` writes one report for all files, with stable codes and
byte ranges, for editors, CI jobs and migration tools:

```json
{
  "files": [
    {
      "file": "fix.crv",
      "diagnostics": [
        {
          "code": "markdown-strong-double-star",
          "severity": "warning",
          "channel": "lint",
          "message": "Markdown `**strong**` is literal text in Carve, asterisks included. Carve strong is a single `*`.",
          "path": "/children/0",
          "range": { "startOffset": 2, "endOffset": 7 },
          "line": 1,
          "column": 3
        }
      ],
      "suppressed": 0
    }
  ]
}
```

`carve fmt --check FILE` is the other check worth running in CI: it fails
when a file is not in canonical form, without writing it. `carve fmt -w FILE`
writes the canonical form. Formatting is not a repair of a semantic error:
a broken cross-reference stays broken after `fmt`.

### Included content

`carve lint` on a file expands the include directives of that file, with the
directory of the file as the containment root, under the same rules and
limits as a render. Every rule then runs on each included Carve file too. A
finding in an included file names that file and the directive that reached
it, and a failed include is reported at its directive with the code of its
cause:

```txt
$ carve lint doc.crv
doc.crv:5:1: warning include-not-found Include "missing.crv" was not expanded: the file does not exist.
part.crv:1:6: warning bare-html-tag This bare HTML tag is escaped as text; use a raw HTML block if markup is intended. (included from doc.crv:3:1)
```

`--include-root DIR` names another root. Standard input has no file and so
no default root: `carve lint < doc.crv` expands nothing unless a root is
named. The include failure codes are listed under
[Parse and render-loss codes](#parse-and-render-loss-codes) below, and
[Includes](./includes) explains the directive itself.

## Automatic repair

`carve lint --fix` rewrites each finding of a rule that has a fix to the one
replacement its message names. Without `--write` it writes the fixed source
to standard output and the remaining findings to standard error; with
`--write` it replaces each file that changed. `carve fix` is the same command.

```txt
$ carve lint doc.crv
doc.crv:1:3: warning markdown-strikethrough-double-tilde Markdown `~~strikethrough~~` is literal text in Carve. Carve strikethrough is the braced `{~x~}`.
doc.crv:1:15: warning markdown-strong-double-star Markdown `**strong**` is literal text in Carve, asterisks included. Carve strong is a single `*`.
$ carve lint --fix doc.crv
doc.crv: fixed markdown-strikethrough-double-tilde 1, markdown-strong-double-star 1
x {~y~} and a *b* c
```

Eleven rules have a fix: `deprecated-bare-highlight`,
`deprecated-bare-strike`, `djot-emphasis-underscore`,
`djot-intraword-underscore`, `djot-plus-bullet`, `djot-subscript-tilde`,
`djot-superscript-caret`, `heading-closing-hashes`,
`markdown-strikethrough-double-tilde`, `markdown-strong-double-star` and
`thematic-break-spelling`. A rule whose message offers two readings, such as
`deprecated-bare-underline` (underline or emphasis?), has no fix, because only
the author knows which was meant. Under `--fix` every rule keeps the state it
has under `lint`: a rule that is off rewrites nothing.

Read the result before committing it. A fix changes the source, and for the
migration notices it changes what the document means: that is the point of
the fix, but it is a change all the same. To move a whole 0.1 document to 0.2,
use `carve upgrade`, described in [Upgrading to 0.2](./upgrade-0-2).

## Programmatic checks

The JavaScript package exports `lint`, which returns the entries of the lint
and parse channels for a source:

```ts
import { lint } from '@markup-carve/carve'

const findings = lint(source, {
  rules: { 'non-descriptive-link-text': 'on' },
  upgrade: false,
  platforms: ['github'],
  headingIds: 'lower',
})
```

Each entry is a diagnostic as described above: `code`, `severity`, `channel`,
`message`, and `range` (UTF-8 byte offsets) and `path` where they apply.
`positionOf(source, offset)` turns an offset into the `line` and `column` the
command line prints. Pass `headingIds` with the value you render with, so
`broken-fragment-link` compares against the ids your HTML carries. Pass the
render's `extensions` too: a rule about an extension's syntax only knows the
extensions it is given. With `includes` (a resolver, as for a parse), included
files are linted as well, and each finding of one carries its `file`.

`fix(source, options)` returns the source with every fix applied, as
`carve lint --fix` writes it, and `fixEdits(source, diagnostic)` returns the
edits for one finding, for an editor quick fix.

Rendering and writing report their own losses, which lint does not see. The
JavaScript API offers `parseWithDiagnostics`, `renderWithDiagnostics`,
`formatWithDiagnostics` and `writeWithDiagnostics` for that. Check the record
before you accept a conversion. `allowLosses` lists render-loss codes a host
accepts: they leave the record and never fail `strictLosses`. `maxLosses`
(default 100) caps the losses the record keeps and counts the rest in
`suppressedDiagnostics`. The command line sets them with `--allow-loss` and
`--max-render-losses`.

## Editor diagnostics

The language server reports the same entries as editor diagnostics, with the
same codes and ranges, so the command line and the editor agree.

## Suppressing lint findings

A line comment can switch rules off. Each control comment is `%%`, one
space, and one of four keywords, followed by rule ids separated by spaces or
commas. No id means every rule.

- `carve-lint-disable-line` suppresses the findings on its own line;
- `carve-lint-disable-next-line` suppresses those on the next line;
- `carve-lint-disable` suppresses from its own line to the end of the
  document;
- `carve-lint-enable` lifts a `carve-lint-disable` from its own line on.

This document reports nothing. Without its four comments it reports a
heading-level skip, an empty link destination and a bare HTML tag:

```crv
= One

=== Three %% carve-lint-disable-line heading-level-skip

%% carve-lint-disable-next-line empty-link-destination
[x]()

%% carve-lint-disable bare-html-tag

This <b> stays text.

%% carve-lint-enable bare-html-tag
```

An enable does not lift a line scope. A finding counts at the line it is
reported on. In an included file the line scopes count the lines of that
file, and a document scope ends with the file. Text of this shape inside a
code span, a code block, raw content, a braced comment or a comment block
controls nothing. `carve fmt` keeps a `carve-lint-disable-next-line` comment
directly above the line it names, so formatting never makes it suppress the
wrong line. A control comment with a blank line under it suppresses nothing.

## Rules off by default

Three kinds of rules stay quiet unless you ask for them.

**Opt-in rules.** `emphasis-as-heading`, `non-descriptive-link-text`,
`duplicate-reference-url` and the `djot-` rules report text that is often
written on purpose. Turn one on by its id:

```sh
carve lint --rules '{"non-descriptive-link-text":"on","djot-plus-bullet":"on"}' doc.crv
```

The `djot-` rules help a document that came from Djot: they report Djot
spellings that Carve reads differently, such as `_emphasis_` (plain text in
Carve) or a `+` bullet.

### Migration notices

The `deprecated-` rules and the other rules with the default `upgrade` in
the catalog (such as `continuation-reading-changed`, `sigil-after-letter`
and `thematic-break-spelling`) report text that 0.2 reads differently from 0.1: a spelling 0.2 removed, or
a line that a definition, a term or a caption now reads otherwise. They are
on for a document that declares a Carve version below 0.2 in its frontmatter,
and under `--upgrade`. `--rules` turns each of them on or off by its id over
both. When a 0.1 document has been upgraded and checked, remove the version
declaration or set it to `0.2`, and the notices stop.

### Declaring a target version

A document may state the Carve version it targets in a frontmatter block on
line 1:

```crv
---
carve: 0.1
---

Text.
```

The key `carve-version:` works the same way. A version below 0.2, such as
`0.1` or `0.1.13`, turns on the migration notices. The key is optional and its
absence is never a finding. It decides whether the migration notices run,
and `carve-version-unsupported` reports a value that is not a version or is
newer than the engine implements. See [Versioning](./versioning) for what a
version difference means for a stored document.

### Platform autolink rules

`platform-mention-token` and `platform-issue-reference` read the document as
text another system will scan again, not as Carve. A host that renders
published output often linkifies two token shapes on its own: an at-prefixed
word becomes a user mention, which notifies whoever owns that handle, and a
hash-number becomes an issue reference, which posts a backlink on whatever it
resolves to. Neither was meant as a reference in a document that discusses
docblock tags, decorators, package scopes or numbered items.

No render-time construct prevents this. A code span tells the Carve renderer
to write its content verbatim, but it cannot bind a host that scans the
rendered HTML again, and some host surfaces linkify inside a code span. The
source is the only place the author's intent still exists, so this is a
linter's job.

Neither rule reports anything unless a platform is selected. The selection is
a list of host names, so a second host can bring its own token table without a
second flag. `github` is the one platform defined so far:

```sh
carve lint --platforms '["github"]' doc.crv
```

```ts
lint(source, { platforms: ['github'] })
```

For `github`, `platform-mention-token` reports an `@` that is not preceded by
a letter, digit, `_`, `@`, `.`, `-` or `/`, followed by a name of letters,
digits, `_`, `-` and interior dots. An email address is not a mention; a
package scope and a docblock tag are. `platform-issue-reference` reports a
`#` that is not preceded by a letter, digit, `_`, `#` or `/`, followed by
digits only and not by a letter, digit, `_` or `-`. A heading id or a version
tag such as `#release-1` is not an issue reference.

Both rules read prose and code spans, for the reason given above. They skip
what a host never shows as prose: code blocks, raw blocks, comments,
frontmatter, definitions, an unreferenced footnote, and a link destination or
URL. Each finding names the host, quotes the token, and suggests moving the
example into a code block, or stripping the sigil and rephrasing.

## A rule id is a contract

A lint rule id is shared surface. Two implementations that report the same
condition use the same id, for the same reason two parsers use the same node
type: anything keyed on the id (a CI filter, an editor setting, a
`carve-lint-disable` comment) would otherwise stop working the moment a second
engine reads the document. Every code is one row of the shared catalog, and a
code is never renamed or reused. The 0.1 ids that 0.2 retired are listed
under [Retired 0.1 rule ids](#retired-0-1-rule-ids) with the code that took
over.

Message wording is part of the catalog too, but compare findings by code and
position, not by message text, when you match the output of two engines.

## Accessibility checks

`a11y/image-alt` reports an image without alternative text that is not marked
decorative, and `heading-level-skip` a heading that skips a level. Turn on
`non-descriptive-link-text` to report links labeled `here`, `click here` or
`read more`. These checks catch focused document-structure problems. They are
not a claim of WCAG conformance and do not replace testing the rendered page
with accessibility tools.

## Lint rule catalog

The following 124 lint-channel rows, every row except the two with status `void`, come from the shared rule catalog `spec/0.2/data/lint-rules.json`, which also defines the parse and render-loss codes, the exact messages and the conditions. `on` and `off` are the default settings; `upgrade` marks a [migration notice](#migration-notices), off unless the document declares Carve 0.1 or `--upgrade` is given; `platforms` marks a [platform rule](#platform-autolink-rules), off unless the option `platforms` selects its platform. The catalog is authoritative if a row changes. Each rule has an example in [Rule examples](#rule-examples) below.

| Rule id | Severity | Default |
| --- | --- | --- |
| `a11y/image-alt` | warning | on |
| `bare-html-tag` | warning | on |
| `bidi-control-in-source` | warning | on |
| `blank-reference-label` | warning | upgrade |
| `block-marker-as-text` | warning | on |
| `block-opener-overindented` | warning | on |
| `block-opener-without-blank-line` | warning | on |
| `blockquote-marker-without-space` | warning | on |
| `braced-comment-in-a-template-source` | warning | on |
| `braced-span-opener-as-text` | warning | on |
| `broken-crossref` | warning | on |
| `broken-fragment-link` | warning | on |
| `caption-looking-paragraph` | warning | on |
| `carve-version-unsupported` | warning | on |
| `code-span-padding-kept` | warning | upgrade |
| `colon-fence-length-mismatch` | warning | on |
| `comment-fence-closer-with-text` | warning | upgrade |
| `comment-in-reference-label` | warning | on |
| `comment-line-in-line-block` | hint | on |
| `comment-shaped-emphasis` | hint | on |
| `comment-splits-table-row` | hint | on |
| `consumed-key-near-miss` | warning | on |
| `continuation-reading-changed` | warning | upgrade |
| `definition-in-container` | warning | on |
| `definition-term-block-folded` | warning | on |
| `delimited-table-wide-row` | warning | on |
| `deprecated-bare-highlight` | warning | upgrade |
| `deprecated-bare-strike` | warning | upgrade |
| `deprecated-bare-underline` | warning | upgrade |
| `deprecated-cell-alignment` | warning | upgrade |
| `deprecated-continuation-marker` | warning | upgrade |
| `deprecated-indented-line-under-heading` | warning | upgrade |
| `deprecated-loose-attribute` | warning | upgrade |
| `deprecated-separator-row` | warning | upgrade |
| `deprecated-spaced-thematic-break` | warning | upgrade |
| `deprecated-substitution-arrow` | warning | upgrade |
| `deprecated-table-attribute` | warning | upgrade |
| `description-separator-below-content-column` | warning | on |
| `description-term-multi-line` | hint | on |
| `djot-definition-list` | hint | off |
| `djot-emphasis-underscore` | warning | off |
| `djot-emphasis-underscore-braced` | hint | off |
| `djot-heading-continuation` | warning | off |
| `djot-highlight-braces` | warning | off |
| `djot-intraword-underscore` | warning | off |
| `djot-ordered-marker` | hint | off |
| `djot-plus-bullet` | warning | off |
| `djot-subscript-tilde` | warning | off |
| `djot-subscript-tilde-braced` | warning | off |
| `djot-superscript-caret` | warning | off |
| `djot-tag-mention` | hint | off |
| `djot-typography-sign` | hint | off |
| `duplicate-reference-url` | warning | off |
| `emphasis-as-heading` | warning | off |
| `emphasis-marker-before-attributes` | warning | on |
| `empty-include-path` | warning | on |
| `empty-link-destination` | warning | on |
| `empty-reference-definition` | warning | on |
| `fence-closer-indented` | hint | on |
| `figure-group-empty` | warning | on |
| `figure-group-nested` | warning | on |
| `figure-group-opener-metadata` | warning | on |
| `figure-group-panel-number` | warning | on |
| `figure-group-single-panel` | warning | on |
| `footnote-labels-differ-only-in-whitespace` | warning | on |
| `footnotes-placement-in-container` | warning | on |
| `frontmatter-crossref` | error | on |
| `frontmatter-shaped-thematic-break` | warning | on |
| `github-alert-marker` | warning | on |
| `glob-shaped-strong` | hint | on |
| `heading-closing-hashes` | warning | on |
| `heading-level-skip` | warning | on |
| `heading-marker-mixed` | hint | on |
| `heading-trailing-attribute` | warning | on |
| `html-comment-renders-as-text` | warning | on |
| `include-attributes-unused` | warning | on |
| `include-lines-table-rows-hint` | hint | on |
| `indented-code-block` | warning | on |
| `link-definition-indented-line` | hint | on |
| `link-gap-before-destination` | warning | on |
| `list-item-block-overindented` | warning | on |
| `list-item-body-below-content-column` | hint | on |
| `list-marker-below-content-column` | warning | on |
| `list-marker-without-blank-line` | warning | on |
| `markdown-definition-paragraph` | warning | on |
| `markdown-strikethrough-double-tilde` | warning | on |
| `markdown-strong-double-star` | warning | on |
| `non-descriptive-link-text` | warning | off |
| `ordered-list-kind-split` | warning | on |
| `ordered-marker-right-aligned` | warning | on |
| `platform-issue-reference` | warning | platforms |
| `platform-mention-token` | warning | platforms |
| `quote-fence-ends-the-quote-above` | warning | on |
| `region-marker-renders-as-text` | warning | on |
| `reserved-syntax` | warning | on |
| `semantic-attribute-outside-span` | warning | on |
| `semantic-attribute-value-ignored` | warning | on |
| `setext-heading-underline` | warning | on |
| `sigil-after-letter` | hint | upgrade |
| `snippet-definition-id` | warning | on |
| `table-attribute-invalid` | warning | on |
| `table-column-arity` | warning | on |
| `table-column-overlap` | warning | on |
| `table-marker-run-padding` | warning | on |
| `table-row-attribute-as-cell` | warning | on |
| `table-row-cell-count` | warning | on |
| `table-row-count-clamped` | hint | on |
| `table-shaped-paragraph` | warning | on |
| `table-span-marker-attribute` | warning | on |
| `table-span-marker-blocked` | warning | on |
| `table-width-total` | warning | on |
| `thematic-break-spelling` | hint | upgrade |
| `tight-list-item-with-blank-line` | hint | upgrade |
| `unattached-block-attribute` | warning | on |
| `unattached-caption` | warning | on |
| `unattached-inline-attribute` | hint | on |
| `unclosed-braced-comment` | warning | on |
| `unclosed-inline-emphasis` | warning | on |
| `uneven-list-indent` | warning | on |
| `unresolved-footnote` | warning | on |
| `unresolved-reference-link` | warning | on |
| `unused-footnote-definition` | warning | on |
| `unused-link-reference-definition` | warning | on |
| `unused-snippet` | hint | on |

## Rule examples

Each rule below has its severity, its default, the condition it reports as the catalog states it, a short document that triggers it, and the output of `carve lint` on that document saved as `doc.crv`. Rules that are off by default show the flag that turns them on. The examples are kept short on purpose: most are the smallest input that shows the rule, not text you would write.

### `a11y/image-alt`

Severity `warning`, on by default. Reports an image that is neither decorative nor carries alt text, once per image: its alt is empty, as `![](a.png)`, or unknown (C2-A-115 names the three states); an image with alt text or `decorative: true` is not reported; a parse of Carve source never marks an image decorative and never leaves its alt unknown, so in source the rule reports exactly the empty alt.

<!-- carve-sample {"lint":"shows a11y/image-alt"} -->
```crv
![](x)
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning a11y/image-alt image has empty alternative text and is not marked decorative
```

### `bare-html-tag`

Severity `warning`, on by default. Reports the first HTML tag shape on a line of a paragraph, a heading or a pipe table row: `<`, an optional `/`, an ASCII letter, then ASCII letters, digits, `_`, `:` and `-`, optionally whitespace and characters other than `<` and `>`, an optional `/`, and `>`; once per line.

<!-- carve-sample {"lint":"shows bare-html-tag"} -->
```crv
a <b>c</b>
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning bare-html-tag This bare HTML tag is escaped as text; use a raw HTML block if markup is intended.
```

### `bidi-control-in-source`

Severity `warning`, on by default. Reports each bidirectional override or isolate control, U+202A to U+202E and U+2066 to U+2069, in text and code, the only places a render drops it: the value of a text, code span, code block or math node, title and label text included only when written between tags; a title written in an attribute, including a code title, is excluded; one finding per code point; the marks U+200E, U+200F and U+061C are not reported.

<!-- carve-sample {"lint":"shows bidi-control-in-source"} -->
```crv
a‮b
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning bidi-control-in-source Bidi override/isolate control U+202E is preserved by canonical Carve but not written to the text and code of presentation output; remove it unless intentional.
```

### `blank-reference-label`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a footnote or link reference or definition whose label is empty after folding, which is text in 0.2 and was a label in 0.1.

```crv
[ ]:
```

```txt
$ carve lint --upgrade doc.crv
doc.crv:1:1: warning blank-reference-label This label holds only spaces, tabs or a line break, so it is no label and "[ ]:" stays text; 0.1 read it as a label. Give the label a character that is not whitespace.
```

### `block-marker-as-text`

Severity `warning`, on by default. Reports a paragraph whose first text, after leading spaces and tabs, starts with a run of three or more colons, a run of three or more tildes (a refused code fence candidate under C2-B-108), or with `{.` or `{#`, a div opener or an attribute line that did not open, as `:::note` with the name glued to the run, once per paragraph on its first line; and, by the row's change, a paragraph line that, after leading spaces and tabs, starts with `{` followed by `.`, `#`, `_` or an ASCII letter and is no valid attribute line, as `{a=}`, once per line; a colon line that `fence-title-syntax` reports and a line that a list-indent rule reports are left to those rules.

<!-- carve-sample {"lint":"shows block-marker-as-text"} -->
```crv
{a=}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning block-marker-as-text This line begins like an attribute line but parsed as plain text - the block did not open. Check this line's syntax and any unterminated fence above it.
```

### `block-opener-overindented`

Severity `warning`, on by default. Reports a block opener that stands past the content column of its owner and still opens there: a quote mark, a colon fence, a code fence or line block, a definition term, a heading, a thematic break or a pipe table row, where the owner is the document (content column 0), a quote, a footnote body, a description or a div; not a list marker, not a `%%%` comment fence, not a table row directly below a row, and never inside a list item, which `list-item-block-overindented` reports; once per opener.

<!-- carve-sample {"lint":"shows block-opener-overindented","fmtSkip":true} -->
```crv
  > a
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning block-opener-overindented This quote is indented 2 columns past the content column of document, and it still opens a quote, measured from its own line. Remove the indentation to make the structure explicit, or escape the opener to keep the line as text.
```

### `block-opener-without-blank-line`

Severity `warning`, on by default. Reports each line inside a paragraph or a caption that would open a block after a blank line: a heading, a quote line, an attribute line, a term or description mark, or a definition; once per candidate line, the range is the marker or attribute block on that line; a line that no open container owns is a lazy line of the paragraph and its candidate is its first marker, a quote mark included; a blank line is one as C2-W-143 reads it.

<!-- carve-sample {"lint":"shows block-opener-without-blank-line"} -->
```crv
a
# b
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning block-opener-without-blank-line This line looks like a heading but directly follows text, so it is part of the paragraph or caption above it. Add a blank line before it.
```

### `blockquote-marker-without-space`

Severity `warning`, on by default. Reports a line of paragraph, heading, cell, term, caption or line of a line block text, or expressly a frontmatter line, whose first character, at column 1 with no indent and no container prefix before it, is `>` followed by a character that is not a space, so `>a`, `>>a` and `>` followed by a tab, which are text; a bare `>` is not reported; once per line.

<!-- carve-sample {"lint":"shows blockquote-marker-without-space"} -->
```crv
>a
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning blockquote-marker-without-space A blockquote marker must be bare `>` or followed by a space. This line is literal text; write `> a` to quote it.
```

### `braced-comment-in-a-template-source`

Severity `warning`, on by default. Reports a braced comment whose content, trimmed, is exactly `raw`, `endraw`, `endif`, `endfor` or `endblock`, or is `if`, `for` or `block` followed by whitespace and at least one further character, as `{% if x %}`; once per comment.

<!-- carve-sample {"lint":"shows braced-comment-in-a-template-source"} -->
```crv
{% if x %}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning braced-comment-in-a-template-source This braced comment is a template tag. Liquid, Nunjucks, or Twig source may have reached Carve as text; the tag is parsed as an invisible comment.
```

### `braced-span-opener-as-text`

Severity `warning`, on by default. Reports a braced opener inside a bare emphasis or strong span that is removed and left as text because a bare delimiter after it closed that span, which opened before it, where a braced closer of the opener's mark follows later in the same content, so the braced span would have formed without that delimiter; a braced opener removed by a braced closer of an outer braced span, as in `{+a {*b+} c*}`, and one that has no closer of its mark are not reported; once per opener, the range is the two characters of the opener.

<!-- carve-sample {"lint":"shows braced-span-opener-as-text"} -->
```crv
*a {/b*/}
```

```txt
$ carve lint doc.crv
doc.crv:1:4: warning braced-span-opener-as-text This braced span did not open: the delimiter inside it closed a span that started before it. Escape that delimiter.
```

### `broken-crossref`

Severity `warning`, on by default. Reports a cross-reference whose id, normalized to NFC, matches no heading id, authored or generated, and no id of a table, a figure or a figure group whose caption has a number mark, nor of a panel of such a group; matching is exact, so an id that differs only in case is reported; once per cross-reference, in footnote bodies too.

<!-- carve-sample {"lint":"shows broken-crossref"} -->
```crv
</#nope>
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning broken-crossref Cross-reference </#nope> has no matching heading id; it renders as the literal text "</#nope>".
```

### `broken-fragment-link`

Severity `warning`, on by default. Reports a link whose destination starts with `#` and whose fragment, the part before any `:~:` and tested both as written and percent-decoded, is not empty, is not `top` in any letter case, and is no `id` (and no `name` of an `a` element) in the rendered HTML of the document under the `headingIds` of the run, heading, footnote, note mark and raw HTML ids included; once per link; not reported at all while an extension that generates ids is registered for the run, whether or not the document contains a node of that extension; an extension that generates no ids changes nothing.

<!-- carve-sample {"lint":"shows broken-fragment-link"} -->
```crv
[a](#nope)
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning broken-fragment-link Link to "#nope" matches no id in this document, so the link goes nowhere.
```

### `caption-looking-paragraph`

Severity `warning`, on by default. Reports a paragraph line whose text, after container prefixes and indent, matches case-insensitively `^(?:\*?\s*(?:Caption|Table|Tabelle|Figure|Image)(?:\s+\d+)?\s*:|:\s+\S)`; the optional number needs whitespace before its digits, so `Caption 2:` matches and `Caption2:` does not; a match reports when a pipe table row starts one or two lines above or below it or one of the two lines above holds `![`; once per line, the range is the first character of the matched line.

<!-- carve-sample {"lint":"shows caption-looking-paragraph","fmtSkip":true} -->
```crv
Caption: x
| a |
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning caption-looking-paragraph This caption-looking paragraph is above the table. Move it directly below the table and start it with `^ ` to make a caption.
```

### `carve-version-unsupported`

Severity `warning`, on by default. Reports a line `carve-version:` (and, by the row's change, `carve:`) in the line-1 frontmatter block, with only spaces and tabs around the key and a single value token, whose value is not dot-separated decimal digits, or is such a version greater than 0.2 compared part by part as numbers with missing parts as 0, so `9.9`, `0.2.1` and `next` are reported and `0.1`, `0.2` and `0.2.0` are not; with no such line in the line-1 block, the same test on the `carve-version:` value of a `%%` stamp comment that ends the document; if more than one declaration meets this test, the first in source order supplies the report, `${version}` and the message condition; the range is that declaration's value token; once per document means one finding, not a document-wide range.

<!-- carve-sample {"lint":"shows carve-version-unsupported"} -->
```crv
---
carve: 9.9
---
```

```txt
$ carve lint doc.crv
doc.crv:2:8: warning carve-version-unsupported This engine implements 0.2; features of the declared 9.9 version may be unsupported. Write `carve: 0.2` only if the source uses 0.2 features.
```

### `code-span-padding-kept`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a code span, a literal-text span, a math span or a raw inline span whose value differs from the value 0.1 read: 0.1 removed one space from each end when the content started and ended with a space and held a character that is not a space, and 0.2 removes only a space between a backtick and the run. Since the content never starts or ends with a backtick, the 0.2 value decides it: exactly one end of the value is a backtick, or the value starts and ends with a space and holds a character that is not a space. Once per span, the range is the span.

<!-- carve-sample {"lint":"shows code-span-padding-kept","fmtSkip":true} -->
```crv
---
carve: 0.1
---
a ` x ` b
```

```txt
$ carve lint doc.crv
doc.crv:4:3: warning code-span-padding-kept The spaces at the ends of this span read otherwise than in 0.1, which removed one space from each end when both ends held one; 0.2 removes only a space next to a backtick. Check the spaces at the ends of the span.
```

### `colon-fence-length-mismatch`

Severity `warning`, on by default. Reports a bare colon run, three or more colons and nothing after them but spaces and tabs, inside an open colon container (a div of any name, a line block or a hard-break block) whose innermost opener run has another length; the container counts only where it is open inside the run's own innermost container, so a run in a quote or list item that sits in a div, with no colon container open inside that quote or item, is not reported, since it cannot close the outer div; the run closes the innermost open container it is long enough for and every one inside it, or opens an anonymous div when it is long enough for none, and the message names that outcome; once per run.

<!-- carve-sample {"lint":"shows colon-fence-length-mismatch","fmtSkip":true} -->
```crv
:::
a
::::
```

```txt
$ carve lint doc.crv
doc.crv:3:1: warning colon-fence-length-mismatch Bare 4-colon fence has a different width from the innermost 3-colon div opened at 1:1; it closes the container.
```

### `comment-fence-closer-with-text`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a line inside a comment block that starts with a `%` run of at least the opener's length and holds other text: it is content in 0.2 and closed the block in 0.1.

```crv
%%%
%%% x
%%%
```

```txt
$ carve lint --upgrade doc.crv
doc.crv:2:1: warning comment-fence-closer-with-text This line starts with a percent run and holds other text, so it is content of the comment block and does not close it. Put the closing run alone on its line.
```

### `comment-in-reference-label`

Severity `warning`, on by default. Reports a line comment that starts inside a reference label and takes the rest of the line, so that the brackets are text.

<!-- carve-sample {"lint":"shows comment-in-reference-label"} -->
```crv
[ %% c] d
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning comment-in-reference-label A line comment starts inside this reference label and takes the rest of the line, so the brackets are text. Move the comment out of the label, or escape the percent signs.
```

### `comment-line-in-line-block`

Severity `hint`, on by default. Reports a line of a line block that starts with `%%` and opens no comment block.

<!-- carve-sample {"lint":"shows comment-line-in-line-block"} -->
```crv
::: |
%% a
:::
```

```txt
$ carve lint doc.crv
doc.crv:2:1: hint comment-line-in-line-block A line comment is text inside a line block. Use the braced comment.
```

### `comment-shaped-emphasis`

Severity `hint`, on by default. Reports an emphasis span whose source starts with `/*` or ends with `*/`, or a strong span whose source starts with `*/` or ends with `/*`, as `/* foo */`; braced forms are not reported; once per span, at hint severity.

<!-- carve-sample {"lint":"shows comment-shaped-emphasis"} -->
```crv
*/a*
```

```txt
$ carve lint doc.crv
doc.crv:1:1: hint comment-shaped-emphasis This span looks like a C comment; use Carve comment syntax if you meant a comment.
```

### `comment-splits-table-row`

Severity `hint`, on by default. Reports a comment-only line, or the trailing comment of a row, between a table row and its continuation row.

<!-- carve-sample {"lint":"shows comment-splits-table-row","fmtSkip":true} -->
```crv
| a |
%% x
+ b |
```

```txt
$ carve lint doc.crv
doc.crv:2:1: hint comment-splits-table-row This comment stands between a table row and its continuation, so it belongs after the whole row. Move it above the row or below the continuation.
```

### `consumed-key-near-miss`

Severity `warning`, on by default. Reports a bare key with an empty value in the attributes of a `csv` or `tsv` code block, captioned or not, that is not `table` but is `table` in another letter case or one edit from it (an inserted, deleted or replaced character, or two adjacent characters swapped), as `tabel`, `tables`, `Table` or `atble`; once per key; `loose` on a list is no longer a consumed key.

<!-- carve-sample {"lint":"shows consumed-key-near-miss"} -->
````crv
{tabel}
```csv
a,b
```
````

```txt
$ carve lint doc.crv
doc.crv:2:1: warning consumed-key-near-miss "tabel" is not a consumed key here; did you mean {table}?
```

### `continuation-reading-changed`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a line whose reading changed between 0.1 and 0.2, where 0.2 reads it as C2-B-083, C2-B-084 and C2-B-234 say: the first line below the first line of a link definition or an abbreviation definition that the definition takes, a tail line or an expansion line, which 0.1 read as a paragraph, once per definition; the first line below the mark line of a term, comment-only lines skipped, that continues the term, which is indented past the term mark and which 0.1 read as a paragraph, once per term; and the line directly below the last line of a caption that the caption does not take, because it is not indented past the caret, when it carries as many quote marks as that last line and is text, a block image line, a display math line, a list item marker line, a description line or a heading line that starts with `=`, which 0.1 read as a lazy line of the caption; the range is that line.

<!-- carve-sample {"lint":"shows continuation-reading-changed","fmtSkip":true} -->
```crv
---
carve: 0.1
---
[a]: /url
  "Title"

See [a].
```

```txt
$ carve lint doc.crv
doc.crv:5:1: warning continuation-reading-changed This indented line continues the definition above in 0.2; in 0.1 it started a paragraph. Remove the indent to make it a separate block again.
```

### `definition-in-container`

Severity `warning`, on by default. Reports each definition-shaped line inside a container or indented at the top level; once per candidate line, the range is the bracketed label and colon, or the snippet marker and colon.

<!-- carve-sample {"lint":"shows definition-in-container"} -->
```crv
> {$v}: X
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning definition-in-container A definition is recognized only at column 0 outside every container, so this line is text. Put it at column 0 outside every container.
```

### `definition-term-block-folded`

Severity `warning`, on by default. Reports a term whose text starts with a quote mark or a list marker followed by a space, which C2-B-075 makes term text; `:: >a` and a block opener on a later line of the term are not reported; once per term, the range is the quote mark or the list marker.

<!-- carve-sample {"lint":"shows definition-term-block-folded"} -->
```crv
:: > a
```

```txt
$ carve lint doc.crv
doc.crv:1:4: warning definition-term-block-folded A quote mark or list marker after the term mark is term text. Put the intended block on a `: ` description line at the list column, such as `: > text` or `: - item`.
```

### `delimited-table-wide-row`

Severity `warning`, on by default. Reports a delimited table, a `csv` or `tsv` fence that the `table` attribute marks, in which any record has more fields than the first record; once per table.

<!-- carve-sample {"lint":"shows delimited-table-wide-row"} -->
````crv
{table}
```csv
a
b,c
```
````

```txt
$ carve lint doc.crv
doc.crv:1:1: warning delimited-table-wide-row A CSV/TSV record has more fields than the first record; the table keeps the extra columns.
```

### `deprecated-bare-highlight`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. `carve lint --fix` rewrites it. Reports a pair of bare `=` in one inline content that 0.1 read as highlight, read as if `=` were a bare delimiter of C2-I-046: the opener can open by C2-I-047, stands next to no other `=`, is not followed by `>` and is not the `=` of `!=`, `<=` or `>=`; the closer is the first later `=` that can close by C2-I-048 and is not the `=` of such a comparison, and a `=` between them that cannot close is text, so the pair does not nest; the content between them is not empty and may hold line breaks and other spans, and no pair forms where that content holds `=` between two word characters; a bare `=` followed by a combining mark, a variation selector or a zero-width joiner takes no part; once per pair, the range runs from the opener to the end of the closer.

<!-- carve-sample {"lint":"shows deprecated-bare-highlight","fmtSkip":true} -->
```crv
---
carve: 0.1
---
a =b=
```

```txt
$ carve lint doc.crv
doc.crv:4:3: warning deprecated-bare-highlight A bare equals pair is text in 0.2. Write the braced highlight.
```

### `deprecated-bare-strike`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. `carve lint --fix` rewrites it. Reports a pair of bare `~` in one inline content that 0.1 read as strike, read as if `~` were a bare delimiter of C2-I-046: the opener can open by C2-I-047, stands next to no other `~`; the closer is the first later `~` that can close by C2-I-048, and a `~` between them that cannot close is text, so the pair does not nest; the content between them is not empty and may hold line breaks and other spans, and no pair forms where that content holds `~` between two word characters; a bare `~` followed by a combining mark, a variation selector or a zero-width joiner takes no part; once per pair, the range runs from the opener to the end of the closer.

<!-- carve-sample {"lint":"shows deprecated-bare-strike","fmtSkip":true} -->
```crv
---
carve: 0.1
---
~x~
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-bare-strike A bare tilde pair is text in 0.2. Write the braced strike.
```

### `deprecated-bare-underline`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a pair of bare `_` in one inline content that 0.1 read as underline, read as if `_` were a bare delimiter of C2-I-046: the opener can open by C2-I-047, stands next to no other `_`; the closer is the first later `_` that can close by C2-I-048, and a `_` between them that cannot close is text, so the pair does not nest; the content between them is not empty and may hold line breaks and other spans, and no pair forms where that content holds `_` between two word characters; a bare `_` followed by a combining mark, a variation selector or a zero-width joiner takes no part; once per pair, the range runs from the opener to the end of the closer.

<!-- carve-sample {"lint":"shows deprecated-bare-underline","fmtSkip":true} -->
```crv
---
carve: 0.1
---
_a_
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-bare-underline A bare underscore pair is text in 0.2. Write the braced underline, or the slash pair for emphasis.
```

### `deprecated-cell-alignment`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a cell of a complete pipe table row, whose text starts directly after the pipe, behind the header mark `=` if any, with a valid 0.1.13 alignment run (a horizontal `<`, `>` or `~` with an optional vertical `^`, `~` or `v`, or `?` with a vertical mark), optionally a glued brace block, then a space; a cell that holds only `<` or `^` and a cell that starts with a brace block are not reported; once per cell.

<!-- carve-sample {"lint":"shows deprecated-cell-alignment","fmtSkip":true} -->
```crv
---
carve: 0.1
---
|=< a |
```

```txt
$ carve lint doc.crv
doc.crv:4:3: warning deprecated-cell-alignment The table cell alignment prefix "<" is the deprecated 0.1.13 spelling, removed in 0.2.0. Alignment symbols now lead the cell's attribute block: write "{<}". In 0.2 the old prefix is cell text, so the formatter leaves it; the upgrade tool rewrites it.
```

### `deprecated-continuation-marker`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a line whose content behind its quote marks and indentation is a single `+`, with only spaces and tabs before and after it, and a list item, with or without a task box, whose text on its marker line is a single `+`, both text in 0.2 where 0.1 read a list continuation marker; `++`, `+a` and a table cell holding `+` are not reported; once per line, the range is the `+`.

<!-- carve-sample {"lint":"shows deprecated-continuation-marker","fmtSkip":true} -->
```crv
---
carve: 0.1
---
+
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-continuation-marker The plus continuation marker was removed in 0.2 and is text here. If a block was intended, write that block after a blank line.
```

### `deprecated-indented-line-under-heading`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a line directly below a heading line, or below it across comment-only lines, that is indented past the heading marker and so continues the heading.

<!-- carve-sample {"lint":"shows deprecated-indented-line-under-heading","fmtSkip":true} -->
```crv
---
carve: 0.1
---
# a
 b
```

```txt
$ carve lint doc.crv
doc.crv:5:1: warning deprecated-indented-line-under-heading This indented line directly below a heading is part of the heading in 0.2; in 0.1 it started a paragraph. Remove the indent to make it a separate block again; if it then reads as a list marker or another opener and a paragraph is meant, escape its first character.
```

### `deprecated-loose-attribute`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a list that carries the key `loose`.

<!-- carve-sample {"lint":"shows deprecated-loose-attribute","fmtSkip":true} -->
```crv
---
carve: 0.1
---
{loose}
- a
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-loose-attribute The loose attribute was removed in 0.2 and is a plain attribute here. A list is loose when a blank line stands between two of its items.
```

### `deprecated-separator-row`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports the second row of a table whose first row is not such a row, when every cell of it holds, inside its padding, only a run of one or more hyphens with an optional colon at either end (`-`, `---`, `:--`, `--:`, `:-:`) and has no cell prefix: the separator row 0.1 read as the end of a Markdown head, which 0.2 reads as an ordinary body row; a row of hyphens at any other place, a lone first row, an empty cell and a cell with a header mark or a brace block are not reported; once per row, the range is the row.

<!-- carve-sample {"lint":"shows deprecated-separator-row","fmtSkip":true} -->
```crv
---
carve: 0.1
---
| a |
|---|
```

```txt
$ carve lint doc.crv
doc.crv:5:1: warning deprecated-separator-row The separator row was removed in 0.2 and is a row of dashes here. Mark the header cells with the header mark and delete this row.
```

### `deprecated-spaced-thematic-break`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a line that after its container prefixes and indent holds only three or more stars, hyphens or underscores with spaces between them, the container prefixes being quote marks and the markers of items, descriptions and footnote bodies up to their content column; markers that the run itself makes, as `- - -` reads as nested items, belong to the run and not to the prefixes, so `- - -` and `a. - - -` both report the whole spaced run; the range is the run.

<!-- carve-sample {"lint":"shows deprecated-spaced-thematic-break","fmtSkip":true} -->
```crv
---
carve: 0.1
---
_ _ _
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-spaced-thematic-break A spaced thematic break was removed in 0.2; this line is a list item (or text). Write the unspaced star form.
```

### `deprecated-substitution-arrow`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a braced strike span whose own content holds `~>`, which 0.1 read as a substitution of the text before by the text after and which 0.2 reads as text in the strike: the first `~>` not behind a backslash in the strike's own inline content, outside a nested braced span or bracket construct, while a bare span around it does not hide it; once per strike span, the range is the strike span.

<!-- carve-sample {"lint":"shows deprecated-substitution-arrow","fmtSkip":true} -->
```crv
---
carve: 0.1
---
{~a~>b~}
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-substitution-arrow The substitution arrow was removed in 0.2; this is a strike span. Write a deletion directly followed by an insertion.
```

### `deprecated-table-attribute`

Severity `warning`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports `header-rows` on a pipe table, whose head cells 0.1 made header cells.

<!-- carve-sample {"lint":"shows deprecated-table-attribute","fmtSkip":true} -->
```crv
---
carve: 0.1
---
{header-rows=1}
| a |
```

```txt
$ carve lint doc.crv
doc.crv:4:1: warning deprecated-table-attribute `header-rows` on a pipe table no longer makes the cells of its rows header cells in 0.2: they keep the kind they are written with. Mark header cells with the header mark.
```

### `description-separator-below-content-column`

Severity `warning`, on by default. Reports a line that, after quote marks and indent, starts with a description mark `:` or a term mark `::` followed by a space, a tab or the end of the line, is no term line or description line of any description list (a lazy line of a paragraph counts as none), and whose nearest line above that is not blank, at the same quote depth, lies in a description list whose first term mark stands at a greater column; once per line.

<!-- carve-sample {"lint":"shows description-separator-below-content-column","fmtSkip":true} -->
```crv
- a

  :: t
  : d
 : e
```

```txt
$ carve lint doc.crv
doc.crv:5:2: warning block-opener-without-blank-line This line looks like a description but directly follows text, so it is part of the paragraph or caption above it. Add a blank line before it.
doc.crv:5:2: warning description-separator-below-content-column This description starts at column 2, below the column 3 of the definition list above, so it adds no entry to that list. Indent it to column 3 to continue the list.
```

### `description-term-multi-line`

Severity `hint`, on by default. Reports a line below a term's mark line that is text of the term, because it is indented past the term mark, and whose text, behind its prefixes and indentation, starts with a description mark `:` followed by a space or a tab, which opens no description there; once per line, the range runs from that mark to the end of the line.

<!-- carve-sample {"lint":"shows description-term-multi-line"} -->
```crv
:: Term
   : desc
```

```txt
$ carve lint doc.crv
doc.crv:2:4: hint description-term-multi-line This line continues the term above, so its `:` is term text and opens no description. Put the description mark at the column of the term mark.
```

### `djot-definition-list`

Severity `hint`, off by default; turn it on with `--rules`. Reports the first line of a paragraph that after its container prefixes and indent starts with `:`, a space or a tab and a further character, which Djot reads as the term of a definition list and Carve as text, a description line with no term above it being text; once per paragraph, the range is that line; a later line of a paragraph is left to `markdown-definition-paragraph`.

<!-- carve-sample {"fmtSkip":true} -->
```crv
: term

  def
```

```txt
$ carve lint --rules '{"djot-definition-list":"on"}' doc.crv
doc.crv:1:1: hint djot-definition-list Djot reads a line that starts with `: ` as the term of a definition list; Carve reads it as paragraph text. Write the term as `:: term` and the definition as `: definition` on the line below it.
```

### `djot-emphasis-underscore`

Severity `warning`, off by default; turn it on with `--rules`. `carve lint --fix` rewrites it. Reports a pair of underscores that Djot reads as emphasis and Carve as text: an opening `_` not behind an odd run of backslashes, not after an ASCII letter, digit or `_` and not before whitespace, and the next `_` not after whitespace and not before an ASCII letter, digit or `_`, with at least one character and no blank line between; once per pair.

<!-- carve-sample {"fmtSkip":true} -->
```crv
a _b_
```

```txt
$ carve lint --rules '{"djot-emphasis-underscore":"on"}' doc.crv
doc.crv:1:3: warning djot-emphasis-underscore Djot emphasis `_x_` is literal text in Carve. Carve emphasis is `/x/`.
```

### `djot-emphasis-underscore-braced`

Severity `hint`, off by default; turn it on with `--rules`. Reports each underline node whose source starts with `{_`, a braced underline that formed and survived delimiter pairing, which Djot reads as emphasis; once per node, the range is the node.

```crv
a {_b_} c
```

```txt
$ carve lint --rules '{"djot-emphasis-underscore-braced":"on"}' doc.crv
doc.crv:1:3: hint djot-emphasis-underscore-braced Djot emphasis `{_x_}` is underline in Carve. Carve emphasis is `/x/` or the braced `{/x/}`.
```

### `djot-heading-continuation`

Severity `warning`, off by default; turn it on with `--rules`. Reports a heading line of one to six `#` and a space, directly followed by one or more lines at or left of the heading marker column that Djot folds into it: a line with the same number of `#`, or a line that is not blank and opens no block (not a thematic break, `#`, `>`, `|`, a `-`, `*` or `+` bullet, an ordered or parenthesized marker, `:` or `::`, a backtick or tilde fence, `^ `, `%%%`, `{` or a definition `[label]:`); once per heading, the range covering the heading and every folded line.

<!-- carve-sample {"fmtSkip":true} -->
```crv
# a
b
```

```txt
$ carve lint --rules '{"djot-heading-continuation":"on"}' doc.crv
doc.crv:1:1: warning djot-heading-continuation Djot folds the line(s) below a heading INTO it (a plain line, or one with the same number of `#`); Carve takes only lines indented past the heading marker into the heading (C2-B-154), so a line at the marker column starts a separate block. A generated heading id is computed from the shorter Carve heading, so it can differ from Djot's id.
```

### `djot-highlight-braces`

Severity `warning`, off by default; turn it on with `--rules`. Reports each formed braced highlight node from `{=x=}` that survives delimiter pairing, whose opener is not escaped and whose non-empty content holds no blank line or second unescaped `{=`; once per formed node; a bare `=x=` is not reported.

```crv
a {=b=} c
```

```txt
$ carve lint --rules '{"djot-highlight-braces":"on"}' doc.crv
doc.crv:1:3: warning djot-highlight-braces Djot highlight `{=x=}` is also Carve highlight. The bare `=x=` is literal text in Carve.
```

### `djot-intraword-underscore`

Severity `warning`, off by default; turn it on with `--rules`. `carve lint --fix` rewrites it. Reports a pair of underscores inside a word, which Djot reads as emphasis: an opening `_` after an ASCII letter or digit, not behind an odd run of backslashes and not before whitespace, and the next `_` not after whitespace and before an ASCII letter or digit, with no blank line between, as `snake_case_name`; once per pair.

```crv
a_b_c
```

```txt
$ carve lint --rules '{"djot-intraword-underscore":"on"}' doc.crv
doc.crv:1:2: warning djot-intraword-underscore Djot emphasizes this intraword `_x_`; the migration leaves it literal, so the emphasis is lost. Brace it as `{/x/}` if it was meant.
```

### `djot-ordered-marker`

Severity `hint`, off by default; turn it on with `--rules`. Reports a parsed paragraph line whose body starts with a Djot ordered marker, one or more digits, one ASCII letter, or a run of the letters `ivxlcdm` or of `IVXLCDM`, followed by `.` or `)` or enclosed in parentheses, and then a space, a tab or the end of the line, where the line is the first line of its paragraph or a lazy line whose body starts at or left of the marker column of the innermost list item that holds it, if one does, the places where Djot starts a list: Djot ends a quote or a list item at such a line, keeps a line indented past the item marker as text of the item and does not end a paragraph at it; Carve reads it as text because the marker is no ordered marker or because an uppercase marker with a dot has only one space; once per line, the range is the line.

```crv
A. x
```

```txt
$ carve lint --rules '{"djot-ordered-marker":"on"}' doc.crv
doc.crv:1:1: hint djot-ordered-marker Djot reads this line as an ordered list item; Carve reads it as paragraph text. Carve has no marker in parentheses such as `(1)`, and an uppercase marker with a dot needs two spaces before its text.
```

### `djot-plus-bullet`

Severity `warning`, off by default; turn it on with `--rules`. `carve lint --fix` rewrites it. Reports a parsed paragraph line whose first character after its container prefixes and optional spaces and tabs is `+`, followed by spaces or tabs and a further character, except a continuation row that the parser takes into a table; once per line.

```crv
+ a
```

```txt
$ carve lint --rules '{"djot-plus-bullet":"on"}' doc.crv
doc.crv:1:1: warning djot-plus-bullet Djot/Markdown `+` bullet is not a Carve bullet, so this line is a paragraph. Write `-` or `*`.
```

### `djot-subscript-tilde`

Severity `warning`, off by default; turn it on with `--rules`. `carve lint --fix` rewrites it. Reports each pair of bare tildes in text, where the opening tilde is not escaped, not directly after an unescaped `{` and not followed by whitespace or `}`, the closing tilde is the next tilde of the same paragraph that is not followed by `}`, and the content between them is not empty and does not end in whitespace; letters or digits on either side do not prevent it (`H~2~O` is reported), and a pair inside a `~~x~~` run is left to `markdown-strikethrough-double-tilde`; once per pair.

<!-- carve-sample {"fmtSkip":true} -->
```crv
~x~
```

```txt
$ carve lint --rules '{"djot-subscript-tilde":"on"}' doc.crv
doc.crv:1:1: warning djot-subscript-tilde Djot subscript `~x~` is literal text in Carve. Carve subscript is the braced `{,x,}`.
```

### `djot-subscript-tilde-braced`

Severity `warning`, off by default; turn it on with `--rules`. Reports each formed braced strike node from `{~x~}` that survives delimiter pairing, whose opener is not escaped and whose non-empty content holds no blank line or further unescaped `{~`; once per formed node.

```crv
{~x~}
```

```txt
$ carve lint --rules '{"djot-subscript-tilde-braced":"on"}' doc.crv
doc.crv:1:1: warning djot-subscript-tilde-braced Djot subscript `{~x~}` renders as *strikethrough* in Carve.
```

### `djot-superscript-caret`

Severity `warning`, off by default; turn it on with `--rules`. `carve lint --fix` rewrites it. Reports each pair of bare carets in text, where the opening caret is not escaped, not directly after an unescaped `{` and not followed by whitespace, `}` or `[`, the closing caret is the next caret of the same paragraph that is not followed by `}`, and the content between them is not empty and does not end in whitespace; letters or digits on either side do not prevent it (`x^2^` is reported); whole-cell row span markers do not count; once per pair.

```crv
x^2^
```

```txt
$ carve lint --rules '{"djot-superscript-caret":"on"}' doc.crv
doc.crv:1:2: warning djot-superscript-caret Djot superscript `^x^` is literal text in Carve — Carve superscript is the braced `{^x^}` only.
```

### `djot-tag-mention`

Severity `hint`, off by default; turn it on with `--rules`. Reports each tag and each mention node, which Djot reads as text; once per node, the range is the node.

```crv
see @ann and #tag
```

```txt
$ carve lint --rules '{"djot-tag-mention":"on"}' doc.crv
doc.crv:1:5: hint djot-tag-mention Djot reads `#word` and `@word` as text; Carve reads them as a tag or a mention. Escape the sigil as `\#` or `\@` to keep it as text.
doc.crv:1:14: hint djot-tag-mention Djot reads `#word` and `@word` as text; Carve reads them as a tag or a mention. Escape the sigil as `\#` or `\@` to keep it as text.
```

### `djot-typography-sign`

Severity `hint`, off by default; turn it on with `--rules`. Reports each smart punctuation node of an arrow, a comparison sign, the plus-minus sign or the trademark sign, which Djot keeps as typed: every replaced run but a quote, a dash and the ellipsis, the three Djot replaces too; once per node, the range is the node.

```crv
a --> b != c
```

```txt
$ carve lint --rules '{"djot-typography-sign":"on"}' doc.crv
doc.crv:1:3: hint djot-typography-sign Djot keeps this run as typed; Carve smart typography writes it as a sign. Escape its punctuation characters to keep it as typed.
doc.crv:1:9: hint djot-typography-sign Djot keeps this run as typed; Carve smart typography writes it as a sign. Escape its punctuation characters to keep it as typed.
```

### `duplicate-reference-url`

Severity `warning`, off by default; turn it on with `--rules`. Reports each link definition whose destination is the same string as that of an earlier link definition in source order with a different label key; a repeated definition of the same label is not reported, and only parsed link definitions count; once per later definition.

<!-- carve-sample {"lint":"shows duplicate-reference-url only with --rules {\"duplicate-reference-url\":\"on\"}; the default run reports other rules","fmtSkip":true} -->
```crv
[a]: /u
[b]: /u
```

```txt
$ carve lint --rules '{"duplicate-reference-url":"on"}' doc.crv
doc.crv:1:1: warning unused-link-reference-definition This link reference definition is unused.
doc.crv:2:1: warning duplicate-reference-url This reference definition repeats an earlier URL.
doc.crv:2:1: warning unused-link-reference-definition This link reference definition is unused.
```

### `emphasis-as-heading`

Severity `warning`, off by default; turn it on with `--rules`. Reports a paragraph whose content, apart from comments and text that is only whitespace, is exactly one strong or emphasis span with non-empty text, on one line or several; any other visible text, such as a trailing period, prevents it; once per paragraph.

```crv
/Title/
```

```txt
$ carve lint --rules '{"emphasis-as-heading":"on"}' doc.crv
doc.crv:1:1: warning emphasis-as-heading This emphasized paragraph looks like a heading.
```

### `emphasis-marker-before-attributes`

Severity `warning`, on by default. Reports (1) each unescaped `*`, `/`, `_`, `~` or `=` that is text and is directly followed by a valid attribute block in the same text, and (2) the closing `*` or `/` of a bare strong or emphasis span that carries an attribute block, when the span's own text holds an unescaped copy of its delimiter before that closer (as in `*a * b*{.c}`); once per marker.

<!-- carve-sample {"lint":"shows emphasis-marker-before-attributes"} -->
```crv
*a * b*{.c}
```

```txt
$ carve lint doc.crv
doc.crv:1:7: warning emphasis-marker-before-attributes This * closes the strong span that opens at line 1, column 1, so the attribute block after it attaches to that whole span, which also holds a literal *. Brace the span you mean ({*text*}{…}) or escape the inner * to make the pairing explicit.
```

### `empty-include-path`

Severity `warning`, on by default. Reports each <code v-pre>{{</code> and <code v-pre>}}</code> pair in inline text with no brace between them, whose body is empty or only spaces and tabs, or holds an empty quoted path (`""` or a pair of curly quotes) behind at least one space, or, behind at least one space or tab, starts with `#` or an at-sign (a section or option with no path in front), so it is no include directive and stays text; <code v-pre>{{#if}}</code> is not reported, nor a directive with a section and no path that `reserved-syntax` reports; every pair on a line and in headings counts.

<!-- carve-sample {"lint":"shows empty-include-path"} -->
```crv
{{ "" }}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning empty-include-path This "{{ "" }}" looks like an include directive with no path, so it renders as literal text. Add a path (for example {{ chapter.crv }}) or remove the braces.
```

### `empty-link-destination`

Severity `warning`, on by default. Reports each inline link whose destination is empty, `[a]()`; images and reference links are not reported.

<!-- carve-sample {"lint":"shows empty-link-destination"} -->
```crv
[a]()
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning empty-link-destination This link has an empty destination.
```

### `empty-reference-definition`

Severity `warning`, on by default. Reports a line of text that holds, after its container prefixes and indent, only a bracketed label with no `]` in it, a colon and nothing or only spaces and tabs after the colon, as `[a]:`, which defines nothing, once per line; a label that starts with `^` counts only if at least one non-whitespace character follows the caret, since `[^a]:` with no content is no footnote definition, and brackets that hold only spaces or nothing hold no label and are not reported; the range is the label and the colon.

<!-- carve-sample {"lint":"shows empty-reference-definition"} -->
```crv
[a]:
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning empty-reference-definition This line is a label and colon with no destination, so it is text and defines no link. Add a destination after the colon, or remove the line.
```

### `fence-closer-indented`

Severity `hint`, on by default. Reports the closer of a code fence whose first backtick stands at another source column than the first backtick of its opener, which still closes the block because a closer has no column test; where the opener stands on the marker line of an item, a description or a footnote body, the closer's column is counted inside that container's content as C2-B-027 strips it, so a closer at or left of its content column stands where the opener does and is not reported; an unclosed fence, a div and a comment block are not reported; once per code block, the range runs from the closer's first backtick to the end of its line.

<!-- carve-sample {"lint":"shows fence-closer-indented","fmtSkip":true} -->
````crv
```
a
 ```
````

```txt
$ carve lint doc.crv
doc.crv:3:2: hint fence-closer-indented This line closes the block opened on line 1 although it is indented differently. If it is content, make the outer fence longer.
```

### `figure-group-empty`

Severity `warning`, on by default. Reports a figure group with no panel, that is with no table and no captioned image, code block, quote or math block among its children.

<!-- carve-sample {"lint":"shows figure-group-empty","fmtSkip":true} -->
```crv
::: figure
:::
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning figure-group-empty This "::: figure" group holds no captionable panel; the panels wrapper renders around the preserved content only.
```

### `figure-group-nested`

Severity `warning`, on by default. Reports a div opener named `figure` with no title and no label that stands anywhere inside a figure group, directly or in a quote, a list item, an admonition or any other container of its body, which gives a plain div with the class `figure` and no second group, once per such div; the range is that div.

<!-- carve-sample {"lint":"shows figure-group-nested","fmtSkip":true} -->
```crv
::: figure
:::: figure
::::
:::
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning figure-group-empty This "::: figure" group holds no captionable panel; the panels wrapper renders around the preserved content only.
doc.crv:2:1: warning figure-group-nested A "::: figure" inside a composite figure does not nest; it renders as a generic container. Move it out of the enclosing group.
```

### `figure-group-opener-metadata`

Severity `warning`, on by default. Reports a `figure` div whose opener carries a quoted title or a label, which C2-B-127 makes a plain div with the class `figure`; once per div, at any depth and with any colon run.

<!-- carve-sample {"lint":"shows figure-group-opener-metadata","fmtSkip":true} -->
```crv
::: figure "T"
:::
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning figure-group-opener-metadata A "::: figure" opener carrying a quoted title or [label] is not a figure group; it is a plain container with the class "figure" (C2-B-127). Drop the title or label to open a figure group, and use a caption line below it.
```

### `figure-group-panel-number`

Severity `warning`, on by default. Reports each panel of a figure group whose caption holds a caption number mark, the first `#` of C2-B-207 (followed by whitespace, `:`, `.`, the caption end or a character that cannot start a tag name), which in a panel stays the character `#`; `#1` and `\#` are no mark; once per panel.

<!-- carve-sample {"lint":"shows figure-group-panel-number"} -->
```crv
::: figure
![a](a.png)
^ A #
:::
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning figure-group-single-panel This "::: figure" group holds a single panel; a plain captioned figure renders the same content without the group wrapper.
doc.crv:2:1: warning figure-group-panel-number A "#" placeholder in a panel caption stays literal: panels are not numbering units, the group caption carries the number (and panel ids resolve with its letter).
```

### `figure-group-single-panel`

Severity `warning`, on by default. Reports a figure group with exactly one panel, a table or a captioned image, code block, quote or math block among its children.

<!-- carve-sample {"lint":"shows figure-group-single-panel"} -->
```crv
::: figure
| a |
:::
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning figure-group-single-panel This "::: figure" group holds a single panel; a plain captioned figure renders the same content without the group wrapper.
```

### `footnote-labels-differ-only-in-whitespace`

Severity `warning`, on by default. Reports each footnote definition whose label is spelled differently from the label of an earlier footnote definition in source order but has the same lookup key; the later parsed definition is reported once.

<!-- carve-sample {"lint":"shows footnote-labels-differ-only-in-whitespace","fmtSkip":true} -->
```crv
[^a b]: x
[^a  b]: y
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning unused-footnote-definition Footnote definition [^a b] is never referenced, so it is omitted from the rendered document.
doc.crv:2:1: warning duplicate-footnote-definition Duplicate footnote definition [^a b] is ignored; the first definition for a label wins.
doc.crv:2:1: warning footnote-labels-differ-only-in-whitespace Footnote definition [^a  b] normalizes to the same key as [^a b]; the first definition wins. Normalized key: "a b".
```

### `footnotes-placement-in-container`

Severity `warning`, on by default. Reports each `footnotes` directive that is not a top-level block of the document, such as one inside a quote, a list item or a div, where it places nothing; once per directive.

<!-- carve-sample {"lint":"shows footnotes-placement-in-container","fmtSkip":true} -->
```crv
> ::: footnotes
> :::
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning footnotes-placement-in-container This "::: footnotes" marker is inside a container, where it does not place: it renders as a plain typed div and the endnotes section goes where it would without the marker. Move the marker to document level, or delete it to accept the default position.
```

### `frontmatter-crossref`

Severity `error`, on by default. Reports a cross-reference whose id belongs to a frontmatter node, once per reference, at the reference.

<!-- carve-sample {"lint":"shows frontmatter-crossref"} -->
```crv
a

{#m}
---yaml
k: v
---

See </#m>.
```

```txt
$ carve lint doc.crv
doc.crv:8:5: error frontmatter-crossref Cross-reference </#m> names a metadata key, which has no HTML target. Read the block through the tree instead.
```

### `frontmatter-shaped-thematic-break`

Severity `warning`, on by default. Reports frontmatter with no format name whose first value line is blank or holds only spaces and tabs, or none of whose value lines holds a colon, a key line of YAML; frontmatter with a format name is not reported; once per frontmatter, the range is the frontmatter from its opener to the end of its closer.

<!-- carve-sample {"lint":"shows frontmatter-shaped-thematic-break"} -->
```crv
---

---
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning frontmatter-shaped-thematic-break Three hyphens on line 1 open frontmatter, not a thematic break. Write three stars for a break.
```

### `github-alert-marker`

Severity `warning`, on by default. Reports on a line whose first non-space character is a quote mark and that is a paragraph, table row or heading line, the first of `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]`, in upper case as written; once per line.

<!-- carve-sample {"lint":"shows github-alert-marker"} -->
```crv
> [!NOTE]
> a
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning github-alert-marker This spelling does not create a GitHub alert in Carve; use an admonition fence for an alert.
```

### `glob-shaped-strong`

Severity `hint`, on by default. Reports each bare strong span whose source starts with `*.` and ends with `*`, such as the span in `*.c,*.h`; a braced strong span is not reported.

<!-- carve-sample {"lint":"shows glob-shaped-strong"} -->
```crv
*.c,*.h
```

```txt
$ carve lint doc.crv
doc.crv:1:1: hint glob-shaped-strong This strong span looks like a file glob; escape the asterisk if you meant a glob.
```

### `heading-closing-hashes`

Severity `warning`, on by default. `carve lint --fix` rewrites it. Reports a heading whose last line ends in a run of `#` that follows a space or tab, with heading text before that whitespace (a non-space character, or another inline node before the run); spaces after the run are allowed; `= ##`, whose only text is the run, is not reported; once per heading.

<!-- carve-sample {"lint":"shows heading-closing-hashes","fmtSkip":true} -->
```crv
# a #
```

```txt
$ carve lint doc.crv
doc.crv:1:5: warning heading-closing-hashes The closing "#" run is heading text in Carve, not a closing marker. Delete it.
```

### `heading-level-skip`

Severity `warning`, on by default. Reports a heading whose level is more than one above the level of the heading before it in document order, also inside quotes and list items; the first heading is never reported; once per heading.

<!-- carve-sample {"lint":"shows heading-level-skip","fmtSkip":true} -->
```crv
= a
=== b
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning heading-level-skip This heading skips from level 1 to 3; use the next heading level for a continuous outline.
```

### `heading-marker-mixed`

Severity `hint`, on by default. Reports a document with `=` headings and `#` headings, once; the range is the first heading of the document, from its start to its end, so an attribute line above it is included; a heading counts by the marker that opens it, behind any attribute lines above it.

<!-- carve-sample {"lint":"shows heading-marker-mixed","fmtSkip":true} -->
```crv
= a
# b
```

```txt
$ carve lint doc.crv
doc.crv:1:1: hint heading-marker-mixed This document mixes the two heading markers. carve fmt rewrites the hash to the equals sign.
```

### `heading-trailing-attribute`

Severity `warning`, on by default. Reports a heading whose last line ends in a brace block whose first character after optional spaces is `.` or `#` and that holds no other brace, such as `{.c}`, `{#i}` or `{.c }`, after a space or tab and followed only by whitespace; it is heading text, not attributes; once per heading.

<!-- carve-sample {"lint":"shows heading-trailing-attribute"} -->
```crv
= a {.c}
```

```txt
$ carve lint doc.crv
doc.crv:1:5: warning heading-trailing-attribute Trailing "{.c}" on a heading is literal text in Carve, not an attribute block. Move it to a "{.c}" line directly above the heading.
doc.crv:1:5: hint unattached-inline-attribute This attribute block is attached to nothing and renders as text. Glue it to a span, link or code span, or escape the brace.
```

### `html-comment-renders-as-text`

Severity `warning`, on by default. Reports each `<!--` on a paragraph line, when `-->` follows later in the same paragraph, on that line or a later one; once per `<!--`.

<!-- carve-sample {"lint":"shows html-comment-renders-as-text"} -->
```crv
<!-- a -->
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning html-comment-renders-as-text This HTML comment renders as visible text. Use %% for one line or %%% for a comment block.
```

### `include-attributes-unused`

Severity `warning`, on by default. Reports an attribute line on an include without `code`, which applies to nothing.

<!-- carve-sample {"lint":"shows include-attributes-unused"} -->
```crv
{.c}
{{ a.crv }}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning include-attributes-unused The attributes above this include apply to nothing, because it has no @code option. Remove them or move them into the included file.
doc.crv:1:1: warning include-not-found Include "a.crv" was not expanded: the file does not exist.
```

### `include-lines-table-rows-hint`

Severity `hint`, on by default. Reports `lines` on a delimited table include.

<!-- carve-sample {"lint":"shows include-lines-table-rows-hint"} -->
```crv
{table}
{{ t.csv @code:csv @lines:1-2 }}
```

```txt
$ carve lint doc.crv
doc.crv:2:20: hint include-lines-table-rows-hint @lines counts physical lines. Use @rows to select records of this table.
doc.crv:1:1: warning include-not-found Include "t.csv" was not expanded: the file does not exist.
```

### `indented-code-block`

Severity `warning`, on by default. Reports a top-level paragraph that starts on line 2 or later directly after a blank line, whose previous block is not a list, and whose first line starts with four or more spaces and then a non-space; only that first line is reported.

<!-- carve-sample {"lint":"shows indented-code-block","fmtSkip":true} -->
```crv
a

    b
```

```txt
$ carve lint doc.crv
doc.crv:3:5: warning indented-code-block Four-space indentation does not make a code block in Carve; this renders as a paragraph. Use a ``` fence.
```

### `link-definition-indented-line`

Severity `hint`, on by default. Reports the line directly below a link definition, its tail lines included, that is indented past column 0 and holds, after its indent, neither a title, nor an attribute block, nor a title, one space and an attribute block, so it is the next block; an attribute block is a valid one; comment-only lines between are skipped, and a blank line is not reported; once per definition, the range runs from the first character of that line's text behind its indent to the end of its text.

<!-- carve-sample {"lint":"shows link-definition-indented-line","fmtSkip":true} -->
```crv
[a]: /u
  "T" x

See [a].
```

```txt
$ carve lint doc.crv
doc.crv:2:3: hint link-definition-indented-line This indented line is not a title or attribute block, so it does not continue the link definition above; it starts a new block.
```

### `link-gap-before-destination`

Severity `warning`, on by default. Reports on each paragraph, table row and heading line, each `[label]` with a non-empty label that is followed by one or more whitespace characters and a parenthesis group `(...)` whose first non-space character is not `)`, matched from left to right without overlap; once per match.

<!-- carve-sample {"lint":"shows link-gap-before-destination"} -->
```crv
[a] (b)
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning link-gap-before-destination The gap after this label prevents the parenthesized destination from attaching; write `](` with no space for an inline link. A defined shortcut reference can still resolve the label.
```

### `list-item-block-overindented`

Severity `warning`, on by default. Reports a line owned by a list item, including a block opener inside a div in that item, or below an ended item across blank lines only, whose content behind the quote marks starts past the item's content column with a block opener: a heading marker, a quote mark, a code fence, a term mark, a div fence, a block image line, a thematic break, an attribute line or a table row; the list is exhaustive, so an include directive line is no block opener here; once per line, consecutive quote or table lines of one block once, and never a list marker, a comment line, a line of a verbatim body or an escaped opener.

<!-- carve-sample {"lint":"shows list-item-block-overindented","fmtSkip":true} -->
```crv
- [ ] # h
```

```txt
$ carve lint doc.crv
doc.crv:1:7: warning list-item-block-overindented This block opener is past the list item's canonical content column 3; it now parses structurally and the formatter will canonicalize it. Dedent it to column 3 for an explicit structural spelling, or escape the opener to preserve the literal meaning used by older readers.
```

### `list-item-body-below-content-column`

Severity `hint`, on by default. Reports the first line of a block of a list item, other than its first block, whose first character stands past the item's marker column and left of its content column, both measured in the item's container, so the block belongs to the item; a lazy continuation line of a paragraph is not reported; once per block, the range runs from that character to the end of the line.

<!-- carve-sample {"lint":"shows list-item-body-below-content-column","fmtSkip":true} -->
```crv
- a

 b
```

```txt
$ carve lint doc.crv
doc.crv:3:2: hint list-item-body-below-content-column This line is indented past the list marker but short of the item's text, and it belongs to the item. Indent it to the text, or move it to the column of the list to end the item.
```

### `list-marker-below-content-column`

Severity `warning`, on by default. Reports a list item whose marker stands right of the marker column of an open list item and left of the marker column of the open bullet or ordered list nested in that item, so it is read at the column of the deeper list, with a paragraph open or not, once per marker, also when it does not match the deeper list and opens a new list there; the range is the item.

<!-- carve-sample {"lint":"shows list-marker-below-content-column","fmtSkip":true} -->
```crv
- a
  - b
 - c
```

```txt
$ carve lint doc.crv
doc.crv:3:2: warning list-marker-below-content-column This list marker starts at column 2, between the columns of two open lists, so it is read at the column of the deeper list. Start it at column 3 to make that explicit, or at column 1 to put it in the outer list.
```

### `list-marker-without-blank-line`

Severity `warning`, on by default. Reports a line of paragraph, term or description text, not the first line of that text, that starts after its quote marks and indent with a bullet marker `-` or `*` or an ordered marker of one to nine digits and `.` or `)`, followed by a space and content, so the marker is part of that text and opens no list, once per line; the range runs from the marker to the end of the line text.

<!-- carve-sample {"lint":"shows list-marker-without-blank-line"} -->
```crv
x
- y
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning list-marker-without-blank-line This list marker is part of the preceding paragraph; add a blank line before the list.
```

### `markdown-definition-paragraph`

Severity `warning`, on by default. Reports a paragraph line, not the first line of its paragraph, that after its container prefixes and indent starts with `:`, a space or a tab and a further character, where the paragraph line above does not start with `::` and a space; a line that `description-separator-below-content-column` reports is left to that rule; once per line.

<!-- carve-sample {"lint":"shows markdown-definition-paragraph"} -->
```crv
a
: b
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning block-opener-without-blank-line This line looks like a description but directly follows text, so it is part of the paragraph or caption above it. Add a blank line before it.
doc.crv:2:1: warning markdown-definition-paragraph This markdown definition remains paragraph text; use a :: term line before the definition.
```

### `markdown-strikethrough-double-tilde`

Severity `warning`, on by default. `carve lint --fix` rewrites it. Reports a pair of `~~` runs in inline text that encloses one or more characters other than `~`, with no whitespace directly inside either run, crossing soft line breaks but not a blank line, whatever stands before or after the pair; once per pair, the range is the pair with its content.

<!-- carve-sample {"lint":"shows markdown-strikethrough-double-tilde","fmtSkip":true} -->
```crv
a ~~b~~ c
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning markdown-strikethrough-double-tilde Markdown `~~strikethrough~~` is literal text in Carve. Carve strikethrough is the braced `{~x~}`.
```

### `markdown-strong-double-star`

Severity `warning`, on by default. `carve lint --fix` rewrites it. Reports a pair of two-star runs in text, as `**b**`, whose content is at least one character, holds no star and no blank line, and neither starts nor ends with whitespace, once per pair, pairs taken from left to right; a letter, a digit or a further star next to a run does not prevent it; the range runs from the first star to the last.

<!-- carve-sample {"lint":"shows markdown-strong-double-star","fmtSkip":true} -->
```crv
**b**
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning markdown-strong-double-star Markdown `**strong**` is literal text in Carve, asterisks included. Carve strong is a single `*`.
```

### `non-descriptive-link-text`

Severity `warning`, off by default; turn it on with `--rules`. Reports a link that resolves and holds no image, whose text, with each run of ASCII whitespace folded to one space, the ends trimmed and lower-cased, is `here`, `click here` or `read more`, unless the link carries an `aria-label` key, in any letter case, whose folded value is neither empty nor one of those three; once per link.

```crv
[here](/u)
```

```txt
$ carve lint --rules '{"non-descriptive-link-text":"on"}' doc.crv
doc.crv:1:1: warning non-descriptive-link-text Use descriptive link text or a specific aria-label.
```

### `ordered-list-kind-split`

Severity `warning`, on by default. Reports a one-item list whose marker is one of the seven roman letters, directly followed by an ordered list of the other letter style in the same case, with fewer than three blank lines between them.

<!-- carve-sample {"lint":"shows ordered-list-kind-split"} -->
```crv
v. a
vi. b
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning ordered-list-kind-split This one-letter marker fixes its list style, so the next marker starts another list.
```

### `ordered-marker-right-aligned`

Severity `warning`, on by default. Reports an ordered marker left of its list that ends at the column where the list's markers end.

<!-- carve-sample {"lint":"shows ordered-marker-right-aligned","fmtSkip":true} -->
```crv
 9. a
10. b
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning ordered-marker-right-aligned This marker sits left of its list, so it is a sibling item that moves the list's column. Write the ordered markers left-aligned, as the formatter does.
```

### `platform-issue-reference`

Severity `warning`, a platform rule, off unless `--platforms` selects its platform. Reports with the platform `github` selected, a `#` followed by one or more ASCII digits, where the character before the `#` is not an ASCII letter, digit, `_`, `#` or `/` and the character after the digits is none of those nor `-`, in paragraph, heading, cell, term, caption or line of a line block text, with inline code expressly included; bare URLs and unreferenced footnote definitions are masked; once per run.

```crv
see #12
```

```txt
$ carve lint --platforms '["github"]' doc.crv
doc.crv:1:5: warning platform-issue-reference GitHub re-linkifies a hash-number in published output, so "#12" becomes a link that notifies or references something unrelated; move the example into a fenced code block, or rewrite it as "item 1" / "point 1".
```

### `platform-mention-token`

Severity `warning`, a platform rule, off unless `--platforms` selects its platform. Reports with the platform `github` selected, an at-sign followed by a name, which is an ASCII letter, digit or `_` and then letters, digits, `_` and `-`, with interior dots each followed by such a character, where the character before the at-sign is not an ASCII letter, digit, `_`, at-sign, `.`, `-` or `/`, in paragraph, heading, cell, term, caption or line of a line block text, with inline code expressly included; bare URLs and unreferenced footnote definitions are masked; the range is the at-sign and the name, once per token.

```crv
ask @bob
```

```txt
$ carve lint --platforms '["github"]' doc.crv
doc.crv:1:5: warning platform-mention-token GitHub re-linkifies an at-prefixed word in published output, so "@bob" becomes a link that notifies or references something unrelated; move the example into a fenced code block, or strip the sigil and rephrase.
```

### `quote-fence-ends-the-quote-above`

Severity `warning`, on by default. Reports a quote fence (`::: >`) that is the next block after a quote written with quote marks, in the same container, and whose opener stands on the line directly below that quote's last line; once per fence.

<!-- carve-sample {"lint":"shows quote-fence-ends-the-quote-above","fmtSkip":true} -->
```crv
> a
::: >
b
:::
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning quote-fence-ends-the-quote-above A "::: >" opener ENDS that quote and opens a sibling one; the two render as adjacent blockquotes, not one nested in the other. Write "> ::: >" to nest it, or leave a blank line to make two quotes deliberate.
```

### `region-marker-renders-as-text`

Severity `warning`, on by default. Reports a line outside a code block, a raw block, a math block, a comment and frontmatter that holds, after spaces and tabs and an optional `//`, `--`, `/*` or `<!--` with spaces or tabs, `#region` or `#endregion` in any letter case not followed by an ASCII letter, digit or `_`; and a `%%` line comment whose keyword is `#region` or `#endregion` in another letter case; once per line, the range from its first character that is not a space or tab to the end of the line.

<!-- carve-sample {"lint":"shows region-marker-renders-as-text"} -->
```crv
#region x
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning region-marker-renders-as-text This line renders as text and is not a region marker for a Carve include. Write `%% #region name` for a region start or `%% #endregion` for its end.
```

### `reserved-syntax`

Severity `warning`, on by default. Reports each directive with a section and no path in a text leaf or a table row: <code v-pre>{{</code>, spaces, `#` and a section name, spaces and <code v-pre>}}</code>, with no option, whose braces are not escaped and stand in no code, math, raw or literal span, once per directive, the range is the directive.

<!-- carve-sample {"lint":"shows reserved-syntax"} -->
```crv
{{ #a }}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning reserved-syntax This "{{ #a }}" is reserved and renders as literal text. Write \{{ to keep the text.
doc.crv:1:2: hint unattached-inline-attribute This attribute block is attached to nothing and renders as text. Glue it to a span, link or code span, or escape the brace.
```

### `semantic-attribute-outside-span`

Severity `warning`, on by default. Reports an authored key `abbr`, `time` or `kbd`, in lower case before attribute merging, in the attributes of a node that is not a span, as a heading, a paragraph, a list, a quote, a table, a code span, a link or an image, which stays an ordinary attribute there, once per key; a key in another case is not reported; the range is the key.

<!-- carve-sample {"lint":"shows semantic-attribute-outside-span","fmtSkip":true} -->
```crv
{kbd}
# H
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning semantic-attribute-outside-span "kbd" is a semantic span attribute (PART 9 §10) and only applies to an ordinary [content]{attrs} span; on heading it stays a raw attribute and is subject to HTML attribute filtering.
```

### `semantic-attribute-value-ignored`

Severity `warning`, on by default. Reports a span that carries the key `kbd` with a nonempty value, which C2-H-075 discards; once per key on the span.

<!-- carve-sample {"lint":"shows semantic-attribute-value-ignored"} -->
```crv
[x]{kbd=a}
```

```txt
$ carve lint doc.crv
doc.crv:1:5: warning semantic-attribute-value-ignored Value on the semantic attribute "kbd" is discarded: it selects the <kbd> element and reaches no output. Only abbr and time carry a value (as title or datetime).
```

### `setext-heading-underline`

Severity `warning`, on by default. Reports a line that after its quote marks and indent holds only a run of three or more `=` or three or more `-` and trailing spaces and tabs, where an `=` run is a later line of a paragraph and a `-` run stands directly below the last paragraph line above it; once per line, the range is the run.

<!-- carve-sample {"lint":"shows setext-heading-underline"} -->
```crv
a
---
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning setext-heading-underline Carve has no underline heading: this marker run is text. Write the heading with a leading `=`.
```

### `sigil-after-letter`

Severity `hint`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports an at-sign or a `#` directly after a Unicode letter or number outside ASCII and followed by a mention or tag name, which forms no mention or tag in 0.2 because the sigil follows a letter or number and which 0.1, testing only ASCII letters, digits and `_` before it, read as one; a sigil after an ASCII letter or digit, after a space or punctuation, behind a backslash or in an atom is not reported, nor `#1`, whose name holds no letter; once per sigil, the range is the sigil.

```crv
ü#1a
```

```txt
$ carve lint --upgrade doc.crv
doc.crv:1:2: hint sigil-after-letter A mention or tag does not start directly after a letter or number. Put a space or punctuation before it.
```

### `snippet-definition-id`

Severity `warning`, on by default. Reports a line at column 0 outside every container that would be a snippet definition but whose marker, glued attribute blocks or attribute line above hold an id, once per line; the range is the marker and the colon.

<!-- carve-sample {"lint":"shows snippet-definition-id"} -->
```crv
{$v #x}: a
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning snippet-definition-id A snippet definition is no anchor and takes no id, so this line is text. Remove the id.
```

### `table-attribute-invalid`

Severity `warning`, on by default. Reports an invalid value of `aligns`, `valigns`, `widths`, `header-rows`, `footer-rows` or the body keys of C2-B-230 that a table keeps in `attrs` and that has no effect; the range is the whole key and value without braces.

<!-- carve-sample {"lint":"shows table-attribute-invalid"} -->
```crv
{aligns=x}
| a |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-attribute-invalid The value of aligns is not valid, so the table ignores the whole attribute. Correct every entry, or remove the attribute.
```

### `table-column-arity`

Severity `warning`, on by default. Reports a table attribute `aligns`, `valigns` or `widths` whose whole comma-separated value is valid under C2-B-211 or C2-B-212 and has fewer entries than the widest row of the table has cells; an invalid list reports only `table-attribute-invalid`; once per key, the range is the key name in the attribute line.

<!-- carve-sample {"lint":"shows table-column-arity"} -->
```crv
{aligns=left}
| a | b |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-column-arity aligns supplies 1 column entries for a 2-column table; the unset tail is valid but may be accidental.
```

### `table-column-overlap`

Severity `warning`, on by default. Reports a table column for which a header cell in the head carries an alignment mark of one axis while the table attribute `aligns` (horizontal axis) or `valigns` (vertical axis) has a valid whole list under C2-B-211 with an entry at that column; an invalid list reports only `table-attribute-invalid`; once per column, the range is the key name, `aligns` where both axes overlap.

<!-- carve-sample {"lint":"shows table-column-overlap"} -->
```crv
{aligns=left}
|={>} A |
| a |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-column-overlap Column 1 supplies the same alignment axis both in the table and in a table attribute; the in-table marker wins.
```

### `table-marker-run-padding`

Severity `warning`, on by default. Reports a table row cell whose text, directly behind its pipe, starts with a valid attribute block that is not empty and that `<`, `>` or `~` follows with no space between; once per cell, the range is the block and the mark.

<!-- carve-sample {"lint":"shows table-marker-run-padding","fmtSkip":true} -->
```crv
|{.x}> a |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-marker-run-padding "{.x}>" attaches the cell attribute block, but the following ">" is text and does not align the cell. Write "{> .x}" with the marker inside the first brace block to align it, or "{.x} >" to keep the mark as text.
```

### `table-row-attribute-as-cell`

Severity `warning`, on by default. Reports a table row whose last cell holds, behind its cell prefix and padding, nothing but one valid attribute block or a run of glued ones, which is cell text, not a row attribute, since a row attribute stands behind the closing pipe; a brace block in the cell prefix, `{}`, a braced comment and a block with other text in the cell are not reported; once per row, the range is the row.

<!-- carve-sample {"lint":"shows table-row-attribute-as-cell"} -->
```crv
| a | {.x} |
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning table-row-attribute-as-cell A row attribute is the brace block glued after the closing pipe. Here it is cell content.
```

### `table-row-cell-count`

Severity `warning`, on by default. Reports a pipe table row, after the first row, whose cell count differs from that of the first row, and a continuation row that adds a cell past the last column of its row; once per row, the range starts at the row's first pipe or at the `+`.

<!-- carve-sample {"lint":"shows table-row-cell-count"} -->
```crv
| a |
| b | c |
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning table-row-cell-count This table row has 2 cells; the first row has 1. Add or remove a cell to match the table.
```

### `table-row-count-clamped`

Severity `hint`, on by default. Reports a valid `header-rows` or `footer-rows` count larger than the rows it can take, which the table clamps.

<!-- carve-sample {"lint":"shows table-row-count-clamped","fmtSkip":true} -->
```crv
{header-rows=3}
| a |
| b |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: hint table-row-count-clamped header-rows=3 asks for more rows than the table has, so it takes 2. Write header-rows=2.
```

### `table-shaped-paragraph`

Severity `warning`, on by default. Reports a line of text that starts with a pipe after its quote marks and indent and does not end with a closing pipe as C2-B-166 and C2-B-167 say, once per line: its last pipe is escaped or stands in a code span, or something other than a row attribute, a line comment after whitespace and trailing spaces and tabs follows it; a line that is a single pipe is not reported; the range runs from the pipe to the end of the line text.

<!-- carve-sample {"lint":"shows table-shaped-paragraph"} -->
```crv
> | a
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning table-shaped-paragraph This table-shaped line lacks a closing pipe and stays as paragraph text. If a table row was intended, write a complete row where a table can start.
```

### `table-span-marker-attribute`

Severity `warning`, on by default. Reports a prefix of a span mark that joins a cell and that the tree does not keep: a brace block, or a header mark that does not make its row a head row.

<!-- carve-sample {"lint":"shows table-span-marker-attribute","fmtSkip":true} -->
```crv
| a |
|= ^ |
```

```txt
$ carve lint doc.crv
doc.crv:2:2: warning table-span-marker-attribute This "^" joins the cell above it, and its header mark makes no head row, so it marks no cell and carve fmt drops it. Remove the "=", or make the row a head row.
```

### `table-span-marker-blocked`

Severity `warning`, on by default. Reports a table cell that holds only a span mark, `<` or `^`, after any prefix, that joins nothing and so holds the mark as text: a `<` in the first column or whose left cell is covered by a row span from above, a `^` in the first row of its group (head, body or foot) or below a cell that spans more than one column; once per cell, an escaped mark is not reported, and the range is the cell, the text between its pipes.

<!-- carve-sample {"lint":"shows table-span-marker-blocked","fmtSkip":true} -->
```crv
|< |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-span-marker-blocked The "<" span marker cannot extend a cell. There is no cell to its left in its row. It is a cell that holds "<" as text; escape it as "\<" to say so, or remove it.
```

### `table-width-total`

Severity `warning`, on by default. Reports a table whose `widths` attribute has a valid whole list under C2-B-212 and whose entries total more than 100; an invalid list reports only `table-attribute-invalid`; once per table, the range is the key `widths`.

<!-- carve-sample {"lint":"shows table-width-total"} -->
```crv
{widths=60,50}
| a | b |
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning table-width-total The specified table column widths total more than 100%.
```

### `thematic-break-spelling`

Severity `hint`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. `carve lint --fix` rewrites it. Reports a line of text that after its container prefixes and indent holds only a run of three or more hyphens or of three or more underscores and trailing spaces and tabs, which is no thematic break in 0.2, once per line; a hyphen run directly below a line of paragraph text is reported by `setext-heading-underline` instead, and three hyphens on line 1 open frontmatter; a typed opener that forms a later block is not text; the range is the run.

<!-- carve-sample {"lint":"shows thematic-break-spelling","fmtSkip":true} -->
```crv
---
carve: 0.1
---
___
```

```txt
$ carve lint doc.crv
doc.crv:4:1: hint thematic-break-spelling This line of "___" is text in Carve 0.2. Write "***" for a thematic break.
```

### `tight-list-item-with-blank-line`

Severity `hint`, a migration notice, off unless the document declares Carve 0.1 or `--upgrade` is given. Reports a tight list in which an item holds a paragraph among its own blocks and a blank line between two of its own blocks, which 0.1 read as a loose list and which 0.2 keeps tight, so the first paragraph of each item is written bare; a blank line inside a nested block does not count; once per list, the range is the list.

<!-- carve-sample {"lint":"shows tight-list-item-with-blank-line","fmtSkip":true} -->
```crv
---
carve: 0.1
---
- a

  b
- c
```

```txt
$ carve lint doc.crv
doc.crv:4:1: hint tight-list-item-with-blank-line A blank line inside an item no longer makes the list loose. Put a blank line between the items if every item should render as a paragraph.
```

### `unattached-block-attribute`

Severity `warning`, on by default. Reports an attribute line, or a run of consecutive attribute lines reported once at its first line, that no block takes because the end of its container or of the document follows, and since 0.2 also one that a blank line follows, a line blank as C2-W-143 reads it; a line the parse reads as text of a paragraph is no attribute line, and `block-opener-without-blank-line` reports it; once per run, the range is the attribute line.

<!-- carve-sample {"lint":"shows unattached-block-attribute"} -->
```crv
{.c}
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning unattached-block-attribute This attribute line reaches no block: a blank line or the end of its container follows, so the line is text (C2-B-192). Move it directly above the block it describes, or delete it.
```

### `unattached-caption`

Severity `warning`, on by default. Reports a caption line that is not directly below an image, table, code block, quote, math block, figure group or valid code include, a caption after a blank line among them, and a caption line directly below a caption that the same container holds.

<!-- carve-sample {"lint":"shows unattached-caption","fmtSkip":true} -->
```crv
a
^ b
```

```txt
$ carve lint doc.crv
doc.crv:2:1: warning unattached-caption This caption line is not directly below an image, table, code block, quote, math block, figure group or code include, so it is text. If a blank line separates it from such a block, remove the blank line; otherwise escape the caret.
```

### `unattached-inline-attribute`

Severity `hint`, on by default. Reports a valid attribute block, or a run of glued ones, in an inline content (a paragraph, heading, term, description or table cell) that is glued to the end of no formed host, so it is printed as written; a line of a line block is such an inline content too, and the text of a caption or a description is that of its paragraphs; `{}`, an escaped brace, a line that holds nothing but blocks (an attribute line), a run at the start of a paragraph or of a line of a line block that `block-marker-as-text` reports and a table cell that `table-row-attribute-as-cell` reports are not reported; once per run, the range is the run.

<!-- carve-sample {"lint":"shows unattached-inline-attribute"} -->
```crv
{{#if}}
```

```txt
$ carve lint doc.crv
doc.crv:1:2: hint unattached-inline-attribute This attribute block is attached to nothing and renders as text. Glue it to a span, link or code span, or escape the brace.
```

### `unclosed-braced-comment`

Severity `warning`, on by default. Reports a braced comment whose closer stands behind an interrupter line, so that it is unclosed and stays text.

<!-- carve-sample {"lint":"shows unclosed-braced-comment"} -->
```crv
- a {% c
- b %}
```

```txt
$ carve lint doc.crv
doc.crv:1:5: warning unclosed-braced-comment This braced comment is not closed before the next block starts, so it stays text. Close it inside its block, or use %% line comments.
```

### `unclosed-inline-emphasis`

Severity `warning`, on by default. Reports a bare `*` or `/` in a paragraph line that stands at the start of the line or after whitespace, `(`, `[` or `{`, that an ASCII letter, digit or `_` follows, that closes no pair, and after which the rest of its paragraph holds no further delimiter of its kind; once per delimiter.

<!-- carve-sample {"lint":"shows unclosed-inline-emphasis"} -->
```crv
a *b
```

```txt
$ carve lint doc.crv
doc.crv:1:3: warning unclosed-inline-emphasis This strong opener is unclosed in its paragraph; add a closer.
```

### `uneven-list-indent`

Severity `warning`, on by default. Reports a marker left of every open list that continues the list above it, except an ordered marker that `ordered-marker-right-aligned` reports.

<!-- carve-sample {"lint":"shows uneven-list-indent","fmtSkip":true} -->
```crv
  - a

- b
```

```txt
$ carve lint doc.crv
doc.crv:3:1: warning uneven-list-indent This marker stands left of every open list and continues the list above it. Align it with the markers of that list.
```

### `unresolved-footnote`

Severity `warning`, on by default. Reports a footnote reference that resolves to no footnote definition, its key folded as C2-I-079 says and its case kept; once per reference.

<!-- carve-sample {"lint":"shows unresolved-footnote"} -->
```crv
a[^b]
```

```txt
$ carve lint doc.crv
doc.crv:1:2: warning unresolved-footnote Footnote reference [^b] has no matching definition; it renders as literal text.
```

### `unresolved-reference-link`

Severity `warning`, on by default. Reports a full or collapsed reference, link or image, whose key matches no link definition and, for a link, no heading by the lookup of C2-I-084, once per reference; a shortcut forms only from a definition and is text otherwise, so it is never reported, and a wrapped label folds its line break to one space; the range is the reference.

<!-- carve-sample {"lint":"shows unresolved-reference-link"} -->
```crv
[a][b]
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning unresolved-reference-link Reference link [a][b] has no matching link definition or heading; its brackets and label remain literal, while link-text children render normally.
```

### `unused-footnote-definition`

Severity `warning`, on by default. Reports a footnote definition whose key no footnote reference of the document uses, a reference inside another footnote definition counting; once per key, the range is `[^label]` on the definition's first line.

<!-- carve-sample {"lint":"shows unused-footnote-definition"} -->
```crv
[^a]: +
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning unused-footnote-definition Footnote definition [^a] is never referenced, so it is omitted from the rendered document.
```

### `unused-link-reference-definition`

Severity `warning`, on by default. Reports a link reference definition whose key no link or image reference that resolves uses, where a reference inside a footnote definition that nothing references, and one inside an unresolved reference, does not count; once per definition, from its opening bracket.

<!-- carve-sample {"lint":"shows unused-link-reference-definition","fmtSkip":true} -->
```crv
[a]: \\
```

```txt
$ carve lint doc.crv
doc.crv:1:1: warning unused-link-reference-definition This link reference definition is unused.
```

### `unused-snippet`

Severity `hint`, on by default. Reports a winning snippet definition that no snippet use of the authored tree names, a use inside another definition counted; once per definition, the range is the `$` and the name in its marker.

<!-- carve-sample {"lint":"shows unused-snippet"} -->
```crv
{$v}: X
```

```txt
$ carve lint doc.crv
doc.crv:1:2: hint unused-snippet Snippet "$v" is defined but never used.
```

## Parse and render-loss codes

These codes come from the parser and from a render or write, not from a lint rule, so the lint options do not turn them off. `carve lint` and `carve diagnostics` print the parse entries; a render or a write reports its losses (see [Programmatic checks](#programmatic-checks)). An `error` in the parse channel still leaves a tree: the construct ends where its container ends, and the document renders.

| Code | Channel | Severity |
| --- | --- | --- |
| `delimited-table-malformed` | parse | error |
| `duplicate-abbreviation-definition` | parse | warning |
| `duplicate-footnote-definition` | parse | warning |
| `duplicate-id` | parse | warning |
| `duplicate-link-reference-definition` | parse | warning |
| `duplicate-snippet` | parse | warning |
| `fence-opener-fallback` | parse | error |
| `fence-title-syntax` | parse | warning |
| `include-budget` | parse | warning |
| `include-cols-duplicate` | parse | warning |
| `include-cols-invalid` | parse | warning |
| `include-cycle` | parse | warning |
| `include-depth` | parse | warning |
| `include-heading-clamp` | parse | warning |
| `include-lines-out-of-range` | parse | warning |
| `include-no-resolver` | parse | warning |
| `include-non-text` | parse | warning |
| `include-not-found` | parse | warning |
| `include-option-invalid` | parse | warning |
| `include-outside-root` | parse | warning |
| `include-region-invalid` | parse | warning |
| `include-rows-out-of-range` | parse | warning |
| `include-section` | parse | warning |
| `include-selection-conflict` | parse | warning |
| `include-unreadable` | parse | warning |
| `unclosed-code-fence` | parse | error |
| `unclosed-comment-fence` | parse | error |
| `unclosed-container-fence` | parse | error |
| `unclosed-frontmatter` | parse | error |
| `carrier-attribute-dropped` | render-loss | warning |
| `derived-text-budget` | render-loss | warning |
| `destination-denied` | render-loss | error |
| `extension-fallback-rendered` | render-loss | warning |
| `extension-renderer-failed` | render-loss | warning |
| `extension-transform-failed` | render-loss | warning |
| `field-unspellable` | render-loss | warning |
| `heading-shift-above-6` | render-loss | warning |
| `image-alt-unknown` | render-loss | warning |
| `import-attribute-dropped` | render-loss | warning |
| `import-carrier-ignored` | render-loss | warning |
| `import-destination-denied` | render-loss | warning |
| `import-element-dropped` | render-loss | warning |
| `import-element-mapped` | render-loss | warning |
| `import-structure-repaired` | render-loss | warning |
| `import-whitespace-normalized` | render-loss | hint |
| `include-expanded-roundtrip` | render-loss | warning |
| `include-unresolved` | render-loss | warning |
| `migration-loss` | render-loss | warning |
| `profile-construct-degraded` | render-loss | warning |
| `raw-format-dropped` | render-loss | warning |
| `snippet-cycle` | render-loss | warning |
| `snippet-depth` | render-loss | warning |
| `snippet-node-budget` | render-loss | warning |
| `snippet-scope-loss` | render-loss | warning |
| `snippet-unexpanded-transform` | render-loss | warning |
| `snippet-unresolved` | render-loss | warning |
| `structure-unspellable` | render-loss | warning |
| `writer-refused` | render-loss | warning |

## Retired 0.1 rule ids

These 0.1 rule ids are not reported by 0.2. Where 0.2 reports the same text under another code, the second column names it. A suppression comment or a `--rules` setting that names a retired id does nothing; change it to the new code.

| 0.1 id | 0.2 code |
| --- | --- |
| `continuation-marker-refused` | `deprecated-continuation-marker` |
| `gfm-delimiter-row` | `deprecated-separator-row` |
| `include-block-in-inline` | none |
| `include-call-limit` | none |
| `include-duplicate-option` | `include-option-invalid` |
| `include-footnote-rename` | none |
| `include-id-rename` | `duplicate-id` |
| `include-lines-invalid` | `include-option-invalid` |
| `include-rows-invalid` | `include-option-invalid` |
| `include-unknown-option` | `include-option-invalid` |
| `list-item-body-detached` | `list-item-body-below-content-column` |
| `markdown-italic-underline` | `deprecated-bare-underline` |
| `ordered-list-split-by-indent` | `uneven-list-indent` |
| `refused-continuation-marker` | `deprecated-continuation-marker` |
| `table-separator-near-miss` | `deprecated-separator-row` |

**Specification (external):** [Diagnostics and lint in the writer chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) (C2-W-103 to C2-W-111, C2-W-156), [the lint command in the tooling chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md) (C2-T-031, C2-T-038 to C2-T-042, C2-T-049 to C2-T-052), [lint control comments](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-215, C2-B-216), [linting included files](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md) (C2-N-085), [diagnostics in the AST chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#diagnostics), and the rule catalog [`spec/0.2/data/lint-rules.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/lint-rules.json).
