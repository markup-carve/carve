# Carve 0.2 specification

For existing documents and integrations, see [Upgrading from Carve 0.1](UPGRADING.md) and its [machine-readable upgrade map](data/upgrade-map.json).

This tree holds the specification of Carve 0.2, written fresh from the 0.2 rule set instead of edited from the 0.1 text.
It is freeze candidate 4 on the `next2` branch and is not released: [`STATUS.md`](STATUS.md) says what is frozen and what is still open. The reference engine is `carve-js` under `v2/` on the same branch name.
Documents: Syntax blocks (`syntax-blocks.md`, which includes tables), Syntax inline, HTML rendering, AST 2.0, extensions (`extensions.md`), the source-layout sidecar, Writer and fmt, and Includes (`includes.md`, prefix `C2-N-`), which defines include expansion.
The HTML import mapping (`import-html.md`, prefix `C2-M-`) defines how HTML without carriers becomes a tree.
Clause ids in this tree use a new prefix per document, starting with `C2-B-` for the block chapter, so that no 0.1 id is reused with a new meaning.
Every example of the nine documents is also an entry of the [conformance corpus](conformance/README.md), with the clause cases and the refused trees that engines test against; an example marked "unverified" has hand-written expected output.
