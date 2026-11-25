# Carve 0.2: includes

Status: part of the freeze candidate of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md` names the candidate).

This document defines how an include directive is expanded: which file a directive reads, how that file becomes part of the tree, what its options select, how references cross a file boundary, what fails and how a failure is reported. The shape of the directive is defined by the block chapter (C2-B-156, C2-B-201 to C2-B-206) and its node by the AST document (C2-A-181, C2-A-182). It replaces section 19 of the 0.1 specification (rules I1 to I16 of CARVE-P6-001) and applies the 0.2 rulings on includes.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-N-nnn`. `C2-A-nnn`, `C2-B-nnn`, `C2-H-nnn`, `C2-I-nnn`, `C2-L-nnn` and `C2-W-nnn` name clauses of the AST document, the block and inline chapters, the HTML document, the sidecar document and the writer document. `I1` to `I16` name the rules of the 0.1 include section.
- A clause that starts with the word "Exception" is a carve-out from a more general clause. Exceptions are counted at the end.
- An example names the files a resolver serves, each in a fenced block below a line `File`, then a `compare` container with the entry document and the expected HTML, and where the tree matters the tree in JSON. The resolver of an example serves exactly those files under the names shown and returns each name as its id. Every example is *unverified*: the fixture trees come from the reference engine, and the HTML is written by hand and not machine-checked.
- JSON examples leave out `pos` unless the example is about positions, and leave out the nodes the example is not about.
- The tables that decide a rule are data files: `data/includes.json` lists the failure causes and the option combinations, `data/include-options.json` the options, and `data/limits.json` the two limits.

## Scope and defaults

**C2-N-001** Expansion is part of 0.2.0. Every engine that offers the `includes` option (C2-H-137) expands include directives as this document states, and an engine that does not offer the option refuses it (C2-H-137).

**C2-N-002** Only an `include` node is expanded, and only a block line makes one (C2-B-156). There is no inline include: `{{ ... }}` inside inline content is text, each of its braces read on its own (inline chapter, braced forms), so a directive in a sentence, in a heading, in a table cell or on a lazy line of a paragraph (C2-B-024) stays text and is never passed to a resolver.

**C2-N-089** A directive with a section and no path is reserved for an include from the same document in a later 0.2 release: `{{`, one or more spaces, `#` and a section name (C2-B-203), one or more spaces and `}}`, as `{{ #intro }}`. A section-only shape with options stays a finding of `empty-include-path`. In 0.2.0 it is text where it stands, on its own line, since a bare path has at least one character (C2-B-202), and in inline content (C2-N-002), and `reserved-syntax` reports it in place of `empty-include-path`. A shape whose opening brace is escaped, or that stands in a code span or another verbatim span, is not reported.

Example 1 (unverified)

File `part.crv`:

```carve
Never read.
```

::: compare

```carve
See {{ part.crv }} here.

Text
{{ part.crv }}
```

```html
<p>See {{ part.crv }} here.</p>
<p>Text
{{ part.crv }}</p>
```

:::

**C2-N-003** The `includes` option holds a resolver (C2-N-007) and the two limits (C2-N-064, C2-N-065). A library call that gives no resolver expands nothing: every include stays unexpanded and is reported with `include-no-resolver` (C2-N-061).

**C2-N-004** A command-line tool expands includes by default when it reads its entry document from a file and writes any target other than Carve source. It uses the resolver of C2-N-012 with the containment root set to the directory of the entry file, as a canonical path with every symbolic link resolved. The tool offers a way to turn expansion off and a way to name another root. With the entry read from standard input there is no entry file and so no default root: the tool expands nothing unless the caller names a root. A tool that expands nothing, with expansion turned off or with standard input and no root, has no resolver, and each include is reported with `include-no-resolver` (C2-N-003). With a named root, an include of standard input resolves against that root.

**C2-N-005** A processor whose output is Carve source does not expand, whether or not a resolver is given: `carve fmt`, a render to the Carve target and every other pipeline whose product is Carve source return the directive as the author wrote it. `carve flatten`, whose product is the expanded tree, is the one command that expands (C2-T-047). Such a processor reports no `include-no-resolver` (C2-N-003), since it expands nothing by its own rule. (I15, carried over)

**C2-N-006** Expansion runs after the top-level document is parsed and before resolution (C2-A-135), as part of the parse that the `includes` option configures. A tree in which expansion ran lists `includeExpansion` in the root `stages` (C2-A-135). Expansion runs whenever the parse has a resolver, also when the document holds no include.

## The resolver

**C2-N-007** A resolver is a function of the host. It receives the decoded path of the directive (C2-B-202), the section name when there is one, the decoded valid options (C2-A-181), and the id of the including file, which is absent when the directive stands in a top-level document that has no id. It returns either the text of the target and an id for it, or one error cause: `not_found`, `outside_root`, `unreadable` or `non_text`.

**C2-N-008** The resolver returns the whole target. It may read the section and the options, for example to decide access, but it does not select: the processor applies every selection, transform and mode to the text the resolver returned.

**C2-N-009** An id is a string that names one target. Two spellings of a path that reach the same target give the same id, so `a/b.crv` and `a/./b.crv` are one id. The cycle check (C2-N-066), `pos.file` (C2-N-019) and the include node's `file` (C2-N-017) all use this id.

**C2-N-010** A path is resolved relative to the including file, never relative to the root or to the working directory of a process. The one exception: with the entry read from standard input and a named root (C2-N-004), the path base of the entry document is that root, so its includes resolve against the root.

**C2-N-011** Content is text when it is well-formed UTF-8 and holds no U+0000. A resolver reports any other content as `non_text` and does not replace a byte: the replacement rule for the top-level input does not apply to an included file. A leading U+FEFF of a returned text is not content.

The file holds U+0000, so it is no text: the include stays unexpanded (C2-N-011).

Example 41 (unverified)

File `bad.crv` holds the three bytes `61 00 62`: `a`, U+0000 and `b`.

::: compare

```carve
{{ bad.crv }}
```

```html
<p>{{ bad.crv }}</p>
```

:::

Reported: `include-non-text`, `include-unresolved`.


**C2-N-012** The resolver of a command-line tool reads files. It resolves the path against the directory of the including file, takes the canonical form of the result with every symbolic link resolved, and returns `outside_root` unless that form lies inside the canonical root. A `..` segment is allowed when the canonical result stays inside the root, and an absolute path is allowed only when it canonicalizes inside the root. The resolver takes the switch `allowAbsolute`, on by default: on, an absolute path is tested against the root as every other path is; off, an absolute path gives `outside_root` before anything is read, as the 0.1 option of that name did by default. The command line keeps it on. A path that starts with a URI scheme, letters and `:` before any `/`, gives `outside_root`: the resolver fetches nothing remote.

**C2-N-013** The containment test comes before any test of existence. For a target that does not exist, the resolver canonicalizes the longest prefix that exists and appends the rest normalized; a result outside the root is `outside_root` whether or not the target exists, so the cause never reveals the existence of a file outside the root. Inside the root, a missing target is `not_found` and a file that cannot be read is `unreadable`. The file the resolver reads is the file it tested: no change of the file system between the test and the read, such as a symbolic link turned to a directory outside the root, makes it read a file outside the root, so a resolver that tests a path and then opens that path again does not meet this clause. A resolver meets it by testing what it opened: it opens the file, then compares the identity of the open handle, its device and file number, with that of the canonical path it tested inside the root, or it opens each segment of the path from a handle of the root without following a link out of it. A host whose platform offers neither does not give the resolver of C2-N-012 a file system that untrusted documents or other processes can change during the expansion: it serves the files from a store that does not change between the test and the read, such as a snapshot or a set of files read into memory before the expansion, or from a directory that the platform confines, such as a preopened directory of WASI.

**C2-N-014** One expansion has one root. A nested include resolves its path against its own including file (C2-N-010) and is still tested against the root of the top-level document; the root is not re-based per file. A configured root is an absolute path, and a root that is not absolute is refused: expansion then stays off, as with no resolver.

Given the files `book/main.crv`, `book/chapters/one.crv` and `book/shared/glossary.crv` and the root `book/`, the directive `{{ ../shared/glossary.crv }}` in `chapters/one.crv` reads the glossary, and `{{ ../../etc/passwd }}` gives `outside_root`.

## Expansion

**C2-N-015** An included file is parsed as a document of its own, with the parse options of the top-level document. It has its own contents and its own depth counts: the block limit (C2-B-190) and the inline limit (C2-I-118) count within that file. A construct that is open at the end of the file, a fence, a list, a div, a quote or a comment block, ends there, as at the end of any document. Nothing of the including file is read by that parse, and nothing in the included file captures a line of the including file.

Example 2 (unverified)

File `child.crv`:

````carve
```js
let x = 1;
````

::: compare

```carve
Before.

{{ child.crv }}

After.
```

```html
<p>Before.</p>
<pre><code class="language-js">let x = 1;
</code></pre>
<p>After.</p>
```

:::

The unclosed fence of `child.crv` ends at the end of that file and reports `unclosed-code-fence` there.

Reported: `unclosed-code-fence`.

**C2-N-016** The blocks of that document, after selection (C2-N-027 to C2-N-052), become the `children` of the include node. The include node stays where the directive stood. There is no splice of source text, so a directive cannot complete or interrupt a construct of the including file. The root of the expanded tree declares each extension that the parse of an included file declared, a name once (C2-A-017, C2-X-002); that parse has the extensions of the top-level document (C2-N-015), so the declarations agree.

**C2-N-017** An include node carries `file`, the id the resolver returned, whenever the resolver returned a text for it, and `children` exactly when it was expanded. An unexpanded include has no `children`; an include of an empty file, or of a selection that holds no block, has an empty `children` list. A node that has `children` also has `file`. Both fields are resolution results (C2-A-133): tree equality skips them.

**C2-N-018** Expansion is recursive: the includes in an included file are expanded the same way, each relative to its own including file. Directives are expanded in tree order, a node before the nodes inside it, so the resolver is called and the size cap is charged (C2-N-065) in that order.

Example 3 (unverified)

File `a.crv`:

```carve
A says hello.
```

::: compare

```carve
Top.

{{ a.crv }}
```

```html
<p>Top.</p>
<p>A says hello.</p>
```

:::

```json
{
  "type": "document",
  "astVersion": "2.0",
  "stages": ["includeExpansion", "referenceResolution", "tableAlignment"],
  "children": [
    {"type": "paragraph", "children": [{"type": "text", "value": "Top."}]},
    {
      "type": "include",
      "path": "a.crv",
      "file": "a.crv",
      "children": [
        {"type": "paragraph", "children": [{"type": "text", "value": "A says hello."}]}
      ]
    }
  ]
}
```

**C2-N-019** Positions are local to their own file. Every positioned node that an included file produced carries `pos.file`, the id of that file (C2-A-142), and lines, columns and offsets counted in that file. The include node itself is positioned in the file that holds the directive (C2-A-182). No position is mapped into the offsets of an including file.

Example 4 (unverified)

File `a.crv`:

```carve
Hi
```

::: compare

```carve
Top.

{{ a.crv }}
```

```html
<p>Top.</p>
<p>Hi</p>
```

:::

```json
{
  "type": "include",
  "path": "a.crv",
  "file": "a.crv",
  "pos": {"startLine": 3, "endLine": 3, "startColumn": 1, "endColumn": 12, "startOffset": 6, "endOffset": 17},
  "children": [
    {
      "type": "paragraph",
      "pos": {"startLine": 1, "endLine": 1, "startColumn": 1, "endColumn": 3, "startOffset": 0, "endOffset": 2, "file": "a.crv"},
      "children": [
        {"type": "text", "value": "Hi", "pos": {"startLine": 1, "endLine": 1, "startColumn": 1, "endColumn": 3, "startOffset": 0, "endOffset": 2, "file": "a.crv"}}
      ]
    }
  ]
}
```

**C2-N-020** A selection by lines or by region (C2-N-034 to C2-N-041) is parsed as a document of its own too, and its positions keep the coordinates of the file: the first selected line is the line it is in the file, not line 1. A selection starting at line 1 may open leading frontmatter (C2-B-161); a selection starting later may open typed metadata blocks under C2-B-232, using the selected lines as its document and their original file coordinates for `pos`. A bare `---` on a later file line remains ordinary content. Its children are the blocks of the selected lines and then, as under a section (C2-N-031), in source order, every definition of the file that the selection did not take: each link reference, footnote, abbreviation and citation definition of the file parsed whole whose first line is not selected. Its references therefore resolve against the definitions of their whole file (C2-N-054).

**C2-N-021** In Carve mode a leading frontmatter block of an included file is the first child of the include node when the selection takes it from line 1 (C2-N-020). Later typed metadata blocks taken by the selection remain among the include children in source order. Every such block renders nothing (C2-H-070) and is not metadata of the top-level document. With `code` the frontmatter lines are content of the payload (C2-N-042).

Example 5 (unverified)

File `child.crv`:

```carve
---
title: Child
---

Child body.
```

::: compare

```carve
Top.

{{ child.crv }}
```

```html
<p>Top.</p>
<p>Child body.</p>
```

:::

```json
{
  "type": "include",
  "path": "child.crv",
  "file": "child.crv",
  "children": [
    {"type": "frontmatter", "format": "yaml", "value": "title: Child\n"},
    {"type": "paragraph", "children": [{"type": "text", "value": "Child body."}]}
  ]
}
```

Example 39 (unverified)

File `a.crv`:

```carve
x

---
t: 1
---

para
```

::: compare

```carve
{{ a.crv @lines:3-7 }}
```

```html
<p>—
t: 1
—</p>
<p>para</p>
```

:::

The selection starts at line 3 of the file, so its `---` line opens no frontmatter and the three lines are a paragraph (C2-N-020).

Example 35 (unverified)

File `a.crv`:

```carve
---
x
---
```

::: compare

```carve
{{ a.crv @code }}
```

```html
<pre><code>---
x
---
</code></pre>
```

:::

With `code` the include has one child, the code block, and the frontmatter lines are its content.

**C2-N-022** A directive may stand wherever a block line stands: as the only block of a list item, a description or a quote, or among other blocks. The include is then a child of that container, and its children are blocks of that container for rendering (C2-N-075). The spacing of the list is decided in the including file (C2-B-062): blank lines inside the included file do not make the list loose.

Example 6 (unverified)

File `a.crv`:

```carve
Alpha
```

::: compare

```carve
- {{ a.crv }}
- two

> {{ a.crv }}
```

```html
<ul>
  <li>Alpha</li>
  <li>two</li>
</ul>
<blockquote><p>Alpha</p></blockquote>
```

:::

**C2-N-023** An included file is parsed with the abbreviation definitions of its own source, and for every term that those do not define, with the abbreviation definitions of the file that includes it, then of the file that includes that one, out to the top-level document. A term its own file defines takes its own expansion (C2-I-098, C2-N-055).

Example 7 (unverified)

File `a.crv`:

```carve
HTML and CSS.

*[CSS]: Cascading Style Sheets
```

::: compare

```carve
{{ a.crv }}

*[HTML]: Hypertext Markup Language
*[CSS]: Not this one
```

```html
<p><abbr title="Hypertext Markup Language">HTML</abbr> and <abbr title="Cascading Style Sheets">CSS</abbr>.</p>
```

:::

## Selection, transforms and mode

The option semantics of 0.1 are carried over unchanged (I1, I1a to I1d, I8) and restated over the tree: an option selects the lines it selected in 0.1. How the selected lines are parsed differs from 0.1 in the leading frontmatter and whole-file definition rules of C2-N-020 (U-301, U-302). Typed metadata blocks after line 1 follow C2-B-232 within a selected fragment. Each option has a kind in `data/include-options.json`: `lines`, `region` and `rows` are selections, and so is the section, which is written `#name` and is no option; `cols` and `shift` are transforms; `code` is the mode.

**C2-N-024** A directive uses at most one selection. Which options exclude each other and which need a context are the rows of `conflicts` in `data/includes.json`: two selections exclude each other, a section excludes `code`, and `rows` and `cols` need a code include whose language is `csv` or `tsv` and whose attributes carry the `table` flag. A directive that breaks a row is not expanded, and `include-selection-conflict` reports it.

Example 8 (unverified)

File `a.crv`:

```carve
= Intro

Text.
```

::: compare

```carve
{{ a.crv #Intro @lines:1-2 }}
```

```html
<p>{{ a.crv #Intro @lines:1-2 }}</p>
```

:::

**C2-N-025** An include that holds an invalid option (C2-B-206) is not expanded, and `include-option-invalid` reports it: an invalid option never silently drops out of a selection, so `{{ a.crv @lines:5-2 }}` does not read the whole file. (I7, carried over)

Example 9 (unverified)

File `a.crv`:

```carve
Whole file.
```

::: compare

```carve
{{ a.crv @lines:5-2 }}
```

```html
<p>{{ a.crv @lines:5-2 }}</p>
```

:::

**C2-N-026** Without a selection the include takes the whole file. Without `code` the selected source is read as Carve.

### Section

**C2-N-027** A section `#name` is matched against the included file's own parse, before the includes of that file are expanded and before its ids meet those of any other file (C2-N-057). It is matched the way a cross-reference matches an id (C2-H-095), exactly and with case: `#intro` does not match a heading whose id is `Intro`.

**C2-N-028** The first of two steps that matches wins. First, a heading whose id is the name, authored or generated in that parse, selects its section: the heading and the blocks after it in the same block sequence, up to the next heading of the same or a lower level number or the end of that sequence. A heading inside a container is bounded by that container. Second, a block with the authored id `name` selects that block alone, with its own attributes. Within a step the first match in document order wins, a container before the blocks inside it. (I1a, carried over)

Example 10 (unverified)

File `child.crv`:

```carve
= A

skip

{#pick}
= B

yes

== C

more

= D

skip
```

::: compare

```carve
{{ child.crv #pick }}
```

```html
<section id="pick">
  <h1>B</h1>
  <p>yes</p>
  <section id="C">
    <h2>C</h2>
    <p>more</p>
  </section>
</section>
```

:::

**C2-N-029** A block in the sense of C2-N-028 is a node in a block list of the file's body at any depth that is not a definition, a comment, frontmatter or an include, whose own id is no target (C2-N-072). An id carried only by something else, an inline node, a list item, a table row or cell, a term, a footnote or a block inside a footnote, selects nothing.

Example 33 (unverified)

File `a.crv`:

```carve
{#pick}
{{ b.crv }}
```

File `b.crv`:

```carve
B.
```

::: compare

```carve
{{ a.crv #pick }}
```

```html
<p>{{ a.crv #pick }}</p>
```

:::

**C2-N-030** A section that selects nothing leaves the include unexpanded, and `include-section` reports it. The file stays a resolved dependency: the node keeps `file`.

Example 11 (unverified)

File `a.crv`:

```carve
A [word]{#item} here.
```

::: compare

```carve
{{ a.crv #item }}
```

```html
<p>{{ a.crv #item }}</p>
```

:::

**C2-N-031** Under a section the children are the selected blocks and then, in source order, every definition of the file that the selection did not take: link reference, footnote, abbreviation and citation definitions. The references of the selected blocks therefore resolve against the definitions of their whole file (C2-N-053). A definition renders nothing on its own, and a footnote that nothing references is not written (C2-H-092).

Example 12 (unverified)

File `a.crv`:

```carve
{#use}
See [the site][s].

Other text.

[s]: https://example.org
```

::: compare

```carve
{{ a.crv #use }}
```

```html
<p id="use">See <a href="https://example.org">the site</a>.</p>
```

:::

**C2-N-032** An included heading's id in the merged tree is decided by the merged tree (C2-N-057), so a heading selected by its generated id may carry another generated id after expansion. The section name decides only what is selected.

**C2-N-033** `shift` composes with a section (C2-N-048). Everything else that holds for a whole file holds for a section: its positions are those of the file, and its nested includes expand after selection.

### Lines

**C2-N-034** `lines` selects physical lines of the file, counted from 1, both ends included. Lines are split as the block chapter splits them, a final line ending begins no further line, and a leading U+FEFF is not content, so an empty file and a file holding only U+FEFF have no lines. (I1, carried over)

**C2-N-035** A range that starts past the last line leaves the include unexpanded, and `include-lines-out-of-range` reports it; the node keeps `file`. A range that starts on or before the last line and ends past it selects through the last line.

**C2-N-036** The selected lines are parsed as a document (C2-N-020). A slice that cuts a fence, a list or a div ends that construct at the end of the slice.

Example 13 (unverified)

File `a.crv`:

````carve
one

```
two
three
```
````

::: compare

```carve
{{ a.crv @lines:3-4 }}

after
```

```html
<pre><code>two
</code></pre>
<p>after</p>
```

:::

### Region

**C2-N-037** `region` selects the physical lines strictly between the opening and the closing marker of the named region; the two marker lines are not selected, and marker lines of other regions between them stay selected source. An empty region selects an empty source. Markers are found by physical line before anything else reads the file, except the record parse of a table include (C2-N-046). (I1b, carried over)

**C2-N-038** An include that reads Carve recognizes only the line-comment markers of C2-B-217: `%% #region name` and `%% #endregion` with an optional name. A bare `#region` line, a `// #region` line and a braced comment are text in that mode, so a region they mark is not found.

**C2-N-039** A code include recognizes these markers, each alone on its line after optional spaces and tabs: `#region name`, `// #region name`, `-- #region name`, `/* #region name */`, `<!-- #region name -->` and `%% #region name`, and the same forms with `#endregion` and an optional name. A block comment's closer ends the same line.

**C2-N-040** In both modes the keywords are case-sensitive; a `%` run of three or more opens a comment block and is no marker; a keyword run on by an ASCII letter, digit or `_` is no marker, and run on by any other character is a malformed marker; spaces and tabs may stand between the comment opener and the keyword and between the name and a closer; and a leading U+FEFF does not hide a marker on line 1.

**C2-N-041** An opener names its region and a closer may omit the name. Distinct names may nest, a named closer matches the innermost open region, and one name opens at most once in a file. A malformed, unmatched, mismatched, unclosed or repeated marker, an opener without a name, and a name the file does not open leave the include unexpanded, and `include-region-invalid` reports it; the node keeps `file`.

Example 14 (unverified)

File `a.crv`:

```carve
Skip.

%% #region keep
Kept.
%% #endregion keep

Skip too.
```

::: compare

```carve
{{ a.crv @region:keep }}
```

```html
<p>Kept.</p>
```

:::

Example 40 (unverified)

File `a.crv`:

```carve
%% #region k
See [s][] and HTML.
%% #endregion k

[s]: /u
*[HTML]: Hyper
```

::: compare

```carve
{{ a.crv @region:k }}
```

```html
<p>See <a href="/u">s</a> and <abbr title="Hyper">HTML</abbr>.</p>
```

:::

The region selects line 2 only. The two definitions below it are appended to the include's children, so the reference and the abbreviation resolve as in the whole file (C2-N-020, C2-N-054).

### Code

**C2-N-042** With `code` the include has one child: the node that a fenced code block would give whose attribute line is the attribute line of the include, whose language is the value of `code`, and whose content is the selected source. A bare `code` gives no language; none is inferred from the file name. The payload is not read as Carve: no construct is recognized in it, and a directive in it is text that is never expanded. (I1c, carried over)

Example 15 (unverified)

File `src/server.js`:

```js
import http from 'node:http'

// #region start
const server = http.createServer(handler)
server.listen(3000)
// #endregion start
```

::: compare

```carve
{.diff title="server.js"}
{{ src/server.js @region:start @code:js }}
```

```html
<pre class="diff" title="server.js"><code class="language-js">const server = http.createServer(handler)
server.listen(3000)
</code></pre>
```

:::

```json
{
  "type": "include",
  "path": "src/server.js",
  "options": {"region": "start", "code": "js"},
  "attrs": {"classes": ["diff"], "keyValues": [["title", "server.js"]]},
  "file": "src/server.js",
  "children": [
    {
      "type": "code_block",
      "syntax": "js",
      "value": "const server = http.createServer(handler)\nserver.listen(3000)\n",
      "attrs": {"classes": ["diff"], "keyValues": [["title", "server.js"]]}
    }
  ]
}
```

**C2-N-043** The payload holds one line per selected line, each ended by one line feed, as an authored fence's content is: a CRLF becomes a line feed, a lone CR stays as content of its line (C2-B-010), a last line without a line ending gains one, a selected blank last line keeps its line feed, and an empty selection gives the value `""`. A leading U+FEFF of the file is not payload; a U+FEFF that opens a later line is.

A lone CR ends no line, in the file as in an authored fence, so the one selected line keeps it (C2-B-010, C2-N-034).

Example 32 (unverified)

File `a.txt` holds the three bytes `61 0D 62`: `a`, a CR and `b`, with no line ending.

```carve
{{ a.txt @code @lines:1-1 }}
```

```json
{
  "type": "include",
  "path": "a.txt",
  "options": {"code": true, "lines": "1-1"},
  "file": "a.txt",
  "children": [{"type": "code_block", "value": "a\rb\n"}]
}
```

**C2-N-044** The child's `pos` is in the included file. It starts at column 1 of the first selected line, after a leading U+FEFF on line 1, and ends directly after the last character of the last selected line, without its line ending. An empty selection has a zero-width span at the start of the file, after a leading U+FEFF, or at column 1 of the closing marker line of an empty region. A table made from the payload (C2-N-045) has the same span, and its cells keep their positions in the file.

**C2-N-045** With the `table` flag in the include's attributes and the language `csv` or `tsv`, the child is the delimited table such a fence gives (C2-B-180), with bad quoting reported as on an authored fence (C2-B-181). `rows` selects records and `cols` projects columns (C2-N-046, C2-N-047).

Example 16 (unverified)

File `data/plans.csv`:

```csv
Plan,Seats,Price
Starter,1,"$0"
Team,10,"$49, billed yearly"
```

::: compare

```carve
{table}
{{ data/plans.csv @code:csv }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Plan</th><th scope="col">Seats</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Starter</td><td>1</td><td>$0</td></tr>
    <tr><td>Team</td><td>10</td><td>$49, billed yearly</td></tr>
  </tbody>
</table>
```

:::

**C2-N-046** `rows` counts the parsed records of the whole file from 1, header records included, after the leading U+FEFF is removed. A quoted field that holds line breaks is one record. A whole physical line that is a well-formed marker of C2-N-039 is no record under any selection or none: it is no row, no cell, and does not count toward `rows` or `header-rows`. A marker is recognized only outside a quoted field, here and for `region`: inside a quoted field the line is data of that field. The first `header-rows` records of the file, one by default, form the head, and the last `footer-rows` records of the file, none by default, form the foot. Both are written under any selection, and a selection chooses only body records, so a head or foot record inside the range is not repeated. A `lines` selection chooses, whole, the records of the whole file whose first line lies in the range, also one that ends past the range, so a quoted field is never cut. The two counts are taken on the records of the whole file as C2-B-221 takes them on the rows of a table: the head takes its records first, and a `footer-rows` count larger than the records below the head takes them all. A `rows` range that starts past the last record leaves the include unexpanded with `include-rows-out-of-range`, and an end past the last record is clipped. (I1d, carried over)

Example 34 (unverified)

File `a.csv`:

```csv
Name
"first
#region keep
mid
#endregion keep
last"
```

::: compare

```carve
{table}
{{ a.csv @code:csv }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Name</th></tr>
  </thead>
  <tbody>
    <tr><td>first
#region keep
mid
#endregion keep
last</td></tr>
  </tbody>
</table>
```

:::

The two marker lines stand inside a quoted field, so they are data of the cell.

Example 37 (unverified)

File `t.csv`:

```csv
H
a
b
F
```

::: compare

```carve
{table footer-rows=1}
{{ t.csv @rows:2-4 @code:csv }}
```

```html
<table>
  <thead>
    <tr><th scope="col">H</th></tr>
  </thead>
  <tbody>
    <tr><td>a</td></tr>
    <tr><td>b</td></tr>
  </tbody>
  <tfoot>
    <tr><td>F</td></tr>
  </tfoot>
</table>
```

:::

Record 4 is the foot of the file, so the range puts only `a` and `b` in the body, and `F` is written once, in the foot.

**C2-N-047** `cols` with a list of names takes the columns whose head names match exactly, in the order given, so it may reorder them. The names are matched against the head of the whole file (C2-N-046) under any selection: a `lines` or `region` selection chooses records and never makes a new head. A requested name that the first head record lacks or holds twice leaves the include unexpanded with `include-cols-invalid`, and a name requested twice with `include-cols-duplicate`; an empty or a repeated head name that no request names is not tested. `cols` with a range selects columns by number and is valid only with `header-rows=0`; on another table, or past the last column, it gives `include-cols-invalid`. `cols` combines with any one selection or none. (I1d, carried over)

Example 36 (unverified)

File `a.csv`:

```csv
Name,Price
A,1
B,2
```

::: compare

```carve
{table}
{{ a.csv @lines:2-2 @cols:"Price" @code:csv }}
```

```html
<table>
  <thead>
    <tr><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td></tr>
  </tbody>
</table>
```

:::

Line 2 selects the record `A,1`; the head is still the first record of the file, so `Price` names its second column.

### Shift

**C2-N-048** `shift` with a number N adds N to the level of every heading among the children of the include, at every depth, headings of nested includes included. A level that would fall below 1 or rise above 6 is set to 1 or 6, the heading is kept, and `include-heading-clamp` reports it. A shift changes no text and no id: an authored id stays, and a generated id is computed from the unchanged text (C2-N-057), so a cross-reference into a shifted heading still resolves. Section numbering counts the new levels. (I8, carried over)

Example 17 (unverified)

File `child.crv`:

```carve
= A

====== B
```

::: compare

```carve
{{ child.crv @shift:1 }}
```

```html
<section id="A">
  <h2>A</h2>
  <section id="B">
    <h6>B</h6>
  </section>
</section>
```

:::

**C2-N-049** `shift:auto` computes N as (C + 1) - T. C is the level of the nearest heading before the include in document order that stands in the include's own block container or in a container around it, where an expanded include counts as no container; a heading inside a sibling container that closed before the include does not count, and with no such heading C is 0. T is the lowest heading level among the children after selection and after the includes inside them are expanded. With no heading among the children, `auto` changes nothing and reports nothing. (I8, carried over)

**C2-N-050** Shifts are applied once the tree is expanded, include by include in tree order, an include before the includes inside it. Each include reads the levels as the shifts before it left them, so a nested `auto` places its headings relative to the assembled document and is not shifted twice.

Example 18 (unverified)

File `child.crv`:

```carve
{{ grand.crv @shift:auto }}
```

File `grand.crv`:

```carve
= GrandTop
```

::: compare

```carve
= One

{{ child.crv @shift:1 }}
```

```html
<section id="One">
  <h1>One</h1>
  <section id="GrandTop">
    <h2>GrandTop</h2>
  </section>
</section>
```

:::

`child.crv` shifts `GrandTop` to level 2. The nested `auto` then finds C = 1 and T = 2, so N = 0.

**C2-N-051** `shift` on a code include has no effect and reports nothing, since its child holds no heading.

**C2-N-052** The children of an include hold no node of the including file, and an include's selection, transform and mode act only on its own children.

## References across files

**C2-N-053** The file of a node is the file whose parse produced it: the top-level document, or the included file of the nearest expanded include around the node. The including file of an include is the file of the include node.

**C2-N-054** A link reference is looked up in the link definitions of its own file first, which for a selection are those of the whole file (C2-N-020, C2-N-031), then in those of the including file, then in those of each file further out, up to the top-level document, and only then in the headings of the whole tree (C2-A-109, C2-H-083). The first file that defines the key decides. A definition never reaches inward: a reference in an including file does not see a definition of the file it includes.

Example 19 (unverified)

File `child.crv`:

```carve
Child [c][ref] and [up][].

[ref]: https://child.example
```

::: compare

```carve
Parent [p][ref].

[ref]: https://parent.example
[up]: https://up.example

{{ child.crv }}
```

```html
<p>Parent <a href="https://parent.example">p</a>.</p>
<p>Child <a href="https://child.example">c</a> and <a href="https://up.example">up</a>.</p>
```

:::

**C2-N-055** A footnote reference and an abbreviation look up their definition the same way: their own file first, then outward to the top-level document. Two files may each define a footnote with one key; they are two notes, and each reference reaches the note of the nearest file that defines the key. (Changed from 0.1, which renamed the second label: I5.)

**C2-N-056** Footnotes are numbered once, over the expanded tree, by the order of their first reference (C2-H-087), and the footnote section collects the notes of every file.

Example 20 (unverified)

File `c.crv`:

```carve
Child sees [^p] and [^n].

[^n]: Child note.
```

::: compare

```carve
See [^n].

{{ c.crv }}

[^p]: Parent note.
[^n]: Parent n.
```

```html
<p>See <a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<p>Child sees <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> and <a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Parent n.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>Parent note.<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>Child note.<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-N-057** Ids run over the expanded tree by the existing rules: the authored ids of every file are reserved in document order, then generated heading ids follow in document order with the suffixes of C2-H-024. Nothing is renamed: an authored id keeps its spelling in every file, and no rename is reported. A generated id that the merged tree suffixes is a generated id like any other (C2-A-134).

Example 21 (unverified)

File `a.crv`:

```carve
= Setup
```

::: compare

```carve
= Setup

{{ a.crv }}
```

```html
<section id="Setup">
  <h1>Setup</h1>
</section>
<section id="Setup-2">
  <h1>Setup</h1>
</section>
```

:::

**C2-N-058** An authored id that stands in two files is a duplicate id like one that stands twice in one file: `duplicate-id` reports the later occurrence (C2-A-039), both elements are written with it, and a cross-reference `</#id>`, a link to `#id` and a link reference that resolves to a heading reach the first occurrence in document order, also when they stand in the file that holds the later one.

Example 22 (unverified)

File `child.crv`:

```carve
{#tip}
= Child tip

Back to </#tip>.
```

::: compare

```carve
{#tip}
= Parent tip

{{ child.crv }}
```

```html
<section id="tip">
  <h1>Parent tip</h1>
</section>
<section id="tip">
  <h1>Child tip</h1>
  <p>Back to <a href="#tip">Parent tip</a>.</p>
</section>
```

:::

`duplicate-id` reports the heading of `child.crv`. In 0.1 it was renamed to `tip-2` and the cross-reference followed it.

Reported: `duplicate-id`.

**C2-N-059** Caption numbers and equation numbers are counted once, over the expanded tree, in the order of C2-H-170.

**C2-N-060** Within one file a second definition of a key is a duplicate (C2-B-085). A key that two files each define once is no duplicate and reports nothing.

## Failures and limits

**C2-N-061** Every failure leaves the include unexpanded and reports one code, the code of its cause, at the include node in the parse channel with severity warning. The causes, their codes and the order in which they are tested are the rows of `causes` in `data/includes.json`; the first cause that applies is reported and no later one is tested. No failure removes the directive, and no failure is silent: past the cap `include_diagnostics` of `data/limits.json`, 100 entries, a failure is counted and not listed (C2-T-024).

**C2-N-062** The causes that are tested before the resolver is called, `no_resolver`, `option_invalid`, `conflict`, `depth` and `size_spent`, never call it, and the node has no `file`. A cause the resolver returns leaves the node without `file`. A cause tested after the resolver returned a text, `cycle`, `size_exceeded` and every selection cause, leaves `file` on the node: the file was read.

**C2-N-063** A failure in an included file is reported at the include node in that file. The range of a finding is counted in the file of the node its path names (C2-A-173, C2-N-053). An entry with `file` may also carry `includedBy`, the chain of include nodes that read that file, from the top-level document inward, each with its `file` and `range` (C2-T-020).

**C2-N-064** The top-level document stands at depth 0, and a file included from a file at depth D stands at depth D + 1. A directive whose file would stand deeper than the limit `include_depth` of `data/limits.json`, 16, is not resolved and reports `include-depth`. A host may lower the limit and may not raise it.

Example 23 (unverified, with the depth limit lowered to 1)

File `a.crv`:

```carve
{{ b.crv }}
```

File `b.crv`:

```carve
Deep.
```

::: compare

```carve
{{ a.crv }}
```

```html
<p>{{ b.crv }}</p>
```

:::

**C2-N-065** The size cap `include_bytes` of `data/limits.json`, 8388608, bounds the sum of the UTF-8 byte lengths of every text the resolver returns in one expansion, the same file counted each time it is read. A text that would carry the sum past the cap is refused with `include-budget` (`size_exceeded`) and does not count toward the sum, and once the sum has reached the cap every later include is refused with `include-budget` before its resolver is called (`size_spent`). A host may lower the cap and may not raise it.

**C2-N-066** A cycle is an include whose returned id is the id of the top-level document or the `file` of an include around it. It is refused with `include-cycle`, so a file that includes itself, directly or through other files, is read once on that chain.

Example 24 (unverified)

File `a.crv`:

```carve
A, then {{ b.crv }} below:

{{ b.crv }}
```

File `b.crv`:

```carve
{{ a.crv }}
```

::: compare

```carve
{{ a.crv }}
```

```html
<p>A, then {{ b.crv }} below:</p>
<p>{{ a.crv }}</p>
```

:::

**C2-N-067** The two limits also bound the work: each directive is at least seven bytes of source, so the number of resolver calls is at most the length of the top-level input and of the returned texts divided by seven. There is no separate bound on resolver calls.

**C2-N-068** A message names the path as the directive wrote it and the cause. It never repeats an error text or a path that the resolver produced, so an absolute path of the host does not reach the output.

**C2-N-069** Included content gets the same treatment as the including document: one `urlPolicy`, one `rawHtml` setting, one `profile` and every sanitizing rule of the HTML document apply to the whole expanded tree. No option is relaxed or tightened for content because it was included.

**C2-N-070** An unexpanded include renders as C2-H-133 states, the directive as text in a paragraph, and the render reports `include-unresolved` in the render-loss channel, whatever the cause.

Example 25 (unverified)

::: compare

```carve
{{ missing.crv #part @shift:1 }}
```

```html
<p>{{ missing.crv #part @shift:1 }}</p>
```

:::

The parse reports `include-not-found`, and the render `include-unresolved`.

Reported: `include-not-found`, `include-unresolved`.

## Attributes and captions

**C2-N-071** The attribute line above a directive attaches to the include node (C2-B-095), and the writer writes it back (C2-N-080). With `code` it acts through the child, which carries the same attributes (C2-N-042), and the `table` flag selects the delimited table (C2-N-045).

**Exception C2-N-072** An include's own `attrs` take part in nothing else: they are not written to HTML, its id is no anchor and is not counted by the duplicate-id rule (C2-A-039) or the id reservation of C2-H-024, and its `lang` and `dir` apply to no child. Only the copy in a code include's child acts. On an include without `code`, `include-attributes-unused` reports them.

Example 26 (unverified)

File `a.crv`:

```carve
Text.
```

::: compare

```carve
{#intro .wide}
{{ a.crv }}
```

```html
<p>Text.</p>
```

:::

**C2-N-073** A caption line directly below a code include attaches to the include (C2-B-147). When the include is expanded, its child carries the same caption, and the child is captioned as an authored code block or table is (C2-H-062). The copy in the child has no `pos`: its characters are in the including file, and a node under the children of an include is positioned in the included file (C2-A-142). The caption of the include keeps its position. A caption below an include without `code` is text, and `unattached-caption` reports it (C2-B-149).

**Exception C2-N-074** The caption of an expanded include is skipped by every resolution walk and is not written: it takes no number, makes no footnote and claims no id, and the copy in its child is numbered, resolved and written. The caption of an unexpanded include is numbered where it stands and written after the directive's paragraph as one more paragraph, as C2-H-165 writes the caption of a degraded block.

Example 27 (unverified)

File `data/plans.csv`:

```csv
Plan,Seats
Starter,1
```

::: compare

```carve
{table}
{{ data/plans.csv @code:csv }}
^ Table #: Plans
```

```html
<table>
  <caption>Table 1: Plans</caption>
  <thead>
    <tr><th scope="col">Plan</th><th scope="col">Seats</th></tr>
  </thead>
  <tbody>
    <tr><td>Starter</td><td>1</td></tr>
  </tbody>
</table>
```

:::

The note and the id of the caption are made once, by the copy in the child, as for an authored code block.

Example 38 (unverified)

File `a.txt`:

```text
code
```

::: compare

```carve
{{ a.txt @code }}
^ Listing #: x^[note] [s]{#q}
```

```html
<figure>
  <pre><code>code
</code></pre>
  <figcaption>Listing 1: x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> <span id="q">s</span></figcaption>
</figure>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Rendering

**C2-N-075** An expanded include renders its children and nothing else: no element, no attribute and no `data-source-line` of its own. Every HTML rule that reads the blocks of a container or of the document reads the children of an expanded include in its place, recursively: section wrapping (C2-H-026), the one-line forms of an item and a quote (C2-H-006, C2-H-007), the bare first paragraph of a description (C2-H-040) and the placement of the footnote section (C2-H-158).

Example 28 (unverified)

File `a.crv`:

```carve
= Chapter

Body.
```

File `one.crv`:

```carve
One
```

::: compare

```carve
{{ a.crv }}

Parent text.

- {{ one.crv }}
```

```html
<section id="Chapter">
  <h1>Chapter</h1>
  <p>Body.</p>
  <p>Parent text.</p>
  <ul>
    <li>One</li>
  </ul>
</section>
```

:::

The section opened by the included heading takes the blocks of the including file that follow, as it would in one file.

**C2-N-076** With `sourceLines` on, an element rendered from an included node carries the line it starts on in its own file (C2-H-016, C2-N-019). The line is not mapped into the including file.

Example 29 (unverified, `sourceLines` on)

File `a.crv`:

```carve
Hi
```

::: compare

```carve
Top.

{{ a.crv }}
```

```html
<p data-source-line="1">Top.</p>
<p data-source-line="1">Hi</p>
```

:::

**C2-N-077** A profile tests an include like any block (C2-H-163). `full` and `article` accept it. Under `comment` and `minimal`, whose allow lists do not name `include`, the include is outside the profile, expanded or not, and is written in its degraded form, the source text of its directive (C2-H-165); its children are not written, and `profile-construct-degraded` reports it once.

Example 30 (unverified, `profile` set to `comment`)

File `a.crv`:

```carve
Included text.
```

::: compare

```carve
{{ a.crv }}
```

```html
<p>{{ a.crv }}</p>
```

:::

**C2-N-078** An unexpanded include is a render loss (C2-N-070), so with `strictLosses` on a render of a tree that holds one returns no output (C2-H-130). An expanded include is no loss.

**C2-N-079** With `roundtrip` on, an expanded include still writes only its children, so an import of that HTML gives the included blocks in place of the directive. The render reports this as the render loss `include-expanded-roundtrip`, once for each expanded include that no expanded include holds. The abbreviation template of C2-H-178 covers the children of the document only; the definitions of an included file get no template.

## Writing and the sidecar

**C2-N-080** A Carve writer writes an include as its directive (C2-W-058), with its attribute line above it and its caption below it. It never writes the children and never writes `file`, and it reports no loss for either: both are resolution results (C2-N-017). (I12, carried over)

**C2-N-081** Because tree equality skips `children` and `file`, `parse(fmt(x)) == parse(x)` holds for a document with includes whether or not either side was expanded (C2-W-002).

**C2-N-082** The source-layout record covers the nodes of the top-level document. The nodes in the children of an include have no entries, and the include node has its own entry like any block, `optionSpelling` included (C2-L-055).

## Dependencies

**C2-N-083** The dependencies of a document are the include nodes of its tree, in tree order. Each names its path as written, its including file (C2-N-053), and whether it was read: a node with `file` was read, a node without `file` was not. With no resolver, every directive is a dependency that was not read.

**C2-N-084** A host that watches files for changes watches the distinct `file` values of the tree, and for each node without `file` the place its path would name relative to its including file. A host that wants a set rather than a list removes repeats by id.

Example 31 (unverified)

File `a.crv`:

```carve
{{ b.crv }}

{{ gone.crv }}
```

File `b.crv`:

```carve
B.
```

::: compare

```carve
{{ a.crv }}

{{ b.crv }}
```

```html
<p>B.</p>
<p>{{ gone.crv }}</p>
<p>B.</p>
```

:::

The dependencies are four include nodes in this order: `a.crv` read, `b.crv` read with the including file `a.crv`, `gone.crv` not read with the including file `a.crv`, and `b.crv` read with the including file the top-level document.

## Lint

**C2-N-085** A linter expands includes when its caller gives a resolver or a root, by the rules of this document and with the same limits. Without one it reads no include target, and each include reports `include-no-resolver` as in any parse. (I16, carried over)

**C2-N-086** The top-level document is linted as it is. Every Carve include that the expansion accepted is linted with every rule and with the options of the top-level document, over the source the expansion parsed: the whole file, the line range or the region. For a section the whole file is linted, and only the findings from the first line of the selected heading or block through the last line of the last selected block are kept. A rule that reads the payload of a block also runs on a code include's child.

**C2-N-087** A finding in included content names its file by id, with a line and a column counted in that file, and its tree path, which leads through the includes that reached it. A finding is reported once for each distinct file, line, column and rule; where one position is reached more than once, the first reach in document order supplies the path. `shift` does not make a range distinct. Lint control comments count the lines of their own file (C2-B-216).

**C2-N-088** On a delimited table include, `lines` is valid and counts physical lines, and lint adds the hint `include-lines-table-rows-hint`, which suggests `rows`.

## What 0.1 rules became

| 0.1 rule | In 0.2 |
| --- | --- |
| I1 syntax | shape: C2-B-201 to C2-B-206; semantics: C2-N-024 to C2-N-026, C2-N-034, C2-N-035 |
| I1a section | C2-N-027 to C2-N-033 |
| I1b region | C2-N-037 to C2-N-041 |
| I1c code | C2-N-042 to C2-N-045, C2-N-073, C2-N-074 |
| I1d rows and cols | C2-N-045 to C2-N-047, C2-N-088 |
| I2 block and inline | the block half is C2-N-002, C2-N-016; the inline half is dropped |
| I3 resolution model | C2-N-003, C2-N-007, C2-N-008, C2-N-011 |
| I4 mechanism | C2-N-015 to C2-N-019 |
| I5 collisions | C2-N-053 to C2-N-060; rename dropped |
| I6 limits | C2-N-064 to C2-N-067; the resolver-call bound dropped |
| I7 errors | C2-N-061 to C2-N-063, C2-N-068, C2-N-069 |
| I8 shift | C2-N-048 to C2-N-051 |
| I9 verbatim | C2-N-002, C2-N-042 |
| I9a run recognition | dropped |
| I10 containment | C2-N-012 to C2-N-014 |
| I11 dependencies | C2-N-083, C2-N-084 |
| I12 writer | C2-N-080, C2-N-081 |
| I15 Carve target | C2-N-005 |
| I16 lint | C2-N-085 to C2-N-088 |

I13 and I14 were unassigned in 0.1.

## Counts

| Section | Clauses | Exceptions | Examples |
| --- | --- | --- | --- |
| Scope and defaults | 7 | 0 | 1 |
| The resolver | 8 | 0 | 1 |
| Expansion | 9 | 0 | 8 |
| Selection, transforms and mode | 29 | 0 | 17 |
| References across files | 8 | 0 | 4 |
| Failures and limits | 10 | 0 | 3 |
| Attributes and captions | 4 | 2 | 3 |
| Rendering | 5 | 0 | 3 |
| Writing and the sidecar | 3 | 0 | 0 |
| Dependencies | 2 | 0 | 1 |
| Lint | 4 | 0 | 0 |
| **Total** | **89** | **2** | **41** |

The document has 89 clauses, 2 of them marked with the word "Exception", and 41 examples, all unverified. The clause count includes the exceptions. Clause ids are stable: a clause added later takes the next free number and stands at the end of its section.
