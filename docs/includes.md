---
title: "File inclusion"
description: "The {{ … }} include directive in Carve 0.2: syntax, selections, the host resolver, references across files, failures, limits, dependencies and security."
---

# File inclusion

For the authoring workflow, start with [Include files](./include-files). This
page explains the processor rules with examples.

The normative text is the
[0.2 includes specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md)
(clauses `C2-N-001` to `C2-N-088`). The shape of the directive is defined by the
[block chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md)
(`C2-B-156`, `C2-B-201` to `C2-B-206`). This page cites those clauses and does
not add to them; where the two differ, the specification wins. The table of
failure causes, the option list and the limits are data files:
[`data/includes.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/includes.json),
[`data/include-options.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/include-options.json)
and [`data/limits.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/limits.json).

## What an include is

An include directive, <code v-pre>{{ path }}</code> alone on its line, is a
block. When the parse has a resolver, the directive's file is parsed as a
document of its own and its blocks become the children of the `include` node,
which stays where the directive stood (`C2-N-015`, `C2-N-016`). Nothing is
spliced as source text, so an included file can neither complete nor
interrupt a construct of the file that includes it.

- **Block only.** There is no inline include. <code v-pre>{{ … }}</code> in a
  sentence, a heading, a table cell or on a lazy paragraph line is text, and no
  resolver ever sees it (`C2-N-002`):

  ```carve
  See {{ snippet.crv }} here.
  ```

  ```html
  <p>See {{ snippet.crv }} here.</p>
  ```

- **Part of the parse.** Expansion runs after the top-level document is parsed
  and before references resolve. A tree that was expanded lists
  `includeExpansion` in its root `stages` (`C2-N-006`).
- **No resolver, no expansion.** A library call without a resolver expands
  nothing; each include stays unexpanded and reports `include-no-resolver`
  (`C2-N-003`).
- **Inert in code.** A directive inside a code span or a code block is code
  content. The payload of a code include is not read as Carve either, so a
  directive in it is never expanded (`C2-N-042`).

## Directive syntax

```
{{ path }}
{{ path #section }}
{{ path @key:value }}
{{ path #section @key:value @key }}
{{ "my chapter.crv" #intro @shift:1 }}
{{ path#section@shift:1 }}
```

- **Padding.** <code v-pre>{{</code>, one or more spaces, the path, an optional section, any
  options, one or more spaces and `}}`, with only spaces and tabs after it on
  the line. A tab right after <code v-pre>{{</code> makes the line text (`C2-B-201`).
- **Path.** A bare path stops at a space, `#`, `@`, `}` or a quote. A path with
  spaces is double-quoted; inside the quotes a backslash before ASCII
  punctuation is dropped and before anything else stays, so `"a\.crv"` names
  `a.crv` and `"notes\new.crv"` names `notes\new.crv`. A path in curly quotes is
  read as written. An empty path makes the line text and reports
  `empty-include-path` (`C2-B-202`).
- **Section.** `#name` names a heading or a block of the included file by its
  id. The name is an ASCII letter, digit or `_`, then letters, digits, `_` and
  `-`, so `#2024-plan` works (`C2-B-203`).
- **Options.** `@key` or `@key:value`. The space before a section or an option
  is optional, and an unquoted value ends at the next `@`, so
  `@shift:1@lines:1-8` is two options. A quoted value may hold `@`, spaces and
  `}}` (`C2-B-204`).
- **The closer** is the first `}}` outside a quoted path or value (`C2-B-201`).

The six option keys are `lines`, `region`, `rows`, `cols`, `shift` and `code`
(`C2-B-205`):

| Option | Kind | Value |
|---|---|---|
| `@lines:N-M` | selection | physical lines `N` to `M`, both included |
| `@region:name` | selection | the lines between two named markers |
| `@rows:N-M` | selection | records of a CSV or TSV table include |
| `@cols:N-M` or `@cols:"A,B"` | transform | table columns by number or by head name |
| `@shift:N` or `@shift:auto` | transform | a heading-level shift |
| `@code` or `@code:lang` | mode | the selection as one code block |

An option is **invalid** when its key is not one of the six, its value has the
wrong shape, a needed value is missing, or the key already stood earlier in the
directive. <code v-pre>{{ a.js @lines:1-1 @lines:3-3 }}</code> is invalid; the later value does
not win. The node keeps the option as written, `include-option-invalid`
reports it, and the include is not expanded (`C2-B-206`, `C2-N-025`). An invalid
option never drops out of a selection: <code v-pre>{{ a.crv @lines:5-2 }}</code> does not read
the whole file.

### Which options combine

A directive uses at most one selection: `#section`, `@lines`, `@region` or
`@rows`. A section excludes `@code`, and `@rows` and `@cols` need a code include
whose language is `csv` or `tsv` and whose attributes carry the `table` flag.
Breaking one of these rows of `conflicts` in `data/includes.json` reports
`include-selection-conflict` and leaves the include unexpanded (`C2-N-024`).
Without a selection the include takes the whole file, and without `@code` it is
read as Carve (`C2-N-026`).

## Selections

### Section (`#name`)

The name is matched against the included file's own parse, before that file's
includes expand and before its ids meet any other file's, exactly and with case
(`C2-N-027`). Two steps, the first that matches wins (`C2-N-028`):

1. **A heading** whose id is the name, authored or generated, selects its
   section: the heading and the blocks after it up to the next heading of the
   same or a higher level, bounded by the heading's container.
2. **A block** with the authored id selects that block alone, with its
   attributes.

`recipes.crv`:

````
= Pizza

{#dough}
```text
500 g flour
325 g water
```
````

```carve
{{ recipes.crv #dough }}
```

```html
<pre id="dough"><code class="language-text">500 g flour
325 g water
</code></pre>
```

An id on an inline node, a list item, a table row or cell, a term or a footnote
selects nothing (`C2-N-029`). A section that selects nothing reports
`include-section` and the include stays unexpanded (`C2-N-030`). The
definitions of the file that the selection did not take are appended to the
children, so references in the selected blocks resolve against the whole file
(`C2-N-031`).

### Lines (`@lines:N-M`)

`@lines` selects physical lines, counted from 1, both ends included. A final
line ending begins no further line, and a leading byte order mark is not
content, so an empty file has no lines (`C2-N-034`). A range that ends past the
last line stops there; one that starts past it reports
`include-lines-out-of-range` (`C2-N-035`).

The selected lines are parsed as a document of their own, and their positions
keep the line numbers of the file. A slice that cuts a fence, a list or a div
ends that construct at the end of the slice (`C2-N-020`, `C2-N-036`). Frontmatter
opens only when the selection starts at line 1 of the file, and the file's
definitions outside the slice are appended as for a section (`C2-N-020`).

### Region (`@region:name`)

`@region:name` selects the lines strictly between an opening and a closing
marker; the marker lines themselves are not selected (`C2-N-037`). Which markers
count depends on the mode, so that a marker never shows in the file that holds
it:

- **Read as Carve** (no `@code`), only the line comment counts:
  `%% #region name` and `%% #endregion`, with an optional name (`C2-N-038`,
  `C2-B-217`). A marker renders nothing. A bare `#region` line or a
  `// #region` line is text in a Carve file.
- **A code include** recognizes the folding comments editors use, each alone
  on its line (`C2-N-039`):

  | Marker | Typical languages |
  |---|---|
  | `#region name` | Python, Ruby, shell, YAML |
  | `// #region name` | JavaScript, TypeScript, C family, Rust, Go, PHP |
  | `-- #region name` | SQL, Lua |
  | `/* #region name */` | CSS, C block comments |
  | `<!-- #region name -->` | HTML, XML |
  | `%% #region name` | Carve |

The keywords are case-sensitive, a `%%%` line is a comment fence and no marker,
`#regional` is no marker and `#region-x` is a malformed one (`C2-N-040`). Distinct
names may nest, a name opens at most once per file, and a closer may omit the
name. A malformed, unmatched, unclosed or repeated marker, or a name the file
does not open, reports `include-region-invalid` (`C2-N-041`).

## Code includes (`@code`)

With `@code:lang` the include has one child: the code block an authored fence
with that language would give, whose content is the selected source
(`C2-N-042`). A bare `@code` gives no language; none is guessed from the file
name. `src/server.js`:

```
import http from 'node:http'

// #region start
const server = http.createServer(handler)
server.listen(3000)
// #endregion start
```

<!-- carve-sample {"fmtSkip":"the pinned engine predates the C2-W-058 order"} -->
```carve
{{ src/server.js @code:js @region:start }}
```

```html
<pre><code class="language-js">const server = http.createServer(handler)
server.listen(3000)
</code></pre>
```

- **Payload.** One line per selected line, each ended by a line feed, as in an
  authored fence. A CRLF becomes a line feed, a missing final line ending is
  added, and a leading byte order mark is dropped (`C2-N-043`).
- **Position.** The child's `pos` is in the included file, from column 1 of the
  first selected line to the end of the last one, without its line ending
  (`C2-N-044`).
- **Attributes and captions.** The attribute line above the directive applies
  to the code block, and a caption line below a code include captions it, as on
  an authored fence (`C2-N-071`, `C2-N-073`). On an include without `@code`, the
  attributes do nothing and `include-attributes-unused` reports them, and a
  caption below it is text (`C2-N-072`, `C2-N-073`).
- **Shift** has no effect on a code include (`C2-N-051`).

### Tables from CSV and TSV

With the `table` flag and the language `csv` or `tsv`, the child is the
delimited table such a fence gives, with bad quoting reported as on an authored
fence (`C2-N-045`). `data/plans.csv`:

```
Plan,Seats
Starter,1
"Team, annual",10
```

```carve
{table}
{{ data/plans.csv @code:csv }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Plan</th><th scope="col">Seats</th></tr>
  </thead>
  <tbody>
    <tr><td>Starter</td><td>1</td></tr>
    <tr><td>Team, annual</td><td>10</td></tr>
  </tbody>
</table>
```

- **`@rows:N-M`** counts the parsed records of the whole file from 1, header
  records included; a quoted field with line breaks is one record. The head
  (`header-rows`, one by default) and the foot (`footer-rows`, none by default)
  always come from the whole file, and a selection chooses only body records.
  A range that starts past the last record reports `include-rows-out-of-range`
  (`C2-N-046`).
- **`@lines`** on a table include chooses whole records whose first line lies
  in the range, so a quoted field is never cut, and lint adds the hint
  `include-lines-table-rows-hint` (`C2-N-046`, `C2-N-088`).
- **`@cols:"Seats,Plan"`** takes the columns with those head names, in that
  order. A missing or doubled head name reports `include-cols-invalid`, a name
  requested twice `include-cols-duplicate`. A numeric `@cols:1-3` needs
  `header-rows=0` (`C2-N-047`).
- A region marker line outside a quoted field is never a record (`C2-N-046`).

## Heading-level shift (`@shift`)

`@shift:N` adds `N` to the level of every heading among the include's
children, at every depth. A level that would leave 1 to 6 is set to the nearest
bound, the heading is kept, and `include-heading-clamp` reports it. A shift
changes no text and no id, so a cross-reference into a shifted heading still
resolves (`C2-N-048`).

`@shift:auto` computes `N = (C + 1) - T` (`C2-N-049`):

- `C` is the level of the nearest heading before the include in its own
  container or in a container around it; a heading inside a sibling container
  that closed before the include does not count. With no such heading, `C` is 0.
- `T` is the lowest heading level among the children, after selection and
  after the includes inside them expand.
- Children without a heading make `auto` a no-op, with no report.

`chapter-one.crv` opens with `= Chapter One`, so `T = 1`; the directive stands
under a level-2 heading, so `C = 2` and `N = 2`:

```carve
== Chapters

{{ chapter-one.crv @shift:auto }}
```

```html
<section id="Chapters">
  <h2>Chapters</h2>
  <section id="Chapter-One">
    <h3>Chapter One</h3>
    <p>Text of the chapter.</p>
  </section>
</section>
```

Shifts apply once the tree is expanded, an include before the includes inside
it, so a nested `auto` reads the levels its ancestors already shifted and is not
shifted twice (`C2-N-050`).

## Expansion

- **A whole document.** An included file is parsed with the parse options of
  the top-level document, as a document of its own: its own depth limits, its
  own frontmatter, and a construct open at its end closes there. An unclosed
  fence in a child ends at the end of the child and reports
  `unclosed-code-fence` there; it never swallows the parent (`C2-N-015`).
- **Metadata blocks** of an included file stay in source order among the
  include children and render nothing. A leading frontmatter block is the first
  child; later typed blocks remain in their positions. None becomes metadata of
  the top-level document (`C2-N-021`).
- **Recursive, in tree order.** Includes in an included file expand the same
  way, each path relative to its own including file. The resolver is called and
  the size cap is charged in tree order (`C2-N-018`).
- **Positions are local.** Every node an included file produced carries
  `pos.file`, the id the resolver returned, and lines, columns and offsets
  counted in that file. The include node is positioned in the file that holds
  the directive. Nothing is mapped into the offsets of the including file
  (`C2-N-019`). With `sourceLines` on, `data-source-line` is the line in the
  element's own file (`C2-N-076`).
- **In a container.** A directive may be the only block of a list item, a
  description or a quote. List spacing is decided in the including file, so
  blank lines inside the included file do not make the list loose (`C2-N-022`).
- **The node.** An include carries `file` whenever the resolver returned a text,
  and `children` exactly when it was expanded. Both are resolution results, so
  tree equality skips them (`C2-N-017`).

### Rendering

An expanded include renders its children and nothing else: no wrapper element,
no attribute of its own. Section wrapping, the one-line forms of items and
quotes and the placement of the footnote section all read the children in the
include's place, so a heading in a child opens a section that takes the blocks
of the including file after it (`C2-N-075`).

An unexpanded include renders the directive as text in a paragraph and reports
the render loss `include-unresolved`, whatever the cause (`C2-N-070`):

<!-- carve-sample {"lint":"the include target does not exist on purpose"} -->
```carve
Text.

{{ missing.crv }}
```

```html
<p>Text.</p>
<p>{{ missing.crv }}</p>
```

The parse reports `include-not-found`, the render `include-unresolved`. With
`strictLosses` on, such a render returns no output (`C2-N-078`). Under the
`comment` and `minimal` profiles an include is outside the profile and is
written as its directive text (`C2-N-077`).

## References across files

Expansion merges every file into one tree, and ids and definitions follow the
rules of a single document over that tree. Nothing is renamed: Carve 0.1
renamed a repeated id or footnote label to `-2` with a Warning, and 0.2 dropped
that rename (see the [upgrade guide](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md)).
The clauses are `C2-N-053` to `C2-N-060` in the
[includes specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md#references-across-files).

### Authored ids are never renamed

An authored `{#id}` keeps its spelling in every file (C2-N-057). An id that
stands in two files is a duplicate id, the same as one that stands twice in one
file (C2-N-058):

- both elements are written with the id;
- `duplicate-id` reports the later occurrence (C2-A-039);
- a cross-reference `</#id>`, a link to `#id` and a link reference that
  resolves to a heading reach the **first** occurrence in document order, also
  when they stand in the file that holds the later one.

Ids are one namespace across element types, as HTML has one `id` namespace per
document, and they compare exactly, case included: `{#Tip}` and `{#tip}` are
two ids.

```carve
%% child.crv

{#tip}
Rest it overnight.

[The tip above](#tip) is the one this file wrote.
```

<!-- carve-sample {"lint":"the child repeats the parent's id on purpose"} -->
```carve
%% parent.crv

{#tip}
Keep the dough cold.

{{ child.crv }}
```

```html
<p id="tip">Keep the dough cold.</p>
<p id="tip">Rest it overnight.</p>
<p><a href="#tip">The tip above</a> is the one this file wrote.</p>
```

`id="tip"` appears twice, `duplicate-id` reports the paragraph of `child.crv`,
and the child's link reaches the parent's paragraph, not the one the child
wrote. The output is invalid HTML until the author gives each id one name across
the files.

An include's own attributes take part in none of this: its id is no anchor and
is not counted as a duplicate (`C2-N-072`).

### Generated heading ids get suffixes

A heading id that comes from the heading's text is not an authored id. After
expansion the authored ids of every file are reserved first, in document order,
and then the generated ids follow in document order with the suffixes `-2`,
`-3` and so on (C2-N-057, C2-H-024). No Warning is reported: two chapters
opening with the same heading text are an ordinary shape for a book.
`chapter.crv` opens with `= Chapter`:

```carve
= Chapter

{{ chapter.crv }}
```

```html
<section id="Chapter">
  <h1>Chapter</h1>
</section>
<section id="Chapter-2">
  <h1>Chapter</h1>
  <section id="Section">
    <h2>Section</h2>
    <p>Text of the chapter.</p>
  </section>
</section>
```

A section include selects by the id the heading has in its own file, before it
meets the ids of other files (C2-N-027), so a heading selected as `#Chapter`
may be written as `Chapter-2` after expansion (C2-N-032).

### Definitions resolve in their own file, then outward

Link reference definitions, footnotes and abbreviations are never renamed
either. A reference looks up its definition in its own file first, then in the
file that includes it, then in each file further out up to the top-level
document (C2-N-054, C2-N-055, C2-N-023). The first file that defines the key
decides. A link reference that no file defines then falls back to the headings
of the whole tree (C2-N-054).

A definition never reaches **inward**: a reference in the including file does
not see a definition of a file it includes. Define a note in the document that
cites it, or in a file that includes that document.

Two files may each define the same key. They are two definitions, not a
duplicate, and nothing is reported (C2-N-060). `child.crv`:

<!-- carve-sample {"includes":"definitions"} -->
```carve
%% child.crv

See [a][] and the note.[^n]

[a]: /CHILD

[^n]: The child's note.
```

<!-- carve-sample {"includes":"definitions"} -->
```carve
%% parent.crv

See [a][] and the note.[^n]

[a]: /PARENT

[^n]: The parent's note.

{{ child.crv }}
```

```html
<p>See <a href="/PARENT">a</a> and the note.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>See <a href="/CHILD">a</a> and the note.<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>The parent’s note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>The child’s note.<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

Each `[a][]` resolves to its own file's definition, and each footnote reference
reaches the note of its own file. Footnotes are numbered once over the expanded
tree, in the order of their first reference, and one footnote section collects
the notes of every file (C2-N-056). Caption and equation numbers are counted
over the expanded tree the same way (C2-N-059).

## The resolver

The parser reads no files. The host gives it a **resolver**, a function that
receives the decoded path, the section name, the valid options and the id of
the including file, and returns either the text of the target and an id for it,
or one cause: `not_found`, `outside_root`, `unreadable` or `non_text`
(`C2-N-007`). It returns the whole target; the processor applies every
selection itself (`C2-N-008`).

- **Identity.** Two spellings that reach one target give one id, so `a/b.crv`
  and `a/./b.crv` are one id. The cycle check, `pos.file` and the node's `file`
  all use it (`C2-N-009`).
- **Relative to the including file**, never to the root or a working directory
  (`C2-N-010`).
- **Text only.** Content is text when it is well-formed UTF-8 without U+0000;
  anything else is `non_text`, and no byte is replaced (`C2-N-011`). Images use
  `![]()`, not an include.

The path is an opaque target string. A host whose documents live in a database,
an object store or an in-memory map implements the same contract as one that
reads files; it still owes a stable id per target and containment in its own
namespace.

### The command-line resolver and its root

A command-line tool expands by default when it reads its entry document from a
file and writes any target other than Carve source. Its containment root is the
directory of the entry file, as a canonical path. It offers a way to turn
expansion off and a way to name another root. With the entry read from standard
input there is no default root, and nothing expands unless the caller names one
(`C2-N-004`).

The file resolver resolves the path against the including file's directory,
canonicalizes it with every symbolic link resolved, and returns `outside_root`
unless the result lies inside the canonical root. A `..` segment is fine when
the result stays inside; a path that starts with a URI scheme is always
`outside_root`, so nothing remote is fetched (`C2-N-012`).

```
book/            <- root (the directory of main.crv)
  main.crv
  chapters/one.crv
  shared/glossary.crv
```

From `chapters/one.crv`, <code v-pre>{{ ../shared/glossary.crv }}</code> reads the glossary, and
<code v-pre>{{ ../../etc/passwd }}</code> gives `outside_root`. One expansion has one root: a
nested include resolves against its own file but is tested against the root of
the top-level document. A configured root must be absolute; a relative one is
refused and expansion stays off (`C2-N-014`).

## Failures and limits

Every failure leaves the include unexpanded and reports one code, a warning at
the include node. Causes are tested in the order of `causes` in
`data/includes.json`, and the first that applies is the one reported
(`C2-N-061`):

| Cause | Code | Clause |
|---|---|---|
| no resolver given | `include-no-resolver` | `C2-N-003` |
| an invalid option | `include-option-invalid` | `C2-N-025` |
| options that may not combine | `include-selection-conflict` | `C2-N-024` |
| the file would stand deeper than 16 | `include-depth` | `C2-N-064` |
| the size cap is already spent | `include-budget` | `C2-N-065` |
| the target lies outside the root | `include-outside-root` | `C2-N-012`, `C2-N-013` |
| no target exists | `include-not-found` | `C2-N-013` |
| the target cannot be read | `include-unreadable` | `C2-N-013` |
| the content is not text | `include-non-text` | `C2-N-011` |
| an include cycle | `include-cycle` | `C2-N-066` |
| the text would pass the size cap | `include-budget` | `C2-N-065` |
| the section selects nothing | `include-section` | `C2-N-030` |
| bad or missing region markers | `include-region-invalid` | `C2-N-041` |
| a line range past the last line | `include-lines-out-of-range` | `C2-N-035` |
| a row range past the last record | `include-rows-out-of-range` | `C2-N-046` |
| a missing or doubled column name, a bad range | `include-cols-invalid` | `C2-N-047` |
| a column named twice | `include-cols-duplicate` | `C2-N-047` |

The first five are tested before the resolver is called and leave the node
without `file`. A cause the resolver returns also leaves no `file`. Every cause
after the resolver returned a text leaves `file` on the node: the file was read
(`C2-N-062`). A heading clamp under `@shift` is the one report that keeps the
expansion (`C2-N-048`).

- **Depth.** The top-level document stands at depth 0. A file deeper than
  `include_depth`, 16, is not resolved. A host may lower the limit, never raise
  it (`C2-N-064`).
- **Size.** The sum of the UTF-8 bytes of every text the resolver returns is
  capped at `include_bytes`, 8388608, the same file counted each time it is
  read. Once the cap is reached, every later include is refused before its
  resolver is called. A host may lower the cap, never raise it (`C2-N-065`).
- **Cycles.** An include whose id is the top-level document or the `file` of an
  include around it is refused, so a file that includes itself is read once on
  that chain (`C2-N-066`).
- **Work.** Each directive is at least seven bytes, so the two limits also bound
  the resolver calls; there is no separate call limit (`C2-N-067`).
- **Messages** name the path as the directive wrote it and never repeat a path
  or an error text from the resolver, so host paths do not leak (`C2-N-068`).
  Past 100 entries, failures are counted and not listed (`C2-N-061`).

## Writing Carve back out

A processor whose output is Carve source does not expand, with or without a
resolver: `carve fmt` and a render to the Carve target return the directive as
the author wrote it and report no `include-no-resolver` (`C2-N-005`). A Carve
writer writes an include as its directive, with its attribute line and caption,
and never writes the children or `file` (`C2-N-080`). Because tree equality skips
both, `parse(fmt(x)) == parse(x)` holds whether or not either side was expanded
(`C2-N-081`).

With `roundtrip` on, an expanded include still writes only its children, so an
import of that HTML gives the included blocks in place of the directive; the
render reports `include-expanded-roundtrip` (`C2-N-079`).

## Dependencies

The dependencies of a document are the include nodes of its tree, in tree order.
Each names its path as written, its including file, and whether it was read: a
node with `file` was read, one without was not (`C2-N-083`). With no resolver,
every directive is a dependency that was not read.

A host that watches files watches the distinct `file` values, and for each node
without `file` the place its path would name relative to its including file
(`C2-N-084`). Watching the unread targets matters: creating a file that was
missing has to refresh a preview.

## Linting included content

A linter expands includes when its caller gives a resolver or a root, with the
same rules and limits; without one it reads no target, and each include
reports `include-no-resolver` (`C2-N-085`). The top-level document is linted as
it is, and every Carve include the expansion accepted is linted with every rule
over the source it parsed: the whole file, the line range or the region. For a
section the whole file is linted and only the findings on the selected lines are
kept. Rules that read a block's payload also run on a code include's child
(`C2-N-086`).

A finding in included content names its file by id, a line and a column in that
file, and the tree path through the includes that reached it. Each distinct
file, line, column and rule is reported once (`C2-N-087`). Given
`data/plans.csv`:

~~~text
Plan,Seats,Price
Starter,1,"$0"
Team,10,"$49 billed yearly
~~~

and `doc.crv`:

<!-- carve-sample {"includes":"malformed-csv","lint":"shows delimited-table-malformed in an included file"} -->
~~~carve
{table}
{{ data/plans.csv @code:csv }}
~~~

the linter reports `delimited-table-malformed` in `data/plans.csv` at line 3,
the record whose quote is never closed, reached from the directive on line 2
of `doc.crv`.

## Security

- **The parser stays pure.** Without a resolver nothing is read.
- **Containment is canonical.** The resolver canonicalizes the target, symbolic
  links included, before it tests the root. Rejecting `..` by its spelling is
  wrong both ways: it refuses `../shared/glossary.crv` inside the project and
  misses a symbolic link that leaves it (`C2-N-012`).
- **No existence oracle.** The root test comes before any test of existence,
  so a target outside the root is `outside_root` whether or not it exists
  (`C2-N-013`).
- **Test what you open.** The file the resolver reads is the file it tested: it
  compares the identity of the open handle with the tested path, or opens each
  segment from a handle of the root. A platform that offers neither serves the
  files from a store that cannot change during the expansion (`C2-N-013`).
- **No relaxed rules for included content.** One `urlPolicy`, one `rawHtml`
  setting, one profile and every sanitizing rule apply to the whole expanded
  tree (`C2-N-069`).

See also the [Security](./security#file-inclusion) page.

## Editor and host guidance

This section is guidance, not a rule of the specification.

- **Local editors** (`vscode-carve`, `intellij-carve` and the others) should
  expand includes only in a trusted workspace, and should root containment at
  the workspace rather than the document's directory. In an untrusted
  workspace, show that includes are off instead of rendering the directive as
  plain text without comment.
- **Browser hosts** (`carve-components`, the playground) have no file system.
  They can offer an in-memory resolver that maps names to sources.
- **Server-side rendering of user content** (CMS and shop fields such as
  `wp-carve` or `shopware-carve`) should keep includes off. A resolver there is
  a file-disclosure risk; if it is ever offered, make it an administrator-only
  option with an explicit root.
- **Live preview.** Watch every dependency, read or not (see
  [Dependencies](#dependencies)), show the include failures as diagnostics, use
  `pos.file` to jump to the right file, and cache child parses by id and
  modification time.
- **Implement it once** in the language server (`carve-lsp`): its workspace root
  is the natural containment root, and the thin editor integrations get
  includes and their diagnostics for free.
