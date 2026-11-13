# Carve 0.2: the canonical writer, `carve fmt` and lint

Status: first draft on `next2`. Nothing in this document is implemented yet.

This document defines the canonical writer, which turns a tree into Carve source, the formatter `carve fmt` built on it, and lint. It ports the clauses of PART 11 of the 0.1 grammar that 0.2 keeps and adds the 0.2 decisions. The Markdown, plain-text and ANSI writers are not part of 0.2.0 (section "Out of scope").

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-W-nnn`. `C2-A-nnn`, `C2-B-nnn`, `C2-I-nnn`, `C2-L-nnn` and `C2-H-nnn` name clauses of the AST document, the block and inline chapters, the sidecar document and the HTML document. `CARVE-P11-nnn` names a 0.1 clause.
- A clause that starts with the word "Exception" is a carve-out from a more general clause. Exceptions are counted at the end.
- An example shows an input and what the writer returns for it, in two fenced blocks. *Generated* means the output was produced by `carve fmt` of the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. *Unverified* means it was written by hand from the clauses. These examples are not `compare` pairs, because they hold no HTML.
- Where a clause says "as in 0.1", the 0.1 definition holds unchanged and is not restated here.

## The writer and its two gates

**C2-W-001** The writer takes a tree and, optionally, the sidecar that was returned with that tree (C2-L-004). It returns Carve source. `carve fmt` parses its input with the sidecar and writes the result.

**C2-W-002** For every document `x`, `parse(fmt(x)) == parse(x)` under the tree equality of the AST document (C2-A-159, C2-A-160). This is a gate on every pull request.

**C2-W-003** For every document `x`, `fmt(fmt(x)) == fmt(x)`, byte for byte. This is a gate on every pull request.

**C2-W-004** Equal trees render equal HTML, so `fmt` never changes the rendered output. The HTML check is a consequence of C2-W-002 and is weaker: a writer that keeps the HTML and changes the tree fails.

**C2-W-005** The gates outrank every per-construct clause below. Where the spelling a clause names would not parse back to the tree it was written from, the writer takes the smallest departure that restores the tree, and another spelling of the same construct is preferred over a different construct. Such a deviation is conformant.

**C2-W-006** The test is made on the emitted bytes of the whole output. A construct is not tested alone, because an opener depends on the lines before it.

**C2-W-007** The writer does not replace one construct by another that renders alike. It does not drop content, move content or re-wrap prose: a soft break stays where the tree has it.

**C2-W-008** A backslash escape is not a node (C2-A-039), so an escape that the writer adds or removes never changes the tree.

**C2-W-009** The writer keeps what the tree holds (C2-A-163), takes from the sidecar the author's form where 0.2 has two equal forms (C2-W-083), and writes the one canonical form everywhere else.

**C2-W-010** This document defines the output. How a writer finds it, by trial and reparse or by an exact test, is its own choice and has no effect on the bytes.

## What the writer cannot spell

**C2-W-011** A tree can hold a shape that no Carve source gives (C2-A-172). The writer writes what the table of C2-A-172 names and reports each dropped node or field in the diagnostics record (C2-W-103), with the code `structure-unspellable` for a node or a wrapper and `field-unspellable` for a field, which the entry names.

**C2-W-012** Where blocks are written into a slot that holds only inline content, such as a caption, a title, a cell or a term, the writer puts a separator between the content of two former blocks, so that no word and no delimiter run is joined across the boundary.

**C2-W-013** Where the whole content of a block is one node whose own spelling at the block's column reads back as a block of another kind, the wrapper is lost. The loss is reported and never silent.

**C2-W-014** The loss of such a bare wrapper is the only structural difference the gates forgive for a supplied tree. A wrapper that carries attributes, a label, a destination, a level or a kind is not bare.

**C2-W-015** A paragraph promoted to a block image is written as its source spelling, the image alone on its line. The promotion is a resolution result and not content (C2-A-135).

**C2-W-016** A line after the first of a code span, a raw span, a literal-text span or a math span is a line of its leaf. Where that line would open a block (C2-B-013 to C2-B-018), no spelling keeps the value, and the writer refuses it with `field-unspellable`.

## Layout

**C2-W-017** One blank line stands between two sibling blocks. This is requirement W1 of the migrate design.

**Exception C2-W-018** No blank line stands before a nested list that follows the first paragraph of its item in a tight list, and none before a caption line.

**Exception C2-W-019** In a tight list no blank line stands between two items.

**C2-W-020** A run of blank lines is written as one blank line, except the three of C2-W-028.

**C2-W-021** No line of the output holds only spaces or tabs: such a line is written empty. A line of a code block, a raw block or a comment block is data and is written as it is.

**C2-W-022** No space or tab is written at the end of a line outside verbatim content, and the output ends with one line ending.

**Exception C2-W-023** A line that ends in a line comment keeps the comment's own trailing content, because a `%%` comment runs to the end of its line.

**C2-W-024** Every block of an item, a description or a footnote body after the marker line is written at the content column, and every continuation line of a paragraph in it is written at that column too. The markers of one list stand at one column. This is requirement W3, and it replaces the lazy and the indented continuation styles of the source.

**C2-W-025** One space follows a list marker. A letter or roman marker with a dot takes two (C2-B-037), and the content column moves with it.

**C2-W-026** A continuation line whose text would read as a list marker is kept text by an escape, not by a smaller indent.

**C2-W-027** An item, a description or a footnote body whose first block is not a paragraph is written with that block's opener on the marker line (C2-B-049, C2-B-060). This is requirement W8.

**C2-W-028** Two adjacent lists of the same kind in one container are separated by exactly three blank lines (C2-B-044). The writer does not change a bullet character or a delimiter to separate them, because both are meaning (C2-L-032). This is requirement W4.

**C2-W-029** Two lists are adjacent for C2-W-028 also when every block between them writes nothing.

**C2-W-030** A loose list is written with one blank line between all of its items. A tight list is written with none, also when an item holds several blocks: the blank line then stands inside the item, before its later block. This is requirement W5.

**C2-W-031** A quote written with `>` lines carries `> ` on every line of its content and a bare `>` on a blank line inside it.

**C2-W-032** A div, an admonition, a line block or a hard-break block with an empty body is written with one blank line between opener and closer.

**C2-W-033** Every fence, div and comment block is written with its closer, also when the source left it unclosed. The closer stands at the column of its opener.

**C2-W-034** A line comment that is a region marker of an include (`#region`, `#endregion`) keeps its line: the writer moves no marker and opens no new line beside one. As in 0.1 (CARVE-P11-073).

## Canonical forms: blocks

**C2-W-035** A heading is written with `=`, one per level, and one space. A `#` in the source is rewritten.

**C2-W-036** A thematic break is written as `***`.

**C2-W-037** A code block is written with a backtick fence. A tilde fence is rewritten.

**C2-W-038** The fence is the shortest run of at least three backticks that is longer than every bare backtick run on a line of the value, at any indent (C2-B-081 has no column test). This is requirement W6.

**C2-W-039** A div is written with the shortest colon run of at least three that is longer than the run of every div inside it.

**C2-W-040** The opener of a code fence is the run, glued to the language word, then one space and the quoted title when there is one, then one space and the label in brackets when there is one: ```` ```php "src/Auth.php" [Composer] ````.

**C2-W-041** The title of a code block is written in the info string, in double quotes. A `title` key on the attribute line above is rewritten to that form.

**C2-W-042** A bullet item is written with the character in `marker.char`. `-` and `*` make different lists (C2-B-032), and the writer changes neither.

**C2-W-043** An ordered list keeps its style, its delimiter and its start value.

**C2-W-044** A decimal list is written with the numbering form the sidecar records (C2-L-016): the bare dot, or sequential digits from the start value. A list of repeated `1.` markers is renumbered to sequential digits. With no sidecar fact the bare dot is written (C2-L-030).

**C2-W-045** A list whose style is not decimal is written with its letters or numerals in sequence (C2-L-031).

**C2-W-046** A task item is written with the character in `task.mark` (C2-A-058). The tree holds `x` for an authored `X`, so `[X]` comes back as `[x]`.

**C2-W-047** The attributes of a block are written as one brace block on one line directly above the block, with no blank line between. Glued blocks and consecutive attribute lines of the source are merged into it (C2-B-071). This is part of requirement W7.

**C2-W-048** Inside a brace block the parts are written in the order id, classes, language, keys, classes and keys each in tree order, with one space between two parts and none inside the braces.

**C2-W-049** A key whose value is the empty string is written as the bare key: `{kbd}`, not `{kbd=""}`.

**C2-W-050** A value is written bare when the bare form reads back as the same value, and in double quotes otherwise. As in 0.1.

**C2-W-051** The attributes of a list item and of a table cell are written glued to the marker (C2-B-079).

**C2-W-052** YAML frontmatter is written with the bare opener `---`. Every other format is written with its format word glued to the opener, such as `---toml`. The body is written as it is.

**C2-W-053** A caption is written directly below its block, with no blank line (C2-B-101), as `^`, one space and its content. This is part of requirement W7.

**C2-W-054** A generated heading id is not written: a heading gets an attribute line with an id only when the id was authored (C2-H-023). How the writer tells the two apart in the tree is open (Open, point 15).

**C2-W-055** A definition is written at column 0 at its place among the children of the document (C2-A-074). The writer does not move definitions to the end and does not sort them, because their order is part of the tree (C2-A-078).

**C2-W-056** A link definition is written as `[label]:`, one space, the URL and, when there is one, one space and the title in double quotes. A definition with an empty URL is written as `[label]:`.

**C2-W-057** A footnote definition with no blocks is written as `[^label]: {empty}`, and a description with no blocks as `: {empty}`. As in 0.1 (CARVE-P11-019, CARVE-P11-040); see Open, point 4.

**C2-W-058** An include directive is written with one space inside each brace pair and one space between its parts, and its options in a fixed order (Open, point 5).

**C2-W-059** A comment is written in its `form` (C2-A-072): `%% text` for a line comment, a `%%%` block for a block comment, `{% text %}` for a braced comment. A comment-only line is written at the column of the leaf or container that holds its node (C2-B-096).

**C2-W-060** A term is written as `::`, one space and its content. A description is written as `:`, one space and its first block, and its later blocks at the content column.

## Canonical forms: tables

**C2-W-061** A table row is written as a pipe, its cells, and a closing pipe. Every row ends with a pipe (C2-B-114).

**C2-W-062** A cell is written as its prefix glued to the opening pipe, one space, its content and one space before the next pipe. The prefix is the header mark `=` when the cell is a header cell, then the brace block when the cell has alignment or attributes; in that brace block the alignment mark stands first: `|={>} Price |`.

**C2-W-063** A span mark is written with the same padding: `| ^ |`, `| < |`. A cell whose content is only `^` or `<` and is not a span is written with an escape.

**C2-W-064** A row is written with exactly the cells it has. The writer adds no empty cell to make the rows equally wide.

**C2-W-065** A row attribute is written glued to the closing pipe (C2-B-115).

**C2-W-066** A table is written in the form the sidecar records, pipe or delimited (C2-L-023), when the tree allows it. With no fact it is a pipe table, and a table with no rows is a delimited table (C2-L-036).

**C2-W-067** Continuation rows are written at the places the sidecar records (C2-L-019, C2-L-020). With no fact a row is one line (C2-L-035).

**C2-W-068** The option `alignTables` pads the cells of each column to one display width. It is off by default, the tree is the same with it on, and the two gates hold in that mode too. As in 0.1 (CARVE-P11-071).

## Canonical forms: inline

**C2-W-069** Emphasis is written with `/` and strong with `*`. Where the bare delimiter would not open or close at that position (C2-I-042, C2-I-043), or the content holds the same delimiter in a position that would pair, the braced form is written: `{/usr/local/}`.

**C2-W-070** An emphasis or strong node with an ancestor or a descendant of its own kind is written in the braced form.

**C2-W-071** Underline, strike and highlight are written in their braced forms, `{_text_}`, `{~text~}` and `{=text=}`. They have no bare form in 0.2 (C2-I-041).

**C2-W-072** A replacement is written as a deletion directly followed by an insertion: `{-old-}{+new+}`. There is no arrow form (C2-A-095).

**C2-W-073** A link title is written in double quotes. Single quotes and a `title` key in an attribute block are rewritten to that form.

**C2-W-074** A link with an empty destination is written as `[text]()`, and an image as `![alt]()`. The writer adds no placeholder.

**C2-W-075** A reference is written with the verbatim text the sidecar records (C2-L-022) when that text still folds to the tree's `key`. Otherwise it is written from the tree: its content, then `[key]` for the form `full` or `[]` for the form `collapsed` (C2-L-040).

**C2-W-076** An attribute block of an inline host is written glued to the host, as one block in the order of C2-W-048. Glued blocks of the source are merged (C2-I-035).

**C2-W-077** A code span is written with the shortest backtick run that does not occur in its content, and with one space of padding on each side when the content starts or ends with a backtick or with a space that C2-I-015 would remove.

**C2-W-078** A smart-punctuation node is written as its `source` (C2-A-096).

**C2-W-079** A hard break is written as a backslash at the end of the line.

**Exception C2-W-080** Inside a line block, and inside a hard-break block written with its opener, a hard break is written as the bare line ending where reading that line ending gives the same tree.

**C2-W-081** A div with the class `hardbreaks` is written in the form the sidecar records (C2-L-018) when the tree allows it. With no fact the opener is used when every line break in the div is a hard break, and the class form otherwise (C2-L-034).

**C2-W-082** A quote is written in the form the sidecar records, `>` lines or a quote fence (C2-L-017). With no fact it is written with `>` lines (C2-L-033).

## The sidecar

**C2-W-083** The writer takes five spellings from the sidecar when the fact is present and the tree allows the form (C2-L-042):

| Spelling | Fact | With the fact | Without |
|---|---|---|---|
| ordered numbering | `bare` | bare dot or written numbers, as recorded | bare dot (C2-L-030) |
| quote form | `fenced` | `>` lines or quote fence | `>` lines |
| hard-break block | `hardBreakOpener` | opener or class form | opener when every break is hard, else class form |
| table form | `sourceFormat` | pipe or delimited | pipe; delimited when the table has no rows |
| continuation rows | `continuationLines`, `wraps` | rows broken at the recorded places | one line per row |

**C2-W-084** The writer also takes `rawRef` (C2-W-075).

**C2-W-085** The writer reads no other sidecar fact. The heading marker, the thematic break, the fence character and length, the frontmatter opener, the quote character of a title, the marker columns, the continuation style and the counts of blank lines are written in their canonical form whatever the sidecar records (C2-L-043).

**C2-W-086** The tree wins: a fact that contradicts the tree is ignored (C2-L-006).

**C2-W-087** Both gates hold with and without a sidecar. `fmt` reads the sidecar of its own parse, so C2-W-003 is tested on that path.

## Escaping

**C2-W-088** A character is written with a backslash exactly when the output without that backslash would parse to a different tree. An escape that is not needed is a defect.

**C2-W-089** The writer decides an escape by reparsing the candidate line in its context, with the 0.2 parser, and not from a list of characters. The lists below name the cases the test has to cover. They are not the rule. This is requirement W2.

**C2-W-090** The unit of an escape is the opener: where a construct opens on a run of characters, the escape is placed so that the whole run reads as text.

**C2-W-091** One escape does not cause others. Each position is tested on its own, with the escapes already placed to its left.

**C2-W-092** A paragraph line is tested for reading as a block opener or as an interrupter. The cases:

- one to six `=` or `#` and a space at the start of a paragraph (C2-B-104, C2-B-105);
- a caret and a space on a line directly below a block that takes a caption, and below an image paragraph (C2-B-016, C2-B-101);
- a pipe at the start of a line that also ends with a pipe (C2-B-114), and a `+` at the start of such a line below a table row (C2-B-123);
- a fence run: three or more backticks, tildes, colons or percent signs (C2-B-013);
- a list marker with content, at the start of a paragraph and on every line inside an item, a description or a footnote body (C2-B-014);
- a description mark or a term mark, at the start of a paragraph and on every line inside a description list (C2-B-015);
- a definition shape at column 0 (C2-B-062);
- a quote mark and a space at the start of a paragraph (C2-B-028);
- a run of three or more stars alone on the first line of a paragraph (C2-B-110);
- a brace block alone on a line, which would be an attribute line (C2-B-068);
- `{{` and `}}` around a whole line (C2-B-108);
- `---` on line 1 of the document (C2-B-111);
- `%%` at the start of a line or after whitespace (C2-B-091).

**C2-W-093** A delimiter is tested for pairing: a `/` or `*` that would open or close emphasis or strong, and a delimiter inside a braced span that would close a span opened outside it.

**C2-W-094** A bracket is tested for forming a construct: a pair followed by a link tail, by `[label]` or `[]`, or by a brace block; `![`; `^[`; `[^`; and a bracket pair whose label would resolve as a reference.

**C2-W-095** A sigil is tested for forming: `@` and `#` before a name after a boundary (C2-I-084), `:name:`, `:name[`, `<` before a URL, an email address or `/#`, a backtick run, `$` before a backtick run, and the runs that smart typography replaces where the tree holds text and not a smart-punctuation node.

**C2-W-096** An opening brace is tested for forming an attribute block, a braced comment, an editorial comment, `{--}` or a braced opener (C2-I-039).

**C2-W-097** A backslash in text is written as two when the next character is ASCII punctuation or a space, or when it ends the line (C2-I-009 to C2-I-011).

**C2-W-098** In a table cell a pipe in text is written with a backslash, and a pipe inside a code span needs none (C2-B-117).

**C2-W-099** A paragraph line can no longer read as a thematic break through hyphens or underscores (C2-B-110). The one line that still needs care is `---` as line 1 of the document (Open, point 6).

Example 1 (generated)

Input:

```carve
A line.

\# not a heading

\- not a list
```

Written:

```carve
A line.

\# not a heading

\- not a list
```

## `carve fmt`

**C2-W-100** `carve fmt` writes the canonical form of each file. With `--check` it changes nothing, prints `path:line` for the first changed line of each file with the old and the new line, and exits with status 1 when a file would change and 0 when none would. With `--diff` it prints a unified diff under the same exit codes. The path of standard input is `<stdin>`.

**C2-W-101** A command line fails with status 2 for an unknown option or a bad option value, for an input file that is missing or unreadable, and for AST JSON that is not valid. The first line on stderr starts with `carve[CATEGORY]:`, where CATEGORY is `usage`, `input-unreadable` or `ast-json-invalid`.

**C2-W-102** The writer is also reachable from AST JSON with no source and no sidecar. It then writes the defaults of C2-W-083.

Example 2 (generated)

Input:

`````carve
~~~~js
a
```
b
~~~~
`````

Written:

`````carve
````js
a
```
b
````
`````

Example 3 (generated)

Input:

```carve
1. a
1. b
1. c





1. d
```

Written:

```carve
1. a
2. b
3. c



1. d
```

Example 4 (generated)

Input:

```carve
[a](/u 'T') and [x]{kbd=""}

- [X] done
- [ ] open
   continued
```

Written:

```carve
[a](/u "T") and [x]{kbd}

- [x] done
- [ ] open
  continued
```

In 0.1 the parts of an attribute block kept their written order. The next example shows the 0.2 order and the merge.

Example 5 (unverified)

Input:

```carve
{.a}{k=v}
{#b}
# Title

- one

  two
- three
```

Written:

```carve
{#b .a k=v}
= Title

- one

  two
- three
```

Example 6 (unverified)

Input:

````carve
- ```js
  x
  ```

- * inner
````

Written:

````carve
- ```js
  x
  ```

- * inner
````

## Diagnostics and lint

**C2-W-103** A parse, a render, a write and a lint run report into one diagnostics record (C2-A-169). Every entry has a code, a severity, a position, a message and a channel.

**C2-W-104** The channel is parse, render loss or lint (C2-A-170). A code belongs to one channel. The writer's codes `structure-unspellable` and `field-unspellable` are in the render-loss channel.

**C2-W-105** The severity is one of `Hint`, `warning` and `error`, as in the 0.1 catalog.

**C2-W-106** Every code is an entry of one catalog, a data file in `resources/`. A code is a contract: it is not renamed and not reused.

**C2-W-107** Lint is computed from the tokens and the tree of the parse. It never reads the raw text with patterns of its own, so it cannot disagree with the parser about what a line is.

**C2-W-108** Lint never changes the tree and never changes the output of `fmt`.

**C2-W-109** The option `rules` turns single rules on and off, and `platforms` selects the platform rules. A rule can be suppressed in the source by the control comments of 0.1.

**C2-W-110** A rule whose id starts with `deprecated-` reports a spelling that 0.2 removed and that now reads as something else. These rules are on by default through 0.2.x.

**C2-W-111** Each `deprecated-` rule states its trigger on the 0.2 tokens and tree. The 0.2 engine holds no 0.1 parsing code for them.

### Rules kept from 0.1

The ids are those of the 0.1 reference engine (`src/lint.ts`, `src/djot-migrate.ts`, `src/extension/accessibility.ts`). Severity, default state and message are those of 0.1 unless the last column says otherwise.

| Rule | In 0.2 |
|---|---|
| `bare-html-tag` | unchanged |
| `bidi-control-in-source` | unchanged |
| `block-marker-as-text` | also a brace line that is not a valid one-line attribute line |
| `block-opener-overindented` | unchanged |
| `blockquote-marker-without-space` | unchanged |
| `braced-comment-in-a-template-source` | unchanged |
| `broken-crossref` | unchanged |
| `broken-fragment-link` | unchanged |
| `caption-looking-paragraph` | unchanged |
| `carve-version-unsupported` | unchanged |
| `colon-fence-length-mismatch` | unchanged |
| `comment-shaped-emphasis` | unchanged |
| `consumed-key-near-miss` | `loose` leaves the list of consumed keys |
| `definition-term-block-folded` | Open, point 10 |
| `delimited-table-malformed` | severity error; new message: the block stays a table (C2-B-129) |
| `delimited-table-wide-row` | unchanged |
| `deprecated-cell-alignment` | the glued alignment marker is cut; the rule stays on through 0.2.x |
| `description-separator-below-content-column` | unchanged |
| `duplicate-footnote-definition` | unchanged |
| `duplicate-heading-id` | unchanged |
| `duplicate-reference-url` | unchanged |
| `emphasis-as-heading` | unchanged |
| `emphasis-marker-before-attributes` | unchanged |
| `empty-include-path` | unchanged |
| `empty-link-destination` | unchanged |
| `empty-reference-definition` | unchanged |
| `fence-opener-fallback` | severity error for an attribute block after a fence language or an admonition name |
| `fence-title-syntax` | unchanged |
| `figure-group-empty` | unchanged |
| `figure-group-nested` | unchanged |
| `figure-group-opener-metadata` | unchanged |
| `figure-group-panel-number` | unchanged |
| `figure-group-single-panel` | unchanged |
| `footnote-labels-differ-only-in-whitespace` | unchanged |
| `footnotes-placement-in-container` | unchanged |
| `github-alert-marker` | unchanged |
| `glob-shaped-strong` | unchanged |
| `heading-closing-hashes` | unchanged |
| `heading-level-skip` | unchanged |
| `heading-trailing-attribute` | unchanged |
| `html-comment-renders-as-text` | unchanged |
| `indented-code-block` | unchanged |
| `link-gap-before-destination` | unchanged |
| `list-item-block-overindented` | unchanged |
| `list-marker-below-content-column` | new message: the marker joins the deeper list (C2-B-047) |
| `list-marker-without-blank-line` | also a list marker directly after term or description text (C2-B-021), with a second message |
| `markdown-definition-paragraph` | unchanged |
| `non-descriptive-link-text` | unchanged |
| `ordered-list-split-by-indent` | Open, point 10 |
| `platform-issue-reference` | unchanged |
| `platform-mention-token` | unchanged |
| `quote-fence-ends-the-quote-above` | unchanged |
| `references-placement-in-container` | unchanged |
| `region-marker-renders-as-text` | unchanged |
| `semantic-attribute-outside-span` | unchanged |
| `semantic-attribute-value-ignored` | unchanged |
| `setext-heading-underline` | new message: a hyphen run under text is text |
| `table-column-arity` | unchanged |
| `table-column-overlap` | unchanged |
| `table-marker-run-padding` | unchanged |
| `table-row-cell-count` | unchanged |
| `table-shaped-paragraph` | stays: a line that starts with a pipe and does not end with one is text (C2-B-116) |
| `table-span-marker-blocked` | also a row span stopped at the head boundary (C2-B-122) |
| `table-width-total` | unchanged |
| `thematic-break-spelling` | new trigger: a run of hyphens or underscores alone on a line, which is text in 0.2 |
| `unattached-block-attribute` | also an attribute line separated from its block by a blank line, which is text |
| `unclosed-code-fence` | the block ends with its container (C2-B-083) |
| `unclosed-comment-fence` | the block ends with its container (C2-B-083) |
| `unclosed-container-fence` | the block ends with its container (C2-B-083) |
| `unclosed-inline-emphasis` | unchanged |
| `unresolved-footnote` | unchanged |
| `unresolved-reference-link` | the full form and a wrapped label now reach the heading lookup (C2-I-075, C2-I-076) |
| `unused-footnote-definition` | unchanged |
| `unused-link-reference-definition` | unchanged |
| `markdown-strong-double-star` | new message (Open, point 9) |
| `markdown-strikethrough-double-tilde` | new message (Open, point 9) |
| `djot-subscript-tilde-braced` | opt-in Djot check |
| `djot-subscript-tilde` | opt-in Djot check; new message (Open, point 9) |
| `djot-superscript-caret` | opt-in Djot check |
| `djot-emphasis-underscore` | opt-in Djot check; new message (Open, point 9) |
| `djot-intraword-underscore` | opt-in Djot check |
| `djot-highlight-braces` | opt-in Djot check; new message (Open, point 9) |
| `djot-plus-bullet` | opt-in Djot check |
| `djot-heading-continuation` | opt-in Djot check |
| `a11y/image-alt` | accessibility extension |

85 rules are kept.

### New rules

The 29 rules of the migrate and lint design, with the later rulings applied. Severity and message are those of the design unless the last column says otherwise.

| Rule | Severity | Reports | After the later rulings |
|---|---|---|---|
| `block-opener-without-blank-line` | warning | a line inside a paragraph or a caption that would open a block after a blank line: a heading, a quote line, a thematic break, an attribute line, a term or description mark, a definition | a table row is no trigger, because a row interrupts (C2-B-018) |
| `unattached-caption` | warning | a caption line that is not directly below one of the six caption targets, a caption after a blank line among them | the target list has six kinds, the figure group included |
| `deprecated-continuation-marker` | warning | a line that holds only `+` outside a table and a fence, and an item whose first line is `+` | unchanged |
| `definition-in-container` | warning | a definition shape inside a container or indented at the top level | unchanged |
| `list-item-body-below-content-column` | Hint | a block of an item that is indented past the marker and short of the content column | unchanged |
| `ordered-marker-right-aligned` | warning | an ordered marker left of its list that ends at the column where the list's markers end | unchanged |
| `tight-list-item-with-blank-line` | Hint, opt-in | a tight list in which an item holds a blank line and a paragraph | unchanged |
| `deprecated-loose-attribute` | warning | a list that carries the key `loose` | unchanged |
| `heading-marker-mixed` | Hint | a document with `=` headings and `#` headings, once | unchanged |
| `comment-line-in-line-block` | Hint | a line of a line block that starts with `%%` | unchanged |
| `fence-closer-indented` | Hint | a closer whose indent differs from its opener's | unchanged |
| `ordered-list-kind-split` | warning | a one-item letter list directly followed by a list of the other letter kind that continues it | unchanged |
| `duplicate-link-reference-definition` | warning | a link definition whose key was defined before | unchanged |
| `duplicate-abbreviation-definition` | warning | an abbreviation definition whose key was defined before | unchanged |
| `deprecated-spaced-thematic-break` | warning | a line of three or more stars, hyphens or underscores with spaces between them | unchanged; `- - -` is this case |
| `description-term-multi-line` | Hint | a term whose text spans several lines | unchanged |
| `table-row-without-closing-pipe` | Hint | a row with no closing pipe | void: such a line is text (C2-B-116) and `table-shaped-paragraph` reports it |
| `table-row-attribute-as-cell` | warning | a row whose last cell holds only an attribute block | the half about a row without a closing pipe is void |
| `deprecated-separator-row` | warning | a row in which every cell holds only hyphens and colons | unchanged |
| `deprecated-table-attribute` | warning | `header-rows` on a pipe table | only `header-rows`; `aligns`, `widths`, `header-cols` and `footer-rows` stay as in 0.1 |
| `deprecated-bare-underline` | warning | an underscore pair that 0.1 read as underline | unchanged |
| `deprecated-bare-strike` | warning | a tilde pair that 0.1 read as strike | unchanged |
| `deprecated-bare-highlight` | warning | an equals pair that 0.1 read as highlight | unchanged |
| `deprecated-substitution-arrow` | warning | a braced strike span that holds `~>` | unchanged |
| `braced-span-opener-as-text` | warning | a braced opener left as text because a bare delimiter inside it closed an outer span | unchanged |
| `unattached-inline-attribute` | Hint | an attribute block in a paragraph that is glued to no host | unchanged |
| `sigil-after-letter` | Hint | a mention or tag shape directly after a letter or number outside ASCII | unchanged |
| `unclosed-frontmatter` | error | frontmatter with no closer | unchanged (C2-B-113) |
| `frontmatter-shaped-thematic-break` | warning | frontmatter whose first line is blank or that holds no key line | unchanged |

Of the 29, 28 stay and one is void.

### Rules of 0.1 that become obsolete

| Rule | Why | Replaced by |
|---|---|---|
| `refused-continuation-marker` | there is no list continuation marker | `deprecated-continuation-marker` |
| `continuation-marker-refused` | the same | `deprecated-continuation-marker` |
| `table-separator-near-miss` | every separator row is a row of cells | `deprecated-separator-row` |
| `markdown-italic-underline` | a bare underscore pair is text, not underline | `deprecated-bare-underline` |
| `list-item-body-detached` | a line past the marker column stays in the item | `list-item-body-below-content-column` |

The design also listed `table-shaped-paragraph` as obsolete. It stays, because a row has to end with a pipe again.

### The lint topics of the later rulings

Each topic the rulings name, with the rule that reports it. No id is new here.

| Topic | Rule |
|---|---|
| the list continuation marker | `deprecated-continuation-marker` |
| the separator row | `deprecated-separator-row` |
| bare underline, strike and highlight | `deprecated-bare-underline`, `deprecated-bare-strike`, `deprecated-bare-highlight` |
| the substitution arrow | `deprecated-substitution-arrow` |
| a caption after a blank line | `unattached-caption` |
| a hyphen run or an underscore run meant as a thematic break | `thematic-break-spelling`, and `setext-heading-underline` directly under text |
| a spaced run meant as a thematic break | `deprecated-spaced-thematic-break` |
| right-aligned ordered markers | `ordered-marker-right-aligned` |
| uneven nested indent | `list-marker-below-content-column` |
| a list marker directly after term or description text | `list-marker-without-blank-line` |
| a definition inside a container | `definition-in-container` |
| an attribute line after a paragraph line | `block-opener-without-blank-line` |
| an unclosed fence, div or comment block | `unclosed-code-fence`, `unclosed-container-fence`, `unclosed-comment-fence` |
| unclosed frontmatter | `unclosed-frontmatter` |
| a duplicate label | `duplicate-footnote-definition`, `duplicate-link-reference-definition`, `duplicate-abbreviation-definition` |
| an unquoted fence title | `fence-title-syntax` |
| an attribute block after a fence language or an admonition name | `fence-opener-fallback`, with severity error |
| `header-rows` on a pipe table | `deprecated-table-attribute` |
| `**bold**` | `markdown-strong-double-star` |
| a row without a closing pipe | `table-shaped-paragraph` |

## Out of scope

The Markdown, plain-text and ANSI writers are not part of 0.2.0, and neither are the importers. These 0.1 clauses define only those targets and are not ported. Nobody should port them into the canonical writer.

- The 24 of the PART 11 review: CARVE-P11-022, 023, 024, 025, 026, 028, 031, 032, 033, 034, 035, 038, 044, 045, 047, 049, 060, 062, 063, 067, 068, 069, 075 and 082.
- Sixteen more, found while porting. Each states a rule of the Markdown target, the plain-text target or the HTML importer in its own text: CARVE-P11-017 (HTML import), 048, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 061, 064 and 065 (Markdown target), and 072 (plain-text target).

The render-loss codes of those targets leave the catalog with them.

## The clauses of PART 11

Fates: *ported* (the rule holds, restated in 0.2 terms), *simplified* (one of the eight the review named), *removed*, *out of scope* (section above).

| 0.1 clause | Subject | Fate | 0.2 |
|---|---|---|---|
| CARVE-P11-001 | equality is modulo escaping | ported | C2-W-008 |
| CARVE-P11-002 | the invariant outranks the per-construct rules | ported | C2-W-005, C2-W-006 |
| CARVE-P11-003 | a flatten preserves the boundary | ported | C2-W-012 |
| CARVE-P11-004 | a wrapper its own content spells away | ported | C2-W-013 |
| CARVE-P11-005 | wrapper loss is the only carve-out | ported | C2-W-014 |
| CARVE-P11-006 | the escaping rule | ported | C2-W-088, C2-W-090 |
| CARVE-P11-007 | minimality inside an escalated unit | simplified | C2-W-091 |
| CARVE-P11-008 | no substitution of constructs | ported | C2-W-007 |
| CARVE-P11-009 | the scope of an escalation | simplified | C2-W-091 |
| CARVE-P11-010 | search cost belongs to the strategy | simplified | C2-W-010 |
| CARVE-P11-011 | the frontmatter opener | ported, reversed: bare `---` for YAML | C2-W-052 |
| CARVE-P11-012 | an empty-string attribute is a bare key | ported | C2-W-049 |
| CARVE-P11-013 | fence opener glued to its info string | ported | C2-W-040 |
| CARVE-P11-014 | cell padding | ported | C2-W-062 |
| CARVE-P11-015 | padding of a span cell | ported | C2-W-063 |
| CARVE-P11-016 | no whitespace-only line | ported | C2-W-021 |
| CARVE-P11-017 | what an HTML import keeps | out of scope | none |
| CARVE-P11-018 | an empty colon fence body | ported | C2-W-032 |
| CARVE-P11-019 | a footnote definition with no blocks | ported | C2-W-057 |
| CARVE-P11-020 | a hard break in a line block | ported | C2-W-080 |
| CARVE-P11-021 | a line whose last node is a comment | ported | C2-W-023 |
| CARVE-P11-022 to 026 | Markdown escaping and hard break | out of scope | none |
| CARVE-P11-027 | continuation lines of an item | simplified | C2-W-024, C2-W-026 |
| CARVE-P11-028 | an unused definition in the other targets | out of scope | none |
| CARVE-P11-029 | a row keeps its cell count | ported | C2-W-064 |
| CARVE-P11-030 | the continuation marker between blocks that would merge | removed: 0.2 has no list continuation marker | none |
| CARVE-P11-031 to 035 | Markdown and plain-text targets | out of scope | none |
| CARVE-P11-036 | three blank lines at a hard list boundary | ported | C2-W-028 |
| CARVE-P11-037 | an unspellable block between two lists | ported | C2-W-029 |
| CARVE-P11-038 | Markdown heading links | out of scope | none |
| CARVE-P11-039 | `blockImage` is not content | ported | C2-W-015 |
| CARVE-P11-040 | an empty description body | ported | C2-W-057 |
| CARVE-P11-041 | the task marker | simplified | C2-W-046 |
| CARVE-P11-042 | a block that opens a tight item, after a continuation marker | removed: 0.2 has no list continuation marker; the marker-line rule is C2-W-027 | none |
| CARVE-P11-043 | the round-trip comparison list | removed: the gate compares trees (C2-A-160); its third entry is Open, point 7 | none |
| CARVE-P11-044, 045 | Markdown escaping and delimiters | out of scope | none |
| CARVE-P11-046 | the conversion-diagnostics channel | ported into the one record | C2-W-011, C2-W-104 |
| CARVE-P11-047 | Markdown list tightness | out of scope | none |
| CARVE-P11-048 | Markdown hard break in a cell | out of scope | none |
| CARVE-P11-049 | Markdown fragment links | out of scope | none |
| CARVE-P11-050 to 056 | Markdown escaping, edge whitespace, headerless tables | out of scope | none |
| CARVE-P11-057 | adjacent lists alternate their marker, in Markdown | out of scope | none; the Carve rule is C2-W-028 |
| CARVE-P11-058, 059 | Markdown description lists and list tables | out of scope | none |
| CARVE-P11-060 | Markdown autolink escaping | out of scope | none |
| CARVE-P11-061 | Markdown soft break in a cell | out of scope | none |
| CARVE-P11-062, 063 | Markdown frontmatter and carrier comments | out of scope | none |
| CARVE-P11-064, 065 | Markdown inline code and hard breaks | out of scope | none |
| CARVE-P11-066 | native headers; the separator row under roundtrip | removed: the separator row is cut | none; header cells are C2-W-062 |
| CARVE-P11-067 to 069 | Markdown carrier mode and autolinks | out of scope | none |
| CARVE-P11-070 | empty destinations | ported | C2-W-074, C2-W-056 |
| CARVE-P11-071 | optional table alignment | ported | C2-W-068 |
| CARVE-P11-072 | plain-text continuation blocks | out of scope | none |
| CARVE-P11-073 | a region marker keeps its line | ported | C2-W-034 |
| CARVE-P11-074 | a fence that a dedent ended is written closed | ported | C2-W-033 |
| CARVE-P11-075 | Markdown destinations | out of scope | none |
| CARVE-P11-076 | repeated emphasis kinds are braced | ported | C2-W-070 |
| CARVE-P11-077 | a paragraph line of dashes alone | simplified | C2-W-099 |
| CARVE-P11-078 | a verbatim value line that opens a block | simplified | C2-W-016 |
| CARVE-P11-079 | layout of a collected definition, a comment and a block below a body | simplified | C2-W-055, C2-W-059 |
| CARVE-P11-080 | CLI errors exit with status 2 | ported | C2-W-101 |
| CARVE-P11-081 | the formatter check | ported | C2-W-100 |
| CARVE-P11-082 | plain-text covered cells | out of scope | none |

Totals over the 82 clauses: 30 ported, 8 simplified, 4 removed, 40 out of scope. The PART 11 review counted 24 out of scope and 3 removed. The difference is the 16 clauses of the section "Out of scope" and CARVE-P11-043.

## Open

Points that the plan, the drafted chapters and 0.1 do not decide. None is decided here.

1. **The diagnostics record.** The five fields are decided. Open: the spelling of the three channel values, and whether the position is a `pos` range, a path into the tree or both (AST Open, point 4). A writer diagnostic for a supplied tree has no source position.
2. **Severity of the 0.1 rules.** The 0.1 source sets a severity on few rules and treats the rest as warnings, and the default state of several rules is documented only in prose. The catalog file has to state severity and default for every rule.
3. **Three ids of the 0.1 documentation.** `gfm-delimiter-row`, `fence-delimiter-indentation` and `bibliography-placement-in-container` are in `docs/validation.md` on `main` and not in the engine source this catalog was read from. The first is replaced by `deprecated-separator-row` in any case. Whether the other two enter the 0.2 catalog is open.
4. **Empty bodies.** The plan says an empty list item is a marker plus a comment. A footnote definition and a description with no blocks keep the 0.1 sentinel `{empty}` here by the carry-over rule. Options: (a) keep the sentinel; (b) a comment after the marker, as for the item. A `list_item` with no children at all, not even a comment, has no 0.2 spelling: options are a report as unspellable, or the sentinel.
5. **Include directives.** The formatter pads and orders them. The order of the options is not stated anywhere. Options: (a) section, then `@` options in a fixed list order; (b) section, then `@` options sorted by name.
6. **`---` as line 1.** A paragraph that starts the document with an em dash node whose source is `---` would be read as a frontmatter opener. 0.1 writes the glyph and lets the comparison treat a dash node and its glyph as equal. The 0.2 equality has no such entry. Options: (a) add the entry to the AST equality; (b) write `{--}`-style braced forms if one exists for the em dash; (c) write a backslash and accept a changed tree, which fails C2-W-002.
7. **Two adjacent code spans.** 0.1 keeps two adjacent code spans apart with an empty braced comment and lets the comparison ignore it (CARVE-P11-043, entry N3). Under tree equality the comment is a node. Options: (a) an equality entry for an empty braced comment; (b) the pair is unspellable and reported; (c) a longer fence on one span, if that separates them.
8. **A glued attribute run.** Glued brace blocks are valid and `fmt` merges them (C2-W-047). The plan names a lint finding for the run, and no rule id exists for it.
9. **Message texts.** The Djot checks and `markdown-strong-double-star` name bare 0.1 forms in their advice and need new text. `markdown-strong-double-star` has to say that the doubled star is literal (C2-I-044).
10. **Rules that 0.1 already calls retired.** `ordered-list-split-by-indent`, `definition-term-block-folded` and `fence-delimiter-indentation` have nothing left to report on `main` after its container rework. Whether they have a trigger under the 0.2 rules, or leave the catalog, needs a check against the block chapter.
11. **The attribute value form.** C2-W-050 keeps the 0.1 rule for bare and quoted values. The valid shape of a bare value is one of the small cases that phase 1 still writes.
12. **Where the language part is written.** The order is id, classes, language, keys. On a code block the language is the info string word. Which other blocks take a language part, and how it is spelled in a brace block, follows AST Open, point 7.
13. **The opt-in group** of `tight-list-item-with-blank-line`, and the release in which the `deprecated-` rules are reviewed (the plan says the next major).
14. **Include rules.** The `include-` rules of 0.1 belong to the Includes document, which follows later. Only `empty-include-path`, which reads the directive's shape, is in this catalog.
15. **Authored and generated heading ids.** A generated id sits in `attrs.id` like an authored one (C2-A-132, AST Open, point 9). The writer must not write it. Options: (a) a tree field that marks the id as generated; (b) the writer recomputes the slug and omits an id that equals it, which also drops an authored id that happens to equal the slug; (c) the writer runs before resolution and never sees generated ids.
16. **The gate for this document.** The plan asks for one. The two properties of C2-W-002 and C2-W-003 on the corpus and the enumerated sets are the gate of phase 5. A gate for the document itself, such as an example for every canonical form, is not stated.

## Counts

| Section | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| The writer and its two gates | 10 | 0 | 0 | 0 |
| What the writer cannot spell | 6 | 0 | 0 | 0 |
| Layout | 18 | 3 | 0 | 0 |
| Canonical forms: blocks | 26 | 0 | 0 | 0 |
| Canonical forms: tables | 8 | 0 | 0 | 0 |
| Canonical forms: inline | 14 | 1 | 0 | 0 |
| The sidecar | 5 | 0 | 0 | 0 |
| Escaping | 12 | 0 | 1 | 0 |
| `carve fmt` | 3 | 0 | 3 | 2 |
| Diagnostics and lint | 9 | 0 | 0 | 0 |
| **Total** | **111** | **4** | **4** | **2** |

The document has 111 clauses, 4 of them marked with the word "Exception", and 6 examples, 4 generated and 2 unverified. The clause count includes the exceptions.
