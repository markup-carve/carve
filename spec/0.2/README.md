# Carve 0.2 specification (draft)

This tree holds the specification of Carve 0.2, written fresh from the 0.2 rule set instead of edited from the 0.1 text.
It is a draft on the `next2` branch: nothing here is released. The reference engine is being built from it in `carve-js` under `v2/` on the same branch name: the block pass and the inline pass exist, the tree output and the HTML renderer are in work.
Planned documents: Syntax blocks (`syntax-blocks.md`, which includes tables), Syntax inline, HTML rendering, AST 2.0, the source-layout sidecar, and Writer and fmt.
Clause ids in this tree use a new prefix per document, starting with `C2-B-` for the block chapter, so that no 0.1 id is reused with a new meaning.
Examples use the `compare` format of `resources/examples/`, so the corpus builder can read them later; an example marked "unverified" has hand-written expected output.
