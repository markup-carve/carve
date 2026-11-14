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

**C2-W-002** For every document `x` that the writer does not refuse (C2-W-016), `parse(fmt(x)) == parse(x)` under the tree equality of the AST document (C2-A-161, C2-A-162). For a supplied tree `t`, `parse(write(t)) == t` holds when the writer reports no loss (C2-W-011). This is a gate on every pull request.

**C2-W-003** For every document `x`, `fmt(fmt(x)) == fmt(x)`, byte for byte. This is a gate on every pull request.

**C2-W-004** Equal trees render equal HTML, so `fmt` never changes the rendered output. The HTML check is a consequence of C2-W-002 and is weaker: a writer that keeps the HTML and changes the tree fails.

**C2-W-005** The gates outrank every per-construct clause below. Where the spelling a clause names would not parse back to the tree it was written from, the writer takes the smallest departure that restores the tree, and another spelling of the same construct is preferred over a different construct. Such a deviation is conformant.

**C2-W-006** The test is made on the emitted bytes of the whole output. A construct is not tested alone, because an opener depends on the lines before it.

**C2-W-007** The writer does not replace one construct by another that renders alike. It does not drop content, move content or re-wrap prose: a soft break stays where the tree has it.

**C2-W-008** A backslash escape is not a node (C2-A-041), so an escape that the writer adds or removes never changes the tree.

**C2-W-009** The writer keeps what the tree holds (C2-A-166), takes from the sidecar the author's form where 0.2 has two equal forms (C2-W-083), and writes the one canonical form everywhere else.

**C2-W-010** This document defines the output. How a writer finds it, by trial and reparse or by an exact test, is its own choice and has no effect on the bytes.

## What the writer cannot spell

**C2-W-011** A tree can hold a shape that no Carve source gives (C2-A-175). The writer writes what the table of C2-A-175 names and reports each dropped node or field in the diagnostics record (C2-W-103), with the code `structure-unspellable` for a node or a wrapper and `field-unspellable` for a field, which the entry names.

**C2-W-117** The table of C2-A-175 is not the whole list. For every node, field and value of a supplied tree that no clause of this document writes in a form that reads back to the same value, the writer writes the nearest form it can spell, or leaves the node or field out, and reports the loss: `field-unspellable` for a field, `structure-unspellable` for a node. No such loss is silent. Among these are: a frontmatter value that holds a line of three hyphens, and a frontmatter format that does not have the shape of a format name (C2-B-164); `spacing: "loose"` on a list of one item; a caption with more than one block; a class that holds a space, a tab or a line break; a definition key that holds a closing bracket with no backslash before it, or that folds to nothing; a line comment whose value holds a line break; a paragraph, a list or a description list with no children; `figure.kind` and `directive.tocTarget`; an `autolink` whose `text` differs from its target; an `abbreviation` with no definition of its key in the document; a mention with a `label` or a kind other than `user`; and `metadata`.

**C2-W-124** Where a field that cannot be spelled makes its whole node read back as another type, as a frontmatter `format` that is no format name does, the report is `structure-unspellable` at that node. A loss is reported at the node that did not read back, not at a wrapper around it.

**C2-W-012** Where blocks are written into a slot that holds only inline content, such as a caption, a title, a cell or a term, the writer puts a separator between the content of two former blocks, so that no word and no delimiter run is joined across the boundary.

**C2-W-013** Where the whole content of a block is one node whose own spelling at the block's column reads back as a block of another kind, the wrapper is lost. The loss is reported and never silent.

**C2-W-014** The loss of such a bare wrapper is the only structural difference the gates forgive for a supplied tree. A wrapper that carries attributes, a label, a destination, a level or a kind is not bare.

**C2-W-015** A paragraph promoted to a block image is written as its source spelling, the image alone on its line (C2-A-137). `blockImage` is a fact of the tree (C2-A-136), and the written line gives it back when it is parsed.

**C2-W-016** A line after the first of a code span, a raw span, a literal-text span or a math span is a line of its leaf. Where that line would open a block (C2-B-014 to C2-B-019), no spelling keeps the value, and the writer refuses it with `field-unspellable`.

**C2-W-112** Two code spans with nothing between them have no spelling: written together, the two runs read as one span. A parse never gives that pair. For a supplied tree the writer reports `structure-unspellable` for the second span and writes its content into the first.

**C2-W-115** A math block is written as its display math span alone on its line, with an attached attribute block glued to the span (C2-B-198). The mark `blockMath` is a fact of the tree (C2-A-184), and the written line gives it back when it is parsed.

## Layout

**C2-W-017** One blank line stands between two sibling blocks. This is requirement W1 of the migrate design.

**Exception C2-W-018** No blank line stands before a nested list that follows the first paragraph of its item in a tight list, and none before a caption line.

**Exception C2-W-019** In a tight list no blank line stands between two items.

**C2-W-020** A run of blank lines is written as one blank line, except the three of C2-W-028. Blank lines inside verbatim content, which is the value of a code block, a raw block, a comment block and frontmatter, are data and are written as they are.

**C2-W-021** No line of the output holds only spaces or tabs: such a line is written empty. A line of a code block, a raw block or a comment block is data and is written as it is.

**C2-W-022** No space or tab is written at the end of a line outside verbatim content, and the output ends with one line ending. The space of a no-break space, which a backslash escapes (C2-I-011), is not such a space and is written also at the end of a line.

**Exception C2-W-023** A line that ends in a line comment keeps the comment's value as it is, because a `%%` comment runs to the end of its line. The value holds no spaces at its end (C2-A-074), so no trailing space is written for it.

**C2-W-024** Every block of an item, a description or a footnote body after the marker line is written at the content column, and every continuation line of a paragraph in it is written at that column too. A continuation line of a caption or of a term is written at the column of the first character of its text, behind the mark and its space. The markers of one list stand at one column. This is requirement W3, and it replaces the lazy and the indented continuation styles of the source.

**C2-W-025** One space follows a list marker. A marker of one uppercase letter and a dot takes two (C2-B-040), and the content column moves with it.

**C2-W-026** A continuation line whose text would read as a list marker is kept text by an escape, not by a smaller indent.

**C2-W-027** An item, a description or a footnote body whose first block is not a paragraph is written with that block's opener on the marker line (C2-B-057, C2-B-072). This is requirement W8.

**C2-W-028** Two adjacent lists of the same kind in one container are separated by exactly three blank lines (C2-B-052). The writer does not change a bullet character or a delimiter to separate them, because both are meaning (C2-L-032, C2-B-037). This is requirement W4.

**C2-W-122** Where a comment stands between two lists of one kind, the comment is written by its own rule (C2-W-059) and the three blank lines stand between the comment and the second list. A line comment can follow a list, a description list or a footnote body as a sibling only in the case of C2-W-123: in every other place its line belongs to the last item (C2-B-138), a parse never gives that tree, and for a supplied tree the writer reports `structure-unspellable` (C2-W-117).

**C2-W-029** Two lists are adjacent for C2-W-028 also when every block between them writes nothing.

**C2-W-030** A loose list is written with one blank line between all of its items. A tight list is written with none, also when an item holds several blocks: the blank line then stands inside the item, before its later block. This is requirement W5.

**C2-W-031** A quote written with `>` lines carries `> ` on every line of its content and a bare `>` on a blank line inside it.

**C2-W-032** A div, an admonition or a hard-break block with an empty body is written with one blank line between opener and closer. An empty line block is written with its closer directly below its opener, because a blank line in it is a `line` (C2-A-069).

**C2-W-033** Every fence, div and comment block is written with its closer, also when the source left it unclosed. A supplied code or raw block whose value has no final line break (C2-A-047) is written with one, and the writer reports `field-unspellable` for `value`. The closer stands at the column of its opener. The closer of a code fence and of a comment block is a bare run of the opener's length (C2-B-110).

**C2-W-123** One fence is written without its closer: the last block of a list, a description list or a footnote body, when a comment follows that container as its sibling. Only the open fence lets the comment line end the container (C2-B-111, C2-B-135); behind a closed fence the comment would be a child of the item (C2-B-138).

**C2-W-034** A line comment that is a region marker of an include (`#region`, `#endregion`) keeps its line: the writer moves no marker and opens no new line beside one. As in 0.1 (CARVE-P11-073).

**C2-W-114** In a description list no blank line stands between a term and its description or between two entries. A later block of a description follows one blank line, at the content column.

## Canonical forms: blocks

**C2-W-035** A heading is written with `=`, one per level, and one space. A `#` in the source is rewritten. A level above six, which only a supplied tree holds (C2-A-071), is written with six markers, and the writer reports `field-unspellable` for `level`. A line break inside a heading is kept, and each continuation line is written at the heading's content column, that is the marker width plus one (C2-B-154).

**C2-W-036** A thematic break is written as `***`.

**C2-W-037** A code block is written with a backtick fence. A tilde fence is rewritten.

**C2-W-038** The fence of a code block and of a raw block is the shortest run of at least three backticks that is longer than every bare backtick run on a line of the value, at any indent (C2-B-109 has no column test). This is requirement W6.

**C2-W-039** A div is written with the shortest colon run of at least three that is longer than the run of every div inside it. The name of an admonition or a directive is its kind. The name of a plain div is its first class, when that class has the shape of a div name and is not one of the names that C2-B-127 gives another meaning; otherwise the div has no name, and all of its classes stand on the attribute line. The opener of a div, an admonition or a directive is the run, then one space and the name when there is one, then one space and the quoted title when there is one, then one space and the label in brackets when there is one. A raw block is written as a backtick fence whose run is glued to `=` and the format name, with nothing after it.

**C2-W-120** A class has the shape of a div name when it holds only ASCII letters, digits, `_` and `-` (C2-I-030) and is none of the names of `data/div-names.json`. Any other first class stands on the attribute line, which gives the same tree (C2-B-128).

**C2-W-040** A title that holds a double quote or a line break and a label that holds a closing bracket or a line break have no spelling on an opener (C2-B-117, C2-B-119): the writer leaves that field out and reports `field-unspellable` for it. The opener of a code fence is the run, glued to the language word, then one space and the quoted title when there is one, then one space and the label in brackets when there is one: ```` ```php "src/Auth.php" [Composer] ````.

**C2-W-041** The title of a code block is written in the info string, in double quotes. A `title` key on the attribute line above stays a key: it is a different tree (C2-A-032).

**C2-W-042** A bullet item is written with the character in `marker.char`. `-` and `*` make different lists (C2-B-035), and the writer changes neither.

**C2-W-043** An ordered list keeps its style, its delimiter and its start value.

**C2-W-044** A decimal list is written with the numbering form the sidecar records (C2-L-016): the bare dot, or sequential digits from the start value. In the bare form a start value other than 1 stands in a `start` attribute above the list (C2-L-030); in the numbered form the first marker carries it. A start value of more than nine digits cannot be a marker (C2-B-036) and cannot be a `start` attribute (C2-B-219): a parse never gives it, and for a supplied tree the writer writes the list from 1 and reports `field-unspellable` (C2-W-117). A list of repeated `1.` markers is renumbered to sequential digits. A later marker whose number would have more than nine digits is written as `1`: only the first marker carries a value (C2-B-041). With no sidecar fact the bare dot is written (C2-L-030). The bare dot is written only for a list whose delimiter is the period: a decimal list with `)` is written with sequential digits, because a bare `)` is not a marker (C2-B-036, C2-L-031).

**C2-W-045** A list whose style is not decimal is written with its letters or numerals in sequence (C2-L-031). Where the first marker so written would read as another style (C2-B-042), which is an alphabetic list that starts at `i` or `I` and a roman list that starts at a one-letter numeral other than `i` or `I`, the list is written from the first value of its style, `a` or `i` in its letter case, under a `start` attribute that carries the real value (C2-B-045). Only the first marker carries a value (C2-B-041), so a later marker that the marker grammar cannot hold, a letter past `z` or a numeral of more than nine letters (C2-B-036), is written as the first value of its style, and a first marker of that kind moves its value to the `start` attribute in the same way.

**C2-W-046** A task item is written with the character in `task.mark` (C2-A-060). The tree holds `x` for an authored `X`, so `[X]` comes back as `[x]`.

**C2-W-047** The attributes of a block are written as one brace block on one line directly above the block, with no blank line between. Glued blocks and consecutive attribute lines of the source are merged into it (C2-B-093, C2-B-102). This is part of requirement W7.

**C2-W-048** Inside a brace block the parts are written in the order id, classes, language, keys, classes and keys each in tree order, with one space between two parts and none inside the braces. The language is written as `:tag` (C2-I-029, C2-A-037). A class that the `.name` form cannot hold, such as `a.b`, is written as a quoted `class` key at its place among the classes (C2-I-042).

**C2-W-049** A key whose value is the empty string is written as the bare key: `{kbd}`, not `{kbd=""}`. A key that starts with `_` is written with an empty quoted value, `{_k=""}`, because a bare key does not start with `_` (C2-I-031).

**C2-W-050** A value is written unquoted when it has the shape of an unquoted value (C2-I-032), and in double quotes otherwise.

**C2-W-051** The attributes of a list item and of a table cell are written glued to the marker (C2-B-101).

**C2-W-052** YAML frontmatter is written with the bare opener `---`, also when the source named the format. Every other format keeps its format name glued to the opener: `---toml`, `---json` (C2-B-164). The form with a space before the name, `--- toml`, is read too (C2-B-164) and is written glued. The body is written as it is.

**C2-W-053** A caption is written directly below its block, with no blank line (C2-B-146), as `^`, one space and its content. This is part of requirement W7.

**C2-W-054** The writer writes an id on a heading exactly when `attrs.id` holds one (C2-A-038). A generated id is in `generatedId` (C2-A-134) and is never written.

**C2-W-055** A definition is written at column 0 at its place among the children of the document (C2-A-076). A footnote definition is `[^key]:`, one space and its first block on the marker line, with its later blocks at the content column (C2-W-024, C2-W-027). An abbreviation definition is `*[key]:`, one space and the expansion. The writer does not move definitions to the end and does not sort them, because their order is part of the tree (C2-A-080).

**C2-W-056** A link definition is written as `[label]:`, one space, the destination and, when there is one, one space and the title in double quotes. A parsed tree has no link definition with an empty destination, because such a line is text (C2-B-083). For a supplied one the writer reports `field-unspellable`.

**C2-W-057** There is no sentinel for an empty body. A parsed item, description or term is never empty: the empty spelling is a marker plus a comment (C2-B-145), and the comment is a node. A footnote body is never empty either, because its marker needs content on its line (C2-B-082). An empty body in a supplied tree has no spelling, and the writer reports `structure-unspellable` for it.

**C2-W-058** An include directive is written with one space inside each brace pair and one space between its parts: the path, then the section, then the options. A path is written bare where the bare form holds it, and in double quotes where it holds a space or a character at which a bare path ends, such as `#`, `@`, `}` or a quote; inside the quotes a double quote and a backslash are written with a backslash before them. A path that holds a line break has no spelling and is reported (C2-W-117). The options are written in the order in which the directive grammar of 0.1 names them (CARVE-P6-001): `@lines`, `@region`, `@rows`, `@cols`, `@shift`, `@code`. An option with another key follows these, in the order of the node. The `options` list of a parsed node is in this order (C2-A-181). An option value is written as the tree holds it; a `cols` value that kept its quotes (C2-A-181) gets no second pair.

**C2-W-059** A comment is written in its `form` (C2-A-074): `%% text` for a line comment, with the one space the reader removes again (C2-A-074) and with no space when the value is empty, a `%%%` block for a block comment, whose opener and closer are the shortest run of at least three percent signs that is longer than every bare percent run in its body (C2-B-110), `{% text %}` for a braced comment, and `{%%}` when its value is empty. A comment-only line is written at the column of the leaf or container that holds its node (C2-B-138). A comment that a container holds is written after one blank line when the block before it ends in a paragraph, a term or a caption, because without the blank line the comment would be a lazy line of that leaf and move into it (C2-B-024, C2-A-075), and when the block before it is a table, because the comment would become a child of the table (C2-A-086); a comment that stands between a figure group and its caption is written between the closer of the group and the caption line (C2-A-082); a heading before it needs none and gets none, which is an exception to the blank line of C2-W-017, since a comment at the container's column is not indented past the heading marker (C2-B-154); in every other place it stands directly below the block before it. Where a block of the same item follows the comment, that blank line stands inside the item and does not make the list loose (C2-W-030).

**C2-W-060** A term is written as `::`, one space and its content. A description is written as `:`, one space and its first block, and its later blocks at the content column.

## Canonical forms: tables

**C2-W-061** A table row is written as a pipe, its cells, and a closing pipe. Every row ends with a pipe (C2-B-166).

**C2-W-062** A cell is written as its prefix glued to the opening pipe, one space, its content and one space before the next pipe. The prefix is the header mark `=` when the cell is a header cell, then the brace block when the cell has alignment or attributes; in that brace block the alignment mark stands first: `|={>} Price |`.

**C2-W-063** A span mark is written with the same padding: `| ^ |`, `| < |`. A cell whose content is only `^` or `<` and is not a span is written with an escape.

**C2-W-064** A row is written with exactly the cells it has. The writer adds no empty cell to make the rows equally wide.

**C2-W-065** A row attribute is written glued to the closing pipe (C2-B-167).

**C2-W-066** A table is written in the form the sidecar records, pipe or delimited (C2-L-023), when the tree allows it. With no fact it is a pipe table, and a table with no rows is a delimited table (C2-L-036). Where a delimited table is written and no fact names its format, the format is `csv`. A table whose body carries `headRows` is written as a delimited table with its `header-rows` attribute, the only form that declares the field (C2-A-088). In a delimited table a cell that holds the separator, a double quote or a line break is written in double quotes with each double quote doubled; every other cell is written bare.

**C2-W-067** Continuation rows are written at the places the sidecar records (C2-L-019, C2-L-020). With no fact a row is one line (C2-L-035), except in a pipe table where the value of a node in a cell holds a line feed, as a code span that crossed rows does (C2-B-184): there the writer breaks the row into continuation rows at each such line feed, the only spelling of a pipe table that keeps the value. A delimited table writes such a cell in double quotes (C2-W-066). A break of the source that fell inside a label, which has no `value` to record it in (C2-L-020), is not kept: that cell is written on one line, and a `rawRef` that holds a line feed is written there with one space in its place (C2-W-075).

**C2-W-068** The option `alignTables` pads the cells of each column to one display width. It is off by default, the tree is the same with it on, and the two gates hold in that mode too. As in 0.1 (CARVE-P11-071). C2-W-118 and C2-W-119 state the padding and the width.

**C2-W-118** With `alignTables`, each cell of each line of a pipe table is a segment: the cell prefix, one space, the content as the writer spells it on that line, and one space. An empty cell is its prefix and one space. A span mark is the content of its own cell. On a continuation line the leading `+` takes the place of the leading pipe and is outside the first segment. The width of a column is the largest display width (C2-W-119) of its segments over every line of the table, continuation lines included. Each segment is padded with spaces after it, before the next pipe, up to that width; no space is added before the content, also for a right or centered cell. A row attribute behind the last pipe, a caption and the lines around the table count toward no width. A table written with `alignTables` and formatted again in that mode keeps its bytes, and `carve fmt --check` in that mode compares the source with the aligned form.

**C2-W-119** The display width of a segment is the sum of the widths of its extended grapheme clusters, by UAX #29 of Unicode 18.0.0. A cluster has width 2 when any of its code points has the East Asian Width W or F of Unicode 18.0.0 (UAX #11), and width 1 otherwise, an ambiguous-width (A) cluster included. A padding space has width 1. These property values hold whatever Unicode version the host runtime has.

Example 7 (generated, `--align-tables`)

Input:

```carve
|= Name |={>} 価格 | Note |
| tea | 2 | < |
+ green tea | | |
| café | 12.5 | hot |
```

Written:

```carve
|= Name     |={>} 価格 | Note |
| tea       | 2        | <    |
+ green tea |          |      |
| café      | 12.5     | hot  |
```

## Canonical forms: inline

**C2-W-069** Emphasis is written with `/` and strong with `*`. Where the bare delimiter would not open or close at that position (C2-I-047, C2-I-048), or the content holds the same delimiter in a position that would pair, the braced form is written: `{/usr/local/}`.

**C2-W-070** An emphasis or strong node with an ancestor or a descendant of its own kind is written in the braced form.

**C2-W-071** Underline, strike and highlight are written in their braced forms, `{_text_}`, `{~text~}` and `{=text=}`. They have no bare form in 0.2 (C2-I-046).

**C2-W-072** A replacement is written as a deletion directly followed by an insertion: `{-old-}{+new+}`. There is no arrow form (C2-A-097).

**C2-W-073** A link title is written in double quotes. Single quotes are rewritten to that form. A `title` key in an attribute block stays a key: it is a different tree (C2-A-032).

**C2-W-074** A link with an empty destination is written as `[text]()`, and an image as `![alt]()`. The writer adds no placeholder.

**C2-W-075** A reference is written with the verbatim text the sidecar records (C2-L-022), without spaces and tabs at the end of a line of it (C2-W-022), when reading that text gives the node the tree holds: the same content, the same `key` and the same form (C2-L-006). Otherwise it is written from the tree: its content, then `[key]` for the form `full` or `[]` for the form `collapsed` (C2-L-040). A key that starts with a caret or an at-sign is written with one space before it inside the brackets, since a label whose first character is one of them is no reference label (C2-I-078) and the space folds away (C2-I-079).

**C2-W-076** An attribute block of an inline host is written glued to the host, as one block in the order of C2-W-048. Glued blocks of the source are merged (C2-I-039).

**C2-W-077** A code span is written with the shortest backtick run that does not occur in its content, and with one space of padding on each side when the content starts or ends with a backtick or with a space that C2-I-016 would remove.

**C2-W-078** A smart-punctuation node is written as its `source` (C2-A-098).

**C2-W-116** Every other inline node is written in the one spelling its syntax clause gives: a mention as `@name` and a tag as `#name` (C2-I-090), a symbol as `:name:` (C2-I-093), an inline extension as `:name[content]` (C2-I-094), superscript as `{^text^}` and subscript as `{,text,}` (C2-I-057), an insertion as `{+text+}` and a deletion as `{-text-}`, an editorial comment as `{#text#}` (C2-I-063), an inline footnote as `^[content]` (C2-I-089), a footnote reference as `[^label]` (C2-I-087), a cross-reference as `</#id>` (C2-I-096), an autolink as its target in angle brackets (C2-I-073), a no-break space as a backslash and a space (C2-I-011), a literal-text span as `!` glued to a code span (C2-I-018), raw inline as a code span with `{=format}` glued to it (C2-I-021), and an `abbreviation` as its `key`, the word as typed. A `caption_number` is written as `#`, the mark of C2-B-150; only its number is a resolution result (C2-A-133, C2-A-162) and is not written. An inline node that needs content and has none in a supplied tree, such as an emphasis, a span or a link text with no children where the syntax needs at least one character, has no spelling: the writer leaves it out and reports `structure-unspellable`. A `cell_paragraph` is written as the content of its cell (C2-W-062).

**C2-W-079** A hard break is written as a backslash at the end of the line.

**Exception C2-W-080** Inside a line block, and inside a hard-break block written with its opener, a hard break is written as the bare line ending where reading that line ending gives the same tree.

**C2-W-081** A div with the class `hardbreaks` is written in the form the sidecar records (C2-L-018) when the tree allows it. With no fact the opener is used when every line break in the div is a hard break and `hardbreaks` is the last of its classes, and the class form otherwise (C2-L-034). The opener adds the class last (C2-A-068), so the opener form on any other div would change the tree. Where the opener is written, the class `hardbreaks` is not written on the attribute line: the opener stands for it.

**C2-W-082** A quote is written in the form the sidecar records, `>` lines or a quote fence (C2-L-017). With no fact it is written with `>` lines (C2-L-033). A quote with no children is written as one line that holds only `>`, or as a quote fence with no body where the sidecar records that form. A sigil div is written with one space between the colon run and its sigil: `::: >`, `::: |`, and the backslash for a hard-break block (C2-B-196).

## The sidecar

**C2-W-083** The writer takes five spellings from the sidecar when the fact is present and the tree allows the form (C2-L-042):

| Spelling | Fact | With the fact | Without |
|---|---|---|---|
| ordered numbering | `bare` | bare dot or written numbers, as recorded | bare dot (C2-L-030) |
| quote form | `fenced` | `>` lines or quote fence | `>` lines |
| hard-break block | `hardBreakOpener` | opener or class form | opener when every break is hard and the class is last, else class form |
| table form | `sourceFormat` | pipe or delimited | pipe; delimited when the table has no rows |
| continuation rows | `continuationLines`, `wraps` | rows broken at the recorded places | one line per row |

**C2-W-084** The writer also takes `rawRef` (C2-W-075).

**C2-W-085** The writer reads no other sidecar fact. The heading marker, the thematic break, the fence character and length, the frontmatter opener, the marker columns, the continuation style and the counts of blank lines are written in their canonical form whatever the sidecar records (C2-L-043). The other facts of the sidecar are for editors and other tools (C2-L-046).

**C2-W-086** The tree wins: a fact that contradicts the tree is ignored (C2-L-006).

**C2-W-087** Both gates hold with and without a sidecar. `fmt` reads the sidecar of its own parse, so C2-W-003 is tested on that path.

## Escaping

**C2-W-088** A character is written with a backslash exactly when the output without that backslash, with the escapes to its left in place and none to its right, would parse to a different tree (C2-W-091). An escape this test does not ask for is a defect.

**C2-W-089** The writer decides an escape by reparsing the candidate line in its context, with the 0.2 parser, and not from a list of characters. The lists below name the cases the test has to cover. They are not the rule. This is requirement W2.

**C2-W-090** The unit of an escape is the opener: where a construct opens on a run of characters, the escape is placed so that the whole run reads as text.

**C2-W-091** One escape does not cause others. Each position is tested on its own, from left to right, with the escapes already placed to its left and the text to its right bare. The result is one form for each tree, found in one pass. It can hold an escape that a later one makes needless. The text `x<a:b>=}` is written `x\<a:b\>=}`: `<` is escaped because, with the text to its right bare, it opens an autolink; `>` is escaped because behind `\<` the bare `>=` would read as the comparison sign (C2-I-117). The escape of `>` alone would have stopped the autolink too, and still the form with both is the canonical one. For a tree from a parse the pass keeps the tree. For a supplied tree it may not. The writer parses its finished form, compares it with the tree, and reports each node that did not read back as a loss (C2-W-011, C2-W-124).

**C2-W-121** A paragraph that starts with a description mark and follows a description list gets its backslash, also where three blank lines stood between them in the source: the writer puts one blank line there (C2-W-017), and behind it the bare mark would read as a description of the list.

**C2-W-092** A paragraph line is tested for reading as a block opener or as an interrupter. The cases:

- one to six `=` or `#` and a space at the start of a paragraph (C2-B-151, C2-B-152);
- a caret and a space on a line directly below a block that takes a caption, below an image paragraph, and directly after a line of an open quote when the line does not carry the quote's mark (C2-B-017, C2-B-018, C2-B-146);
- a pipe at the start of a line that also ends with a pipe (C2-B-166), and a `+` at the start of such a line below a table row (C2-B-175);
- a fence run: three or more backticks, tildes, colons or percent signs (C2-B-014);
- a list marker with content, at the start of a paragraph and on every line inside an item, a description or a footnote body (C2-B-015);
- a description mark or a term mark, at the start of a paragraph and on every line inside a description list (C2-B-016);
- a definition shape at column 0 (C2-B-081);
- a quote mark and a space at the start of a paragraph (C2-B-031);
- a run of three or more stars alone on any line of a paragraph (C2-B-159, C2-B-200);
- a brace block with content alone on a line, which would be an attribute line (C2-B-090, C2-B-193);
- `{{` and `}}` around a whole line (C2-B-156);
- `---` on line 1 of the document (C2-B-161);
- `%%` at the start of a line or after whitespace (C2-B-133).

**C2-W-093** A delimiter is tested for pairing: a `/` or `*` that would open or close emphasis or strong, and a delimiter inside a braced span that would close a span opened outside it.

**C2-W-094** A bracket is tested for forming a construct: a pair followed by a link tail, by `[label]` or `[]`, or by a brace block; `![`; `^[`; `[^`; and a bracket pair whose label would resolve as a reference.

**C2-W-095** A sigil is tested for forming: `@` and `#` before a name after a boundary (C2-I-090), `:name:`, `:name[`, `<` before a URL, an email address or `/#`, a backtick run, `$` before a backtick run, and the runs that smart typography replaces where the tree holds text and not a smart-punctuation node.

**C2-W-096** An opening brace is tested for forming an attribute block, a braced comment, an editorial comment or a braced opener (C2-I-043).

**C2-W-097** A backslash in text is written as two when the next character is ASCII punctuation or a space, or when it ends the line (C2-I-010 to C2-I-012).

**C2-W-098** In a table cell a pipe in text is written with a backslash, and a pipe inside a code span needs none (C2-B-169).

**C2-W-099** A text line that holds only underscores, or one hyphen, is written as it is and needs no escape: it is not a thematic break (C2-B-159). A text run of two or more hyphens that would read as dashes is written with every second hyphen escaped, starting with the second, on any line, as in `-\-` and `-\--` (C2-I-111, C2-W-095): that leaves no two bare hyphens side by side and adds no escape that is not needed (C2-W-088). The escape also keeps three hyphens on line 1 from opening frontmatter (C2-B-161). Where the first block of the document would read as another tree on line 1 and reads as itself below a blank line, as a paragraph that holds only an em dash node with the source `---` does (C2-B-161), the output starts with one blank line. Formatting that output again gives the same bytes.

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
{.a}{k=v}{#b}
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

**C2-W-103** A parse, a render, a write and a lint run report into one diagnostics record (C2-A-172). Every entry has a code, a severity, a position, a message and a channel (C2-A-173). The position is a byte range in the source, a path into the tree, or both: a finding of the writer on a supplied tree has the path alone.

**C2-W-104** The channel is `parse`, `render-loss` or `lint`. A code belongs to one channel. The writer's codes `structure-unspellable` and `field-unspellable` are in the render-loss channel.

**C2-W-105** The severity is one of `hint`, `warning` and `error`, in lower case. The 0.1 engine source writes the first with a capital, `Hint`. The default is `warning`: a rule has that severity unless the catalog names another.

**C2-W-106** Every code is an entry of one catalog, a data file in `resources/`. A code is a contract: it is not renamed and not reused.

**C2-W-107** Lint is computed from the tokens and the tree of the parse. It never reads the raw text with patterns of its own, so it cannot disagree with the parser about what a line is.

**C2-W-108** Lint never changes the tree and never changes the output of `fmt`.

**C2-W-109** The option `rules` turns single rules on and off, and `platforms` selects the platform rules. A rule can be suppressed in the source by the control comments of 0.1 (C2-B-215, C2-B-216). A rule that is off by default is turned on by its id. There is no named group of rules.

**C2-W-110** A rule whose id starts with `deprecated-` reports a spelling that 0.2 removed and that now reads as something else. These rules are on by default through 0.2.x.

**C2-W-111** Each `deprecated-` rule states its trigger on the 0.2 tokens and tree. The 0.2 engine holds no 0.1 parsing code for them.

### Rules kept from 0.1

The ids and the messages are copied from the 0.1 reference engine (`src/lint.ts`, `src/djot-migrate.ts`, `src/extension/accessibility.ts`). `${...}` stands for a value the engine fills in. A rule with several messages lists all of them. A message of a platform rule is put together from parts. The severity of a rule is `warning` (C2-W-105) unless the table "Severities other than warning" names it. A message that names a 0.1 form, such as a leading `#` or a bare delimiter, gets its 0.2 text with the catalog data file.

| Rule | Messages in the source | In 0.2 |
|---|---|---|
| `bare-html-tag` | `This bare HTML tag is escaped as text; use a raw HTML block if markup is intended.` | unchanged |
| `bidi-control-in-source` | `Bidi override/isolate control U+${code} is preserved by canonical Carve but not written to the text and code of presentation output; remove it unless intentional.` | narrowed to text and code (C2-H-172) |
| `block-marker-as-text` | `This line begins like ${what} but parsed as plain text - the block did not open. Check this line's syntax and any unterminated fence above it.` | also a brace line that is not a valid one-line attribute line |
| `block-opener-overindented` | `This ${kind} is indented ${past} column(s) past the content column of ${owner}, and it still opens a ${kind}, measured from its own line. Remove the indentation to make the structure explicit, or escape the opener to keep the line as text.` | unchanged |
| `blockquote-marker-without-space` | `A blockquote marker must be either bare ">" or followed by a space. This line renders as literal text; write "> ${text}" to quote it.` | unchanged |
| `braced-comment-in-a-template-source` | `This braced comment is a template tag. Liquid, Nunjucks, or Twig source may have reached Carve as text; the tag is parsed as an invisible comment.` | unchanged |
| `broken-crossref` | `Cross-reference </#${target}> matches no id; ${caseOnlyPhrase}, and cross-references are case-sensitive, so it renders as the literal text "</#${target}>".`<br>`Cross-reference </#${target}> names the id "${id}", which is on a ${kind}; a cross-reference reaches only headings and numbered captions, so it renders as the literal text "</#${target}>". Link to it with [text](#${id}).`<br>`Cross-reference </#${target}> has no matching heading id; it renders as the literal text "</#${target}>".` `${caseOnlyPhrase}` is "the ${noun} ${id} differs only in case" or its plural. | unchanged |
| `broken-fragment-link` | `Link to "${href}" matches no id; the id "${caseOnly}" differs only in case, and fragment links are case-sensitive, so the link goes nowhere.`<br>`Link to "${href}" matches no id in this document, so the link goes nowhere.` | unchanged |
| `caption-looking-paragraph` | `This caption-looking paragraph sits next to a table or image; use a ^ caption line.` | unchanged |
| `carve-version-unsupported` | `document declares Carve ${version}; this engine implements ${SPEC_VERSION}, so constructs added after that version will not render as intended`<br>`document declares an unrecognized Carve version ${version}; this engine implements ${SPEC_VERSION}` | unchanged |
| `colon-fence-length-mismatch` | `Bare ${authoredWidth}-colon fence does not close the innermost ${expectedWidth}-colon ${kind} opened at ${line}:${column}; it ${outcome}.` | new message text: the run closes the innermost open div it is long enough for and every div inside that one, and opens an anonymous div only when it is long enough for none (C2-B-125) |
| `comment-shaped-emphasis` | `This emphasis looks like a C comment; use Carve comment syntax if you meant a comment.` | unchanged |
| `consumed-key-near-miss` | `"${word}" is not a consumed key here; did you mean {${key}}?` | `loose` leaves the list of consumed keys |
| `definition-term-block-folded` | `This block opener is indented under a definition term, which has no content column, so it folds into the term as text (a fence line or a table row does not fold: it closes the description list). Dedent it to the container's content column to open the block, or put it in the term's ": " description.` | a block opener under a term is term text (C2-B-075) |
| `delimited-table-malformed` | `This marked CSV/TSV fence has malformed quoting, so it remains a code block.` | severity error; new message text: the block stays a table (C2-B-181) |
| `delimited-table-wide-row` | `A CSV/TSV record has more fields than the first record; the table keeps the extra columns.` | unchanged |
| `deprecated-cell-alignment` | `The table cell alignment prefix "${prefix}" is the deprecated 0.1.13 spelling, removed in 0.2.0. Alignment symbols now lead the cell's attribute block: write "${braced}". In 0.2 the old prefix is cell text, so the formatter leaves it; the upgrade tool rewrites it.` | the glued alignment marker is cut; the rule stays on through 0.2.x |
| `description-separator-below-content-column` | `This ${name} starts at column ${column}, below the column ${host.column} of the definition list above, so it adds no entry to that list. Indent it to column ${host.column} to continue the list.` | unchanged |
| `duplicate-footnote-definition` | `Duplicate footnote definition [^${label}] is ignored; the first definition for a label wins.` | unchanged |
| `duplicate-id` | `Duplicate id "${explicit}": the repeated HTML id is invalid, and cross-references to it resolve to the first occurrence.`<br>`Heading slug "${base}" collides with another heading or an explicit id; its auto id becomes "${id}", and ambiguous references to "${base}" resolve to the first occurrence.` | renamed from `duplicate-heading-id`; covers a duplicate authored id on every node (C2-A-039) |
| `duplicate-reference-url` | `This reference definition repeats an earlier URL.` | unchanged |
| `emphasis-as-heading` | `This emphasized paragraph looks like a heading.` | unchanged |
| `emphasis-marker-before-attributes` | `This ${ch} closes no span, so it and the attribute block after it stay text. Brace the span you mean ({${ch}text${ch}}{…}) to attach the block, or escape the ${ch} to keep both as text.`<br>`This ${marker} closes the ${name} span that opens at line ${line}, column ${column}, so the attribute block after it attaches to that whole span, which also holds a literal ${marker}. Brace the span you mean ({${marker}text${marker}}{…}) or escape the inner ${marker} to make the pairing explicit.` | unchanged |
| `empty-include-path` | `This "${text}" looks like an include directive with no path, so it renders as literal text. Add a path (for example {{ chapter.crv }}) or remove the braces.` | unchanged |
| `empty-link-destination` | `This link has an empty destination.` | unchanged |
| `empty-reference-definition` | `This line is a label and a colon with nothing after it, so it is text and defines nothing. Add a destination, or remove the line.` | re-scoped: a line of the shape `[label]:` with nothing after it, which is text in 0.2 (C2-B-083); new message text |
| `fence-opener-fallback` | `A code fence carries no inline attributes, so "${attributes}" after the info string is not valid. ${effect} (use: "${attributes}" on its own line directly above the fence, then "${opener}").`<br>`The whitespace in this fence opener is not valid: at most one space follows the fence, and the parts of the info string are separated by spaces, never tabs. ${effect} (use: "${respaced}").`<br>`This line starts like a fenced code block, but "${info}" is not a valid info string (a language, then an optional "title", then an optional [label]). ${effect}` `${effect}` says that the fence does not open and that the block renders as a paragraph; for an attribute block after the language it says that the fence opens and the attribute block is not applied (C2-B-105). | severity error for an attribute block after a fence language or an admonition name |
| `fence-title-syntax` | `The title after "${type}" uses typographic quotes - usually a CMS "smart quote" filter rewrote the source before Carve parsed it. A fence title needs straight double quotes: ${fence} ${type} "${title}"${label}.`<br>`A "{…}" on the fence line is not an attribute block and is not applied; the block still opens. Put attributes on their own line directly above the ":::" opener.`<br>`Text after the "${type}" fence type must be a quoted "title" or a [label]; unquoted it is not read as a title, and the block opens. Did you mean ${fence} ${type} "${title}"${label}?`<br>`Invalid container metadata was dropped; the container and its children are preserved. ${hint}` | unchanged |
| `figure-group-empty` | `This "::: figure" group holds no captionable panel; the panels wrapper renders around the preserved content only.` | unchanged |
| `figure-group-nested` | `A "::: figure" inside a figure group is a figure group of its own and not a panel of the outer group. Move it out of the enclosing group.` | unchanged |
| `figure-group-opener-metadata` | `A "::: figure" opener carrying a quoted title or [label] is not a figure group; it is a plain container with the class "figure" (C2-B-127). Drop the title or label to open a figure group, and use a caption line below it.` | new message text |
| `figure-group-panel-number` | `A "#" placeholder in a panel caption stays literal: panels are not numbering units, the group caption carries the number (and panel ids resolve with its letter).` | unchanged |
| `figure-group-single-panel` | `This "::: figure" group holds a single panel; a plain captioned figure renders the same content without the group wrapper.` | unchanged |
| `footnote-labels-differ-only-in-whitespace` | `Footnote definition [^${label}] normalizes to the same key as [^${twin}]; the first definition wins. Normalized key: ${key}.` | unchanged |
| `footnotes-placement-in-container` | `This "::: footnotes" marker is inside a container, where it does not place: it renders as a plain typed div and the endnotes section goes where it would without the marker. Move the marker to document level, or delete it to accept the default position.` | unchanged |
| `github-alert-marker` | `This github alert marker stays literal in a Carve quote; use an admonition fence.` | unchanged |
| `glob-shaped-strong` | `This strong span looks like a file glob; escape the asterisk if you meant a glob.` | unchanged |
| `heading-closing-hashes` | `The closing "${run}" run is heading text in Carve, not a closing marker. Delete it.` | unchanged |
| `heading-level-skip` | `This heading skips from level ${previous} to ${level}; use the next heading level for a continuous outline.` | unchanged |
| `heading-trailing-attribute` | `Trailing "${block}" on a heading is literal text in Carve, not an attribute block. Move it to a "${block}" line directly above the heading.` | unchanged |
| `html-comment-renders-as-text` | `This HTML comment renders as visible text. Use %% for one line or %%% for a comment block.` | unchanged |
| `indented-code-block` | ```` Four-space indentation does not make a code block in Carve; this renders as a paragraph. Use a ``` fence. ```` | unchanged |
| `link-gap-before-destination` | `The gap after this link label keeps the link as text; write ]( with no space.` | unchanged |
| `list-item-block-overindented` | `This block opener is past the list item's canonical content column ${contentColumn}; it now parses structurally and the formatter will canonicalize it. Dedent it to column ${contentColumn} for an explicit structural spelling, or escape the opener to preserve the literal meaning used by older readers.` With an attributed item the message starts "This line uses the attributed item's former full-prefix column." | unchanged |
| `list-marker-below-content-column` | `This list marker starts at column ${column}, below the content column ${contentColumn} of the list item above, ${reading}. Indent it to column ${contentColumn} to nest it under the item, or start it at column ${baseColumn} to put it at the item's own level.` `${reading}` is "so it is a sibling item, not a nested one" or "so it starts a separate list instead of nesting". | new message: the marker joins the deeper list (C2-B-055) |
| `list-marker-without-blank-line` | `This list marker is part of the preceding paragraph; add a blank line before the list.` | also a list marker directly after term or description text (C2-B-022), with a second message |
| `markdown-definition-paragraph` | `This markdown definition remains paragraph text; use a :: term line before the definition.` | unchanged |
| `non-descriptive-link-text` | `Use descriptive link text or a specific aria-label.` | unchanged |
| `platform-issue-reference` | `${host} re-linkifies a hash-number in published output, so "${text}" becomes a link that notifies or references something unrelated; move the example into a fenced code block, or rewrite it as "item 1" / "point 1"` | unchanged |
| `platform-mention-token` | `${host} re-linkifies ${what} in published output, so "${text}" becomes a link that notifies or references something unrelated; move the example into a fenced code block, or strip the sigil and rephrase` | unchanged |
| `quote-fence-ends-the-quote-above` | `A "::: >" opener at the column of the quote above it ENDS that quote and opens a sibling one; the two render as adjacent blockquotes, not one nested in the other. Write "> ::: >" to nest it, or leave a blank line to make two quotes deliberate.` | unchanged |
| `references-placement-in-container` | `This "::: references" marker is inside a container and does not place the reference list. Move it to document level, or remove it if no placement is needed.` | unchanged |
| `region-marker-renders-as-text` | `This line renders as text and is not a region marker for a Carve include. Use "%% #region name".` | unchanged |
| `semantic-attribute-outside-span` | `"${name}" is a semantic span attribute (PART 9 §10) and only applies to an ordinary [content]{attrs} span; on ${type} it stays a raw attribute and renders as ${name}="${value}".` | unchanged |
| `semantic-attribute-value-ignored` | `Value on the semantic attribute "${name}" is discarded: it selects the <${name}> element and reaches no output. Only abbr, dfn and time carry a value (as title or datetime).` | unchanged |
| `setext-heading-underline` | `Carve has no underline heading: this run is not a heading underline. Write the heading with a leading "#" instead.` | new message: a hyphen run under text is text |
| `table-column-arity` | `${key} supplies ${count} column entries for a ${widest}-column table; the unset tail is valid but may be accidental.` | unchanged |
| `table-column-overlap` | `Column ${n} supplies the same alignment axis both in the table and in a table attribute; the in-table marker wins.` | unchanged |
| `table-marker-run-padding` | `"${spelling}" writes a cell's attribute block before its alignment marker, which Carve no longer reads as one. The block is part of the cell's marker run and the run ends at a space, so with the "${marker}" glued to it there is no run: the braces are content and the cell is neither attributed nor aligned. Write "${marker}${block} " to align it, or "${block} ${marker}" to keep the "${marker}" as content deliberately.` | unchanged |
| `table-row-cell-count` | `This table row has ${cells} cells; the header has ${width}. Add or remove a cell to match the table.` | unchanged |
| `table-shaped-paragraph` | `This table-shaped line lacks a closing pipe and renders as paragraph text; close the table row.` | stays: a line that starts with a pipe and does not end with one is text (C2-B-168) |
| `table-span-marker-blocked` | `The "${marker}" span marker cannot extend a cell. ${reason} It renders as a cell of its own; escape it as "\${marker}" to keep the character as text, or remove it.` | also a row span stopped at the head boundary (C2-B-174) |
| `table-width-total` | `The specified table column widths total more than 100%.` | unchanged |
| `thematic-break-spelling` | `This line of "${raw}" is text in Carve 0.2. Write "***" for a thematic break.` | new trigger: a run of hyphens or underscores alone on a line, which is text in 0.2 |
| `unattached-block-attribute` | `This attribute line reaches no block: a blank line or the end of its container follows, so the line is text (C2-B-192). Move it directly above the block it describes, or delete it.` | new message text; also an attribute line separated from its block by a blank line |
| `unclosed-code-fence` | `The ${marker} fence opened here has no closing fence; ${ending}. Add a closing ${marker} where the code should stop.` `${ending}` is "it runs to the end of the document", "a continuation marker on line ${line} ends it" or "it ends at the end of its container on line ${line}". | severity error; the block ends with its container (C2-B-111) |
| `unclosed-comment-fence` | `The ${opener} comment fence opened here has no closing fence and hides everything to the end of its container (or: the document). Add a closing ${opener} where the comment should stop.` | severity error; the block ends with its container (C2-B-111) |
| `unclosed-container-fence` | `This ${width}-colon ${kind} has no closer; it runs to the end of its container. Add a bare fence of ${width} colons to close it.`<br>`This ${width}-colon container has no closer; add a bare fence of ${width} colons to close it.` | severity error; the block ends with its container (C2-B-111) |
| `unclosed-inline-emphasis` | `This strong (or: emphasis) opener is unclosed in its paragraph; add a closer.` | unchanged |
| `unresolved-footnote` | `Footnote reference [^${id}] has no matching definition; it renders as literal text.` | unchanged |
| `unresolved-reference-link` | `Reference link ${rawRef} matches no link definition or heading; ${caseOnlyPhrase}, and reference labels are case-sensitive, so it renders as literal text.`<br>`Reference link ${rawRef} has no matching link definition or heading; it renders as literal text.`<br>`Reference image ${rawRef} matches no link definition; ${caseOnlyPhrase}, and reference labels are case-sensitive, so it renders as literal text.`<br>`Reference image ${rawRef} has no matching link definition; it renders as literal text.` | the full form and a wrapped label now reach the heading lookup (C2-I-080, C2-I-081) |
| `unused-footnote-definition` | `Footnote definition [^${label}] is never referenced, so it is omitted from the rendered document.` | unchanged |
| `unused-link-reference-definition` | `This link reference definition is unused.` | unchanged |
| `markdown-strong-double-star` | `` Djot/Markdown `**strong**` is not Carve bold — Carve bold is a single `*`, so this renders with literal asterisks. `` | new message text |
| `markdown-strikethrough-double-tilde` | `` Markdown `~~strikethrough~~` is literal text in Carve. Carve strikethrough is the braced `{~x~}`. `` | new message text |
| `djot-subscript-tilde-braced` | `` Djot subscript `{~x~}` renders as *strikethrough* in Carve. `` | opt-in Djot check |
| `djot-subscript-tilde` | `` Djot subscript `~x~` is literal text in Carve. Carve subscript is the braced `{,x,}`. `` | opt-in Djot check; new message text |
| `djot-superscript-caret` | `` Djot superscript `^x^` is literal text in Carve — Carve superscript is the braced `{^x^}` only. `` | opt-in Djot check |
| `djot-emphasis-underscore` | `` Djot emphasis `_x_` is literal text in Carve. Carve emphasis is `/x/`. `` | opt-in Djot check; new message text |
| `djot-intraword-underscore` | `` Djot emphasizes this intraword `_x_`; the migration leaves it literal, so the emphasis is lost. Brace it as `{/x/}` if it was meant. `` | opt-in Djot check |
| `djot-highlight-braces` | `` Djot highlight `{=x=}` is also Carve highlight (`{=x=}`). `` | opt-in Djot check; new message text |
| `djot-plus-bullet` | `` Djot/Markdown `+` bullet is not a Carve bullet, so this line is a paragraph. Write `-` or `*`. `` | opt-in Djot check |
| `djot-heading-continuation` | `` Djot folds the line(s) below a heading INTO it (a plain line, or one with the same number of `#`); Carve takes only lines indented past the heading marker into the heading (C2-B-154), so a line at the marker column is a separate block and the heading id changes. `` | opt-in Djot check |
| `a11y/image-alt` | `image has empty alternative text and is not marked decorative` | accessibility extension; severity warning, where the 0.1 source sets error |

84 rules are kept, one of them under a new id.

Three ids stand in `docs/validation.md` on `main` and were not found in the engine source:

| Rule | In 0.2 |
|---|---|
| `gfm-delimiter-row` | not found in the engine; replaced by `deprecated-separator-row` |
| `fence-delimiter-indentation` | not found in the engine; not in the catalog |
| `bibliography-placement-in-container` | not found in the engine; not in the catalog |

The `include-` rules of 0.1 belong to the Includes document, which follows later. `empty-include-path`, which reads the shape of the directive, is the one include rule in this catalog.

### Severities other than warning

| Severity | Rules and codes |
|---|---|
| error | `unclosed-code-fence`, `unclosed-container-fence`, `unclosed-comment-fence`, `unclosed-frontmatter`, `delimited-table-malformed`, `fence-opener-fallback`, and the render-loss code `destination-denied` |
| hint | `comment-shaped-emphasis`, `glob-shaped-strong`, `thematic-break-spelling`, and the new rules marked hint in the next table |

`unclosed-container-fence` is an error also for a stray closer that opens a div running to the end. The `deprecated-` rules are warnings.

### New rules

The 29 rules of the migrate and lint design and one rule added later, with the later rulings applied. Severity and message are those of the design unless the last column says otherwise.

| Rule | Severity | Reports | After the later rulings |
|---|---|---|---|
| `block-opener-without-blank-line` | warning | a line inside a paragraph or a caption that would open a block after a blank line: a heading, a quote line, an attribute line, a term or description mark, a definition | a table row is no trigger, because a row interrupts (C2-B-019) |
| `unattached-caption` | warning | a caption line that is not directly below one of the six caption targets, a caption after a blank line among them | the target list has six kinds, the figure group included |
| `deprecated-continuation-marker` | warning | a line that holds only `+` outside a table and a fence, and an item whose first line is `+` | unchanged |
| `definition-in-container` | warning | a definition shape inside a container or indented at the top level | unchanged |
| `list-item-body-below-content-column` | hint | a block of an item that is indented past the marker and short of the content column | unchanged |
| `ordered-marker-right-aligned` | warning | an ordered marker left of its list that ends at the column where the list's markers end | unchanged |
| `tight-list-item-with-blank-line` | hint, opt-in | a tight list in which an item holds a blank line and a paragraph | unchanged |
| `deprecated-loose-attribute` | warning | a list that carries the key `loose` | unchanged |
| `heading-marker-mixed` | hint | a document with `=` headings and `#` headings, once | unchanged |
| `comment-line-in-line-block` | hint | a line of a line block that starts with `%%` | unchanged |
| `fence-closer-indented` | hint | a closer whose indent differs from its opener's | unchanged |
| `ordered-list-kind-split` | warning | a one-item letter list directly followed by a list of the other letter kind that continues it | unchanged |
| `duplicate-link-reference-definition` | warning | a link definition whose key was defined before | unchanged |
| `duplicate-abbreviation-definition` | warning | an abbreviation definition whose key was defined before | unchanged |
| `deprecated-spaced-thematic-break` | warning | a line of three or more stars, hyphens or underscores with spaces between them | unchanged; `- - -` is this case |
| `deprecated-indented-line-under-heading` | warning | a line directly below a heading line that is indented past the heading marker and so continues the heading, where 0.1 started a paragraph (C2-B-154) | added with the heading continuation rule |
| `description-term-multi-line` | hint | a term whose text spans several lines | unchanged |
| `table-row-without-closing-pipe` | hint | a row with no closing pipe | void: such a line is text (C2-B-168) and `table-shaped-paragraph` reports it |
| `table-row-attribute-as-cell` | warning | a row whose last cell holds only an attribute block | the half about a row without a closing pipe is void |
| `deprecated-separator-row` | warning | a row in which every cell holds only hyphens and colons | unchanged |
| `deprecated-table-attribute` | warning | `header-rows` on a pipe table | only `header-rows`; `aligns`, `widths`, `header-cols` and `footer-rows` stay as in 0.1 |
| `deprecated-bare-underline` | warning | an underscore pair that 0.1 read as underline | unchanged |
| `deprecated-bare-strike` | warning | a tilde pair that 0.1 read as strike | unchanged |
| `deprecated-bare-highlight` | warning | an equals pair that 0.1 read as highlight | unchanged |
| `deprecated-substitution-arrow` | warning | a braced strike span that holds `~>` | unchanged |
| `braced-span-opener-as-text` | warning | a braced opener left as text because a bare delimiter inside it closed an outer span | unchanged |
| `unattached-inline-attribute` | hint | an attribute block in a paragraph that is glued to no host | unchanged |
| `sigil-after-letter` | hint | a mention or tag shape directly after a letter or number outside ASCII | unchanged |
| `unclosed-frontmatter` | error | frontmatter with no closer | unchanged (C2-B-163) |
| `frontmatter-shaped-thematic-break` | warning | frontmatter whose first line is blank or that holds no key line | unchanged |

Of the 29, 28 stay and one is void.

### Rules added for findings the syntax chapters promise

Four findings of the syntax chapters had no rule. Their ids are new in this document.

| Rule | Severity | Reports |
|---|---|---|
| `unclosed-braced-comment` | warning | a braced comment whose closer stands behind an interrupter line, so that it is unclosed and stays text (C2-B-141, C2-I-027) |
| `comment-in-reference-label` | warning | a line comment that starts inside a reference label and takes the rest of the line, so that the brackets are text (C2-I-077) |
| `comment-fence-closer-with-text` | warning | a line inside a comment block that starts with a `%` run of at least the opener's length and holds other text: it is content in 0.2 and closed the block in 0.1 (C2-B-110, C2-B-195) |
| `uneven-list-indent` | warning | a marker left of every open list that continues the list above it (C2-B-054) |

A glued attribute run is no finding: glued blocks merge (C2-B-093), `fmt` writes one block, and the tree is the same.

### The codes of the parse channel and of the render-loss channel

**C2-W-113** A finding that a syntax chapter calls a diagnostic or a warning is reported by the parser, in the parse channel. A finding that a chapter calls lint, and every other rule of this catalog, is reported in the lint channel. A code keeps its one channel in every tool.

| Code | Channel | Severity | Reports |
|---|---|---|---|
| `unclosed-frontmatter` | parse | error | frontmatter with no closer (C2-B-163) |
| `delimited-table-malformed` | parse | error | an unclosed quote in a delimited table (C2-B-181) |
| `unclosed-code-fence` | parse | error | a code fence that runs to the end of its container (C2-B-111) |
| `unclosed-comment-fence` | parse | error | a comment block that runs to the end of its container (C2-B-111) |
| `unclosed-container-fence` | parse | error | a div that runs to the end of its container (C2-B-111, C2-B-125) |
| `fence-opener-fallback` | parse | error | an attribute block after a fence language or an admonition name |
| `fence-title-syntax` | parse | warning | an unquoted title or further words in an info string (C2-B-117) |
| `duplicate-footnote-definition` | parse | warning | a second footnote definition for a key (C2-B-085) |
| `duplicate-link-reference-definition` | parse | warning | a second link definition for a key (C2-B-085) |
| `duplicate-abbreviation-definition` | parse | warning | a second abbreviation definition for a key (C2-B-085) |
| `duplicate-id` | parse | warning | a second node with one authored id (C2-A-039) |
| `raw-format-dropped` | render-loss | warning | raw content in a format the target does not write (C2-H-054) |
| `destination-denied` | render-loss | error | a destination that `urlPolicy` blanked (C2-H-082) |
| `carrier-attribute-dropped` | render-loss | warning | an authored attribute with a reserved carrier name under `roundtrip` (C2-H-116) |
| `include-unresolved` | render-loss | warning | an include directive that was not expanded (C2-H-133) |
| `structure-unspellable` | render-loss | warning | a node or wrapper the writer could not write (C2-W-011) |
| `field-unspellable` | render-loss | warning | a field the writer could not write (C2-W-011) |
| `extension-fallback-rendered` | render-loss | warning | an unknown optional extension that rendered through its fallback (C2-A-127, C2-H-076) |
| `profile-construct-degraded` | render-loss | warning | a construct outside the active `profile` (C2-H-129) |

### Rules of 0.1 that become obsolete

| Rule | Why | Replaced by |
|---|---|---|
| `refused-continuation-marker` | there is no list continuation marker | `deprecated-continuation-marker` |
| `continuation-marker-refused` | the same | `deprecated-continuation-marker` |
| `table-separator-near-miss` | every separator row is a row of cells | `deprecated-separator-row` |
| `markdown-italic-underline` | a bare underscore pair is text, not underline | `deprecated-bare-underline` |
| `list-item-body-detached` | a line past the marker column stays in the item | `list-item-body-below-content-column` |
| `ordered-list-split-by-indent` | lists with markers at different columns are one list (C2-B-054) | `uneven-list-indent` |

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
| a marker left of every open list | `uneven-list-indent` |
| a `%%%` line with other text inside a comment block | `comment-fence-closer-with-text` |
| a list marker directly after term or description text | `list-marker-without-blank-line` |
| a definition inside a container | `definition-in-container` |
| an attribute line after a paragraph line | `block-opener-without-blank-line` |
| an unclosed fence, div or comment block | `unclosed-code-fence`, `unclosed-container-fence`, `unclosed-comment-fence` |
| unclosed frontmatter | `unclosed-frontmatter` |
| a stray `:::` that opens an anonymous div running to the end | `unclosed-container-fence`, with severity error |
| a braced comment left unclosed by an interrupter line | `unclosed-braced-comment` |
| a line comment inside a reference label | `comment-in-reference-label` |
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
| CARVE-P11-019 | a footnote definition with no blocks | removed: 0.2 has no sentinel, and an empty supplied body is unspellable | C2-W-057 |
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
| CARVE-P11-040 | an empty description body | removed: 0.2 has no sentinel, and an empty supplied body is unspellable | C2-W-057 |
| CARVE-P11-041 | the task marker | simplified | C2-W-046 |
| CARVE-P11-042 | a block that opens a tight item, after a continuation marker | removed: 0.2 has no list continuation marker; the marker-line rule is C2-W-027 | none |
| CARVE-P11-043 | the round-trip comparison list | removed: the gate compares trees (C2-A-164); the case of its third entry is C2-W-112 | none |
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
| CARVE-P11-070 | empty destinations | ported for a link and an image; an empty link definition has no spelling in 0.2 | C2-W-074, C2-W-056 |
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

Totals over the 82 clauses: 28 ported, 8 simplified, 6 removed, 40 out of scope. The PART 11 review counted 24 out of scope and 3 removed. The difference is the 16 clauses of the section "Out of scope", CARVE-P11-043, and the two sentinel clauses CARVE-P11-019 and CARVE-P11-040.

## Open

One point is open.

1. **The gate for this document.** The plan asks for one. The two properties of C2-W-002 and C2-W-003 on the corpus and the enumerated sets are the gate of phase 5. A gate for the document itself, such as an example for every canonical form, is not stated.

## Counts

| Section | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| The writer and its two gates | 10 | 0 | 0 | 0 |
| What the writer cannot spell | 10 | 0 | 0 | 0 |
| Layout | 21 | 3 | 0 | 0 |
| Canonical forms: blocks | 27 | 0 | 0 | 0 |
| Canonical forms: tables | 10 | 0 | 1 | 0 |
| Canonical forms: inline | 15 | 1 | 0 | 0 |
| The sidecar | 5 | 0 | 0 | 0 |
| Escaping | 13 | 0 | 1 | 0 |
| `carve fmt` | 3 | 0 | 3 | 2 |
| Diagnostics and lint | 10 | 0 | 0 | 0 |
| **Total** | **122** | **4** | **5** | **2** |

The document has 122 clauses, 4 of them marked with the word "Exception", and 7 examples, 5 generated and 2 unverified. The clause count includes the exceptions. Clauses added after the first draft carry the next free number and stand at the end of their section, so the ids are not in document order everywhere.
