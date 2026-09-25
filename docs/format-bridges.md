---
description: Convert Carve to and from Pandoc and ProseMirror without using rendered HTML as an intermediate format.
---

# Format conversion

Carve can convert to and from Pandoc documents for LaTeX, Typst, or DOCX output,
and ProseMirror documents used by editors such as Tiptap. These converters work
with structured documents instead of using rendered HTML as an intermediate
format. This preserves information that HTML cannot represent.

This page explains the design; it does not define required behavior. [Parsed
document JSON](./ast-json) defines the data exchanged between programs. [HTML
import](./html-import) defines conversion from HTML.

## Why conversion does not use rendered HTML

Rendered HTML has already discarded information that another document format
may support. The parsed Carve document can still record:

- whether a list was tight or loose, which is content and not styling - a loose
  list read back as tight loses its items' paragraphs;
- how a reference link was *spelled*, as opposed to where it resolved to;
- a `shortCaption`, which exists for a list of figures and never renders;
- a comment, which renders nothing anywhere by design.

A bridge built on HTML output is therefore bounded twice: once by what the HTML
renderer chose to emit, and again by what the target's HTML parser claims to
understand. The second bound is the dangerous one, because it is silent. Tiptap
rebuilds a document with each extension's `parseHTML`, so an attribute that no
extension declares is dropped and **nothing records that it happened**. For a
stored document format that is the unrecoverable failure: the loss is invisible
at the moment it occurs and undetectable afterwards.

That route still works, and it is still the right one for content an extension
understands but the engine has no node for. It is not the route to store
against. Every bridge listed below therefore reads the AST, which makes the same
loss visible: the bridge holds both the thing it was given and the vocabulary of
the target, and can compare them.

## A bridge reports; it never guesses

Every construct that crosses a bridge lands in one of three states, and a bridge
is expected to tell the caller which:

| | meaning | example |
|---|---|---|
| **carried** | the target has an equivalent; nothing is lost | a paragraph, a table row |
| **degraded** | the node type is gone, the text survives | a soft break becomes a space; a smart quote becomes its glyph |
| **dropped** | the content is gone | a node type the target model has no place for at all |

Which construct sits in which state is a property of one bridge at one version,
not of Carve - a target that grows a node moves a type from dropped to carried,
which is the direction these tables travel. What does not change is that the
caller is told.

Degraded is a distinct state on purpose. Dropping a soft break rather than
degrading it would run two words together, and dropping an escape would lose a
character - so the text has to survive even where the node cannot, and the
caller still has to be told the node did not.

In practice that means an API surface, not a log line an operator might read:
carve-php exposes `droppedTypes()` and `degradedTypes()` after a render and
carve-grammars returns `preserved` and `degraded` beside the document, so an
application that stores documents can refuse to save one that lost something;
pandoc-carve writes `pandoc-carve: degraded ...` to stderr for every lossy
construct. None of them degrades silently.

A bridge that keeps the exact source of what it could not model is still lossy
in the sense that matters here: the construct is not editable, and an editor
that hands the document back has to reproduce a blob it does not understand. It
belongs in the report.

Built-in HTML, Markdown, Djot, and BBCode migration entry points in carve-js and
carve-rs return a shared migration-result shape: converted Carve source plus a
machine-readable report with the source format and diagnostics whose entries
carry fidelity and confidence. Prefer that result over
a bare string when importing stored content, so degraded or dropped constructs
can become a review gate instead of a log message.

The version 2 contract uses `preserved`, `normalized`, `degraded`, and
`dropped`, with `exact`, `inferred`, or `fallback` confidence. The existing
HTML-import and converter corpora gate the built-in importers' output and
diagnostics. Cross-repository cases live in
`tests/importer-fidelity/manifest.json`, are validated against
`resources/importer-fidelity-schema.json`, and name the downstream repository
that must replay both their output and diagnostics.
The published schema describes the fixture manifest; its `schemaVersion` is not
the version of any one language binding's report. The same manifest is
published as `importer-fidelity-manifest.json` for downstream fixture sync.
The report envelope itself is defined by
`resources/migration-report-schema.json`.

Fidelity is ordered `preserved < normalized < degraded < dropped`. A loss gate
fails by default when any finding is `degraded` or `dropped`; `preserved` and
`normalized` do not fail it. Gate failure and tool failure MUST use distinct
nonzero exits, although a CLI may choose the actual numbers. A tool failure
writes no fidelity report. An empty diagnostic array asserts that the producer
performed complete construct-level assessment at the named `sourceFormat`
boundary. When that is not true, the producer MUST emit `fidelity-unverified`
as `dropped` with `fallback` confidence. `diagnostics-truncated` has the same
fail-closed classification.

`fidelity-unverified` does not suppress losses the importer can identify. An
importer MUST also report each known construct-level loss. For example, GFM
reads a checkbox on `1. [x] done`, but Carve spells task markers only on bullet
items. The ordered item keeps `[x]` as text and reports
`structure-unspellable` as `dropped` with `exact` confidence alongside
`fidelity-unverified`. Its message is pinned once, for every entry point that
reaches the loss, under
[a lost checkbox on an ordered task item](./html-import-contract#a-lost-checkbox-on-an-ordered-task-item-says-it-one-way).

The producer's `fidelity` is final: bindings MUST NOT reclassify it, and
fidelity MUST NOT be inferred from human-readable message text. Report and
diagnostic objects are intentionally open; consumers MUST ignore members they
do not understand. This reserves additive producer, dialect, and structured
location metadata without another schema-version break. A diagnostic `path`
is an opaque, producer-defined human locator and MUST NOT be resolved as a
portable machine path.

The reverse direction has a stricter rule: a name the bridge does not know is an
**error**, not a skip. An editor that grew a node type nobody mapped is exactly
the case where a quiet skip destroys the most content.

This is the same principle the renderers follow one stage later. [Graceful
degradation](./graceful-degradation) governs what a *renderer* may drop when a
target cannot be interactive - the interaction, never the words. A bridge
governs what a *converter* may drop when a target model is smaller than
Carve's - a node, never in silence.

## Check conversion in both directions

Before storing converted content, test both directions on documents that matter
to your application:

1. Convert Carve to the target format and inspect the loss report.
2. Convert the result back to Carve.
3. Compare the visible content and the structures your workflow depends on.

A target format may legitimately lack a Carve construct. That construct should
be reported as degraded or dropped. The reverse direction is more important:
an unmapped construct in the target document must be an error, because silently
skipping it destroys content.

The repository maintains detailed round-trip baselines for its built-in
converters in `resources/import-roundtrip-baseline.json`. Those measurements
are development gates rather than compatibility promises, so this guide does
not publish their changing totals.

## The bridges that exist

| Bridge | Carve to target | Target to Carve | Runtime |
|---|---|---|---|
| [pandoc-carve](https://github.com/markup-carve/pandoc-carve) | `carveToPandoc()` - Pandoc JSON, then every pandoc writer (LaTeX, Typst, DOCX, PDF, RST, JATS, EPUB) | `pandocToCarve()` - anything pandoc reads (DOCX, LaTeX, RST, Org, MediaWiki) | Node, plus a `pandoc` 3.x executable on PATH. Emitting or reading plain JSON needs no pandoc. |
| carve-php's [ProseMirror bridge](https://github.com/markup-carve/carve-php/blob/main/docs/prosemirror.md) | `ProseMirrorRenderer::renderJson()` | `ProseMirrorToCarve::convertJson()` | PHP only. No Node runtime, which is what lets a Tiptap editor in the browser and PHP rendering in a queue worker or CLI command share one stored document. |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | `carveToProseMirror()` | `serializeToCarve()` | Node. Owns the `CarveKit` schema and the shared name map. |

Two of those bridges reach the same target model from different runtimes, which
is the arrangement to expect rather than a duplication to resolve: an editor
needs the model in the runtime the application already has. The PHP pair is what
lets a Tiptap editor in the browser and PHP rendering in a queue worker share
one stored document with no Node runtime anywhere in the pipeline.

carve-js and carve-rs have no bridge of their own. Both accept a `prosemirror`
adapter for [HTML import](./html-import), which normalizes editor-produced HTML
on the way in - a different job, at a different stage, from converting a
ProseMirror document. For carve-js that is by design: the ProseMirror vocabulary
and its schema live in carve-grammars, avoiding a second copy that could drift.

:::: details Bridge implementer notes

The remainder explains how bridge implementations keep their vocabularies
aligned. Application developers can stop after the bridge table.

**One vocabulary, copied rather than restated**

A bridge needs a name for every Carve node type in the target's vocabulary, and
the tempting mistake is for each implementation to write that mapping down
itself. carve-php did once, and emitted `citation-group` where everything else
spelled it with an underscore.

The Carve to ProseMirror mapping therefore has one owner,
`tiptap/schema-map.json` in carve-grammars, published with the `CarveKit` schema
it describes. Other engines copy the map and record which commit they copied,
rather than restating it; carve-php's corpus test fails if the engine grows a
node type the map has no decision for.

The map is also where the *absences* are written down. Alongside the names it
carries an `unmapped` block naming every Carve type the editor model does not
hold and why - a soft break is whitespace in the ProseMirror model, smart
typography is lossy on reparse, a caption number is a resolution artifact rather
than editor content. A bridge reads its degradation list from there instead of
inventing one, which is what keeps two bridges to the same model from disagreeing
about what was lost.

**A name is only half a vocabulary**

Naming the node a type becomes leaves the attributes to each implementation, and
that is where two bridges to the same model drifted: one wrote `ref`, `rawRef`
and `autolink` on the link mark where the other wrote `carveRef`,
`carveRawRef` and `carveAutolink`; one recorded a list's marker style and the
other its tightness, neither both. Every one of those names round-trips
perfectly within its own bridge, so no test either implementation had could see
it. A document stored by one and read by the other lost its reference spelling,
its list tightness and its table spans - silently, which is the failure mode this
whole page exists to rule out.

So the map names the attributes too, under one rule: an attribute carrying a
CARVE concept on a node the target model already defines is prefixed, and a node
the map itself owns keeps bare names. `carveRef` on the stock link mark;
`carveTight` on the stock list; plain `raw` on `carveCitation`, which is ours.
HTML-native names - `id`, `class`, `href`, `colspan` - keep their spelling
wherever they appear.

Names in a document and names in a map can still disagree, so the map ships
FIXTURES beside itself: a set of Carve sources with the exact target document
each must produce. A bridge in another runtime copies them and asserts against
them, which turns "we both read the same map" into something a test can fail.

**The preservation node is part of the wire**

A bridge that keeps an unmodeled construct as exact source needs somewhere to
put it, and that node crosses runtimes like any other. carve-grammars writes a
`carveUnsupported` atom holding the source; carve-php refuses an unknown name by
design, so every such document was rejected outright on arrival - 179 of 1025 in
one measurement. Neither behavior is wrong on its own; the pair is, and the fix
is for the preservation node to be in the map rather than in one bridge's head.

It carries the source verbatim AND the type it stands in for. Without the type
the caller learns that something was preserved and never what, which is the same
silence the atom exists to avoid.

Pandoc's side needs no shared map, because it reads the serialized
[AST exchange format](./ast-json) directly - the shape
[`resources/ast-schema.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json)
pins. Any engine that can write that JSON can feed the bridge, not only the one
it ships beside.

**Five readings where the two models differ in kind**

Most of the vocabulary maps by name. Five places do not: the models hold the
same information in a different SHAPE, so a bridge has to choose a reading, and
two bridges choosing separately is how the ProseMirror pair drifted. These are
the readings, measured against pandoc-carve rather than proposed for it. A
second bridge to Pandoc implements these, and does not re-decide them.

| | Carve | Pandoc | reading |
|---|---|---|---|
| definition lists | a flat run of `definition_term` and `definition_description` | `[([Inline], [[Block]])]`, grouped | a term run opens a group; the descriptions after it belong to that group |
| citation mode | `mode` per item, with `citation_group.mode` as the authored shorthand | `CitationMode`, three-valued, per citation | `suppressAuthor` picks `SuppressAuthor`; otherwise the item's own `mode` decides |
| quotes | a pair of `smart_punctuation` nodes with content between | `Quoted`, wrapping its content | pair within one inline sequence, else emit the glyph |
| line blocks | `lines`, naming where each line stops, over stanzas separated by `hard_break` | `LineBlock`, a list of lines | read `lines` where a stanza publishes them, split on `hard_break` where it does not; a U+E000 run becomes U+00A0 |
| document metadata | `frontmatter` holding `format` and raw `content` | `Meta`, structured | the bridge parses; the tree stays raw |

**Definition lists.** Pandoc's term slot is a single `[Inline]`, so a run of two
terms sharing one description joins with a `LineBreak` rather than producing two
entries. A description with no term before it attaches to the group already
open - not to an empty term list, which would invent an entry the source does
not have. The grouping is not published in the tree on purpose: two engines that
published it grouped the same document differently, and a plain grouping object
can carry no `pos`.

**Citation mode.** Carve source cannot spell a group whose items have different
modes, but the exchanged tree can: the mode sits on the ITEM, which is where
Pandoc's `CitationMode` sits, and `citation_group.mode` is the authored `+`
shorthand that fills every item of a source-spelled group. So a Pandoc `Cite`
mixing `AuthorInText` with `NormalCitation` crosses intact, with the group
carrying no `mode` of its own - a reader refuses a group whose `mode` any item
lacks, so the two cannot both be set halfway. What still belongs in the loss
report is the way back to SOURCE: a canonical writer has one marker per cluster
and flattens. A typed locator flattens into `citationSuffix`, since Pandoc's
`Citation` has no locator field - reported as `normalized`, not `degraded`,
because the visible text is unchanged.

**Quotes.** Synthesizing `Quoted` is worth doing and safe as long as the pairing
is conservative. A pair that opens and closes inside one inline sequence becomes
`Quoted`; anything else - an unmatched opener, a pair straddling an emphasis
boundary - emits the glyph, which is what the `smart_punctuation` node already
resolves to. That bound is what keeps re-pairing from guessing: a bridge never
reaches across a construct boundary to find a partner.

**Line blocks.** A stanza may publish `lines`: one pointer per line, naming the
`hard_break` that closes it. Read those where they are there, because a line
boundary can sit INSIDE an inline - `*a` on one line and `b*` on the next - and a
scan over the stanza's own children cannot see it. Where a stanza publishes none,
split `children` on `hard_break`, which is what a bridge did before the field
existed and what it still does against an engine that omits it. A leading run of
U+E000 is preserved indentation and maps to U+00A0, per the sentinel rule in the
[AST contract](./ast-json-contract). Without `lines`, an authored hard break
inside a verse line and a line boundary are the same node and stay
indistinguishable on the way back.

**Document metadata.** `frontmatter.content` stays raw, because §3a wants the
document and not a reading of it. The YAML lands in Pandoc's `Meta` through the
bridge's own parse, so the supported subset is the bridge's to document - and a
second bridge naming a different subset is the drift this section exists to
catch.

**A rich image description has three landing places, and none of them is a new field**

Pandoc's `Image` carries `[Inline]` as its description; an HTML `<figcaption>`
on an imported figure carries flow content. Carve's `image.alt` is a flat
string, which is correct rather than a limitation: an HTML `alt` attribute is
plain text, and it is alternative text for a reader who cannot see the image,
not a visible caption.

So a bridge reading rich description content picks one of three, and says which:

1. **Flatten it** to accessible plain text in `alt`, reported as `normalized` -
   the visible result is unchanged, the markup is gone.
2. **Promote the image to a `figure`**, where `caption` already holds inline
   content, when the content reads as a caption rather than as alternative
   text. This is the lossless path and the one to prefer where the image stands
   alone in its block.
3. **Keep the unrepresentable form in an interchange wrapper**, when an exact
   round trip matters more than a clean tree - the same preservation node the
   ProseMirror map defines, carrying the source and the type it stands in for.

Adding an inline caption field beside `alt` was considered and refused
([carve#2194](https://github.com/markup-carve/carve/issues/2194)): two
descriptions on one node with no stated rule about which a screen reader gets,
and which of them renders, is worse than a documented conversion. `figure` is
already the home for rich content, and an inline image that needs markup is
describing itself as a figure.

**An application's own node type**

A bridge does not need to know about an application's private constructs for
them to survive. An attributed container carries them as data:

```carve
{#calc-1 .calculation data-label="Heat demand" data-unit=kWh}
::: calculation
42
:::
```

That crosses into a ProseMirror document as the generic Carve div node with both
data attributes intact, and comes back spelled the same way. A new *editor*
node - one with its own ProseMirror name - belongs in the shared map first so
every bridge uses the same vocabulary.

::::
