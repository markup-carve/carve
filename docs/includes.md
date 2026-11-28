---
title: "File inclusion"
description: "The {{ … }} include directive in Carve 0.2: syntax, selections, code and table includes, heading shifts, the host resolver, references across files, failures, limits, dependencies, lint and security."
---

# File inclusion

For the authoring workflow, start with [Include files](./include-files). This
page explains the processor rules with examples: what a directive may hold,
what it selects, how the included file becomes part of the document, how ids
and definitions behave across files, what fails, and what a host has to do to
read files safely.

The page follows the 0.2 includes specification and cites its clauses
(`C2-N-…`) and those of the block chapter (`C2-B-…`) that define the shape of
the directive. It does not add rules; where the two differ, the specification
wins. The links into the specification are collected at the end of the page.
Every example on this page was rendered by the reference engine with the
include root set to a folder that holds the files the example names.

## What an include is (and is not)

An include directive, <code v-pre>{{ path }}</code> alone on its line, is a
block. When the parse has a resolver, the directive's file is parsed as a
document of its own and its blocks become the children of the `include` node,
which stays where the directive stood (`C2-N-015`, `C2-N-016`). Nothing is
spliced as source text, so an included file can neither complete nor
interrupt a construct of the file that includes it.

- **Block only.** There is no inline include. <code v-pre>{{ … }}</code> in a
  sentence, a heading, a table cell or on a lazy paragraph line is text, and no
  resolver ever sees it (`C2-N-002`):

  ::: compare
  ```crv
  See {{ snippet.crv }} here.
  ```

  ```html
  <p>See {{ snippet.crv }} here.</p>
  ```
  :::

- **Part of the parse.** Expansion runs after the top-level document is parsed
  and before references resolve. A tree that was expanded lists
  `includeExpansion` in its root `stages`, also when the document holds no
  include (`C2-N-006`).
- **No resolver, no expansion.** A library call without a resolver expands
  nothing; each include stays unexpanded and reports `include-no-resolver`
  (`C2-N-003`). This is the default, and it keeps a browser or sandboxed build
  inert without any extra setting.
- **Text only.** An include brings in Carve, or with `@code` the text of a
  source file. A target that is not well-formed UTF-8, or holds U+0000, is
  refused as non-text. Images use `![]()`, not an include (`C2-N-011`).
- **Inert in code.** A directive inside a code span or a code block is code
  content and is never resolved. The payload of a code include is not read as
  Carve either, so a directive in it is never expanded (`C2-N-042`). To show a
  directive on a page, put it in code:

  ::: compare
  ````crv
  ```
  {{ snippet.crv }}
  ```

  The span `{{ snippet.crv }}` is code too.
  ````

  ```html
  <pre><code>{{ snippet.crv }}
  </code></pre>
  <p>The span <code>{{ snippet.crv }}</code> is code too.</p>
  ```
  :::

## Directive syntax

```
{{ path }}
{{ path #section }}
{{ path @key:value }}
{{ path #section @key:value @key }}
{{ "my chapter.crv" #intro @shift:1 }}
{{ path#section@shift:1 }}
```

- **Padding.** <code v-pre>{{</code>, one or more spaces, the path, an
  optional section, any options, one or more spaces and `}}`, with only spaces
  and tabs after it on the line. At least one space is needed on each side, so
  <code v-pre>{{path}}</code> is text. More than one space changes nothing. The
  padding is spaces only: a tab right after <code v-pre>{{</code> makes the
  line text (`C2-B-201`).
- **Path.** A bare path stops at a space, `#`, `@`, `}` or a quote. A path with
  spaces is double-quoted; inside the quotes a backslash before ASCII
  punctuation is dropped and before anything else stays, so `"a\.crv"` names
  `a.crv` and `"notes\new.crv"` names `notes\new.crv`. A path in curly quotes is
  read as written. An empty path makes the line text and reports
  `empty-include-path` (`C2-B-202`). The path is resolved relative to the
  including file; see [The resolver](#the-resolver).
- **Section.** `#name` names a heading or a block of the included file by its
  id. The name is an ASCII letter, digit or `_`, then letters, digits, `_` and
  `-`, so `#2024-plan` works (`C2-B-203`). The name ends at the first character
  it cannot hold, which is how an option can follow it with no space.
- **Options.** `@key` or `@key:value`. The space before a section or an option
  is optional, and an unquoted value ends at the next `@`, so
  `@shift:1@lines:1-8` is two options. A quoted value may hold `@`, spaces and
  `}}`. Outside `@cols`, quoting a value only delimits it: `@lines:"1-2"` is
  `@lines:1-2` (`C2-B-204`).
- **The closer** is the first `}}` outside a quoted path or value
  (`C2-B-201`). Each of these lines is one directive, because the `}}` inside
  the quotes belongs to the path or the value:

  ```
  {{ "a }} more" @shift:1 }}
  {{ ch.crv @cols:"a }} more" }}
  ```

  Anything other than spaces and tabs after the closer makes the whole line
  text.

`carve fmt` writes every directive in one canonical spelling: one space of
padding, a space before the section and each option, a path without quotes
when it needs none, and the options in the order `code`, `lines`, `region`,
`rows`, `cols`, `shift`. So <code v-pre>{{ chapter.crv#Section@shift:1 }}</code>
is written back as <code v-pre>{{ chapter.crv #Section @shift:1 }}</code>.

A directive with a section and no path, such as
<code v-pre>{{ #intro }}</code>, is reserved for a later version. It is text
today, and lint reports it as `reserved-syntax` (`C2-N-089`):

<!-- carve-sample {"lint":"the reserved section-only shape is reported on purpose"} -->
::: compare
```crv
{{ #intro }}
```

```html
<p>{{ #intro }}</p>
```
:::

### Options

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

A range `N-M` is two decimal numbers without a leading zero, the first at
least 1 and not greater than the second. A shift is `auto` or an integer of one
to nine digits with an optional sign. A language is ASCII letters, digits and
`-`, `_`, `+`, `#`, `.`, `/`.

An option is **invalid** when its key is not one of the six, its value has the
wrong shape, a needed value is missing, or the key already stood earlier in the
directive. <code v-pre>{{ a.js @lines:1-1 @lines:3-3 }}</code> is invalid; the
later value does not win. A bare `@code` and `@code:lang` are the same key. The
node keeps the option as written, `include-option-invalid` reports it, and the
include is not expanded (`C2-B-206`, `C2-N-025`). An invalid option never drops
out of a selection: <code v-pre>{{ recipes.crv @lines:5-2 }}</code> does not
read the whole file.

<!-- carve-sample {"lint":"the reversed range is an invalid option on purpose"} -->
::: compare
```crv
{{ recipes.crv @lines:5-2 }}
```

```html
<p>{{ recipes.crv @lines:5-2 }}</p>
```
:::

### Selection, transform and mode

Options fall into three kinds, and the kind decides how they combine:

- **Selections** choose which content is pulled in: the section `#name` (a
  heading's section or one block), `@lines` and `@region` (physical source
  lines), and `@rows` (parsed records of a table include). The section is
  written without `@` and is no option, but it counts as a selection.
- **Transforms** reshape what was selected: `@shift` (heading levels) and
  `@cols` (table columns).
- **The mode** `@code` decides what the selection becomes: one code block
  instead of Carve.

A directive uses at most one selection. A section excludes `@code`, because a
code include never parses the Carve structure a section names. `@rows` and
`@cols` need a code include whose language is `csv` or `tsv` and whose
attributes carry the `table` flag. `@shift` may go with any selection or none,
and `@cols` with any one selection on a table include. Breaking one of these
rules reports `include-selection-conflict` and leaves the include unexpanded
(`C2-N-024`). Without a selection the include takes the whole file, and without
`@code` it is read as Carve (`C2-N-026`).

<!-- carve-sample {"lint":"two selections conflict on purpose"} -->
::: compare
```crv
{{ recipes.crv #dough @lines:1-2 }}
```

```html
<p>{{ recipes.crv #dough @lines:1-2 }}</p>
```
:::

## Selections

### Section (`#name`)

The name is matched against the included file's own parse, before that file's
includes expand and before its ids meet any other file's, exactly and with case
(`C2-N-027`). Two steps, the first that matches wins (`C2-N-028`):

1. **A heading** whose id is the name, authored or generated, selects its
   section: the heading and the blocks after it up to the next heading of the
   same or a higher level, bounded by the heading's container.
2. **A block** with the authored id selects that block alone, with its
   attributes: a paragraph, list, table, code block, quote, div and so on, at
   any depth.

Within a step the first match in document order wins, and a container comes
before the blocks inside it. A heading match wins over a block match anywhere
in the file.

`recipes.crv`:

````
= Pizza

{#dough}
```text
500 g flour
325 g water
```
````

::: compare
```crv
{{ recipes.crv #dough }}
```

```html
<pre id="dough"><code class="language-text">500 g flour
325 g water
</code></pre>
```
:::

The code block keeps its `id="dough"`. A heading selects its whole section.
`chapter.crv` holds `= Chapter`, then `== Section` and a paragraph:

::: compare
```crv
{{ chapter.crv #Section }}
```

```html
<section id="Section">
  <h2>Section</h2>
  <p>Text of the chapter.</p>
</section>
```
:::

An id on an inline node, a list item, a table row or cell, a term or a footnote
selects nothing, and neither does a block inside a footnote (`C2-N-029`). A
section that selects nothing reports `include-section` and the include stays
unexpanded; the file was still read, so it stays a resolved dependency
(`C2-N-030`). The match is case-sensitive, so `#Dough` finds nothing in
`recipes.crv`:

<!-- carve-sample {"lint":"the section name differs in case on purpose"} -->
::: compare
```crv
{{ recipes.crv #Dough }}
```

```html
<p>{{ recipes.crv #Dough }}</p>
```
:::

The definitions of the file that the selection did not take (link reference,
footnote, abbreviation, citation and snippet definitions) are appended to the
children, so references in the selected blocks resolve against the whole file.
A definition renders nothing on its own, and a footnote nothing references is
not written (`C2-N-031`). The section name decides only what is selected: the
id a selected heading carries after expansion is decided by the merged tree
(`C2-N-032`, see [Generated heading ids get suffixes](#generated-heading-ids-get-suffixes)).
`@shift` composes with a section (`C2-N-033`).

### Lines (`@lines:N-M`)

`@lines` selects physical lines, counted from 1, both ends included. A final
line ending begins no further line, and a leading byte order mark is not
content, so an empty file, and a file that holds only a byte order mark, has no
lines (`C2-N-034`). A range that ends past the last line stops there; one that
starts past it reports `include-lines-out-of-range` (`C2-N-035`).

The selected lines are parsed as a document of their own, and their positions
keep the line numbers of the file. A slice that cuts a fence, a list or a div
ends that construct at the end of the slice (`C2-N-020`, `C2-N-036`). Lines 3 to
5 of `recipes.crv` are the attribute line, the fence opener and the first line
of code, so the fence is cut. It closes at the end of the slice, lint reports
`unclosed-code-fence` in `recipes.crv`, and the paragraph after the directive
stays a paragraph:

<!-- carve-sample {"lint":"the slice cuts the fence of recipes.crv on purpose"} -->
::: compare
```crv
{{ recipes.crv @lines:3-5 }}

After.
```

```html
<pre id="dough"><code class="language-text">500 g flour
</code></pre>
<p>After.</p>
```
:::

Frontmatter opens only when the selection starts at line 1 of the file. A
selection that starts later may still open a typed metadata block, but a bare
`---` on a later line stays ordinary content. The file's definitions outside
the slice are appended as for a section (`C2-N-020`).

### Region (`@region:name`)

`@region:name` selects the lines strictly between an opening and a closing
marker; the marker lines themselves are not selected, and marker lines of
other regions between them stay in (`C2-N-037`). Selecting a region instead of
a line range keeps working when lines are added above it. Which markers count
depends on the mode, so that a marker never shows in the file that holds it:

- **Read as Carve** (no `@code`), only the line comment counts:
  `%% #region name` and `%% #endregion`, with an optional name (`C2-N-038`,
  `C2-B-217`). A marker is a comment and renders nothing. `readme.crv`:

  ::: compare
  ```crv
  = Project

  %% #region requirements

  - PHP 8.3 or later
  - Composer 2.7

  %% #endregion requirements
  ```

  ```html
  <section id="Project">
    <h1>Project</h1>
    <ul>
      <li>PHP 8.3 or later</li>
      <li>Composer 2.7</li>
    </ul>
  </section>
  ```
  :::

  Another file can then include only the list:

  <!-- carve-sample {"lint":"readme.crv is an illustrative path, so the sample root reports include-not-found"} -->
  ```crv
  {{ readme.crv @region:requirements }}
  ```

  A bare `#region` line, a `// #region` line and a braced comment are text in a
  Carve file (a bare `#region` is even read as a tag), so a region they mark
  is not found. Lint reports such a line as
  `region-marker-renders-as-text`, also for a case variant such as `#Region`:

  <!-- carve-sample {"lint":"shows region-marker-renders-as-text"} -->
  ::: compare
  ```crv
  #region requirements
  ```

  ```html
  <p><span class="tag"><strong>#region</strong></span> requirements</p>
  ```
  :::

- **A code include** recognizes the folding comments editors use, each alone
  on its line after optional spaces and tabs (`C2-N-039`):

  | Marker | Typical languages |
  |---|---|
  | `#region name` | Python, Ruby, shell, YAML |
  | `// #region name` | JavaScript, TypeScript, C family, Rust, Go, PHP |
  | `-- #region name` | SQL, Lua |
  | `/* #region name */` | CSS, C block comments |
  | `<!-- #region name -->` | HTML, XML |
  | `%% #region name` | Carve |

  A block comment's closer (`*/`, `-->`) ends the same line.

In both modes (`C2-N-040`, `C2-N-041`):

- The keywords are case-sensitive, so `#Region` is no marker.
- A `%%%` line opens a comment block and is no marker.
- `#regional` is no marker, while `#region-x` is a malformed one.
- Spaces and tabs may stand between the comment opener and the keyword.
- A byte order mark does not hide a marker on line 1.
- Distinct names may nest, a name opens at most once per file, and a closer may
  omit the name.

A malformed, unmatched, unclosed or repeated marker, an opener without a name,
or a name the file does not open, reports `include-region-invalid`; the file
stays a resolved dependency. Combining `@region` with another selection is the
different error `include-selection-conflict`. The selected lines keep their
positions in the file. A region selects from the source and never writes back
to it.

## Code includes (`@code`)

With `@code:lang` the include has one child: the code block an authored fence
with that language would give, whose content is the selected source
(`C2-N-042`). Nothing in it is parsed as Carve. A bare `@code` gives no
language; none is guessed from the file name. `src/server.js`:

```
import http from 'node:http'

// #region start
const server = http.createServer(handler)
server.listen(3000)
// #endregion start
```

::: compare
```crv
{{ src/server.js @code:js @region:start }}
```

```html
<pre><code class="language-js">const server = http.createServer(handler)
server.listen(3000)
</code></pre>
```
:::

`@code` takes the whole file, an `@lines` range or an `@region` region, and
with a table also `@rows`:

::: compare
```crv
{{ src/server.js @code:js @lines:1-1 }}
```

```html
<pre><code class="language-js">import http from 'node:http'
</code></pre>
```
:::

- **Payload.** One line per selected line, each ended by a line feed, as in an
  authored fence. A CRLF becomes a line feed, a lone CR stays content of its
  line, a missing final line ending is added, a selected blank last line keeps
  its line feed, and an empty selection gives an empty code block. A leading
  byte order mark is dropped (`C2-N-043`). Frontmatter lines of the file are
  payload too (`C2-N-021`).
- **Position.** In the tree (`carve ast`), the child's `pos` is in the included
  file, from column 1 of the first selected line to the end of the last one,
  without its line ending (`C2-N-044`).
- **Shift** has no effect on a code include and reports nothing, since the code
  holds no heading (`C2-N-051`).

Resolution, containment, the size cap, cycles, depth and dependencies work as
for any other include.

### Attributes and captions

The attribute line above a directive attaches to the include node, and the
writer writes it back. With `@code` it acts through the child, which carries
the same attributes, as an authored fence does (`C2-N-071`). Extensions that
read a code block read this one too:

::: compare
```crv
{.diff title=server.js}
{{ src/server.js @code:js @region:start }}
```

```html
<pre class="diff" title="server.js"><code class="language-js">const server = http.createServer(handler)
server.listen(3000)
</code></pre>
```
:::

A caption line directly below a code include captions the child, as on an
authored code block or table (`C2-N-073`):

::: compare
```crv
{{ src/server.js @code:js @lines:1-1 }}
^ The import line.
```

```html
<figure>
  <pre><code class="language-js">import http from 'node:http'
</code></pre>
  <figcaption>The import line.</figcaption>
</figure>
```
:::

The caption of an expanded include is not numbered or written itself; its copy
in the child is. The caption of an unexpanded include is written after the
directive's paragraph as one more paragraph (`C2-N-074`).

On an include without `@code` the attributes do nothing: they are not written
to HTML, the include's id is no anchor and is not counted as a duplicate, and
its `lang` and `dir` apply to no child. Lint reports them as
`include-attributes-unused` (`C2-N-072`):

<!-- carve-sample {"lint":"attributes on a Carve include are unused on purpose"} -->
::: compare
```crv
{.note}
{{ snippet.crv }}
```

```html
<p>a <em>short</em> form</p>
```
:::

A caption line below an include without `@code` is text, and lint reports
`unattached-caption` (`C2-N-073`).

### Tables from CSV and TSV

With the `table` flag and the language `csv` or `tsv`, the child is the
delimited table such a fence gives, with bad quoting reported as on an authored
fence (`C2-N-045`). Data whose quoting cannot be read stays a code block, as in
an authored fence. `data/plans.csv`:

```
Plan,Seats
Starter,1
"Team, annual",10
```

::: compare
```crv
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
:::

**`@rows:N-M`** counts the parsed records of the whole file from 1, header
records included; a quoted field with line breaks is one record. The head
(`header-rows`, one by default) and the foot (`footer-rows`, none by default)
always come from the whole file, and a selection chooses only body records, so
a head record inside the range is not repeated. A range that starts past the
last record reports `include-rows-out-of-range`, and an end past it is clipped
(`C2-N-046`):

::: compare
```crv
{table}
{{ data/plans.csv @code:csv @rows:3-3 }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Plan</th><th scope="col">Seats</th></tr>
  </thead>
  <tbody>
    <tr><td>Team, annual</td><td>10</td></tr>
  </tbody>
</table>
```
:::

**`@cols:"Seats,Plan"`** takes the columns with those head names, in that
order, so it may reorder them. A comma or a double quote inside a name is
escaped with a backslash. A requested name the head lacks or holds twice
reports `include-cols-invalid`, a name requested twice
`include-cols-duplicate`. A numeric `@cols:1-3` needs `header-rows=0`
(`C2-N-047`):

::: compare
```crv
{table}
{{ data/plans.csv @code:csv @cols:"Seats,Plan" }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Seats</th><th scope="col">Plan</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Starter</td></tr>
    <tr><td>10</td><td>Team, annual</td></tr>
  </tbody>
</table>
```
:::

- **`@lines`** on a table include chooses whole records whose first line lies
  in the range, so a quoted field is never cut, and lint adds the hint
  `include-lines-table-rows-hint`, which suggests `@rows` (`C2-N-046`,
  `C2-N-088`).
- **`@rows` or `@cols` without a table** (no `{table}`, or a language other
  than `csv` or `tsv`) reports `include-selection-conflict` (`C2-N-024`).
- A region marker line outside a quoted field is never a record, with or
  without `@region`. Inside a quoted field the line is data (`C2-N-046`).

## Heading-level shift (`@shift`)

`@shift:N` adds `N` to the level of every heading among the include's
children, at every depth, the headings of nested includes included. An omitted
`@shift` shifts nothing. With `@shift:2`, the `=` and `==` headings of
`chapter.crv` become `h3` and `h4`:

::: compare
```crv
{{ chapter.crv @shift:2 }}
```

```html
<section id="Chapter">
  <h3>Chapter</h3>
  <section id="Section">
    <h4>Section</h4>
    <p>Text of the chapter.</p>
  </section>
</section>
```
:::

A negative `N` moves headings toward level 1. A level that would leave 1 to 6
is set to the nearest bound, the heading is kept, and `include-heading-clamp`
reports it. This is the one report that keeps the expansion (`C2-N-048`):

<!-- carve-sample {"lint":"the shift clamps a heading on purpose"} -->
::: compare
```crv
{{ chapter.crv @shift:-1 }}
```

```html
<section id="Chapter">
  <h1>Chapter</h1>
</section>
<section id="Section">
  <h1>Section</h1>
  <p>Text of the chapter.</p>
</section>
```
:::

A shift changes no text and no id, so a cross-reference into a shifted heading
still resolves. Section numbering counts the new levels (`C2-N-048`).

### Context-relative shift (`@shift:auto`)

`@shift:auto` computes `N = (C + 1) - T` (`C2-N-049`):

- `C` is the level of the nearest heading before the include in its own
  container or in a container around it; a heading inside a sibling container
  that closed before the include does not count. With no such heading, `C` is 0.
- `T` is the lowest heading level among the children, after selection and
  after the includes inside them expand. Using the lowest level, not the first
  heading's, keeps the included file's own structure.
- Children without a heading make `auto` a no-op, with no report.

`chapter-one.crv` opens with `= Chapter One`, so `T = 1`; the directive stands
under a level-2 heading, so `C = 2` and `N = 2`:

::: compare
```crv
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
:::

Shifts apply once the tree is expanded, an include before the includes inside
it, so a nested `auto` reads the levels its ancestors already shifted and is not
shifted twice (`C2-N-050`).

`auto` lets one chapter file be included at any depth without editing its
heading levels, and since the author writes it at the include site, the
dependence on position is chosen per directive.

## Expansion

- **A whole document.** An included file is parsed with the parse options of
  the top-level document, as a document of its own: its own depth limits, its
  own frontmatter, the same inline syntax, and a construct open at its end
  closes there. An unclosed fence in a child ends at the end of the child and
  reports `unclosed-code-fence` there; it never swallows the parent
  (`C2-N-015`). A slice by lines or by region is parsed the same way.
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
  element's own file (`C2-N-076`). Line and column alone could not tell the
  first line of a child from the first line of the parent; `pos.file` can, and
  it is the same id the dependency list names.
- **The node.** An include carries `file` whenever the resolver returned a text,
  and `children` exactly when it was expanded. An include of an empty file has
  an empty `children` list. Both fields are resolution results, so tree
  equality skips them (`C2-N-017`).

`snippet.crv` holds `a /short/ form`. The tree of a document that includes it,
from `carve ast`, shortened to the include node and its paragraph:

```json
{
  "type": "include",
  "path": "snippet.crv",
  "file": "snippet.crv",
  "pos": {"startLine": 3, "endLine": 3, "startColumn": 1, "endColumn": 18, "startOffset": 6, "endOffset": 23},
  "children": [
    {
      "type": "paragraph",
      "pos": {"startLine": 1, "endLine": 1, "startColumn": 1, "endColumn": 15, "startOffset": 0, "endOffset": 14, "file": "snippet.crv"},
      "children": ["…"]
    }
  ]
}
```

### In a container

A directive may be the only block of a list item, a description or a quote, or
stand among other blocks. The include is then a child of that container, and
its children are read as blocks of that container. List spacing is decided in
the including file, so blank lines inside the included file do not make the
list loose (`C2-N-022`):

::: compare
```crv
- {{ snippet.crv }}
- two

> {{ snippet.crv }}
```

```html
<ul>
  <li>a <em>short</em> form</li>
  <li>two</li>
</ul>
<blockquote><p>a <em>short</em> form</p></blockquote>
```
:::

### Abbreviations reach inward

An included file is parsed with its own abbreviation definitions, and for each
term those do not define, with the definitions of the file that includes it,
then further out up to the top-level document. A term the file defines itself
keeps its own expansion (`C2-N-023`):

::: compare
```crv
{{ snippet.crv }}

*[form]: a shape
```

```html
<p>a <em>short</em> <abbr title="a shape">form</abbr></p>
```
:::

### Rendering

An expanded include renders its children and nothing else: no wrapper element,
no attribute of its own. Section wrapping, the one-line forms of items and
quotes and the placement of the footnote section all read the children in the
include's place (`C2-N-075`). So a heading in a child opens a section that also
takes the blocks of the including file after it. `chapter-2.crv` opens with
`= Chapter Two`:

::: compare
```crv
Intro paragraph.

{{ chapter-2.crv }}

See {{ snippet.crv }} for the short form.
```

```html
<p>Intro paragraph.</p>
<section id="Chapter-Two">
  <h1>Chapter Two</h1>
  <p>Text of the chapter.</p>
  <p>See {{ snippet.crv }} for the short form.</p>
</section>
```
:::

The second directive stands in a sentence, so it is text.

An unexpanded include renders the directive as text in a paragraph and reports
the render loss `include-unresolved`, whatever the cause (`C2-N-070`):

<!-- carve-sample {"lint":"the include target does not exist on purpose"} -->
::: compare
```crv
Text.

{{ missing.crv }}
```

```html
<p>Text.</p>
<p>{{ missing.crv }}</p>
```
:::

The parse reports `include-not-found`, the render `include-unresolved`. With
`strictLosses` on, such a render returns no output (`C2-N-078`). Under the
`comment` and `minimal` [profiles](./profiles) an include is outside the
profile, expanded or not, and is written as its directive text (`C2-N-077`).

## References across files

Expansion merges every file into one tree, and ids and definitions follow the
rules of a single document over that tree. Nothing is renamed: Carve 0.1
renamed a repeated id or footnote label to `-2` with a Warning, and 0.2 dropped
that rename (see the [upgrade guide](./upgrade-0-2#includes)).

### Authored ids are never renamed

An authored `{#id}` keeps its spelling in every file (`C2-N-057`). An id that
stands in two files is a duplicate id, the same as one that stands twice in one
file (`C2-N-058`):

- both elements are written with the id;
- `duplicate-id` reports the later occurrence;
- a cross-reference `</#id>`, a link to `#id` and a link reference that
  resolves to a heading reach the **first** occurrence in document order, also
  when they stand in the file that holds the later one.

Ids are one namespace across element types, as HTML has one `id` namespace per
document, and they compare exactly, case included: `{#Tip}` and `{#tip}` are
two ids.

```crv
%% child.crv

{#tip}
Rest it overnight.

[The tip above](#tip) is the one this file wrote.
```

<!-- carve-sample {"lint":"the child repeats the parent's id on purpose"} -->
::: compare
```crv
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
:::

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
`-3` and so on (`C2-N-057`). No Warning is reported: two chapters opening with
the same heading text are an ordinary shape for a book. `chapter.crv` opens
with `= Chapter`:

::: compare
```crv
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
:::

A section include selects by the id the heading has in its own file, before it
meets the ids of other files (`C2-N-027`), so a heading selected as `#Chapter`
may be written as `Chapter-2` after expansion (`C2-N-032`).

### Definitions resolve in their own file, then outward

Link reference definitions, footnotes and abbreviations are never renamed
either. A reference looks up its definition in its own file first, then in the
file that includes it, then in each file further out up to the top-level
document (`C2-N-054`, `C2-N-055`, `C2-N-023`). The first file that defines the
key decides. A link reference that no file defines then falls back to the
headings of the whole tree (`C2-N-054`).

A definition never reaches **inward**: a reference in the including file does
not see a definition of a file it includes. Define a note in the document that
cites it, or in a file that includes that document.

Two files may each define the same key. They are two definitions, not a
duplicate, and nothing is reported (`C2-N-060`). `child.crv`:

<!-- carve-sample {"includes":"definitions"} -->
```crv
%% child.crv

See [a][] and the note.[^n]

[a]: /CHILD

[^n]: The child's note.
```

<!-- carve-sample {"includes":"definitions"} -->
::: compare
```crv
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
:::

Each `[a][]` resolves to its own file's definition, and each footnote reference
reaches the note of its own file. Footnotes are numbered once over the expanded
tree, in the order of their first reference, and one footnote section collects
the notes of every file (`C2-N-056`). Caption and equation numbers are counted
over the expanded tree the same way (`C2-N-059`).

### Snippets

Snippet names are the one exception to "own file first": they have one
registry over the whole expanded tree, so a snippet use may stand in another
file than its definition, before or after it. The first definition of a name
wins, and a later one reports `duplicate-snippet`. A link or footnote reference
inside a snippet resolves against the file that holds the snippet definition
(`C2-N-090`, `C2-N-092`). See [Snippets](./snippets) for the syntax.

## The resolver

The parser reads no files. The host gives it a **resolver**, a function that
receives the decoded path, the section name, the valid options and the id of
the including file, and returns either the text of the target and an id for it,
or one cause: `not_found`, `outside_root`, `unreadable` or `non_text`
(`C2-N-007`). It returns the whole target; the processor applies every
selection itself. A resolver may read the section and the options, for example
to decide access, but it does not select (`C2-N-008`).

- **Identity.** Two spellings that reach one target give one id, so `a/b.crv`
  and `a/./b.crv` are one id. The cycle check, `pos.file` and the node's `file`
  all use it (`C2-N-009`).
- **Relative to the including file**, never to the root or a working directory
  (`C2-N-010`).
- **Text only.** Content is text when it is well-formed UTF-8 without U+0000;
  anything else is `non_text`, and no byte is replaced (`C2-N-011`).

In the JavaScript engine the resolver goes in the `includes` option of
`parse`, `render` and `lint`. `fileSystemResolver(root)` from
`@markup-carve/carve/node` is the resolver the command line uses; any function
with the same contract works:

```js
import { render } from '@markup-carve/carve'
import { fileSystemResolver } from '@markup-carve/carve/node'

const files = { 'intro.crv': 'Hello from /intro/.\n' }
const resolver = ({ path }) =>
  path in files ? { text: files[path], id: path } : { error: 'not_found' }

render('{{ intro.crv }}\n', { includes: { resolver } })
// <p>Hello from <em>intro</em>.</p>

render(source, { includes: fileSystemResolver('/abs/path/to/book') })
```

The `includes` object may also carry `file`, the id of the top-level document
so that a cycle back to it is caught, and lower values for `depth` and
`bytes`.

### When the medium is not a filesystem

The path is an opaque target string. A host whose documents live in a
database, an object store, a git tree or an in-memory map implements the same
contract as one that reads files, as the map above does. Neither "path" nor
`pos.file` promises a filesystem: to the resolver the path is a key, and
`pos.file` holds whatever id the resolver returned.

What such a host still owes:

- **A stable id per target.** The cycle check compares ids and the dependency
  list publishes them. Two spellings that name one document must return one id,
  or a cycle escapes the check and a preview watches something that never
  changes.
- **Containment in its own namespace.** Turn the request into a canonical
  identity first, then test whether that identity is inside the permitted set;
  never judge the spelling of the request. A tenant, a collection or a key
  prefix plays the part the root plays for files.
- **A limit per target.** The size cap counts the texts the resolver returns,
  so a resolver without a limit of its own reads an oversized record in full
  before the expansion refuses it.
- **Untrusted input.** The path comes from a document, so it must not be
  interpolated into a query, a URL or a command. It is a key to look up.

Everything else belongs to the processor and applies whatever the medium: the
size cap, the depth limit, the cycle check, the diagnostic cap and the rule
that a refused directive stays unexpanded.

### The command-line resolver and its root

`carve render`, `ast`, `lint` and `diagnostics` expand by default when they
read the entry document from a file. The containment root is the directory of
the entry file, as a canonical path. `--include-root <path>` names another
root, and `--no-includes` turns expansion off. With the entry read from
standard input there is no default root, and nothing expands unless the caller
names one; with a named root, the includes of standard input resolve against
that root (`C2-N-004`, `C2-N-010`). `fmt`, `import` and `migrate-ast` never
expand (see [Writing Carve back out](#writing-carve-back-out)).

```sh
carve render book/main.crv > main.html
carve render --include-root . book/main.crv > main.html
carve render --include-root book < book/main.crv
```

The file resolver resolves the path against the including file's directory,
canonicalizes it with every symbolic link resolved, and returns `outside_root`
unless the result lies inside the canonical root. A `..` segment is fine when
the result stays inside, and an absolute path is allowed when it canonicalizes
inside the root. A path that starts with a URI scheme (letters and `:` before
any `/`) is always `outside_root`, so nothing remote is fetched. The library
resolver takes `allowAbsolute: false` to refuse every absolute path; the
command line keeps it on (`C2-N-012`).

```
book/            <- root (the directory of main.crv)
  main.crv
  chapters/one.crv
  shared/glossary.crv
```

From `chapters/one.crv`, <code v-pre>{{ ../shared/glossary.crv }}</code> reads
the glossary, and <code v-pre>{{ ../../etc/passwd }}</code> gives
`outside_root`.

- **One root for the whole expansion.** A nested include resolves against its
  own file but is tested against the root of the top-level document. A root
  that moved with each file would shrink at every level, and a nested chapter
  could never reach a sibling folder of the project (`C2-N-014`).
- **The root is absolute.** A configured root that is not absolute is refused
  and expansion stays off (`C2-N-014`). A relative root has no base but the
  working directory of the process, which may be `/` or a home folder. The
  command line turns `--include-root .` into an absolute path before handing it
  on, which is allowed: the root has to be absolute, not written that way.
- **String input has no default.** A library call that converts a string has
  no document path, so it gets no root and no resolver unless the host gives
  one. An application never gains file access by accident.

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
expansion (`C2-N-048`). A failure inside an included file is reported at the
include node in that file, with `includedBy`, the chain of includes that
reached it (`C2-N-063`).

Several 0.1 codes are gone. A missing, outside or unreadable target, all
`include-unresolved` in 0.1, now report `include-not-found`,
`include-outside-root` and `include-unreadable`, and `include-unresolved` is
only the render loss. `include-duplicate-option`, `include-unknown-option`,
`include-lines-invalid` and `include-rows-invalid` became
`include-option-invalid` (or `include-selection-conflict` for `@rows` without a
table). `include-block-in-inline` and `include-call-limit` have no successor.

- **Depth.** The top-level document stands at depth 0. A file deeper than
  `include_depth`, 16, is not resolved. A host may lower the limit, never raise
  it (`C2-N-064`).
- **Size.** The sum of the UTF-8 bytes of every text the resolver returns is
  capped at `include_bytes`, 8388608 (8 MiB), the same file counted each time it
  is read, so a small file included many times cannot inflate the output
  without bound. Once the cap is reached, every later include is refused before
  its resolver is called. A host may lower the cap, never raise it
  (`C2-N-065`).
- **Cycles.** An include whose id is the top-level document or the `file` of an
  include around it is refused, so a file that includes itself, directly or
  through other files, is read once on that chain (`C2-N-066`).
- **Work.** Each directive is at least seven bytes, so the two limits also bound
  the resolver calls; there is no separate call limit (`C2-N-067`).
- **Messages** name the path as the directive wrote it and never repeat a path
  or an error text from the resolver, so host paths do not leak (`C2-N-068`).
  Past 100 entries, failures are counted and not listed (`C2-N-061`).

## Writing Carve back out

A processor whose output is Carve source does not expand, with or without a
resolver: `carve fmt` and a render to the Carve target return the directive as
the author wrote it and report no `include-no-resolver` (`C2-N-005`). Expansion
answers "what does this document say"; Carve output answers "what does this
document consist of". A formatter that expanded first would hand back a
different document, every child inlined and every directive gone.

A Carve writer writes an include as its directive, with its attribute line and
caption, and never writes the children or `file` (`C2-N-080`). Because tree
equality skips both, `parse(fmt(x)) == parse(x)` holds whether or not either
side was expanded (`C2-N-081`). Rendering to HTML with a resolver expands as
usual; only the Carve target keeps the directives.

`carve flatten` is the one command that expands into Carve source. It writes
the expanded tree as one document, with every directive replaced by the blocks
it expanded to. It writes nothing and exits with status 1 when an include does
not expand, or when the flattened file would render differently from the
expanded tree, as when two included files define the same footnote, link
reference or abbreviation key, which are looked up per file. See
[Include files](./include-files#flatten-a-book).

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
missing has to refresh a preview, and a host that watches only what it read
would stay stale at the moment the author fixes the problem.

On the command line, `--report-includes <path>` writes the dependencies as
JSON. For a document that includes `snippet.crv` and a missing `missing.crv`:

```json
{
  "files": [
    {
      "file": "<stdin>",
      "dependencies": [
        { "path": "snippet.crv", "read": true, "file": "snippet.crv" },
        { "path": "missing.crv", "read": false }
      ]
    }
  ]
}
```

In JavaScript, `includeDependencies(tree)` returns the same list for a parsed
tree. A host that wants a set rather than a list removes repeats by id.

## Linting included content

A linter expands includes when its caller gives a resolver or a root, with the
same rules and limits; without one it reads no target, and each include
reports `include-no-resolver` (`C2-N-085`). `carve lint` uses the command-line
resolver and root described above.

- The top-level document is linted as it is.
- Every Carve include the expansion accepted is linted with every rule and with
  the options of the top-level document, over the source it parsed: the whole
  file, the line range or the region. For a section the whole file is linted
  and only the findings on the selected lines are kept.
- Rules that read a block's payload also run on a code include's child, such as
  `delimited-table-malformed` on a `{table}` CSV include (`C2-N-086`).
- A `{table}` include with `@lines` gets the hint
  `include-lines-table-rows-hint` (`C2-N-088`).
- Every include failure is a finding under its own code, at the directive in
  the file that wrote it.

A finding in included content names its file by id, a line and a column in that
file, and the tree path through the includes that reached it. Each distinct
file, line, column and rule is reported once, and the first reach in document
order supplies the path; a file included twice reports each finding once, and
`@shift` does not make a range distinct. Lint control comments count the lines
of their own file (`C2-N-087`). Given `data/plans.csv`:

```text
Plan,Seats,Price
Starter,1,"$0"
Team,10,"$49 billed yearly
```

and `doc.crv`:

<!-- carve-sample {"includes":"malformed-csv","lint":"shows delimited-table-malformed in an included file"} -->
```crv
{table}
{{ data/plans.csv @code:csv }}
```

the linter reports `delimited-table-malformed` in `data/plans.csv` at line 3,
the record whose quote is never closed, reached from the directive on line 2
of `doc.crv`.

## Security

Inclusion turns a document into a request to read files, so the host decides
whether it is allowed. The threats are path traversal, symbolic-link escape,
include cycles, size amplification and depth exhaustion.

- **The parser stays pure.** Without a resolver nothing is read.
- **Containment is canonical.** The resolver canonicalizes the target, symbolic
  links included, before it tests the root. Rejecting `..` by its spelling is
  wrong both ways: it refuses `../shared/glossary.crv` inside the project and
  misses a symbolic link or an absolute path that leaves it (`C2-N-012`).
- **No existence oracle.** The root test comes before any test of existence,
  so a target outside the root is `outside_root` whether or not it exists. For
  a missing target the resolver canonicalizes the longest prefix that exists
  and appends the rest. A resolver that read first and tested afterwards would
  answer "not found" for an absent file and "outside the root" for a present
  one, and anyone who can get a document rendered would learn which paths exist
  on the host (`C2-N-013`).
- **Test what you open.** The file the resolver reads is the file it tested: it
  compares the identity of the open handle with the tested path, or opens each
  segment from a handle of the root. A platform that offers neither serves the
  files from a store that cannot change during the expansion, such as a
  snapshot or a preopened WASI directory (`C2-N-013`).
- **Nothing remote.** A path with a URI scheme is `outside_root` (`C2-N-012`).
- **No relaxed rules for included content.** One `urlPolicy`, one `rawHtml`
  setting, one profile and every sanitizing rule apply to the whole expanded
  tree. An include is not a way around any of them (`C2-N-069`).

See also the [Security](./security#file-inclusion) page.

## Editor and host guidance

This section is guidance, not a rule of the specification. Hosts fall into
three trust classes, and the include policy follows the class.

### Local editors on the user's own files

Editor integrations (`vscode-carve`, `intellij-carve` and the others) have a
document path and a trust signal.

- **Gate on workspace trust.** Expand includes only in a trusted workspace (VS
  Code Workspace Trust, JetBrains trusted projects). In an untrusted workspace,
  show that includes are off instead of rendering the directive as plain text
  without comment: a directive shown as text looks like a syntax error.
- **Root at the workspace.** Use the workspace or project root as containment
  root rather than the document's folder, so a file in `chapters/` can reach
  `shared/`. The document's folder stays the fallback for a file opened outside
  any workspace.
- **Offer a setting**, for example on, off, or on only in trusted workspaces,
  plus a root override for projects whose content root is not the workspace
  root.

### Browser hosts with no filesystem

Browser hosts (`carve-components`, the playground) have no filesystem and take
strings, so includes cannot resolve on their own. Show that includes are not
resolved rather than leaving the directive as silent text. An in-memory
resolver that maps names to sources lets demos and sandboxes run includes end
to end without file access.

### Server-side rendering of user content

CMS and shop fields such as `wp-carve` or `shopware-carve` render text that
users supply. Keep includes off there: a resolver on that path is a file
disclosure risk. If one is ever offered, make it an administrator-only option
with an explicit root that front-end rendering paths do not inherit.

### Live preview

- **Watch every dependency**, read or not (see [Dependencies](#dependencies)),
  so a change to an included file, or a missing file that appears, refreshes the
  preview. A preview that watches only the open file shows stale output.
- **Show include failures as diagnostics** instead of leaving them as text.
- **Jump to the right file.** Use `pos.file` so that a jump from the preview
  lands in the included file, not on the directive line.
- **Cache child parses** by id and modification time instead of reading every
  target on each keystroke.

### Implement it once, in the language server

Resolution in the language server (`carve-lsp`) gives the thin editor
integrations includes and their diagnostics with no work per editor. The
server's workspace root is the natural containment root, and it already owns
the document lifecycle that dependency tracking and caching need.

## What 0.1 rules are gone

These 0.1 features have no 0.2 counterpart:

- **Inline includes.** A directive inside a sentence was spliced into it in
  0.1; in 0.2 it is text (`C2-N-002`).
- **Recognition over a run of inline nodes.** It was needed only for inline
  directives; a 0.2 directive is a block line.
- **Renaming on collision.** Ids and footnote labels are no longer renamed, see
  [References across files](#references-across-files).
- **The resolver-call bound** and the size budget of `max(1 MB, 8 × input
  length)`. The fixed size cap and the depth limit replace both
  (`C2-N-065`, `C2-N-067`).

The [upgrade guide](./upgrade-0-2#includes) lists how each change shows in a
document.

**Specification (external):** [Includes](https://github.com/markup-carve/carve/blob/main/spec/0.2/includes.md), clauses C2-N-001 to C2-N-096; [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md), clauses C2-B-156, C2-B-201 to C2-B-206 and C2-B-217 (the directive shape and region markers); [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md), clauses C2-T-018, C2-T-022, C2-T-047 and C2-T-048 (command-line flags, the include report and `flatten`); data files [`includes.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/includes.json), [`include-options.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/include-options.json) and [`limits.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/limits.json).
