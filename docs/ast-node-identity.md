---
description: Authored ids, generated heading ids and node identity in editing tools.
---

# Node identity in parsed document JSON

An RFC 6901 pointer into the [parsed document JSON](/ast-json) addresses a node in one tree. It stops addressing the same node the moment a sibling is inserted before it. That is enough for a single patch, and not enough for anything that has to survive an edit: a comment anchored to a paragraph, a collaborator's cursor, or an incremental reparse that asks which nodes are still the same nodes.

Carve 0.1 offered an optional node identity sidecar for this. **The Carve 0.2 contract has no node identity sidecar and no call that returns one.** This page explains which ids the 0.2 tree does carry, how a host can keep its own identities within the contract, and what the reference engine offers outside it.

## Ids in the tree are not node identity

A 0.2 tree carries two kinds of id, and neither identifies a node across edits:

- `attrs.id` is the id the author wrote, as in `{#intro}`. It belongs to the document, survives a canonical write, and renders as an HTML anchor. The first node with a given id wins, and the parser reports each later one as `duplicate-id`.
- `generatedId` on a heading is a resolution result: the id the renderer gives a heading without an authored id. It depends on every heading before it, because a repeated slug gets a `-2` or `-3` suffix, so inserting a heading can change the `generatedId` of every heading after it. A renderer recomputes it and never reads it from a supplied tree.

```crv
= Setup

{#intro}
= Setup
```

```json
{"children":[{"type":"text","value":"Setup"}],"generatedId":"Setup","level":1,"type":"heading"}
{"attrs":{"id":"intro"},"children":[{"type":"text","value":"Setup"}],"level":1,"type":"heading"}
```

Neither can serve as an editor's handle for a node: one is authored content that the user may change or delete, and the other moves when the document around it changes.

## Keeping identities within the 0.2 contract

A host that needs stable ids keeps them itself. Two approaches stay inside the contract:

**A mapping outside the tree.** The host stores its own table from its ids to paths, and updates the table after every edit it makes. Because the host makes the edit, it knows which paths moved. Nothing in Carve reads the table.

**A declared data namespace.** The host puts its id on the node under a qualified `data` key and declares that key on the root or envelope:

```json
{
  "type": "document",
  "astVersion": "2.0",
  "extensions": [{ "name": "org.example.node", "version": "1", "required": false, "slots": [] }],
  "children": [
    {
      "type": "paragraph",
      "data": { "org.example.node": { "id": "p-17" } },
      "children": [{ "type": "text", "value": "First." }]
    }
  ]
}
```

The id then travels with the node through `encodeTree`, `decodeTree`, and `applyPatch`, and the HTML renderer ignores it. Know its limits before choosing it:

- Tree equality compares `data`, so two trees that differ only in host ids are not equal.
- Carve source has no spelling for it. `writeWithDiagnostics` drops it and reports `field-unspellable` at `/children/0/data`, and `write` refuses with `CarveWriteError`. After a write and a reparse the ids are gone.
- Parsing never produces it, so a host that reparses source after every keystroke must carry the ids across itself.

[Annotation ranges](/ast-annotation-ranges) solve a related problem: they anchor a text span, not a node, and the host rebinds them after edits in the same way.

## Editor sessions in the reference engine

The JavaScript reference engine still exports `createEditorSession`, which keeps a source document and its tree in step and returns an identity record in the 0.1 shape. It is outside the 0.2 contract: other engines need not offer it, its shape is not versioned with AST 2.0, and the 0.2 upgrade guide lists it among the helpers with no 0.2 counterpart. Treat it as an engine feature.

```js
import { createEditorSession } from '@markup-carve/carve'

const session = createEditorSession('= Title\n\nFirst.\n\nSecond.\n')
const before = session.snapshot()
const after = session.update([{ from: 9, to: 9, insert: 'New.\n\n' }])
```

Before the edit, `before.identity` is:

```json
{"version":1,"session":"b312c563-c08d-4fc7-b561-efc9fc5a38e5","nodes":[{"id":"n0","path":""},{"id":"n1","path":"/children/0"},{"id":"n2","path":"/children/0/children/0"},{"id":"n3","path":"/children/1"},{"id":"n4","path":"/children/1/children/0"},{"id":"n5","path":"/children/2"},{"id":"n6","path":"/children/2/children/0"}]}
```

Inserting a paragraph before `First.` gives `after.identity`:

```json
{"version":1,"session":"b312c563-c08d-4fc7-b561-efc9fc5a38e5","nodes":[{"id":"n0","path":""},{"id":"n1","path":"/children/0"},{"id":"n2","path":"/children/0/children/0"},{"id":"n7","path":"/children/1"},{"id":"n8","path":"/children/1/children/0"},{"id":"n3","path":"/children/2"},{"id":"n4","path":"/children/2/children/0"},{"id":"n5","path":"/children/3"},{"id":"n6","path":"/children/3/children/0"}]}
```

`First.` keeps `n3` and moves from `/children/1` to `/children/2`; the new paragraph gets fresh ids. `after.changedPaths` lists the paths whose content or position changed. A host anchored to `n3` follows it by looking up its new path.

The rules a host relies on:

- **The id is the handle and the path is only where it sits now.** Re-read the identity record after every update and never carry a path across an edit.
- **A missing id means the node is gone.** A node the session no longer recognizes has no entry, and there is no tombstone. Changing a node's own text also counts: editing `= Title` to `= Heading` gives the heading a new id.
- **Ids are scoped to one session.** Within a session an id is never given to a different node. `session` is an opaque token; two records with different `session` values share no ids, whatever their strings look like. A new session, or a reparse of written source, mints new ids.
- **Offsets are UTF-16.** `update` takes `{ from, to, insert }` changes in JavaScript string offsets, and `snapshot().nodes` maps each path to a UTF-16 range with marker tokens for highlighting. Tree `pos` values stay in UTF-8 bytes. An invalid range throws `EditorChangeError` and applies nothing.
- **The record carries no spans and no file paths.** A node's source range is its `pos`, or the session's `nodes` map.

## Changed since 0.1

- The node identity sidecar and its schema `ast-node-identity-schema.json` are 0.1 only. No 0.2 reader accepts or checks one, and `validateTree` has no option for it.
- `readNodeIdentity` and the other 0.1 identity helpers have no 0.2 counterpart.
- A heading's generated id moved from `attrs.id` to `generatedId`, so `attrs.id` now holds only authored ids.

**Specification (external):** [AST: tree and sidecars](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [attributes](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#attributes), [resolution results](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#resolution-results), [standard data namespaces](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#standard-data-namespaces), [upgrade guide: JavaScript API](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#javascript-api).
