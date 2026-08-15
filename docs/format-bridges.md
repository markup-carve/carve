---
description: Why Carve reaches other document formats and editor models through the AST rather than through rendered HTML, what a bridge owes its caller, and what a round trip proves about the AST itself.
---

# Format bridges

A bridge converts between the Carve AST and some other document model: Pandoc's
AST on the way to LaTeX, Typst or DOCX, a ProseMirror document on the way into a
Tiptap editor. This page says why that boundary sits at the AST rather than at
rendered output, what a bridge owes the caller that runs it, and why a bridge
round trip tests something about Carve that no HTML test can reach.

It is a rationale page, not a normative one. The normative wire shape is the
[AST exchange format](./ast-json); the normative HTML direction is the
[HTML import contract](./html-import).

## HTML is a sink, not a channel

Rendered HTML is the end of the pipeline, so it is a bad place to start a
conversion. The AST holds information HTML has no element for, and by the time
HTML exists that information is already gone:

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
carve-php exposes `droppedTypes()` and `degradedTypes()` after a render, so an
application that stores documents can refuse to save one that lost something;
pandoc-carve writes `pandoc-carve: degraded ...` to stderr for every lossy
construct. Neither degrades silently.

The reverse direction has a stricter rule: a name the bridge does not know is an
**error**, not a skip. An editor that grew a node type nobody mapped is exactly
the case where a quiet skip destroys the most content.

This is the same principle the renderers follow one stage later. [Graceful
degradation](./graceful-degradation) governs what a *renderer* may drop when a
target cannot be interactive - the interaction, never the words. A bridge
governs what a *converter* may drop when a target model is smaller than
Carve's - a node, never in silence.

## A round trip is an expressiveness test for the AST

Bridges are usually justified by reach: one conversion unlocks a whole family of
outputs. That is true, and it is not the most interesting property.

HTML conformance cannot prove the AST holds a thing. A field can be present in
the schema, absent from every renderer, and no HTML test will ever notice,
because HTML is lossy by construction - there is no element whose absence
implicates the field. Fields that no source spells and no renderer prints are
exactly the ones that rot unobserved.

A bridge to a mature foreign AST asks a question HTML never asks: *is there
somewhere to put this?* It gets asked in both directions, and the two answers
mean different things:

- **Carve to foreign.** A Carve node with no equivalent is a limit of the
  target. Expected, uninteresting, reported as dropped or degraded.
- **Foreign to Carve.** A construct the Carve AST cannot hold is a limit of
  **Carve**. That is a finding about the language, and it is the same diagnostic
  the [HTML import contract](./html-import) raises for a structure Carve cannot
  spell.

So a bridge is a distribution route and an audit at once. Round-tripping the
corpus through a foreign model is one of the few checks that can fail because
the exchange format is missing something, rather than because a renderer is.

That is also why the fidelity gate on a bridge is worth stating precisely.
carve-php's corpus sweep is narrow on purpose: a document whose types the editor
model fully covers must round-trip to **byte-identical HTML**; a document that
loses something is allowed to differ, because it must. A single gate over
everything would have to be loose enough to pass the lossy documents, and would
then stop detecting anything.

The other half of that gate is what happens to the exemptions. carve-grammars
drives its round trip off a coverage matrix and fails when a *skipped* category
round-trips cleanly for every one of its files, which forces the skip to be
promoted. Without that direction the exemption list only ever grows, and a list
that only grows stops describing anything.

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
ProseMirror document. For carve-js that is by design, since the ProseMirror
vocabulary and its schema live in carve-grammars and restating them in the
engine is the drift the next section describes.

## One vocabulary, copied rather than restated

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

Pandoc's side needs no shared map, because it reads the serialized
[AST exchange format](./ast-json) directly - the shape
[`resources/ast-schema.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json)
pins. Any engine that can write that JSON can feed the bridge, not only the one
it ships beside.

## An application's own node type

A bridge does not need to know about an application's private constructs for
them to survive. An attributed container carries them as data:

```carve
{#calc-1 .calculation data-label="Heat demand" data-unit=kWh}
::: calculation
42
:::
```

That crosses into a ProseMirror document as the generic Carve div node with both
data attributes intact, and comes back spelled the same way. A genuinely new
*editor* node - one with its own ProseMirror name - belongs in the shared map
first, for the reason the previous section gives.
