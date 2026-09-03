---
title: Parsed Document JSON
description: Understand and use the JSON representation shared by Carve implementations.
---

# Parsed document JSON

A parser represents a Carve document as an **abstract syntax tree (AST)**: a
tree of objects for headings, paragraphs, links, and other content. Use this
JSON when an editor, linter, converter, or service needs structured content
rather than rendered HTML.

Most applications need only the common shape described here. Parser and binding
authors can use the [complete AST contract](./ast-json-contract).

## Start with a small document

The Carve source:

```carve
Hello *world*.
```

has a document root containing a paragraph and inline children:

```json
{
  "type": "document",
  "children": [
    {
      "type": "paragraph",
      "children": [
        { "type": "text", "value": "Hello " },
        {
          "type": "strong",
          "children": [{ "type": "text", "value": "world" }]
        },
        { "type": "text", "value": "." }
      ]
    }
  ],
  "srcByteLength": 15
}
```

Nodes may also include source positions. Those fields are omitted above so the
structure is easy to see. The root's `srcByteLength` is required and counts the
UTF-8 bytes in the parsed source.

## Fields you will use most

| Field | Meaning |
|---|---|
| `type` | The object kind, such as `paragraph`, `heading`, `link`, or `text` |
| `children` | Ordered child objects for a container node |
| `value` | Text or another scalar value held by a leaf node |
| `attrs` | Authored or resolved attributes associated with the node |
| `pos` | Optional source range for nodes produced by parsing Carve source |

The document root has exactly `type`, `children`, and `srcByteLength`.
Consumers should dispatch on `type`, then read only fields valid for that type.
Validate untrusted JSON before traversing it.

## Walk the tree

A depth-first traversal is enough for most integrations:

```js
function visit(node) {
  if (node.type === 'heading') {
    // Add it to a document outline.
  }

  for (const child of node.children ?? []) visit(child)
}
```

Do not assume that every object has `children`: text and other leaf nodes carry
a value instead. Likewise, do not infer a node’s meaning from its HTML output;
different tree shapes can sometimes render the same bytes.

## Attributes and identifiers

Authored identifiers, classes, and key/value attributes appear in `attrs`.
Resolved information may also appear there when consumers need it without
replaying the whole document—for example, a heading’s final identifier.

The schema closes every node type. An unknown property makes the payload
invalid; reject it with a typed validation error rather than silently dropping
or passing it through.

## Links and references

Links keep their resolved destination in `href`; images use `src`. A reference
form also retains its lookup key in `ref` and its authored spelling in `rawRef`
so formatters and editor tools can preserve intent. An undefined reference is
still a link or image node with `ref` and `rawRef`, but has no resolved `href`
or `src`.

If your application only needs the destination, use `href` or `src`.
If it writes Carve back, use the canonical writer rather than reconstructing
reference syntax from the destination alone.

## Source positions

Parsed nodes may carry `pos` with line, column, and offset boundaries. Imported
or programmatically created nodes may have no source position, because they did
not originate in Carve source.

For exact coordinate rules, byte offsets, source slices, and editor-facing
layout metadata, see [Source locations in JSON](./ast-source-layout).

## Editing safely

Prefer the editing or patch API supplied by your implementation when you need
undoable structural changes. Validate patches from untrusted callers and reject
stale edits using the implementation’s document fingerprint or equivalent
guard when available.

After changing a tree:

1. validate its JSON shape;
2. serialize it with the canonical Carve writer;
3. parse the result again if the change crosses a storage or interoperability
   boundary; and
4. surface any reported loss instead of silently discarding it.

## Schema and complete contract

- [Published JSON Schema](https://markup-carve.github.io/carve/ast-schema.json)
- [Schema source](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json)
- [Complete AST contract](./ast-json-contract)

The complete contract defines every object type and field, validation rules,
source-spellability limits, forward compatibility, and the evidence used to
check interoperability across engines.
