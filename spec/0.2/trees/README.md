# Tree fixtures of Carve 0.2

The gate of the tree document (`ast.md`, "The tree gate"). Every file is JSON with a `description` and a `trees` list; each entry has an `id`.

| File | Holds |
|---|---|
| `examples-syntax-blocks.json`, `examples-syntax-inline.json`, `examples-html.json`, `examples-writer.json` | the parse tree, with positions, of every example of that chapter that has a Carve input: `id` is the chapter and the example number, `source` the input, `options` the parse options the example's flags set, `tree` the tree |
| `examples-includes.json` | the expanded tree, with positions, of every example of `includes.md`: `files` holds the files the example names, which the resolver serves under their names and returns as ids (`includes.md`, conventions), `source` the entry document, `options.includes` the include settings the example's flags set, and `tree` the tree, each `pos` local to the file it names |
| `metadata-blocks.json` | positioned trees for the typed metadata block clause cases CC-1581 to CC-1600 |
| `positions.json` | positioned trees for the exemptions of C2-A-145, each with its `source` and `clauses`; an entry with `fails` names the clause the position check must report for its tree |
| `nodes.json` | supplied trees, without source and positions, for the node types and fields no example tree holds; each names its `clauses` |
| `refused.json` | trees a reader refuses: `clauses`, `reason`, and `refusedBy`, which is `schema` when `data/ast-schema.json` refuses the tree and `reader` when only a reader check beyond the schema does; a tree the reader refuses also has `path`, the pointer of the node its reader check refuses at |
| `layouts.json` | layout sidecars (`source-layout.md`): each has `clauses`, the `layout`, and `input`, the byte input in hex where it is not a string; a sidecar marked `refused: true` is one `data/layout-schema.json` refuses, one marked `refused: "reader"` is one the schema accepts and only a reader check refuses (C2-L-058), every other must be accepted and its ranges must lie inside the input |

The examples of `import-html.md` have no fixture file: the gate reads the children each example states, wraps them in a document and checks that tree against the schema, with no position.

## Check

```
npm run spec2:data
```

runs `scripts/spec2-trees.mjs --check`. It validates every positive tree against the schema and every tree with a source against the position invariants C2-A-139 to C2-A-159, checks that the example trees and the examples of the chapters match one to one with the same source and that a tree an example states in a `json` fence is the fixture tree without positions or a node of it, that every node type and field of the schema occurs, that each refused tree is refused as `refusedBy` says and at its `path`, that every positive and imported tree passes the reader checks the script states beyond the schema (`scripts/lib/spec2-reader.mjs`, C2-A-188) and that every tree refused by the reader breaks one of them that cites a clause of its entry, that the trees of blocks Examples 267 and 268 are equal (C2-L-023), and that each sidecar of `layouts.json` is accepted or refused as it says. A tree of an include example states only part of the tree (`includes.md`, conventions): it matches when the fixture tree or one of its nodes holds every field the stated tree names.

## Adding a tree

`node scripts/spec2-trees.mjs --write <path to a carve-js next2 checkout>` adds the tree that the carve-js parse gives for each example without one, or whose source changed; an include example is parsed with a resolver over its files. It keeps every other entry as it stands, so a tree corrected by hand stays. A new tree is checked like every other; where the clauses and carve-js differ, correct the tree by hand.
