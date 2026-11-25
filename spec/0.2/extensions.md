# Carve 0.2: extensions

Status: provisional, not frozen with the core of Carve 0.2 on `next2`. The interfaces of this document may change in a 0.2.x release together with the extension catalog, because that work holds the open interface point O12 and may revisit two rulings of 17 November, the element around an attributed fallback (O15, C2-X-035) and the unresolved fallback after a renderer fails (O17, C2-X-050); see `STATUS.md`, "What is not frozen". The standard extensions are not frozen either.

This document defines the extension interface for Carve 0.2.0.

## Registration and matching

**C2-X-001** An extension is a versioned behavior identified by a qualified name under C2-A-123.

**C2-X-002** A producer declares each qualified extension it uses on the root or envelope with a name, a version, a required or optional flag and an ordered `slots` list of distinct names.

**C2-X-003** A reader refuses a required extension whose name or version it does not implement.

**C2-X-004** A reader preserves an unknown optional extension and uses its core fallback.

**C2-X-005** The matcher claims only an existing core node after core source parsing has finished.

**C2-X-006** An inline matcher claims `:name[content]{attributes}` under C2-I-094 by its source name.

**C2-X-007** The inline matcher receives the source name, parsed inline children and parsed attributes.

**C2-X-008** A block div matcher claims a `div` by the name after its opener run under C2-B-119.

**C2-X-009** The div matcher receives that name, the quoted title, the bracket label, parsed attributes and parsed body blocks.

**C2-X-010** A block fence matcher claims a `code_block` by the language on its opener.

**C2-X-011** The fence matcher receives that language, the title, the bracket label, parsed attributes and the code text value.

**C2-X-012** A name without a declared and enabled matcher stays the core node that the parser built: an inline source extension, a div with its first class, or a code block.

**C2-X-013** An extension adds no sigil, line shape or delimiter in 0.2.0.

**C2-X-014** Two enabled matchers cannot claim one core node; registration of such a pair fails before parsing.

## Transformation and carriage

**C2-X-015** A transform maps one claimed core node to one extension node of the same inline or block role. It may place further extension nodes that it produces inside the slots of that node, as the tabs transform places each `carve.tab` (C2-X-039).

**C2-X-016** A transform leaves every core node outside its claimed node unchanged.

**C2-X-017** A transform reads only the claimed node and its descendants.

**C2-X-018** The extension node carries the declared qualified name and version, with the same version as its declaration.

**C2-X-019** `props` is a JSON object whose keys and value types are defined by the extension's registered schema.

**C2-X-020** `slots` is an object of named child lists. The registered extension schema fixes each slot's content kind. The root or envelope declaration names the slots in order, including slots absent from a node. A slot name is a lowercase identifier and has no number suffix that encodes position. Repeated children form an ordered list in one slot. A walker visits slots in declaration order without a registry. A validator refuses a slot the declaration does not name.

**C2-X-021** `payload` is an optional list of alternatives with a nonempty format and a non-null JSON value under C2-A-122.

**C2-X-022** `fallback` is mandatory for every qualified extension node. It is core content of the node's own role, block or inline: it contains no extension node and validates as core content.

**C2-X-023** A reader without the extension resolves, renders and writes the fallback as core content, except where the Carve writer has a source form under C2-X-027. A writer without the extension writes that source form only when the written text parses back to one core node of that form and name whose canonical content is `body`, and otherwise writes the fallback and reports `structure-unspellable`. The source form it writes reports no loss: it reads back as that core node, which a reader with the extension claims again, and it is an exception to the equality of C2-W-002.

**C2-X-024** A source transform carries a `source` record with `form`, `name`, canonical `body` text, and any quoted title or bracket label, plus the core node's attributes on the extension node. The class a div takes from its name (C2-B-119) is no attribute of the extension node: `{#t .k}` above `:::: tabs` gives the attributes `id` `t` and the class `k`. Where the fallback is the claimed core node, it is that node without these attributes, which the extension node holds, so the fallback HTML of C2-X-035 writes each of them once.

**C2-X-025** `source.form` is `inline`, `div` or `fence`, and `source.name` is the claimed source name. A reader refuses a `source.name` that no matcher of its form can claim: for `div` a name that makes no plain div (C2-B-127), for `fence` a language that opens no `code_block`, for `inline` a name that is no inline extension name (C2-I-094).

**C2-X-026** `source.body` is the canonical Carve spelling of the claimed node's content, without its opener, closer or attached outer attributes.

**C2-X-027** A Carve writer with a source record writes the canonical `:name[body]`, colon-run div or fenced code block form under C2-W-039 and C2-W-040 and writes the extension node's attributes in the core attribute form.

**C2-X-028** A Carve writer without a source record writes the fallback and reports `structure-unspellable` at the extension node.

**C2-X-029** A transform gives the same node for the same claimed core node, extension version and configuration.

**C2-X-030** A reader refuses more than 32 nested unqualified inline extension nodes along `children` used as fallback under C2-A-124, or more than 8 MiB of decoded payload on one extension node under C2-A-132. The nesting bound counts only that path, the `children` of unqualified inline extension nodes: a qualified fallback holds no extension node (C2-X-022), so it nests none.

**C2-X-031** A reader refuses a `source.body` longer than 8 MiB in UTF-8 bytes and a qualified extension nesting depth greater than 32 through slots or children.

## Resolution, rendering and equality

**C2-X-032** Resolution visits one view of an extension node: its `children` and named slots when a renderer is registered in the selected mode's channel (C2-X-033, C2-X-052) for its name and version or for an extension node whose slots hold it, and the profile admits the node (C2-H-163), and its fallback otherwise. So a node the profile degrades is resolved in its fallback, which its degraded form writes (C2-H-165). Validation and the limits visit all of them. Resolution does not execute or inspect props, payload or source text.

**C2-X-033** A host registers a renderer by qualified name and version. The renderer receives the node, resolved child lists, fallback, rendering profile, URL policy, render `mode` (C2-H-122) and host helpers for escaped text, attributes, child lists and generated ids. Its `host.attributes(node, { block?, bare?, style? })` returns the attributes for an element, each with a leading space, in core writer order: `block: true` appends a generated `data-source-line` last when `host.sourceLines` is on and the node has a position; `bare: true` omits the node's authored id, classes and key-value attributes, so a synthesized row or row group can take only that generated line. With `style`, the helper merges the generated style declarations with an authored `style` into one attribute, at the authored key's position and with the value order of C2-H-009; without an authored `style` it writes the generated attribute in the order of C2-H-009. The host also exposes `sourceLines`, the effective boolean render option, and `blockDepth`, the current block indent in two-space units (C2-H-042).

**C2-X-034** An extension renderer is trusted host code. It returns an HTML string, which the host writes unchanged. The renderer uses the host helpers of C2-X-033 to apply escaping, the URL policy and the profile to its output. A host that renders untrusted documents registers only renderers it trusts. A structured output interface is left to a later version.

**C2-X-050** A host transform or renderer exception does not escape the engine. When a transform throws, the engine retains the claimed core node and reports a diagnostic that names the extension. When a renderer throws or returns a value that is not a string, the engine renders the extension fallback and reports a diagnostic that names the extension. That fallback is written unresolved, since resolution visited the slots (C2-X-032): its references, footnote references and cross-references render as unresolved text (C2-H-085, C2-H-086) and its headings carry no generated id, and the diagnostic says that the fallback was written unresolved. The size of a renderer's HTML string is the host's responsibility.

**C2-X-051** If the engine cannot prepare a claim's canonical source record because the writer reports a loss (C2-W-134) or refuses a repair (C2-W-133), the engine retains the core node and reports `extension-transform-failed` naming the extension. Parsing and rendering continue with that core node.

**C2-X-035** With no matching renderer, the HTML renderer writes the fallback and reports `extension-fallback-rendered`. Where the HTML renderer writes the fallback of an extension node that carries attributes (an `id`, a class or a pair, C2-A-032), here or after a renderer fails (C2-X-050), it writes the fallback inside a `<div>` for a block extension and a `<span>` for an inline extension, and that element carries the attributes by the rules of every element (C2-H-010 to C2-H-014). A node without attributes adds no element.

**C2-X-036** Every profile restriction and URL policy check applies inside slots and fallback.

**C2-X-037** Equality compares an extension node's name, version, props, children, slots, fallback, payload, resource ids and source record under C2-A-161.

**C2-X-038** A reader validates extension props and slot content kinds against its registered extension schema when it knows the extension. It validates slot names against the tree declaration even without a registry.

**C2-X-052** In `interactive` mode a registered interactive renderer handles the node. In `static` mode an explicitly registered build-time renderer handles it; registration for interactive mode alone does not select that channel. A build-time renderer returns self-contained HTML and receives the same host inputs and helpers as C2-X-033. With no renderer in the selected channel, C2-X-035 writes the fallback. Both channels obey C2-X-034 and C2-X-036.

**C2-X-053** A host may register ordered document transforms. After includes and ordinary resolution, before HTML rendering, each receives a copy of the resolved render view and returns a view; registration order is execution order, and a later transform sees the earlier result. A transform may inspect the whole document, replace or insert nodes declared by its extension, claim existing directive nodes, and edit core nodes of the view: change their attributes or content, or replace them with core nodes, as a transform that numbers headings or turns inline footnotes into text does. It does not change the authored tree, source record or the tree the Carve writer reads.

**C2-X-054** A document transform keeps core nodes it does not replace in their order and may claim a directive only once. The first registered transform to claim a directive owns it; a later claim fails that transform. Inserted extension nodes require their ordinary declaration, valid slots and core fallback. The normal tree limits and profile restrictions apply to the resulting view, and every URL it writes passes C2-H-159 to C2-H-161.

**C2-X-055** The host checks ids in the transformed view in document order after each transform. An inserted or replacement node with an authored id already used by a preceding node fails that transform; the first node keeps its id. A duplicate authored id that the view held before the transform ran, which C2-A-039 reports, fails no transform: only the nodes a transform inserted, replaced or edited are checked. Generated ids, including heading and extension control ids, are allocated again over the final view by their ordinary rules, avoiding every authored id and earlier generated id. References in that view resolve against the final ids before HTML is written. A failed document transform leaves its input view intact and reports a diagnostic naming the extension, as in C2-X-050. The checks of C2-X-054 and of this clause are observable only in their result: a view that fails one fails that transform as this clause says, and a view that passes all of them is rendered. An engine may check only the nodes a transform inserted, replaced or edited, since every node it kept passed the same checks before it ran; the result is the one a check of the whole view gives. A render with document transforms therefore resolves twice: once before the first transform, and once over the final view for the generated ids and references of this clause.

## Standard extension: tabs

The standard extensions are a catalog that follows the core: this section is not part of the freeze candidate, and the clauses of the sections before and after it are, with the provisional status of the head of this document.

**C2-X-039** The core provides optional `carve.tabs` and `carve.tab` extensions at version `1`. The `tabs` div matcher produces `carve.tabs`; the nested `tab` div produces `carve.tab` only inside its `tabs` slot. A `tab` div elsewhere stays a core div.

**C2-X-040** The `tabs` matcher claims a div only when its body has one or more `tab` divs and no other blocks, and each `tab` div has a nonempty quoted title.

**C2-X-041** `carve.tabs` has one slot, `tabs`, whose ordered items are `block_extension` nodes named `carve.tab` and nothing else. Each `carve.tab` has an optional `title` slot of inline nodes and a `body` slot of blocks. The transform puts the quoted title in `title` as inline content and the div body in `body`. Their declarations list `slots` as [`tabs`] and [`title`, `body`], respectively.

**C2-X-042** The transform gives each `carve.tab` a core fallback with its title as a `strong` paragraph, when present, followed by its body blocks. The `carve.tabs` fallback concatenates those sequences in tab order.

**C2-X-043** The tabs renderer writes one radio input, one linked label and one panel per item of `tabs` in order, with the input of the selected tab (C2-X-056) checked. That is its output in its default host option `mode`, `css` (C2-X-056). In `aria` mode it writes the WAI-ARIA tab pattern inside the same wrapper `div` instead: per item in order one `button` element with, in this order, `type="button"`, `role="tab"`, its `id`, `aria-selected` (`true` for the selected tab and `false` for the others) and `aria-controls` with the id of its panel, plus `tabindex="-1"` on every button but the selected tab's, holding the content the label would hold; then per item in order one panel, a `div` with, in this order, `class="tab-panel"`, `role="tabpanel"`, its `id` and `aria-labelledby` with the id of its button, plus `hidden` on every panel but the selected tab's. The renderer writes no script in either mode; a host that selects `aria` ships the script that switches the panels. Its build-time renderer, which a host registers for static mode (C2-X-052), writes no input, no `label` element, no generated id and no script: inside the same wrapper `div` it writes, per item in order, a `<section class="tabs-panel">` holding an `<h3 class="tabs-label">` with the content the label would hold, followed by the panel content. The selection does not change static output. Nor does the host option `mode`: the build-time renderer writes no button either. No output of the renderer has a line break between the elements it writes.

**C2-X-044** The tabs renderer renders each label from the tab's `title` slot and each panel from its `body` slot. It escapes text and attributes through the host renderer.

**C2-X-045** The tabs transform keeps the nested `tab` divs as div source in the outer `source.body`, in the canonical spelling of C2-X-026. A Pandoc bridge carries this structure as nested Divs with the classes `tabs` and `tab`.

**C2-X-046** A reader that knows `carve.tabs` (C2-X-038) refuses a `carve.tab` outside `carve.tabs.slots.tabs`, an item of that slot that is not `carve.tab`, or a tab without its `body` slot. The path of the refusal is the node it names: the `carve.tab`, the item of the slot, or the tab.

**C2-X-047** The tabs renderer groups the controls under the `tabsGroup` label (C2-H-125) and names each panel with the plain text of its title, or, when the title is absent, `Tab`, one space and its position counted from 1, as `Tab 1`. The wrapper is `<div class="tabs">` with `role="group"` and an `aria-label` with that group label before authored attributes are applied. It writes the authored id, `tabs` followed by the authored classes, and the other authored attributes in the order of C2-H-009. In `aria` mode the wrapper takes `role="tablist"` instead, and a panel takes its name from its button through `aria-labelledby` and carries no `aria-label`; a button without a title holds the `Tab 1` text. An authored `role` of the `carve.tabs` node takes the place of the generated role, and an authored `aria-label` or `aria-labelledby` the place of the generated name, in every mode: the wrapper writes the authored ones of these three attributes after its class, in their authored order, then the generated role and name that no authored attribute replaced. Without a stylesheet every panel of the `css` mode stays visible.

**C2-X-048** The tabs renderer gives each radio input a unique document-scoped id and links its label to that id. The groups are counted in document order from 1: group N has the input name `tabs-N`, and its inputs the ids `tabs-N-0`, `tabs-N-1` and so on, counted from 0. In `aria` mode each button takes the id its input would take, and the panel of button `tabs-N-K` the id `tabs-N-K-panel`. Where any authored id or any generated heading id is one of the ids of a group, that group takes the next N whose ids no authored id or generated heading id takes, and later groups count on from it. The ids of a group are the ids it writes in its mode. A code group uses a separate counter from 1: its Kth tab, counted from 1, has the id `codegroup-N-tab-K`. The collision rule above applies separately to the ids of each tabs or code-group scheme.

**C2-X-056** A tab's nonempty quoted title is its only label source (C2-X-040); a bracket label, a `label` attribute or a first heading does not supply a tab title. A tab whose attributes hold the key `selected`, with any value, is marked. The first marked tab is the selected tab, and with no mark the first tab is, so exactly one tab is selected; a later mark is ignored without a diagnostic. The standard tabs renderer takes the host option `mode`, `css` or `aria`, with `css` the default, as the code-group extension does; creating the renderer with another value fails. The option is a setting of the renderer, not the render option `mode` of C2-H-122, and it changes only the interactive output (C2-X-043). The group label of C2-X-047 applies in every mode, and the panel names in `css` mode only: in `aria` mode the button names its panel, and in static mode the heading of each section names it. A per-instance host class does not change the standard tabs contract.

Input:

```carve
:::: tabs
::: tab "Install"
Run setup.
:::

::: tab "Use"
Open the app.
:::
::::
```

Tree:

```json
{
  "type": "document",
  "astVersion": "2.0",
  "extensions": [
    { "name": "carve.tab", "version": "1", "required": false, "slots": ["title", "body"] },
    { "name": "carve.tabs", "version": "1", "required": false, "slots": ["tabs"] }
  ],
  "children": [{
    "type": "block_extension",
    "name": "carve.tabs",
    "version": "1",
    "children": [],
    "slots": { "tabs": [
      {
        "type": "block_extension",
        "name": "carve.tab",
        "version": "1",
        "children": [],
        "slots": {
          "title": [{ "type": "text", "value": "Install" }],
          "body": [{ "type": "paragraph", "children": [{ "type": "text", "value": "Run setup." }] }]
        },
        "fallback": [
          { "type": "paragraph", "children": [{ "type": "strong", "children": [{ "type": "text", "value": "Install" }] }] },
          { "type": "paragraph", "children": [{ "type": "text", "value": "Run setup." }] }
        ],
        "source": { "form": "div", "name": "tab", "title": "Install", "body": "Run setup.\n" }
      },
      {
        "type": "block_extension",
        "name": "carve.tab",
        "version": "1",
        "children": [],
        "slots": {
          "title": [{ "type": "text", "value": "Use" }],
          "body": [{ "type": "paragraph", "children": [{ "type": "text", "value": "Open the app." }] }]
        },
        "fallback": [
          { "type": "paragraph", "children": [{ "type": "strong", "children": [{ "type": "text", "value": "Use" }] }] },
          { "type": "paragraph", "children": [{ "type": "text", "value": "Open the app." }] }
        ],
        "source": { "form": "div", "name": "tab", "title": "Use", "body": "Open the app.\n" }
      }
    ] },
    "fallback": [
      { "type": "paragraph", "children": [{ "type": "strong", "children": [{ "type": "text", "value": "Install" }] }] },
      { "type": "paragraph", "children": [{ "type": "text", "value": "Run setup." }] },
      { "type": "paragraph", "children": [{ "type": "strong", "children": [{ "type": "text", "value": "Use" }] }] },
      { "type": "paragraph", "children": [{ "type": "text", "value": "Open the app." }] }
    ],
    "source": { "form": "div", "name": "tabs", "body": "::: tab \"Install\"\nRun setup.\n:::\n\n::: tab \"Use\"\nOpen the app.\n:::\n" }
  }]
}
```

HTML with the tabs renderer:

```html
<div class="tabs" role="group" aria-label="Tabs"><input type="radio" name="tabs-1" id="tabs-1-0" checked><label for="tabs-1-0">Install</label><input type="radio" name="tabs-1" id="tabs-1-1"><label for="tabs-1-1">Use</label><div class="tab-panel" role="group" aria-label="Install"><p>Run setup.</p></div><div class="tab-panel" role="group" aria-label="Use"><p>Open the app.</p></div></div>
```

HTML with the tabs renderer in `aria` mode:

```html
<div class="tabs" role="tablist" aria-label="Tabs"><button type="button" role="tab" id="tabs-1-0" aria-selected="true" aria-controls="tabs-1-0-panel">Install</button><button type="button" role="tab" id="tabs-1-1" aria-selected="false" aria-controls="tabs-1-1-panel" tabindex="-1">Use</button><div class="tab-panel" role="tabpanel" id="tabs-1-0-panel" aria-labelledby="tabs-1-0"><p>Run setup.</p></div><div class="tab-panel" role="tabpanel" id="tabs-1-1-panel" aria-labelledby="tabs-1-1" hidden><p>Open the app.</p></div></div>
```

HTML with the build-time tabs renderer, `--mode static`:

```html
<div class="tabs" role="group" aria-label="Tabs"><section class="tabs-panel"><h3 class="tabs-label">Install</h3><p>Run setup.</p></section><section class="tabs-panel"><h3 class="tabs-label">Use</h3><p>Open the app.</p></section></div>
```

HTML without the tabs renderer:

```html
<p><strong>Install</strong></p>
<p>Run setup.</p>
<p><strong>Use</strong></p>
<p>Open the app.</p>
```

Written Carve source:

```carve
:::: tabs
::: tab "Install"
Run setup.
:::

::: tab "Use"
Open the app.
:::
::::
```

## Standard extension source forms

**C2-X-057** A registered `wiki` inline matcher claims `:wiki[Page]` as an inline extension with the parsed content as its target and core-text fallback. In `:wiki[Page|Display]` the content before the first `|` is the target and the content after it the display text, which is the fallback: `:wiki[Main Page|home]` falls back to `home`. Without a `|` the content is both. Its renderer may turn that target into a link only through the host URL helper and C2-H-159. A heading reference uses the existing core `</#id>` or `[Label](#id)` forms, and a bare URL or email uses an angle autolink; none gets a new delimiter from an extension (C2-X-013).

**C2-X-058** A registered `cite` inline matcher claims `:cite[key]` as an inline extension with the key as its core-text fallback. A locator is an attribute, for example `:cite[doe]{locator="p. 4"}`, not punctuation inside the key. `:cite[a; b]` names several keys in one citation, separated by `;` and the spaces around it, and each key is resolved on its own. A named `bibliography` or `references` directive may hold definitions as core definition-list entries, with each term the citation key and its description the definition. A document transform may claim that directive and resolve the citations from it (C2-X-053); the claimed directive renders every entry in source order, including entries no citation uses. A cited key that only data the host gives the extension defines is listed in the last claimed directive, after that directive's own entries: the entries of all directives are numbered in source order and such keys after them in the order they are first cited. Without that extension, the inline form and directive retain their core fallback.

**C2-X-059** The standard `imgFence` matchers claim code fences whose language is `img` or `image` and whose body is SVG source, producing `carve.imgFence.img` or `carve.imgFence.image`, respectively. Its fallback is that core code block without its attributes (C2-X-024). Its trusted sanitizer removes unsafe elements with their descendants and unsafe attributes, then accepts only a single well-formed SVG root it can reduce to a bounded image without scripts, event attributes, active or external references, or foreign content. If it cannot, the renderer writes the fallback and reports its failure under C2-X-050. Every childless element of the sanitized SVG tree serializes self-closing, including an element emptied by sanitization. It writes the standard SVG namespace on the root and percent-encodes the accepted SVG as UTF-8 in a `data:image/svg+xml` URL for the `src` of one `<img>`; the encoded URL may be no longer than the existing 8 MiB extension payload bound (C2-X-030). The fence’s authored `alt` attribute supplies the image’s alt text; without it, the image writes `alt=""`, even when the SVG has a `<title>`. The other authored attributes are written on the `<img>` under C2-H-009 to C2-H-014.

**C2-X-060** Only the `imgFence` sanitizer's own result, passed directly to that `<img>` sink with its provenance intact, receives the URL-policy exception of C2-H-159. A source URL, an authored `data:` attribute, a copied sanitizer string or a value passed to another sink has no exception. The host applies the profile and its other attribute filters to the image and does not pass an unsafe sanitizer result through as HTML.

## Standard extensions of the 0.1 catalog

These extensions follow the catalog status of the tabs section. Each claims a core node by the matcher its row of `data/extensions.json` names, and with no renderer in the selected channel C2-X-035 writes its fallback.

**C2-X-061** A diagram extension of the fenced renderers, as `carve.fencedRender.mermaid`, and `carve.mathBlock` claim a code block by its language (C2-X-010), and their fallback is that core code block without its attributes (C2-X-024). A diagram extension has a build-time renderer (C2-X-052) only where the host gives it a build function, and the engine makes no network call. In `static` mode without one, C2-X-035 writes the fallback, the plain code block `<pre><code class="language-mermaid">`, and no `<pre class="mermaid">` source element as in 0.1.

**C2-X-062** The renderer of `carve.mathBlock` writes `role="math"` on the element that holds the math, as core display math does (C2-H-072, C2-H-077).

**C2-X-063** The `code-group` div matcher of `carve.codeGroup` claims a div only when its body holds one or more code blocks and no other blocks; a body with another block stays a core div, as a `tabs` body does (C2-X-040), so no block is lost. The label of a panel is the bracket label of its code block, or, where it has none, its quoted title, or else its language.

**C2-X-064** The spoiler is one extension with two node names, because a definition has one matcher form: `carve.spoiler`, which the `spoiler` inline matcher makes of `:spoiler[...]`, and `carve.spoilerBlock`, which the `spoiler` div matcher makes of `::: spoiler`. A host registers both together.

**C2-X-065** `carve.details`, which the `details` div matcher makes, and `carve.spoilerBlock` take the fallback of a tab (C2-X-042): the quoted title as a `strong` paragraph, when present, followed by the body blocks. The core div with its class is not their fallback.

**C2-X-066** A span key an extension adds for rendering and lint, as `samp`, `var`, `cite` and `dfn`, is an ordinary attribute for C2-A-035: only `abbr`, `time` and `kbd` are semantic keys of the core, so an added key merges with its other spellings by the general rule, and the duplicate checks treat it as any other key.

**C2-X-067** The `glossary` transform writes its definition lists inside the core `<div class="glossary">` wrapper of the directive, which carries the directive's attributes; it does not put those attributes on a list.

**C2-X-068** In `author-date` mode the author and year of a reference entry come from a span around its key in the description term, `:: [doe]{author="Doe" year="2020"}`, since a term takes no attributes in source, or from data the host gives the extension. The standard cite renderer takes the host option `mode`, `numbered` or `author-date`, with `numbered` the default; creating the renderer with another value fails.

**C2-X-069** A document transform does not see the render option `labels`, so the `index` extension takes the label of its back-links as its own option `backrefLabel`; its default is the default of the label `indexBackref`, `Back to`.

**C2-X-070** In the `number-title` style, `carve.headingNumbers` replaces a heading cross-reference with a link that holds the number and a copy of the target's title. A heading cross-reference inside that copy is not expanded again: it stays a reference and renders as a plain link with its target's title, so copies do not nest and a title that refers to itself ends. With `{#a}` on `= A </#b>`, `{#b}` on `== B </#c>` and `{#c}` on `== C`, the reference in `A` writes `Section 1.1 - B C`, not `Section 1.1 - B Section 1.2 - C`.

## Writing consistency

**C2-X-049** A writer with a source record that does not parse and transform back to an equal extension node writes the fallback and reports `structure-unspellable`. The test needs the extension's matcher, so it is the test of a writer that has the extension registered; a writer without it follows C2-X-023. A `write` call reads the option `extensions` for this test.

## Carrying Carve facts through a tree that has no slot for them

This section is non-normative. Bridges can use these marker attributes when another tree has no native slot for a Carve fact. The value forms below are a recommended convention. JSON means a JSON-encoded value; `true` means a presence marker. A bridge that drops a marker loses the listed fact and nothing else.

| Marker | Carve tree field | Value form |
| --- | --- | --- |
| `carve-columns` | `table.columns` | JSON array of column nodes |
| `carve-comment` | `comment.form`, `comment.value` | JSON object |
| `carve-critic-comment` | `critic_comment.value` | string |
| `carve-tree` | definition nodes in `document.children` | JSON array of nodes |
| `carve-frontmatter` | `frontmatter.format`, `frontmatter.value` | JSON object |
| `carve-title` | a container's `title` | JSON array of inline nodes |
| `carve-group-label` | `groupLabel` | string |
| `carve-generated-id` | `heading.generatedId` | string |
| `carve-literal` | `literal_inline.value` | string |
| `carve-span` | `table_cell.span` | string span mark |
| `carve-autolink` | `autolink` identity and fields | JSON autolink node |
| `carve-block-image` | `paragraph.role: "image"` | `true` |
| `carve-block-math` | `paragraph.role: "math"` | `true` |
| `carve-xref` | `xref` identity | `true` |
| `carve-key` | `xref.key` or a keyed reference's `key` | string |
| `carve-form` | `xref.display` or a reference's `refForm` | string |
| `carve-block-quote` | `block_quote.attrs` | JSON object |
| `carve-list` | `list.marker.char` | one character |
| `carve-admonition` | `admonition.kind` | string |
| `carve-directive` | `directive.kind` | string |
| `carve-figure-group` | `figure_group` identity | `true` |
| `carve-paragraph` | `paragraph.attrs`, `paragraph.role` | JSON object of present fields |
| `carve-footnote-ref` | `footnote_ref.key`, `footnote_ref.namespace` | JSON object |
| `carve-inline-attrs` | inline node `attrs` | JSON object |
| `carve-insert` | `insert` identity | `true` |
| `carve-delete` | `delete` identity | `true` |
| `carve-mention` | `mention.target`, `mention.kind`, `mention.label` | JSON object of present fields |
| `carve-tag` | `tag.name` | string |
| `carve-symbol` | `symbol.name` | string |
| `carve-abbreviation` | `abbreviation.key`, `abbreviation.namespace`, `abbreviation.expansion` | JSON object of present fields |
| `carve-smart` | `smart_punctuation.kind`, `smart_punctuation.source`, `smart_punctuation.glyph` | JSON object of present fields |
| `carve-task` | `list_item.task.mark` | one character |

A Pandoc `Example` list round trip can use `carve-example=1` and `carve-example-delimiter=TwoParens` as list attributes to retain its document-wide counter style.
A Pandoc bridge can carry a quoted span as matching opening and closing `smart_punctuation` nodes and pair them on export.

## Counts

| Section | Clauses |
| --- | ---: |
| Registration and matching | 14 |
| Transformation and carriage | 17 |
| Resolution, rendering and equality | 13 |
| Standard extension: tabs | 11 |
| Standard extension source forms | 4 |
| Standard extensions of the 0.1 catalog | 10 |
| Writing consistency | 1 |
| **Total** | **70** |
