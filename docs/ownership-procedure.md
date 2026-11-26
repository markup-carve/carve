---
description: Reading container ownership decisions in the 0.2 block specification.
---

# Container ownership

An implementation first decides which open container owns a source line, then reads the line's block form. The 0.2 rules are in [Block syntax, Container ownership and stripping](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#container-ownership-and-stripping). The neighboring list, quote, fence and table sections give the rules for each container family.

For each line, normalize the input as [Block syntax, Preliminaries](https://github.com/markup-carve/carve/blob/next2/spec/0.2/syntax-blocks.md#preliminaries) requires. Match the open container prefixes from outside in. Strip only prefixes the rules permit, then classify the remaining content under the block's current state. A line that misses a prefix can close a container or continue a paragraph only where the relevant clause allows it. Apply the same procedure at every nesting depth.

The 0.1 `S1` to `S5` procedure and `B-CELLS` table documented here before 0.2 are historical. They refer to [`resources/spec/01-layout.ebnf` on branch `0.1`](https://github.com/markup-carve/carve/blob/0.1/resources/spec/01-layout.ebnf), which does not define the 0.2 ownership contract. For syntax cases, use the [0.2 examples and clause cases](https://github.com/markup-carve/carve/blob/next2/spec/0.2/conformance/README.md).
