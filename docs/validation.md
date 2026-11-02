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

Across commands, usage errors, unreadable input, and invalid AST JSON exit with
status `2`. The first stderr line begins `carve[category]:`, where `category`
is `usage`, `input-unreadable`, or `ast-json-invalid`. Scripts can use that
token; wording after the colon may differ by implementation.

Use `carve lint --json` when an editor, CI job, or migration tool needs stable
rule IDs, source ranges, and rule-specific details rather than display text.

By default `carve lint` reports the semantic rules below and source that
looks like intended markup but renders as something else. The default hint for
`_word_` explains that Carve renders underline and `/word/` renders italic;
a document can suppress it when underline is intended. Caption-looking prose
adjacent to a table or image is opt-in because ordinary prose can use the same words.

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

### Included content

Pass `--include-root DIR` to lint what a document pulls in through
<code v-pre>{{ ... }}</code> as well:

```sh
carve lint --include-root . doc.crv
```

With a root, the linter expands includes under the same containment, size,
depth and cycle rules as `carve render`, and runs every rule on each Carve-mode
include. A `{table}`-marked `csv` or `tsv` `@code` include also gets the
`delimited-table-*` rules. A finding in an included file names that file,
relative to the root, and the directive that reached it:

```txt
data/plans.csv:3:1 delimited-table-malformed — This marked CSV/TSV record has malformed quoting, so the include remains a code block. (included from doc.crv:2:1)
```

An include that fails (a missing file, a cycle, an invalid region, conflicting
selections) is reported at its directive under its `include-*` rule id. Renames
and heading clamps (`include-id-rename`, `include-footnote-rename`,
`include-heading-clamp`) are render warnings, not lint findings. A file
included twice reports each finding once. Without `--include-root` nothing is
expanded and lint reports what it always has: the include root is never
inferred from the input path here, unlike `carve render`. The rules are
CARVE-P6-001 I16; see [Linting included content](./includes#linting-included-content).

## Automatic Repair

`carve fmt --migrate` rewrites the case-only reference misses that have exactly
one candidate: a `</#id>` cross-reference to a heading, numbered caption or
equation whose id differs only in case; a collapsed or explicit link or image
reference whose label matches a link definition only case-insensitively; or a
collapsed link reference that falls back to plain heading text with a case-only
mismatch.

It leaves a reference alone when more than one target matches it
case-insensitively, and when a collapsed reference would fall back to heading
text carrying inline markup. The skip is that fallback alone, not inline markup
in general: `## *Label*` with `[*label*][]` stays as written, while
`[*l*abel][]` and `[t][*l*abel]` against a `[*L*abel]: /u` definition are both
rewritten. Include selectors, glossary references and external fragment links
are outside the repair.

Rewriting a collapsed label changes the visible link text, and a collapsed
image's alternative text, so read the result rather than committing it unseen.
Ordinary `fmt` leaves every reference as authored.

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

To lint included content, pass the resolver you render with. A warning from an
included file carries `file` (the resolver's id for it) and `includedBy`, the
directives that reached it, top-level directive first:

```ts
import { lintCarve } from '@markup-carve/carve'
import { fileSystemResolver } from '@markup-carve/carve/node'

lintCarve(source, { includes: { resolve: fileSystemResolver(root), sourcePath } })
```

## Editor Diagnostics

The language server surfaces the same lint warnings as editor diagnostics, so
the command-line and editor behavior stay aligned.

## Rules

| Rule | Catches |
| ---- | ------- |
| `table-shaped-paragraph` | a line beginning like a pipe table row that misses its closing `|` and stays paragraph text; report the first unclosed row |
| `table-row-cell-count` | a pipe-table body row with a different effective cell count from its header, after colspan and rowspan are counted, or a `+` line that appends a cell past its row's last column; rendering keeps the row as written |
| `table-separator-near-miss` | a separator-like row that remains a body row, or a cell containing only a dash run that looks like a separator |
| `list-marker-without-blank-line` | a list marker folded into the preceding paragraph because no blank line separates them |
| `unclosed-inline-emphasis` | a strong or emphasis opener with no closer in its paragraph |
| `link-gap-before-destination` | whitespace between `]` and `(` prevents an intended inline link from forming |
| `markdown-italic-underline` | `_word_` renders underline; use `/word/` for italic. This default hint can be suppressed per document |
| `heading-level-skip` | a heading jumps over a level; default-on hint. `a11y/heading-jump` is a deprecated input alias through the next minor and reports under this id |
| `unused-link-reference-definition` | a winning link reference definition has no rendered link or image use; default-on |
| `empty-link-destination` | a parsed inline link has an empty destination; default-on |
| `duplicate-reference-url` | two distinct reference definitions have the same normalized URL; opt-in |
| `non-descriptive-link-text` | a link is labeled `here`, `click here`, or `read more` without a more specific accessible name; opt-in |
| `emphasis-as-heading` | a paragraph consists only of emphasis or strong text; opt-in |
| `bare-html-tag` | an HTML-like tag in prose renders as escaped text; default-on hint |
| `comment-shaped-emphasis` | a C-comment shape such as `/* foo */` renders as emphasis around `* foo *`; use a code span or escape the delimiters. Default-on hint |
| `glob-shaped-strong` | a file glob such as `*.js,*.ts` renders as strong text; use a code span or escape the `*`. Default-on hint |
| `html-comment-renders-as-text` | an HTML comment `<!-- ... -->` in prose renders as visible text; use a `%%` line comment or a `%%%` comment fence. Default-on warning |
| `markdown-definition-paragraph` | `term` followed by `: definition` remains a paragraph; Carve needs `:: term` |
| `github-alert-marker` | `[!NOTE]` or `[!WARNING]` in a blockquote stays literal text |
| `caption-looking-paragraph` | opt-in hint for a caption-like paragraph directly before or after a table or image |
| `bidi-control-in-source` | a Trojan-Source bidi override or isolate control (U+202A–U+202E, U+2066–U+2069) that canonical Carve preserves but every presentation target strips |
| `duplicate-heading-id` | two headings producing the same id, either by slug collision or repeated explicit `{#id}` |
| `broken-crossref` | a `</#id>` cross-reference with no matching heading or numbered caption id; when the id exists on another element, the message names that element and suggests `[text](#id)`, since a cross-reference cannot target it. Matching is case-sensitive (PART 9R R4); a case-only mismatch names the real id, and `carve fmt --migrate` rewrites the reference to it when exactly one id matches |
| `broken-fragment-link` | a `[text](#id)` link, inline or through a `[label]: #id` definition, whose fragment matches no id in the rendered document. Matching is case-sensitive like the rendered `href`; a case-only mismatch names the real id. `#`, `#top`, other files and URLs are not checked. The render that collects the ids is the caller's own, carrying the extensions passed to the linter. A link absent from that render is not checked, such as one inside an unreferenced footnote definition, which `unused-footnote-definition` already reports |
| `unresolved-reference-link` | a `[text][label]` or `[text][]` reference link, or a `![alt][label]` or `![alt][]` reference image, with no matching link definition; only the collapsed `[text][]` also falls back to the implicit heading target, so an explicit label that names no definition is unresolved even when a heading carries that text (PART 9R R1). Matching is case-sensitive; a case-only mismatch names the real label or heading text, and `carve fmt --migrate` rewrites the label to it when exactly one target matches |
| `fence-opener-fallback` | a line that opens like a fenced code block but whose info string is not valid and does not recover - an attribute block with no language (`{.x}` right after the fence), tabs or extra spaces before the language, or a language token followed by a character other than whitespace, a quote, `{` or `[`. The line falls back to paragraph text, so the block the author meant is not a code block at all. A language followed by invalid metadata recovers and reports `fence-title-syntax` instead |
| `unresolved-footnote` | a `[^label]` footnote reference with no matching `[^label]: ...` definition |
| `duplicate-footnote-definition` | a repeated `[^label]: ...` definition; the first definition wins and later ones are ignored |
| `unused-footnote-definition` | a footnote definition that is never referenced and is omitted from rendered output |
| `setext-heading-underline` | a `---` or `===` run (three or more markers) directly under a paragraph line; Carve has no underline heading, so `---` renders a break and `===` stays paragraph text. Use `#` |
| `heading-closing-hashes` | a heading line ending in a space and a `#` run; the run stays heading text, so delete it |
| `indented-code-block` | a top-level paragraph after a blank line whose first line is indented four or more spaces; it renders as a paragraph, not code. Use a fence. Silent inside a list item, quote or other container, and directly after a list, where the indent reads as a continuation |
| `heading-trailing-attribute` | a trailing `{#id}` or `{.class}` on a heading line; attributes must go on the line above the heading |
| `raw-block-syntax` | a legacy `` ```raw FORMAT `` fence; Carve raw blocks use `` ```=FORMAT `` |
| `blockquote-marker-without-space` | a line starting with `>` that is neither a bare quote marker nor `> `; it renders as prose, not a block quote |
| `block-marker-as-text` | a line that opens like a block (`:::`, `{#`, `{.`) but parsed as plain text |
| `fence-delimiter-indentation` | a fenced-code delimiter indented past its owner's content column. Since markup-carve/carve#3885 that fence opens, measured from its own line, and `block-opener-overindented` or, inside a list item, `list-item-block-overindented` reports the line, so the rule has nothing left to report; it retires as each engine adopts the ruling (markup-carve/carve#4834). `fmt` still moves a structural fence back to the minimum column |
| `list-item-body-detached` | a block-shaped line indented past the item's marker column but below its exact content column; after a blank it has left the item, so the diagnostic offers the two explicit intentions: indent to the content column to make it structural, or escape the opener to preserve literal text |
| `list-marker-below-content-column` | a list marker past a list item's marker column but below its content column: a marker of another kind starts a separate list and one of the same kind is a sibling item, before and after a blank line. Indent it to the content column to nest it or move it to the marker column for a sibling |
| `description-separator-below-content-column` | a `:` or `::` separator below the column of a definition list it appears to continue inside an indentation container, so it adds no entry: past the item's marker column it folds into the open term or description as text, and a `:` at the marker column ends the item as a paragraph. Indent it to the definition list's column |
| `ordered-list-split-by-indent` | consecutive ordered lists continue the same numbering style and sequence, but their first markers start in different columns, so they render as two lists |
| `list-item-block-overindented` | a recognized block opener past an item's canonical content column. Reported once per block, on its first line; continuing table rows and quote lines do not open another block. An aligned opener stays unreported when a continuation is overindented, including when the block opens on the item's marker line. The finding also covers the pre-#1701 full-prefix column of an attributed marker; under #1705 it is structural and `fmt` canonicalizes it. Dedent for the canonical structural spelling or escape the opener to preserve the literal meaning older readers assigned to it |
| `continuation-marker-refused` | a refused lone `+`, on its own line or on a marker line (`- +`, `: +`, `[^a]: +`, `> +`, `- > +`): the next line is blank or missing, lacks the prefix of a quote around the host, stands at another column, is a sibling or closes an open div. PART 9 §17 L3 refuses attachment and the `+` stays a plain letter; see [refused continuation markers](#refused-continuation-markers) |
| `block-opener-overindented` | a block opener indented past the content column of the document, a quote, a definition body, a footnote body or a colon body; it still opens there, measured from its own line (`  # h` is a heading). A list marker is not reported, and a table reports once. Inside a list item the finding is `list-item-block-overindented` instead. Remove the indentation, or escape the opener to keep it as text; see [fragile spellings](#fragile-spellings) |
| `emphasis-marker-before-attributes` | a bare `*`, `/`, `_`, `~` or `=` directly before an attribute block where the reading is not the visible one: the marker closes no span and both stay text, or the span it closes holds another same marker and the block attaches to all of it. Plain `*a*{.x}` is quiet. Brace the span or escape the marker; see [fragile spellings](#fragile-spellings) |
| `empty-include-path` | a <code v-pre>{{ ... }}</code> run shaped like an include directive but containing no path, including empty braces and spaced directive forms containing only a `#section` or `@option`; it remains literal text, so add a path or remove the braces |
| `region-marker-renders-as-text` | a line whose content is a `#region` or `#endregion` marker in a source-comment form (`#region name`, `// #region name`, `-- #region name`, `/* #region name */`, `<!-- #region name -->`), or a `%%` marker whose keyword is not lowercase (`%% #Region name`). In a Carve file the first kind renders as visible text and none of them is a region marker for a Carve include (CARVE-P6-001 I1b), so write `%% #region name` |
| `include-unresolved` | a Warning for an include whose path the resolver cannot read: missing, unreadable or outside the containment root; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-non-text` | a Warning for an include target that is binary or otherwise not text; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-section` | a Warning for a `#section` that selects nothing in the included file; a case-only mismatch names the exact id; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-region-invalid` | a Warning for an `@region:name` the included file does not define, or region markers that are malformed, duplicated, unmatched or unclosed; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-selection-conflict` | a Warning for a directive that combines more than one of `#section`, `@lines` and `@region`, names two sections, or pairs `#section` with `@code`; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-unknown-option` | a Warning for an unrecognized or malformed `@option`, such as `@bogus:1` or a `@code` language that is not a language token; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-lines-invalid` | a Warning for an `@lines` value that is not two decimal integers without leading zeros, starts below 1, or ends before it starts; the directive stays literal and the file remains a resolved dependency (CARVE-P6-001 I1, I7, I11). Reported only when lint is given an include root or resolver (I16) |
| `include-lines-out-of-range` | a Warning for an `@lines` range that starts past the last line of the included file; the directive stays literal, while a range that starts inside the file and ends past it is clamped (CARVE-P6-001 I1, I7). Reported only when lint is given an include root or resolver (I16) |
| `include-duplicate-option` | a Warning for a directive that gives the same option key twice, such as two `@lines` ranges or `@code:js` beside `@code:py`; the directive stays literal instead of taking the last value (CARVE-P6-001 I1, I7). Reported only when lint is given an include root or resolver (I16) |
| `include-block-in-inline` | a Warning for an inline include whose content resolves to more than one paragraph or to block structure; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-cycle` | a Warning for an include that would reach a file already on its own include chain; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-depth` | a Warning for an include nested deeper than the include-depth limit; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-budget` | a Warning for an include whose expansion would exceed the render byte budget, and for every directive after the budget is spent, which is not resolved; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `include-call-limit` | a Warning for an include past the resolver-call bound, and for every directive after it, which is not resolved; the directive stays literal (CARVE-P6-001 I7). Reported only when lint is given an include root or resolver (I16) |
| `empty-reference-definition` | warning for a bare `[label]:` definition with an empty URL; the definition remains valid and can interrupt a paragraph, so confirm that no destination was removed by mistake |
| `carve-version-unsupported` | a document declaring a Carve spec version the processor does not implement, so constructs added after that version render as something else without any error |
| `unclosed-container-fence` | a `:::` opener with no matching closer; the container runs to end of input, which is legal (PART 9 §12) and rarely what was meant |
| `unclosed-code-fence` | a backtick or tilde fence that opened a code block or a raw block and has no closing fence, so it runs to the end of the document, to the end of the container holding it, or to a `+` continuation marker that ends it (PART 9 §17 L3). Legal and rarely meant: every line up to that point is code. The message names the fence as written and where it ended; see [unclosed code fences](#unclosed-code-fences) |
| `colon-fence-length-mismatch` | a bare colon run plausibly intended to close the innermost container has a different width; reports both widths, the opener location, and whether the line actually opens a nested container or remains text |
| `fence-title-syntax` | invalid fence metadata; a recognized fence/type prefix (a colon fence's type word, a code fence's language token) keeps the container or code block while dropping metadata, and an unrecognized prefix remains paragraph text |
| `footnote-labels-differ-only-in-whitespace` | two footnote definitions whose labels normalize to the same ASCII-whitespace key; the first definition wins, the later definition is ignored, and the diagnostic identifies the collision |
| `table-marker-run-padding` | a table cell's marker run with no terminating space - the kind marker `=`, the alignment run, the attribute block, or any glued combination of them, as in `|=a `, `|>text ` or `|=<{.x}value `. PART 9 §5 T11 makes the whole run one thing with one terminator, so without the space there is no run and every character of it is content: `|=a |` is a data cell whose text is `=a`, not a header cell holding `a`. `fmt --migrate` inserts the required space. A block written before its alignment marker (`|{#x}< `, the order PART 9 §5 T10 retired) is reported under this id and not rewritten, because the two orders render different documents. This id replaces `table-alignment-run-padding` and `table-cell-attribute-before-marker` |
| `table-column-arity` | an `aligns`, `valigns`, or `widths` list shorter than the widest row; the unset tail is valid but often accidental. More entries than columns is a parse error rather than a lint |
| `table-column-overlap` | a field supplied both by an in-table column marker and by a table attribute list; the in-table spelling wins |
| `delimited-table-malformed` | malformed quoting in a marked `csv` or `tsv` fence, or in a `{table}`-marked `csv` or `tsv` `@code` include when lint is given an include root (CARVE-P6-001 I16); the fence or include remains code |
| `delimited-table-wide-row` | a marked `csv` or `tsv` record, in a fence or in a `{table}`-marked `@code` include linted under an include root (CARVE-P6-001 I16), wider than the first record; the extra fields are kept |
| `consumed-key-near-miss` | a bare key one edit away from the consumed structural key its block reads, such as `{tabel}` on a `csv` fence or `{lose}` on a list. The key stays an ordinary attribute and the structure does not happen; see [consumed key near misses](#consumed-key-near-misses) |
| `table-width-total` | table column widths whose specified percentages total more than 100; individual widths remain usable, but the allocation overcommits the table |
| `table-span-marker-blocked` | a `^` or `<` span marker that the PART 9 §5 T5 span walk cannot resolve: a `^` in the first row or with no cell above it, a `<` in the first column, or a span that would cover another cell. T5 renders the marker as a cell of its own, so the span the author wrote silently does not happen. The message names the reason. Escaped `\^` and `\<` are text and are not reported. Nothing is rewritten. Emitted by carve-js; carve-php and carve-rs port it next (markup-carve/carve#3183) |
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
| `footnotes-placement-in-container` | a `::: footnotes` marker inside a block-level container - a block quote, a list item, a div or directive body, a table cell, a definition description, a footnote definition. Only a top-level marker places (PART 9 §16, `CARVE-P9-073`), so the marker renders the `<div class="footnotes">` floor where it is written and the endnotes section goes where it would without this marker. Move the marker to document level, or delete it to accept the default position |
| `bibliography-placement-in-container` | a `::: bibliography` marker inside a block-level container when a processor feature supplies a document-wide region under that marker. The marker renders the `<div class="bibliography">` floor and the region keeps its default position (`CARVE-P9-073`) |
| `references-placement-in-container` | a `::: references` marker inside a block-level container when a citation extension supplies a document-wide reference list. The marker renders the `<div class="references">` floor and the list keeps its default position (`CARVE-P9-073`) |
| `quote-fence-ends-the-quote-above` | a `::: >` opener at the column of the quote directly above it. It is a block opener, so it ends that quote and starts a sibling one, and the two render as adjacent blockquotes rather than the nesting the indentation suggests. Nothing is malformed and lint otherwise exits 0, which is why this container kind needs a rule of its own: write `> ::: >` to nest it, or leave a blank line to make two quotes deliberate |
| `definition-term-block-folded` | a block opener indented under a `:: ` term, past the column of the container that holds the list. Since markup-carve/carve#3885 a term has no ownership of its own, so the opener opens in the enclosing container (PART 0 S3) and the rule has nothing left to report; it retires as each engine adopts the ruling. Move the line into the term's `: ` description to keep it with the term |

### Consumed key near misses

`consumed-key-near-miss` covers the two boolean
[consumed structural keys](./blocks-and-attributes#consumed-structural-keys).
A misspelled one is an ordinary attribute, so `{tabel}` above a `csv` fence
renders the records as code and `{lose}` above a list leaves it tight, with
nothing malformed to report.

A host and the key it is checked against:

- a fenced code block whose language is exactly `csv` or `tsv`, or a figure
  whose target is one: `table`;
- a list of any kind, or a definition list: `loose`.

Every key on the host's attributes whose value is empty (`{tabel}` or
`{tabel=""}`) is reported when it differs from the key and either equals it
after ASCII lowercasing or is one edit from it: one inserted, deleted or
replaced letter, or two adjacent letters swapped. `{Table}`, `{tables}`,
`{teble}` and `{talbe}` are reported on a `csv` fence. `{TABEL}`, `{tab}` and
`{abel}` are two edits away, and `{close}` is two edits from `loose`; none is
reported. A key with a value (`{tabel=foo}`) is not a flag and is not checked.

The finding is at the host's first line and column, not at the attribute line.
A host with several near misses reports each, in the order the keys are
written. `table` is not checked on a list or `loose` on a fence. A fence that
already carries `table` is a table, not a host, so `{table tabel}` reports
nothing. The message names the key as written and suggests the consumed key:

```txt
doc.crv:2:1 consumed-key-near-miss — "tabel" is not a consumed key here; did you mean {table}?
```

The shared vectors are in
[`tests/lint-rule-vectors/consumed-key-near-miss.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/consumed-key-near-miss.json).

### Unclosed code fences

`unclosed-code-fence` reports a fenced code block or raw block whose opener
has no matching closer: a line of the same fence character, at least as long
as the opener, at the opener's column. Without one, the block takes every line
until something else ends it, and all of them are code:

- the end of the input;
- the end of the container holding the fence: a list item, a definition
  description, a block quote or a footnote body. A `:::` closer inside the
  fence is code, so it does not end it;
- a `+` continuation marker at the host's marker column, which ends a
  preceding fence before the attached block begins (PART 9 §17 L3).

Each case is legal (PART 2 `code_block`, CARVE-P12-064), and none is what an
author usually meant. An opener under an open paragraph interrupts it whether
or not a closer follows (PART 9 §10 I4), so a missing closer there turns the
rest of the container into code too. Here the fence opened on the item's marker line takes
`x` and the blank line as code, and the `+` ends it:

````carve
- ```
  x

+
tail
````

The finding is at the opener's first fence character. The message names the
fence as written and how it ended, using one of three phrases: `end of the
document`, `end of its container` or `continuation marker`. It also names
the fix, a closing fence where the code should stop. Nothing is rewritten.

```txt
doc.crv:1:3 unclosed-code-fence — The ``` fence opened here has no closing fence; a continuation marker on line 4 ends it. Add a closing ``` where the code should stop.
```

Not reported:

- a fence-shaped line that does not open a code block, such as an opener
  whose info string is invalid; `fence-opener-fallback` covers those;
- a `:::` container, which `unclosed-container-fence` covers;
- a `%%%` comment fence.

The shared vectors are in
[`tests/lint-rule-vectors/unclosed-code-fence.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/unclosed-code-fence.json).

### Refused continuation markers

`continuation-marker-refused` reports a `+` that PART 9 §17 L3 reads as a
continuation marker: alone at an open container's marker column, or first
after a block opener in the first-block form (`- +`, `1. +`, `: +`, `[^a]: +`,
`> +`). It reports when the next line is blank or the input ends, lacks the
prefix of a quote around the host, stands at another column, is the host's
sibling (a list marker under a list item, a `: ` or `:: ` line under a
description), or closes an open div (CARVE-P9-067, markup-carve/carve#3421,
markup-carve/carve#4409). A `+` that PART 0 S2 reads as a letter, including one
past a quote's marker column or at document level, is quiet. PART 9 §17 L3
refuses the recognized marker. The `+` remains a
plain letter, or fence payload when the fence content column claims it:

```carve
- item
+

Meant for the item.
```

renders a one-item list whose text ends in `+`, then a separate paragraph. The finding is at the `+`.
The message says what follows it, a `blank line` or the `end of the
document`, and names the fix: delete the blank line to attach the next
block, or delete the `+`. A refused first-block `+` is the same letter: `- +` over a
blank line renders `<li>+</li>`. An empty item is written `- {empty}`, an empty
description `: {empty}`.

```txt
doc.crv:2:1 continuation-marker-refused — This + attaches nothing: a blank line follows it, so the marker is refused and the list item ends here. Delete the blank line to attach the next block, or delete the +.
```

Not reported:

- a `+` inside a code fence's content column, which is payload.
- a document-level `+` between two text lines (`q` / `+` / `para`), which is
  ordinary paragraph text.
- a document-level `+` before a list, table, heading, fence or quote; S2 reads
  it as a letter.
- a `+` past an open quote's marker column; S2 reads it as a letter.

A refused `+` inside an open fence is payload at its content column and text
at another column (markup-carve/carve#3400, markup-carve/carve#3421).

The shared vectors are in
[`tests/lint-rule-vectors/continuation-marker-refused.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/continuation-marker-refused.json).

### List markers below the content column

`list-marker-below-content-column` reports a marker-shaped line when its first
marker character is past a list item's marker column but below its content
column. It reads as it would at the marker column, before and after a blank
line: a marker of another kind starts a separate list, and one of the same kind
is a sibling item (markup-carve/carve#4835). Carve keeps the strict column model: sibling markers are
not aligned by their delimiter (markup-carve/carve#3439).

```carve
10. c
   - d
```

This renders an ordered list and then a separate bullet list, not a nested list.
The finding sits on the `-`. Move it to content column 4 to nest it, or to
marker column 0 to begin a sibling item. The lint does not rewrite the source.

```txt
doc.crv:2:4 list-marker-below-content-column — This list marker starts at column 3, below the list item's content column 4, so it folds into the item's paragraph as text. Indent it to column 4 to nest it under the item, or start it at column 0 to begin a new item at the item's own level.
```

The same indentation after a blank line is the loose-item spelling of a child
list, and it fails the same way:

```carve
10. c

   - d
```

This renders an ordered list and then a separate bullet list. The finding sits
on the `-`, and its message says the marker is after a blank line:

```txt
doc.crv:3:4 list-marker-below-content-column — This list marker starts at column 3 after a blank line, below the content column 4 of the list item above, so it starts a separate list instead of nesting. Indent it to column 4 to nest it under the item, or start it at column 0 to put it at the item's own level.
```

Only the first marker of the detached list is reported, and only when nothing
but blank lines separates it from the item.

A marker of the same kind joins the list, and a one-space sublist is the usual
way to write one by accident:

```carve
- Rechnung
 - Entwurf
 - Final
- Mahnung
```

This renders one flat list of four items. Lines 2 and 3 are both reported,
because each stands past the marker column and below the content column of an
earlier item of the list. A continuing ordered marker is the same case, as are
`9. nine` over ` 10. ten` and a marker after a blank line:

```txt
doc.crv:2:2 list-marker-below-content-column — This list marker starts at column 1, below the content column 2 of an earlier item in its list, so it is a sibling item, not a nested one. Indent it to column 2 to nest it under that item, or start it at column 0 to align it with that item.
doc.crv:3:2 list-marker-below-content-column — This list marker starts at column 1, below the content column 2 of an earlier item in its list, so it is a sibling item, not a nested one. Indent it to column 2 to nest it under that item, or start it at column 0 to align it with that item.
```

Not reported:

- escaped markers, markers without a following space or tab, and lines outside
  a list item;
- a marker at or past the content column, or at or left of the
  item's marker column;
- a marker inside code, raw, comment, line-block or other payload;
- a marker of another kind after a blank line when a paragraph or other block
  sits between it and the item, or when it is the second marker of a list
  already reported.

The canonical auto-numbered `.` marker avoids this column trap when an
explicit number would widen the marker. The shared vectors are in
[`tests/lint-rule-vectors/list-marker-below-content-column.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/list-marker-below-content-column.json).

### Description separators below the list column

`description-separator-below-content-column` reports a `:` or `::` separator
below the column of a definition list that ends on the line above it, or above
a blank line, inside an indentation container. The separator cannot continue
that list (markup-carve/carve#3451): past the container's marker column it
folds into the open term or description as text, or starts a separate
paragraph after a blank line, and a `:` at the marker column ends the
container and becomes a paragraph (markup-carve/carve#3455).

```carve
- a
  :: term
 : detail
```

The `: detail` line starts one column below the definition list. Indent it to
column 2 to make it a description of `term`. Not reported: a separator at the
list's column, a separator that attaches to a surviving outer definition
list, a `::` at the marker column (it opens a new list at that level), escaped
separators, and separator-shaped lines inside literal payloads. The rule does
not rewrite source. Shared positive and negative cases are in
[`tests/lint-rule-vectors/description-separator-below-content-column.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/description-separator-below-content-column.json).

### Ordered lists split by indentation

`ordered-list-split-by-indent` reported adjacent sibling ordered lists whose
first markers started at different source columns. Since
markup-carve/carve#3885, sibling items group by the container they open in,
not by the column they are written at, so this document is one list:

```carve
 9. nine
10. ten
```

It renders one ordered list starting at 9, as Djot does. Both markers open at
the document's content column, so there is no second list to report. The rule
retires as each engine adopts the ruling; until then an engine may still
report it. The shared vectors are in
[`tests/lint-rule-vectors/ordered-list-split-by-indent.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/ordered-list-split-by-indent.json).

### Fragile spellings

Two rules report spellings that parse, but not the way a reader of the source
is likely to expect (markup-carve/carve#3992). Neither changes the output.

`block-opener-overindented` reports a block opener written past its owner's
content column. Under PART 0 S3 leading space never stops an opener, so this
is a heading, not paragraph text or indented code:

```carve
  # Heading
```

Write the opener at the column of its container, or escape it (`\#`) to keep
the line as text. The rule covers the document, quotes, description bodies,
footnote bodies and colon blocks. List markers are not reported, since a list
may start at any indentation; inside a list item the same check is
`list-item-block-overindented`.

`emphasis-marker-before-attributes` reports a bare `*`, `/`, `_`, `~` or `=`
glued to an attribute block when the attachment is not the visible one. Here
the `*` closes the strong span that opens at column 1, so `{.x}` styles all of
`a *b`, not `b`:

```carve
*a *b*{.x}
```

Write `*a {*b*}{.x}*` for the inner span, or escape the inner `*`. When the
marker closes no span at all, as in `a*{.x} b*`, the marker and the attribute
block both stay text, and the finding says so. A plain `*a*{.x}` is the
canonical spelling and is not reported.

The shared vectors are in
[`tests/lint-rule-vectors/block-opener-overindented.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/block-opener-overindented.json)
and
[`tests/lint-rule-vectors/emphasis-marker-before-attributes.json`](https://github.com/markup-carve/carve/blob/main/tests/lint-rule-vectors/emphasis-marker-before-attributes.json).

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
the scoping. The [extension catalog](./extensions) tracks availability; current
carve-js and carve-rs APIs both expose it.

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

All three engines provide `carve lint`. `npm run parity:check` runs the default
triggers in
[`resources/lint-default-triggers.json`](https://github.com/markup-carve/carve/blob/main/resources/lint-default-triggers.json)
against the pinned builds. The missing PHP and Rust rules are declared in
[`resources/lint-parity-drift.txt`](https://github.com/markup-carve/carve/blob/main/resources/lint-parity-drift.txt).
[`resources/lint-corpus-drift.json`](https://github.com/markup-carve/carve/blob/main/resources/lint-corpus-drift.json)
records an earlier pin measurement; its corpus agreement count does not describe
the current pins. Passing a trigger establishes that a rule can fire; it does
not establish correctness for every possible input.

| implementation | measured coverage |
|---|---|
| carve-js | 45 default triggers; `unattached-block-attribute`; Djot and Markdown migration checks; opt-in platform checks |
| carve-php | 45 default triggers; `unattached-block-attribute`; Markdown strong/strike and Djot plus/caret checks; opt-in platform checks |
| carve-rs | 45 default triggers; `unattached-block-attribute`; Markdown strong/strike and Djot plus/caret checks; no platform checks |

`bibliography-placement-in-container` is
specified but absent from these builds, and none of them reports
`unresolved-reference-link` for a reference image yet. `consumed-key-near-miss`
is in carve-js; carve-php and carve-rs port it next (markup-carve/carve#3340).
`list-marker-below-content-column` and `ordered-list-split-by-indent` are
specified ahead of the engines (markup-carve/carve#3439). Their default triggers
are declared missing in `resources/lint-parity-drift.txt` until the pins carry
them. `unclosed-code-fence` and `continuation-marker-refused` are in carve-js;
carve-php and carve-rs still owe them (markup-carve/carve#3407). The broader Djot migration checks
remain specific to carve-js. Diagnostic message wording is engine-specific;
compare the rule id and source location.

#### Checking lint parity

`npm run parity:check` runs the same corpus gate as `npm run lint:parity`. It checks
every `.crv` file under `tests/corpus*` with default CLI options. Each document's
complete sorted list of `(rule, line, column)` diagnostics must agree across
JavaScript, PHP, and Rust, including repeated diagnostics. Differing documents
and a fixed sample are also linted individually to check batch isolation. Optional corpus files
are checked as core input; this sweep does not enable their rendering extensions.

Known differences are recorded in `resources/lint-corpus-drift.json`, with the
exact diagnostic lists, a reason, and an owning issue. A new difference, a changed
list, or a declaration whose difference has disappeared fails the gate. Review
changed output before editing a declaration. Agreement alone does not establish
that a diagnostic is correct.

The gate also checks bidi and Markdown-habit codepoint columns after ASCII,
accented, supplementary-plane, and combining characters in all three engines. Missing engines, command failures, and stderr output
fail the run. Set `CARVE_JS_DIR`, `CARVE_PHP_DIR`, and `CARVE_RS_DIR` to built engine
checkouts; `CARGO_TARGET_DIR` is supported. To save the observed differences, run
`npm run lint:parity -- --report /tmp/lint-parity.json`. Writing a report does not
update declarations or suppress failure.

The two platform autolink rules are in carve-js and carve-php, and not in
carve-rs. They are specified here rather than left to one engine because the ids
are shared surface: a second engine implementing the same condition takes the
same two ids, the same `platforms` selection, and the same token tables, or a
`--platform` config stops being portable the moment it moves between engines.

The parser accepts PART 9 §24 C3 block openers at every authored column at or
beyond the item's minimum/canonical content column. The #1705 experiment found
thirteen mandatory-corpus documents whose AST and HTML change, including a
reference definition that begins resolving nonlocally; those are the accepted
compatibility changes. The formatter may canonicalize a block already parsed as
structural. The compatibility lint still names both migration intentions:
dedent for the canonical structural spelling, or escape to retain old literal
meaning.

### A rule id is a contract

**A lint rule id is spec surface.** Two implementations reporting the same
condition MUST use the same id, for the same reason two implementations parsing
the same document must use the same node type: anything keyed on the id (a CI
filter, an editor suppression, a `# carve-lint-disable` comment) is otherwise
unshareable, and a document's tooling config stops being portable the moment a
second engine touches it.

This does NOT require every engine to implement every rule. Coverage differs and
that is fine; the table above says so. What it forbids is two engines detecting
the same thing under different names.

The Markdown strong and strike checks use `markdown-strong-double-star` and
`markdown-strikethrough-double-tilde` in all three measured engines.
These source-pattern checks ignore recognized comments, including their fence
lines and bodies inside containers. The same visibility rule applies to the
other authoring checks. Source safety checks such as `bidi-control-in-source`
still inspect hidden comment text.

### Suppressing lint findings

A Carve line comment can suppress named rules. Each directive begins with
`%% carve-lint-` and never renders. Separate multiple rule ids with spaces or
commas; omitting ids selects every rule. For example:

```carve
# One

### Three %% carve-lint-disable-line heading-level-skip

Text %% carve-lint-disable-next-line empty-link-destination
[x]()

%% carve-lint-disable markdown-italic-underline

This _word_ is intentional.

%% carve-lint-enable markdown-italic-underline
```

`disable-line` applies to its own physical source line, and `disable-next-line`
to the next physical line. `disable` starts at its own line and lasts until a
matching `enable` or end of the document. A later `enable` does not cancel a
line-scoped directive. Source scopes stay within the file that contains the
comment, including when that file is included elsewhere. Directives in code,
raw content, inline comments, and fenced comment bodies are inert. The caller
can supply an exact file-id ignore list; an ignored file emits no findings.
Ignoring one file does not suppress findings from other files it includes.

The two new reference checks `unused-link-reference-definition` and
`empty-link-destination` are on by default. `duplicate-reference-url`,
`non-descriptive-link-text`, and `emphasis-as-heading` require opt-in. The
existing zero-findings gate for correct documents still applies.

### Accessibility checks

carve-js and carve-rs expose an initial AST-based accessibility pass.
`a11y/image-alt` covers missing or blank image alternatives. Skipped heading
levels report as `heading-level-skip`; `a11y/heading-jump` is an input alias
that will be removed in the next minor release. These checks catch focused
document-structure problems; they are not a claim of WCAG conformance or a
replacement for testing the rendered page with accessibility tools.

The CLI also reports Djot/Markdown delimiter collisions from the migration
checker (mis-rendering constructs by default, plus the Djot semantic shifts
under `--from-djot`), so `carve lint` is the broadest single validation
command.
