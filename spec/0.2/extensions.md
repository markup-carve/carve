# Carve 0.2: extensions

Status: freeze candidate 2 of Carve 0.2 on `next2`: the extension mechanism is frozen with the core, and the standard extensions are not (`STATUS.md`).

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

**C2-X-015** A transform maps one claimed core node to one extension node of the same inline or block role.

**C2-X-016** A transform leaves every core node outside its claimed node unchanged.

**C2-X-017** A transform reads only the claimed node and its descendants.

**C2-X-018** The extension node carries the declared qualified name and version, with the same version as its declaration.

**C2-X-019** `props` is a JSON object whose keys and value types are defined by the extension's registered schema.

**C2-X-020** `slots` is an object of named child lists. The registered extension schema fixes each slot's content kind. The root or envelope declaration names the slots in order, including slots absent from a node. A slot name is a lowercase identifier and has no number suffix that encodes position. Repeated children form an ordered list in one slot. A walker visits slots in declaration order without a registry. A validator refuses a slot the declaration does not name.

**C2-X-021** `payload` is an optional list of alternatives with a nonempty format and a non-null JSON value under C2-A-122.

**C2-X-022** `fallback` is mandatory for every qualified extension node and contains only core nodes of the extension's role.

**C2-X-023** A reader without the extension resolves, renders and writes the fallback as core content, except where the Carve writer has a source form under C2-X-027.

**C2-X-024** A source transform carries a `source` record with `form`, `name`, canonical `body` text, and any quoted title or bracket label, plus the core node's attributes on the extension node.

**C2-X-025** `source.form` is `inline`, `div` or `fence`, and `source.name` is the claimed source name.

**C2-X-026** `source.body` is the canonical Carve spelling of the claimed node's content, without its opener, closer or attached outer attributes.

**C2-X-027** A Carve writer with a source record writes the canonical `:name[body]`, colon-run div or fenced code block form under C2-W-039 and C2-W-040 and writes the extension node's attributes in the core attribute form.

**C2-X-028** A Carve writer without a source record writes the fallback and reports `structure-unspellable` at the extension node.

**C2-X-029** A transform gives the same node for the same claimed core node, extension version and configuration.

**C2-X-030** A reader refuses more than 32 nested unqualified inline extension nodes along `children` used as fallback under C2-A-124, or more than 8 MiB of decoded payload on one extension node under C2-A-132. The nesting bound counts only that path, the `children` of unqualified inline extension nodes: a qualified fallback holds no extension node (C2-X-022, C2-A-126), so it nests none.

**C2-X-031** A reader refuses a `source.body` longer than 8 MiB in UTF-8 bytes and a qualified extension nesting depth greater than 32 through slots or children.

## Resolution, rendering and equality

**C2-X-032** Resolution visits `children`, named slots and fallback, and does not execute or inspect props, payload or source text.

**C2-X-033** A host registers a renderer by qualified name and version. The renderer receives the node, resolved child lists, fallback, rendering profile, URL policy and host helpers for escaped text, attributes, child lists and generated ids.

**C2-X-034** An extension renderer is trusted host code. It returns an HTML string, which the host writes unchanged. The renderer uses the host helpers of C2-X-033 to apply escaping, the URL policy and the profile to its output. A host that renders untrusted documents registers only renderers it trusts. A structured output interface is left to a later version.

**C2-X-050** A host transform or renderer exception does not escape the engine. When a transform throws, the engine retains the claimed core node and reports a diagnostic that names the extension. When a renderer throws or returns a value that is not a string, the engine renders the extension fallback and reports a diagnostic that names the extension. The size of a renderer's HTML string is the host's responsibility.

**C2-X-051** If the engine cannot prepare a claim's canonical source record because the writer reports a loss (C2-W-134) or refuses a repair (C2-W-133), the engine retains the core node and reports `extension-transform-failed` naming the extension. Parsing and rendering continue with that core node.

**C2-X-035** With no matching renderer, the HTML renderer writes the fallback and reports `extension-fallback-rendered`.

**C2-X-036** Every profile restriction and URL policy check applies inside slots and fallback.

**C2-X-037** Equality compares an extension node's name, version, props, children, slots, fallback, payload, resource ids and source record under C2-A-161.

**C2-X-038** A reader validates extension props and slot content kinds against its registered extension schema when it knows the extension. It validates slot names against the tree declaration even without a registry.

## Standard extension: tabs

The standard extensions are a catalog that follows the core: this section is not part of the freeze candidate, and the clauses of the sections before and after it are.

**C2-X-039** The core provides optional `carve.tabs` and `carve.tab` extensions at version `1`. The `tabs` div matcher produces `carve.tabs`; the nested `tab` div produces `carve.tab` only inside its `tabs` slot. A `tab` div elsewhere stays a core div.

**C2-X-040** The `tabs` matcher claims a div only when its body has one or more `tab` divs and no other blocks, and each `tab` div has a nonempty quoted title.

**C2-X-041** `carve.tabs` has one slot, `tabs`, whose ordered items are `block_extension` nodes named `carve.tab` and nothing else. Each `carve.tab` has an optional `title` slot of inline nodes and a `body` slot of blocks. The transform puts the quoted title in `title` as inline content and the div body in `body`. Their declarations list `slots` as [`tabs`] and [`title`, `body`], respectively.

**C2-X-042** The transform gives each `carve.tab` a core fallback with its title as a `strong` paragraph, when present, followed by its body blocks. The `carve.tabs` fallback concatenates those sequences in tab order.

**C2-X-043** The tabs renderer writes one radio input, one linked label and one panel per item of `tabs` in order, with the first input checked.

**C2-X-044** The tabs renderer renders each label from the tab's `title` slot and each panel from its `body` slot. It escapes text and attributes through the host renderer.

**C2-X-045** The tabs transform keeps the nested `tab` div spelling in the outer `source.body`. A Pandoc bridge carries this structure as nested Divs with the classes `tabs` and `tab`.

**C2-X-046** A reader refuses a `carve.tab` outside `carve.tabs.slots.tabs`, an item of that slot that is not `carve.tab`, or a tab without its `body` slot.

**C2-X-047** The tabs renderer groups the controls and names each panel with the plain text of its title, or `Tab` and its position when the title is absent. Without a stylesheet every panel stays visible.

**C2-X-048** The tabs renderer gives each radio input a unique document-scoped id and links its label to that id.

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

HTML without the tabs renderer:

```html
<p><strong>Install</strong></p><p>Run setup.</p><p><strong>Use</strong></p><p>Open the app.</p>
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

## Writing consistency

**C2-X-049** A writer with a source record that does not parse and transform back to an equal extension node writes the fallback and reports `structure-unspellable`.

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
| Resolution, rendering and equality | 9 |
| Standard extension: tabs | 10 |
| Writing consistency | 1 |
| **Total** | **51** |
