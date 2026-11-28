---
description: Convert Carve to and from other formats through the AST and the HTML importer.
---

# Format conversion

Carve 0.2 converts documents along a small number of specified paths and a few
engine paths beside them. The specified paths are HTML output, HTML import, the
2.0 AST in JSON, and the canonical Carve writer. Every engine also exports
Markdown, plain text and ANSI terminal text, and the reference JavaScript engine
imports Markdown, GFM, Djot and BBCode. Those exports and importers work, and
this page shows what they do, but their output is engine behavior that the
specification does not define. Bridges to other document models, such as Pandoc
and ProseMirror editors, are separate projects that read and write the 2.0 tree.

## Choose a path

| If you need | Use | What to inspect |
|---|---|---|
| HTML for display | `carve render`, or `render` in the library | The HTML and the render-loss entries |
| Carve from HTML | `carve import --from html`, or `importDocument(html, { from: 'html' })` | The tree, the written source, and the importer and writer losses |
| Carve from Markdown, GFM, Djot or BBCode | `carve import --from gfm` (or `markdown`, `djot`, `bbcode`) in the reference engine | The written source and the losses; the importers are outside the specification |
| Markdown, plain text or ANSI | `carve render --to markdown` (or `plain`, `ansi`), or `toMarkdown`, `toPlainText`, `toAnsi` from `@markup-carve/carve/export` | The output and the export losses; the exports are engine behavior |
| Structure for another tool | The 2.0 AST: `carve ast --envelope`, or `parse` and `encodeEnvelope` | The version, the extension declarations, fallbacks, and what the reading side validates |
| DOCX, LaTeX, Typst, EPUB or another Pandoc format | A Pandoc bridge over the 2.0 AST, such as [pandoc-carve](https://github.com/markup-carve/pandoc-carve) | The bridge's own loss report |
| A ProseMirror or Tiptap editor | The Tiptap kit of [carve-grammars](https://github.com/markup-carve/carve-grammars), `@markup-carve/carve-grammars/tiptap` | Attributes the save did not read, and writer refusals |
| Another target | Your own writer over the 2.0 AST | The node types and fields your writer does not handle |

The [ecosystem page](./ecosystem) lists the bridges. AST 2.0 is a new contract,
so a bridge written for 0.1 needs a port before it reads 0.2 trees; check each
bridge's own release notes for its 0.2 status. For HTML input, the
[Import HTML](./html-import) page has the workflow and the options.

## Why conversion does not go through rendered HTML

Rendered HTML has already discarded facts that another document format may be
able to hold. The parsed tree still records:

- whether a list is tight or loose (`spacing`), which is content and not
  styling: a loose list read back as tight loses the paragraph breaks of its
  items;
- how a reference link was spelled (`[label][key]` and its definition), as
  opposed to only the address it resolved to;
- a short caption (`caption.short`) meant for a list of figures, which never
  renders;
- a comment, which renders nothing in any output.

A bridge built on HTML output is limited twice: once by what the HTML renderer
chose to write, and again by what the target's HTML reader understands. The
second limit is the dangerous one because it is silent. Tiptap rebuilds a
document through each extension's `parseHTML`, so an attribute that no extension
declares is dropped and nothing records that it happened. For a stored document
format that is the failure that cannot be repaired: the loss is invisible when it
happens and cannot be detected later.

Carve's own HTML can carry more than plain markup. With the `roundtrip` render
option, the renderer writes carriers, `data-carve-*` attributes that let the
importer rebuild facts plain HTML cannot hold. This source has a reference link
and an autolink:

<!-- carve-example {"options":{"roundtrip":true}} -->
```crv
See [the guide][g] and <https://example.com>.

[g]: /guide "Guide"
```

```html
<p>See <a href="/guide" title="Guide" data-carve-ref="g">the guide</a> and <a href="https://example.com" data-carve-autolink>https://example.com</a>.</p>
```

Importing that HTML gives back the same source, definition included. Rendered
without `roundtrip`, the same document carries no carriers, and the import
writes an inline link with its title and an explicit link for the autolink:

```crv
See [the guide](/guide "Guide") and [https://example.com](https://example.com).
```

The specification lists what a render without `roundtrip` loses on the way back,
carrier by carrier. Use rendered HTML for display, and as the import hub for
HTML that other tools wrote. When a Carve to HTML to Carve round trip matters,
render with `roundtrip` and check the report of both steps. When the target is
another document model, read the tree instead.

## A bridge reports; it never guesses

Every construct that crosses a bridge ends in one of three states, and a bridge
should tell the caller which:

| State | Meaning | Example |
|---|---|---|
| Carried | The target has an equivalent; nothing is lost | A paragraph, a table row |
| Degraded | The node type is gone, the text survives | A soft break becomes a space; smart punctuation becomes its glyph |
| Dropped | The content is gone | A node type the target model has no place for |

Which construct is in which state belongs to one bridge at one version, not to
Carve. A target that gains a node moves a type from dropped to carried. What
does not change is that the caller is told.

Degraded is a separate state on purpose. Dropping a soft break instead of
degrading it would run two words together, and dropping an escape would lose a
character. The text has to survive even where the node cannot, and the caller
still has to learn that the node did not.

That means an interface, not a log line that an operator might read. In 0.2 the
engines report into one diagnostics record that sits beside the tree. Each entry
has a `code`, a `severity`, a `channel` (`parse`, `render-loss` or `lint`) and a
`message`, plus a `path` into the tree where the entry is about a node and a
`range` in UTF-8 bytes where it has a position in the input. Importer and writer
losses use the `render-loss` channel. An importer entry also names the HTML node
it came from in `foreignType`. An application that stores documents can refuse
to save one whose record holds a loss.

A bridge that keeps the exact source of a construct it could not model is still
lossy in the sense that matters here: the construct is not editable, and an
editor that hands the document back has to reproduce content it does not
understand. It belongs in the report.

### Reading the loss report

This HTML has an inline style, a `<font>` element and a script:

```html
<p style="color:red">Hello <font face="Arial">world</font><script>x()</script></p>
```

`carve import --from html` writes this source:

```crv
{style=color:red}
Hello [world]{face=Arial}
```

and these entries on standard error, one per loss:

```text
page.html:1:28: warning import-element-mapped HTML font read as a span
page.html:1:59: warning import-element-dropped Raw content dropped with rawHtml off
```

`--report-losses FILE` writes the same entries as JSON, one object per input
file. The importer entry for the script looks like this:

```json
{
  "code": "import-element-dropped",
  "severity": "warning",
  "channel": "render-loss",
  "message": "Raw content dropped with rawHtml off",
  "foreignType": "script",
  "range": { "startOffset": 58, "endOffset": 78 },
  "line": 1,
  "column": 59
}
```

The command line adds `line` and `column`; the library entry has the other
fields. Three flags turn the report into a gate:

- `--strict-losses` makes every loss an error. The file fails with status 1 and
  the category `render-loss`, and no source is written.
- `--allow-loss CODE` exempts one code, and can be given more than once.
- `--max-render-losses N` caps how many entries are kept; the rest are counted
  in `suppressed`.

Without `--strict-losses`, a writer loss still fails the file, with the
category `writer-refused`, because the written source would not hold the tree.
Every other loss is reported while the source is written. An input the importer
cannot read at all, such as one nested deeper than a reader accepts, ends the
run with status 2 and the category `import-input-invalid`. In the library the
same settings are the options `strictLosses`, `allowLosses` and `maxLosses`;
`importDocument` returns `document`, `source` and `diagnostics`.

The 0.1 migration report, with its four fidelity levels (`preserved`,
`normalized`, `degraded`, `dropped`), its confidence values and its
`fidelity-unverified` entry, is not part of 0.2. The diagnostics record above
replaces it for single files; the directory import of the reference engine still
writes a `migration-report.json` of its own, described below.

The reverse direction has a stricter rule: a name the bridge does not know is an
error, not a skip. An editor that gained a node type nobody mapped is exactly the
case where a quiet skip destroys the most content.

This is the same principle the renderers follow one stage later.
[Graceful degradation](./graceful-degradation) governs what a renderer may drop
when a target cannot be interactive: the interaction, never the words. A bridge
governs what a converter may drop when a target model is smaller than Carve's:
a node, never in silence.

## Markdown, GFM and Djot import

The reference JavaScript engine reads Markdown, GFM and Djot by rendering them
to HTML with each format's reference library (micromark for Markdown and GFM,
djot.js for Djot) and importing that HTML with the 0.2 HTML importer. The Carve
source is then written by the canonical writer, so it follows the same
escaping and canonical spelling as every other written source. BBCode is turned
into HTML by the engine itself. These importers are outside the 0.2
specification, and the other engines offer their own subsets, if any; the HTML
import they rely on is specified.

### Use `gfm` for ordinary Markdown

`--from markdown` reads strict CommonMark. `--from gfm` adds the GitHub
extensions: tables, task lists, strikethrough, bare URL links, footnotes and
alerts. Most Markdown in the wild is GFM, and a host that offers a "Markdown"
import should pass `gfm`. With `markdown`, GFM constructs become escaped text
without any error.

```md
# Guide

Some **bold** and _emphasis_, ~~gone~~.

| a | b |
|---|--:|
| 1 | 2 |

1. [x] done

> [!NOTE]
> Heads up.
```

`carve import --from gfm` writes:

```crv
= Guide

Some *bold* and /emphasis/, {-gone-}.

|= a |={>} b |
| 1 | 2 |

. [x] done

::: note
Heads up.
:::
```

Strikethrough becomes a deletion, the table gets `|=` header cells with the
alignment of the separator row, the GitHub alert becomes an admonition, and the
ordered task item keeps its box: 0.2 has task items on ordered lists, so the
0.1 loss for an ordered checkbox is gone. With `--from markdown`, the same input
keeps the table as escaped text, keeps `~~gone~~` and `[x]` as text, and leaves
the alert as an ordinary quote whose `[!NOTE]` line `carve lint` then reports as
`github-alert-marker`.

### What the written source looks like

Because the importer reads the HTML that micromark writes, some spellings
change on the way:

- A link or image destination is written percent-encoded, as the HTML holds it:
  `[a](/ü.png)` imports as `[a](/%C3%BC.png)`, and `[a](/x[y])` as
  `[a](/x%5By%5D)`. A GFM bare URL becomes an explicit link whose text keeps the
  readable form: `https://e.com/ü` imports as
  `[https://e.com/ü](https://e.com/%C3%BC)`. In 0.1 the importer kept the
  destination characters as written.
- An HTML comment or an HTML block is kept as a raw HTML fence
  (` ```=html `). A Markdown input always keeps raw HTML, whatever `rawHtml`
  says; rendering it still needs `--raw-html`. In 0.1 a comment-only HTML block
  became a Carve comment.
- A paragraph that holds only one image is written as a block image.
- A reference link becomes an inline link, because the HTML holds only the
  resolved address.

The library can say, construct by construct, what the tree holds. With the
option `constructs`, `importDocument` adds a list of the constructs it found in
the input, each with the Carve node type it imports as and a `status` of
`preserved` or `unverified`:

```js
importDocument('Some **bold** text.\n\n1. [x] done\n', { from: 'gfm', constructs: true }).constructs
```

```json
[
  { "construct": "strong", "node": "strong", "status": "preserved", "range": { "startOffset": 5, "endOffset": 13 } },
  { "construct": "listOrdered", "node": "list", "status": "preserved", "range": { "startOffset": 21, "endOffset": 32 } }
]
```

The check works per node type: a type counts as preserved when the tree holds
one node of it for each construct that imports as it and no loss names an
element it came from. A construct lost anywhere leaves every construct of its
type `unverified`, so the list never claims the wrong one. The option is
available for Markdown, GFM and Djot.

### Front matter in a Markdown file

Markdown has no front matter. Jekyll, Hugo and similar generators consume a
leading `---` block before the Markdown reader sees it. The reference importer
takes a leading block between two `---` lines as YAML front matter, without
looking at what the block holds:

```md
---
Foo
---
Bar
---
Baz
```

imports as:

<!-- carve-sample {"lint":"the written source opens frontmatter on line 1, which lint reports"} -->
```crv
---
Foo
---

== Bar

Baz
```

Under CommonMark that input is a thematic break, a heading `Foo`, and so on, so
`Foo` has moved into metadata that no output shows, and no entry reports it.
`carve lint` does flag the result with `frontmatter-shaped-thematic-break`.
A typed opener such as `---yaml` is not front matter in a Markdown input:
CommonMark reads it as text, and in this position as part of a heading. Check the first block of a converted file when the input may
start with a thematic break. In 0.1 the importer tested whether the block was
shaped like a mapping and reported every conversion as
`frontmatter-synthesized`; the 0.2 reference importer does neither.

### Converting a directory

`carve import --from gfm --directory DIR --output OUT` converts a tree of
Markdown files, rewrites links between them to the `.crv` names, and writes
`migration-report.json` into the output directory. Directory import and its
report are reference tooling outside the specification.

Carve keeps a heading's case in its id, while GitHub and most Markdown tools
lowercase it. When a link fragment in one file matches no id exactly but matches
one heading id without regard to case, the directory import rewrites the
fragment to that id. In a folder where `a.md` links to a heading in `b.md`:

```text
a.md:  # Guide
       See [steps](b.md#install-steps).
b.md:  # Install Steps
```

`a.crv` is written as:

```crv
= Guide

See [steps](b.crv#Install-Steps).
```

and the report records the rewrite for `a.md`:

```json
{
  "source": "a.md",
  "output": "a.crv",
  "diagnostics": [
    {
      "code": "link-fragment-case-rewritten",
      "severity": "hint",
      "channel": "parse",
      "path": "/children/1/children/1",
      "message": "Rewrote link fragment #install-steps to #Install-Steps, the one heading id it matches without regard to case."
    }
  ],
  "links": [{ "target": "b.md#install-steps", "status": "rewritten" }]
}
```

The entry is a hint, so it fails no gate, and its `path` points at the link in
the written tree. A fragment that matches several heading ids without regard to
case, or none, is not rewritten. A single-file import does not rewrite
fragments; `#install-steps` stays as written.

## BBCode import

The reference engine reads forum BBCode with `--from bbcode`. Like the other
foreign importers it is outside the specification. Inputs past a size limit are
refused with `BbcodeInputTooLargeError`.

### Quote attribution

Forum software writes who is being quoted into the opening tag. phpBB writes a
user id as well:

```text
[quote="alice" post_id=12 time=1700000000 user_id=3]q3[/quote]
```

The quote converts to a quote with a caption:

```crv
> q3
^ alice (2023-11-14) #12
```

The attribution is the text after `[quote=` or `[quote ` up to the closing `]`;
both openers read it the same way. It splits into parts at ASCII whitespace:

- a field `key=value`: the key is an ASCII letter or `_` followed by ASCII
  letters, digits, `_` or `-`, compared without regard to case. The value is the
  text between a matching pair of `"` or `'` right after the `=`, or else the run
  of non-whitespace characters after it;
- quoted text: `"..."` or `'...'` up to the matching quote;
- a bare word: any other run of non-whitespace characters.

The quoted texts and bare words, in order and joined by single spaces, are the
attribution's text. Fields map as follows. The first field of each kind wins,
and a later one of the same kind is dropped.

| Part | Reads as |
|---|---|
| `name=` or `author=` | The name |
| The text, when no `name=` or `author=` is present | The name |
| `post_id=` with an all-digit value | The post id |
| `id=` with an all-digit value, when no `post_id=` is present | The post id |
| Quoted text that is only digits and opens the attribution (`[quote="9"]`), when no `post_id=` or `id=` is present | The post id |
| `;` and digits ending the text (vBulletin `[quote=bob;123]`), when no other post id is present | The post id |
| `date=` | The date, as written |
| `time=` with a value of 9 to 11 digits | The date: Unix seconds as the UTC calendar day `YYYY-MM-DD` |
| `time=` with any other value | A clock time, written after the `date=` value and a space, or alone |

These are dropped:

- `user_id=`, a field with an empty value, a `post_id=` or `id=` whose value is
  not all ASCII digits, and every key the table does not name;
- `id=` when `post_id=` is present, and a leading quoted post id
  (`[quote="9" post_id=12]`) when `post_id=` or `id=` is present;
- `date=` when a Unix `time=` is present;
- the text when `name=` or `author=` is present.

The caption is `name (date) #id`, each part left out when it is absent and the
parts joined by single spaces. When all three are absent the quote gets no
caption line: a bare `^` is not a caption.

Text inside `[code]`, `[c]`, `[icode]` and `[noparse]` is content, not
attributes, so a quote tag written there becomes code text.

Where these rules come from:

- phpBB's quote tag declares `author` (the `[quote="name"]` value), `post_id`,
  `time` as Unix seconds, `user_id`, `msg_id` and URL fields. Of those, only the
  author, the post id and the time belong in a caption. A key phpBB does not
  declare, such as `foo=bar`, is not part of the author's name, so it is dropped
  rather than printed.
- `post_id=` is phpBB's post id field, so it wins over a generic `id=`. A Unix
  `time=` is phpBB's post timestamp, so it wins over a `date=` that no phpBB
  quote writes.
- phpBB writes its named fields after a space and unquoted (`post_id=12`), so a
  field reads the same quoted or not, and after either opener
  (`[quote name="bob"]`).
- No forum format decides a repeated key, so the first one wins for every key.
- No forum format decides how the caption spaces its parts, so the gaps that
  removed fields leave behind are not kept.

In 0.1 every dropped part was reported as `bbcode-quote-field-dropped`. The 0.2
reference importer drops the same parts without an entry, so a caller that must
know about a dropped `user_id` has to look at the input.

## Markdown, plain text and ANSI export

Every engine exports a tree as Markdown, plain text or ANSI terminal text.
The specification names these exports and leaves their output to the engine,
except that only the Markdown export reads `headingShift`. The export-only loss
codes are not in the shared catalog either.

```crv
= Release notes

The /new/ parser is *faster*, see [the guide](https://example.com/guide).
Water is H{,2,}O.

{.checklist}
- [x] Ship it
- [ ] Write the post
```

`carve render --to markdown` writes CommonMark with GFM tables, task lists,
strikethrough and footnotes, and uses HTML elements where Markdown has no
spelling:

```md
# Release notes

The *new* parser is **faster**, see [the guide](https://example.com/guide).
Water is H<sub>2</sub>O.

- [x] Ship it
- [ ] Write the post
```

and reports the class it could not keep:

```text
notes.crv:6:1: warning markdown-attributes-dropped Dropped block attributes in Markdown
```

`carve render --to plain` writes the text without markup:

```text
Release notes

The new parser is faster, see the guide. Water is H2O.

- Ship it
- Write the post
```

The plain export drops the link address and the task boxes without an entry,
and the Markdown export writes some constructs, such as an admonition or a
description list, in a simpler form without one either. Treat an empty loss
report from an export as "nothing the export chose to report", and compare the
output for the constructs your documents use. In the library, `toMarkdown`,
`toPlainText` and `toAnsi` return `output` and `diagnostics`, and
`strictLosses` makes them throw `CarveExportError` instead.

## Check conversion in both directions

Before storing converted content, test both directions on documents that matter
to your application:

1. Convert Carve to the target format and read the loss report.
2. Convert the result back to Carve.
3. Compare the trees, not the bytes.

`carve diff` compares the trees of two Carve files and prints the JSON Patch
that turns the first into the second, with exit status 1 when they differ. For
the reference link above, the round trip through HTML with `roundtrip` is clean:

```sh
carve render --roundtrip doc.crv > doc.html
carve import --from html doc.html > back.crv
carve diff doc.crv back.crv
```

prints nothing and exits with 0. Without `--roundtrip`, the same check names
every fact that did not come back:

```text
remove /children/0/children/1/key
remove /children/0/children/1/namespace
remove /children/0/children/1/refForm
add /children/0/children/1/tooltip "Guide"
replace /children/0/children/3 {"children":[{"type":"text","value":"https://example.com"}],"href":"https://example.com","type":"link"}
remove /children/1
replace /srcByteLength 80
```

A target format may lack a Carve construct; that construct should be reported
as degraded or dropped. The reverse direction matters more: an unmapped construct
in the target document must be an error, because silently skipping it destroys
content. In the library, `diffTree` returns the same patch and `applyPatch`
applies one.

## Bridge details

A bridge reads and writes the 2.0 tree. The [AST JSON page](./ast-json)
describes the tree, and the [AST contract page](./ast-json-contract) the rules a
reader and a writer follow. Four parts of the contract matter most to a bridge:

- **Validate what you read.** `decodeTree` reads JSON text and `validateTree`
  checks a value; both refuse a tree that is not contract 2.0 with
  `CarveTreeError` and the path of the problem. A bridge that writes trees should
  run its output through one of them in its tests.
- **Foreign constructs.** A construct with a core equivalent maps to core nodes.
  One without may be carried in declared `data` or in an extension node with a
  fallback. A writer that cannot carry it reports the loss with its JSON path.
- **Provenance and style.** The optional data namespaces `carve.source` and
  `carve.style` let an importer record where a node came from (format, a locator
  such as a part and an element path, and the importer's name and version) and
  simple paragraph and page styles. The renderer and the Carve writer ignore
  both, so they cost nothing where unused.
- **Shapes Carve source cannot spell.** A bridge may supply nodes and fields that
  no parse produces, such as `caption.short`, `image.longDescription`,
  `table_cell.scope`, blocks inside a table cell, `small_caps`, `section` or
  `ruby`. JSON keeps them and HTML renders them, but the Carve writer reports
  each one it cannot write.

For a supplied tree, `writeWithDiagnostics` returns the source and the losses.
This tree has an image with no alt text and a `small_caps` node:

```json
{"type":"document","astVersion":"2.0","children":[
  {"type":"paragraph","children":[{"type":"text","value":"Logo: "},{"type":"image","src":"logo.png"}]},
  {"type":"paragraph","children":[{"type":"small_caps","children":[{"type":"text","value":"Nasa"}]}]}
]}
```

The writer returns the source `Logo: ![](logo.png)` and `Nasa` and two entries:

```json
[
  { "code": "image-alt-unknown", "severity": "warning", "channel": "render-loss",
    "message": "Carve source cannot spell an unknown alt text; the image is written with an empty one",
    "path": "/children/0/children/1" },
  { "code": "structure-unspellable", "severity": "warning", "channel": "render-loss",
    "message": "Carve source cannot spell a small_caps node here",
    "path": "/children/1/children/0" }
]
```

`write` throws `CarveWriteError` for the same tree, and `carve fmt --from-ast`
fails it with the category `writer-refused`. The
[writer escaping page](./writer-escaping-strategy) explains how the writer
decides its spelling.

### Editors: the Tiptap kit

`@markup-carve/carve-grammars/tiptap` loads Carve 0.2 into a Tiptap editor and
writes it back. The caller passes in the carve-js engine, so the kit does not
bundle it:

```js
import { Editor } from '@tiptap/core'
import * as carve from '@markup-carve/carve'
import { CarveKit, carveToProseMirror, serializeToCarve } from '@markup-carve/carve-grammars/tiptap'

const editor = new Editor({ extensions: [CarveKit], content: carveToProseMirror(source, { engine: carve }) })
const next = serializeToCarve(editor.getJSON(), { engine: carve, source })
```

`serializeToCarve` throws the engine's `CarveWriteError` when the writer cannot
spell the edited tree, and returns `source` unchanged when nothing was edited.
`proseMirrorToTreeWithOrigins` also lists, under `ignored`, every attribute the
save did not read, with the JSON pointer of its node in the editor document.
That list is the place to look for content an editor extension added that the
tree has no field for.

The carve-js and carve-rs engines have no ProseMirror bridge of their own. Their
HTML importer takes an `adapter` option (`tiptap`, `prosemirror`, `ckeditor`,
`tinymce`, `word`, `google-docs`) for HTML that an editor wrote. That is a
different job at a different stage: it reads editor HTML, not a ProseMirror
document. The `tiptap`, `prosemirror`, `ckeditor` and `tinymce` values read the
input like `generic`, because the mapping already covers what these editors
write; `word` and `google-docs` also rebuild footnotes from the anchors those
exports write. carve-php has a ProseMirror bridge of its own; see its
documentation for its 0.2 status.

:::: details Bridge implementer notes

The rest of this page explains how a bridge keeps its vocabulary aligned with
the tree. Application developers can stop after the bridge table.

**Keep every field the editor does not own**

A bridge needs a place in the target model for every Carve node type, and for
every field of those types. The mistake that 0.1 bridges made was to name the
attributes per implementation: two bridges to the same model each stored list
tightness and reference spelling under different names, each round-tripped
perfectly within itself, and a document stored by one and read by the other lost
those facts silently.

The 0.2 Tiptap kit avoids that by construction. Each ProseMirror node and mark
keeps, in one `carve` attribute, the tree fields the editor does not own, so
`proseMirrorToTree(treeToProseMirror(tree))` gives the same tree for any
document. A node the editor's content model cannot hold becomes an atom that
carries the whole tree node. A second bridge to the same editor model should
read and write that attribute rather than invent its own names.

**An application's own node type**

A bridge does not need to know an application's private constructs for them to
survive. An attributed div carries them as data:

```crv
{#calc-1 data-label="Heat demand" data-unit=kWh}
::: calculation
42
:::
```

```html
<div id="calc-1" class="calculation" data-label="Heat demand" data-unit="kWh">
  <p>42</p>
</div>
```

In the Tiptap kit that becomes a `carveDiv` node whose `carve` attribute holds
the id, the class and both data attributes, and it comes back spelled the same
way. A new editor node with its own ProseMirror name needs a mapping in the kit
first, so that every bridge uses the same vocabulary.

**Five readings where Carve and Pandoc differ in kind**

Most of the vocabulary maps by name. In five places the two models hold the
same information in a different shape, so a bridge has to choose a reading. Two
bridges choosing separately is how vocabularies drift, so a Pandoc bridge should
use these:

| Construct | Carve 2.0 tree | Pandoc | Reading |
|---|---|---|---|
| Description lists | A flat run of `definition_term` and `definition_description` nodes | `[([Inline], [[Block]])]`, grouped | A run of terms opens a group; the descriptions after it belong to that group |
| Citation mode | `mode` on each `citation` item | `CitationMode`, per citation | The item's `mode` maps one to one; no `mode` means `normal` |
| Quotes | A pair of `smart_punctuation` nodes with content between | `Quoted`, wrapping its content | Pair within one inline sequence, else write the glyph |
| Line blocks | A `line_block` of `line` nodes | `LineBlock`, a list of lines | One `line` per Pandoc line; an empty `line` ends a stanza |
| Document metadata | `frontmatter` holding `format` and the raw `value` | `Meta`, structured | The bridge parses the value; the tree stays raw |

*Description lists.* The tree does not publish the grouping on purpose: two
engines that published it grouped the same document differently. Pandoc's term
slot is a single `[Inline]`, so two terms that share one description join with a
`LineBreak` instead of making two entries. A description with no term before it
attaches to the group already open, not to an empty term list, which would
invent an entry the source does not have.

*Citation mode.* The tree holds `normal`, `author-in-text` and
`suppress-author`, the three Pandoc modes, on each item; a group has no mode of
its own. So a Pandoc `Cite` that mixes modes crosses intact. The way back to
Carve source is what loses: core Carve has no citation spelling, and the writer
writes the group's `raw` bracket text. A locator (`label` and inline `children`)
has no Pandoc field and goes into the citation suffix; the visible text is
unchanged.

*Quotes.* Building `Quoted` is worth doing and safe while the pairing is
conservative. A pair that opens and closes inside one inline sequence becomes
`Quoted`; anything else, such as an unmatched opener or a pair across an
emphasis boundary, writes the glyph that the `smart_punctuation` node stands
for. A bridge never reaches across a construct boundary to find a partner.

*Line blocks.* 0.2 gives each line its own node, so a bridge no longer splits a
paragraph at hard breaks. A line keeps the spaces that lead it as text, and an
empty line ends a stanza.

*Document metadata.* `frontmatter.value` stays raw, because the tree holds the
document and not one reading of it. The YAML reaches Pandoc's `Meta` through the
bridge's own parser, so the supported subset is the bridge's to document.

**A rich image description has several landing places**

Pandoc's `Image` carries `[Inline]` as its description, and an HTML
`<figcaption>` on an imported figure carries flow content. Carve's `image.alt`
is a flat string, which is correct: an HTML `alt` is plain text, alternative
text for a reader who cannot see the image, not a visible caption. A bridge that
reads a rich description picks one of these and says which:

1. Flatten it to plain text in `alt`. The visible result is unchanged and the
   markup is gone.
2. Promote the image to a figure whose caption holds the inline content, when
   the content reads as a caption rather than alternative text. This is the
   lossless path, and the one to prefer when the image stands alone in its
   block.
3. Put block content in `image.longDescription`, which HTML renders after the
   image. Carve source cannot spell it, so the writer reports it.
4. Keep the form in declared `data` or an extension node with a fallback, when
   an exact round trip matters more than a clean tree.

::::

**Specification (external):** [AST tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [AST description lists](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#description-lists), [AST citations](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#citations), [AST foreign data](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#extension-nodes-foreign-data-and-resources), [shapes that Carve source cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell), [standard data namespaces](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#standard-data-namespaces), [HTML roundtrip carriers](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers), [HTML import diagnostics](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#diagnostics), [the import guarantee](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#the-guarantee), [editor adapters](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#editor-adapters), [writer: what it cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#what-the-writer-cannot-spell), [tooling scope](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#scope), [diagnostics and reports](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#diagnostics-and-reports), [`carve import`](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#carve-import), [exit codes](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#exit-codes), [Markdown import is GFM import](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#markdown-import-is-gfm-import), [command line and missing features](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#command-line-and-missing-features).
