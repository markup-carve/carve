# Carve 0.2: extensions

Status: draft on `next2`.

This document defines the extension interface for Carve 0.2.0.

## Registration and matching

**C2-X-001** An extension is a versioned behavior identified by a qualified name under C2-A-123.

**C2-X-002** A producer declares each qualified extension it uses on the root or envelope with a name, a version and a required or optional flag.

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

**C2-X-020** `slots` is an object of named child lists; each list has the node role of the extension and is visited in key order under C2-A-025.

**C2-X-021** `payload` is an optional list of alternatives with a nonempty format and a non-null JSON value under C2-A-122.

**C2-X-022** `fallback` is mandatory for every qualified extension node and contains only core nodes of the extension's role.

**C2-X-023** A reader without the extension resolves, renders and writes the fallback as core content, except where the Carve writer has a source form under C2-X-027.

**C2-X-024** A source transform carries a `source` record with `form`, `name`, canonical `body` text, and any quoted title or bracket label, plus the core node's attributes on the extension node.

**C2-X-025** `source.form` is `inline`, `div` or `fence`, and `source.name` is the claimed source name.

**C2-X-026** `source.body` is the canonical Carve spelling of the claimed node's content, without its opener, closer or attached outer attributes.

**C2-X-027** A Carve writer with a source record writes the canonical `:name[body]`, colon-run div or fenced code block form under C2-W-039 and C2-W-040 and writes the extension node's attributes in the core attribute form.

**C2-X-028** A Carve writer without a source record writes the fallback and reports `structure-unspellable` at the extension node.

**C2-X-029** A transform gives the same node for the same claimed core node, extension version and configuration.

**C2-X-030** A reader refuses a tree with more than 32 nested extension nodes on a fallback path or more than 8 MiB of decoded payload on one extension node under C2-A-132.

**C2-X-031** A reader refuses a `source.body` longer than 8 MiB in UTF-8 bytes and an extension nesting depth greater than 32 through slots or children.

## Resolution, rendering and equality

**C2-X-032** Resolution visits `children`, named slots and fallback, and does not execute or inspect props, payload or source text.

**C2-X-033** A host registers a renderer by qualified name and version, and the renderer receives the node, resolved child lists, fallback, rendering profile and URL policy.

**C2-X-034** A renderer returns HTML through the host's normal escaping and URL policy.

**C2-X-035** With no matching renderer, the HTML renderer writes the fallback and reports `extension-fallback-rendered`.

**C2-X-036** Every profile restriction and URL policy check applies inside slots and fallback.

**C2-X-037** Equality compares an extension node's name, version, props, children, slots, fallback, payload, resource ids and source record under C2-A-161.

**C2-X-038** A reader validates extension props and slot names against its registered extension schema when it knows the extension.

## Standard extension: tabs

**C2-X-039** The core provides the optional `carve.tabs` extension at version `1`, with a div matcher for the source name `tabs`.

**C2-X-040** The `tabs` matcher claims a div only when each body block is a `tab` div with a nonempty quoted title.

**C2-X-041** The transform writes `props.titles` as the ordered title strings and writes each tab body's blocks in `slots.tab_0`, `slots.tab_1` and successive numbered slots.

**C2-X-042** The transform writes a fallback sequence with a paragraph containing each title in `strong`, followed by that tab's body blocks.

**C2-X-043** The tabs renderer writes one radio input, one linked label and one panel per tab in order, with the first input checked.

**C2-X-044** The tabs renderer escapes each title for text and attribute contexts and renders each panel from its matching slot.

**C2-X-045** The tabs transform keeps the nested `tabs` and `tab` div spelling in `source.body` so a Pandoc bridge can also carry the structure as nested Divs with classes.

**C2-X-046** A `carve.tabs` reader refuses a title count that differs from the number of consecutive slots starting at `tab_0`.

**C2-X-047** The tabs renderer groups the controls and names each panel with its title; without a stylesheet every panel stays visible.

**C2-X-048** The tabs renderer gives each radio input a unique document-scoped id and links its label to that id.

Input:

```carve
::: tabs
::: tab "Install"
Run setup.
:::

::: tab "Use"
Open the app.
:::
:::
```

Tree:

```json
{
  "type": "document",
  "astVersion": "2.0",
  "extensions": [{ "name": "carve.tabs", "version": "1", "required": false }],
  "children": [{
    "type": "block_extension",
    "name": "carve.tabs",
    "version": "1",
    "children": [],
    "props": { "titles": ["Install", "Use"] },
    "slots": {
      "tab_0": [{ "type": "paragraph", "children": [{ "type": "text", "value": "Run setup." }] }],
      "tab_1": [{ "type": "paragraph", "children": [{ "type": "text", "value": "Open the app." }] }]
    },
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

## Counts

| Section | Clauses |
| --- | ---: |
| Registration and matching | 14 |
| Transformation and carriage | 17 |
| Resolution, rendering and equality | 7 |
| Standard extension: tabs | 10 |
| Writing consistency | 1 |
| **Total** | **49** |
