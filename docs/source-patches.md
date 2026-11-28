---
description: Why Carve 0.2 specifies no source-patch API, and what to use instead.
---

# Source-preserving patches

Writers expect a small correction to stay a small correction. A tool that fixes one link should not rewrite the spacing, the marker style, or the comments of the rest of the document.

Carve 0.1 had a shared **source patch** format for this: exact byte replacements against the source the engine read, with an FNV-1a fingerprint and an `unresolved` list for changes the engine could not prove safe. **Carve 0.2 has no source patch contract.** `createSourcePatch`, `applySourcePatch`, and `toCarvePatch` have no 0.2 counterpart, and no 0.2 call edits source text by byte ranges as an interchange format.

What 0.2 offers instead:

| Need | 0.2 tool |
| --- | --- |
| Change document structure | `diffTree` and `applyPatch`: RFC 6902 JSON Patch over the encoded tree |
| Detect a stale input | `sourceFingerprint` and `treeFingerprint`: SHA-256 fingerprints |
| Apply one lint fix as an edit | `fixEdits`: byte-range edits for one finding |
| Fix a whole file | `fix`, `carve lint --fix`, and `carve fix` |
| Keep spelling when writing a tree | `write` with the [source-layout sidecar](/ast-source-layout) |
| Format a whole file | `format` and `carve fmt`, which may change spelling anywhere |

## Patching the tree

`diffTree(a, b)` returns a JSON Patch that turns the encoded tree `a` into `b`. `applyPatch(tree, patch)` applies one and returns the decoded result. Paths are RFC 6901 pointers into the JSON of `encodeTree`, the same form a diagnostic's `path` uses.

Two versions of a short document, the second with emphasis instead of strong:

```crv
= Hello

A *bold* word.
```

```crv
= Hello

A /quiet/ word.
```

`carve diff --json` compares their trees, without positions:

```json
[
  {
    "op": "replace",
    "path": "/children/1/children/1",
    "value": {
      "children": [
        {
          "type": "text",
          "value": "quiet"
        }
      ],
      "type": "emphasis"
    }
  },
  {
    "op": "replace",
    "path": "/srcByteLength",
    "value": 25
  }
]
```

Without `--json`, the command writes one line per operation and exits with status 1 when the trees differ. `diffTree` on trees parsed with positions also emits `replace` operations for every `pos` field the edit shifted.

A host that edits a tree in place applies its patch with a fingerprint guard, then writes the result:

```js
import { applyPatch, treeFingerprint, writeWithDiagnostics } from '@markup-carve/carve'

const fingerprint = treeFingerprint(tree) // taken when the patch was made
const next = applyPatch(tree, patch, { fingerprint })
const { source, diagnostics } = writeWithDiagnostics(next)
```

For the patch above, `source` is the second document. The writer produces canonical Carve for the whole document, not a minimal edit of the first source; see [keeping unrelated spelling](#keeping-unrelated-spelling) below.

### Rules for `applyPatch`

- It applies the six RFC 6902 operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) in order to the JSON value of `encodeTree(tree)`, then decodes the result as `decodeTree` does, with the reader checks.
- It returns a new tree and leaves the given tree unchanged.
- It applies nothing when any step fails, and refuses with one `CarvePatchError` that carries `path` and `reason`:

| Case | `path` points | Example `reason` |
| --- | --- | --- |
| `fingerprint` is not the `treeFingerprint` of the tree | the empty pointer | the tree has the fingerprint `sha256:...`, not `sha256:...` |
| an operation is unknown, names no member, or a `test` fails | into the patch, at the field (`/0/op`, `/0/path`, `/0/value`) | `unknown operation "frobnicate"`, `index 9 is out of range`, `the test failed` |
| the result is not a 2.0 tree | into the result, where the reader refuses | `the result is no tree: not a field of heading` |

- There is no reversible patch and no three-way merge. Keep the old tree to undo a change.
- Two engines may produce different patches for the same pair of trees. Compare the trees a patch gives, not the patches.
- Two equal trees give the empty list.

## Fingerprints

A fingerprint is `sha256:` followed by 64 lowercase hex digits. `sourceFingerprint` hashes the UTF-8 bytes of a source as given, with no normalization, so the text and the bytes of one source give one fingerprint. `treeFingerprint` hashes the bytes of `encodeTree(tree)`, which is canonical JSON, so one tree has one fingerprint in every engine.

| UTF-8 source | `sourceFingerprint` |
| --- | --- |
| empty | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `a` | `sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb` |
| `abc` | `sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |

A fingerprint detects stale input. A byte-order mark and the original line endings are ordinary bytes and change it.

## Lint fixes as byte edits

The closest 0.2 relative of a 0.1 source edit is the quick fix of one lint finding. `fixEdits(source, diagnostic)` returns the edits that fix that finding, as UTF-8 byte ranges with replacement text, or `null` where the rule has no fix or the fix would not hold. Take this 0.1 source, linted with the migration notices on (`lint(source, { upgrade: true })`):

```text
Some ~old~ text.
```

The finding and its edits:

```json
{"code":"deprecated-bare-strike","severity":"warning","channel":"lint","message":"A bare tilde pair is text in 0.2. Write the braced strike.","path":"/children/0","range":{"startOffset":5,"endOffset":10}}
[{"startOffset":5,"endOffset":6,"text":"{~"},{"startOffset":9,"endOffset":10,"text":"~}"}]
```

Applying both gives `Some {~old~} text.`, and every byte outside the two ranges stays as written. `fix(source, options)` applies every fix that holds, as `carve lint --fix` and `carve fix` do. An editor that offers each fix as a choice uses `fixEdits`, because it also returns edits for a range that two rules report with different replacements. `fixableRules` lists the rules that have a fix.

## Keeping unrelated spelling

Every 0.2 path from a tree back to source goes through the canonical writer, and the writer writes the whole document. Unrelated spelling survives only where the writer is told about it:

- `write(tree, { layout })` keeps the spellings the [source-layout sidecar](/ast-source-layout) records where 0.2 has two equal forms: bare or written list numbers, quote form, hard-break form, table form, a declared head count, continuation rows, the typed form of references, and include option quoting.
- Spellings with one canonical form in 0.2 are always normalized: `#` headings become `=`, every thematic break becomes `***`, code fences get the shortest safe backtick run.
- The sidecar belongs to the tree it came with. After a structural edit, its paths may name other nodes, so parse again before writing with layout.

`format` and `carve fmt` are document formatters, not patch protocols. `carve fmt --diff` shows a unified diff of what they would change, for a person to read:

```text
--- a/d3.crv
+++ b/d3.crv
@@ -1,2 +1,3 @@
-#  Title
-Text
+= Title
+
+Text
```

A host that requires minimal byte edits, for an editor buffer or a review tool, can derive them itself, for example by comparing the old source with the written source and keeping their common prefix and suffix. That edit format is the host's own and should not be presented as a Carve interchange contract.

## Offsets

Tree positions, diagnostic ranges, `fixEdits`, and sidecar ranges count UTF-8 bytes. JavaScript strings and the Language Server Protocol count UTF-16 code units by default. Convert explicitly: the engine exports `positionOf`, `utf8Length`, and `stringOffsetOfByte`. The reference engine's `createEditorSession`, which is outside the 0.2 contract, takes `{ from, to, insert }` changes in UTF-16 offsets; see [node identity](/ast-node-identity#editor-sessions-in-the-reference-engine).

## From 0.1 to 0.2

| 0.1 | 0.2 |
| --- | --- |
| `createSourcePatch(source, replacement, kind, code)` | none; write the tree, and derive byte edits yourself if you need them |
| `applySourcePatch(source, patch)` | none for source; `applyPatch` for trees |
| `toCarvePatch(source)` | `format` or `formatWithDiagnostics`; lossy output is reported, not routed to `unresolved` |
| `fnv1a64:` fingerprint and `sourceBytes` | `sourceFingerprint` (`sha256:`); `srcByteLength` on the tree |
| edit `kind` and `code` | a lint finding's `code`, for edits from `fixEdits` |
| `unresolved` suggestions | diagnostics from `writeWithDiagnostics` or `formatWithDiagnostics`; `write` throws `CarveWriteError` instead of losing content |
| `createAstPatch`, `applyAstPatch`, reversible AST patches | `diffTree` and `applyPatch`; no inverse operations |

**Specification (external):** [tooling: library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library), [tooling: commands](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#commands), [`carve lint`](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#carve-lint), [writer: the sidecar](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#the-sidecar), [`carve fmt`](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#carve-fmt), [upgrade guide: JavaScript API](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#javascript-api).
