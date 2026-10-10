---
title: "Explicit same-kind emphasis nesting"
description: "Specification change, compatibility examples, and acceptance cases for nested braced emphasis."
---

# Explicit same-kind emphasis nesting

This specification change permits an explicit braced emphasis child of an active kind. It covers strong, italic, underline, strike, highlight, superscript, and subscript. It is governed by CARVE-P9-043 and the delimiter-stack rules in PART 9 §9.

## Implementation status

This PR changes the specification and supplies shared acceptance vectors. It does not change JavaScript, PHP, Rust, the formal reference parser, or editor grammar implementations. The published engine pin and existing executable corpus remain unchanged. Their old same-kind expectations, including corpus 471, describe the current implementation during this draft review; they are not acceptance evidence for the new rule.

Before this change is released, update the affected corpus expectations and declare any specification-ahead engine drift, implement the rule across all three engines and the formal reference parser, then verify the updated corpus. The shared vectors in `resources/spec/nested-braced-emphasis-cases.json` are the expected new behavior, not results measured against current engines.

## Native spelling

~~~carve
{*outer {*inner*} tail*}
*outer {*inner*} tail*
{^outer {^inner^} tail^}
~~~

The first two examples each produce a strong parent with a strong child. The third produces two superscript nodes. A bare child of an active kind remains literal, so `{*a *b* c*}` is one strong node with inner asterisks in its text. Doubled bare delimiters such as `**x**` remain literal.

Each explicit closer ends the innermost reachable matching braced span. It cannot cross an intervening braced boundary or a bracket-run boundary. Code, literal and raw spans, comments, destinations, and attributes retain their existing opacity. Empty braced spans remain literal. An unmatched outer opener does not discard a matched inner span: `{*a {*b*}` keeps the outer opener as text and the inner strong node.

Child and parent attributes attach independently:

~~~carve
{*a {*b*}{.inner} c*}{.outer}
~~~

Strike substitution retains its top-level separator test. A separator inside a nested braced span does not select substitution for the parent. Editorial insertion and deletion are outside this change.

## Compatibility

Existing source containing nested explicit spans can change meaning. For example, the pinned implementation reads `*a {*b*} c*` as one strong span ending after `b`, followed by literal text. The new rule produces a strong parent containing a strong child and the trailing ` c`.

An author who wants literal punctuation can escape it:

~~~carve
\{\*x\*\}
~~~

Escaping only the opening brace prevents a forced opener, but other punctuation can still participate in ordinary inline parsing. A canonical writer must escape all active punctuation needed to preserve literal text.

## Writing, import, and export

The native writer must preserve repeated emphasis nodes and their attributes, choosing braced spelling where bare spelling cannot preserve the tree. Importers must preserve newly representable relationships and stop reporting same-kind flattening for those relationships. Other unsupported shapes and depth-limit recovery keep their diagnostics.

HTML keeps both wrappers. Plain output keeps the text. Markdown and Djot export retain their existing target-specific contracts: native support does not prove that either foreign syntax can preserve every nested tree. Verify those targets separately and use their specified fallback or loss reporting where needed.

The current AST schema already permits inline children of these kinds, including children of the same kind. This change needs no new node or field and no schema-version bump for that relationship.

## Acceptance

The shared vectors cover all seven kinds, bare parents, three levels, an indirect repeated ancestor, independent attributes, opaque code, malformed outer input, braced boundaries, and literal controls. Compare the expected children structurally, ignoring only source positions. HTML equivalence alone does not establish AST preservation.

Implementation acceptance also requires native write/reparse preservation, formatting stability, source positions and source-preserving edits, links and other inline hosts, headings, lists, quotes, footnotes, table cells, and nesting-limit recovery. Add cases for unmatched inner openers, escaped closers, consecutive attribute runs, strike substitution, and foreign export behavior. Long malformed and deeply nested inputs must retain the delimiter-stack performance contract without repeated suffix searches.

Sections 2 and 5 of the broader proposal, encoded code syntax, and unrelated importer fixes are outside this change. No changelog work is included.
