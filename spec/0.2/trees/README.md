# Tree fixtures of Carve 0.2

The gate of the tree document (`ast.md`, "The tree gate"). Every file is JSON with a `description` and a `trees` list; each entry has an `id`.

| File | Holds |
|---|---|
| `examples-syntax-blocks.json`, `examples-syntax-inline.json`, `examples-html.json`, `examples-writer.json` | the parse tree, with positions, of every example of that chapter that has a Carve input: `id` is the chapter and the example number, `source` the input, `options` the parse options the example's flags set, `tree` the tree |
| `nodes.json` | supplied trees, without source and positions, for the node types and fields no example tree holds; each names its `clauses` |
| `refused.json` | trees a reader refuses: `clauses`, `reason`, and `refusedBy`, which is `schema` when `data/ast-schema.json` refuses the tree and `reader` when only a reader check beyond the schema does |

The examples of `includes.md` have no fixture yet: their trees need a resolver and the files each example names.

## Check

```
npm run spec2:data
```

runs `scripts/spec2-trees.mjs --check`. It validates every positive tree against the schema and every tree with a source against the position invariants C2-A-139 to C2-A-159, checks that the example trees and the examples of the chapters match one to one with the same source and that a tree an example states in a `json` fence is the fixture tree without positions or a node of it, that every node type and field of the schema occurs, and that each refused tree is refused as `refusedBy` says.

## Adding a tree

`node scripts/spec2-trees.mjs --write <path to a carve-js next2 checkout>` adds the tree that the carve-js parse gives for each example without one, or whose source changed. It keeps every other entry as it stands, so a tree corrected by hand stays. A new tree is checked like every other; where the clauses and carve-js differ, correct the tree by hand.
