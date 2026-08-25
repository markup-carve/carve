---
description: "Compatibility report for classifying comments before visible block ownership."
---

# Comment classification experiment

This report records the compatibility gate for [carve#1731](https://github.com/markup-carve/carve/issues/1731). The executable oracle now recognizes line and fenced comments as layout-transparent tokens after opaque-context handling and before visible block ownership.

The token retains its kind and complete source extent. Visible classification skips that extent. The surrounding frame then applies the comment boundary from #1730: the container remains open and its paragraph closes.

## Corpus comparison

The mandatory and optional corpora were regenerated before and after the phase change.

| comparison | deltas |
|---|---:|
| mandatory AST | 0 |
| mandatory HTML | 0 |
| optional AST | 0 |
| optional HTML | 0 |
| formatter fixtures | 0 |
| source-layout fixtures | 0 |

The zero-delta result shows that current output did not depend on accidental comment fallthrough. It also means downstream engines can adopt the phase ordering without moving corpus pins.

## Boundary coverage

The existing corpus families from #618, #629, #634 and #677 cover indented line comments, matched and unmatched fences, comment bodies and closers, terminal comments, comments between item blocks and comments below active content columns. The classifier test additionally pins exact-width closing and the unterminated line-comment fallback.

Code, raw and other opaque collectors run before this classifier, so comment-looking bytes in their payload remain literal. A following blank applies the ordinary blank transition. A following visible line receives no continuation claim from the comment and is owned by its prefixes and visual column.

## Complexity

Line comments take constant work. A fenced comment scans its source extent once to find the exact-width closer and then advances past that extent. No indentation is remeasured and no dedent candidate is probed, so work remains linear in source length.
