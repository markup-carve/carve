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

Each explicit closer ends the innermost reachable matching braced span. It cannot cross an intervening braced boundary or a bracket-run boundary. Code, literal and raw spans, comments, destinations, and attributes retain their existing opacity. Empty braced spans remain literal. Only matched braced spans create an opaque boundary. For `*a {*b c*`, the unmatched child opener remains literal and the bare parent closes normally. An unmatched outer opener does not discard a matched inner span: `{*a {*b*}` keeps the outer opener as text and the inner strong node.

Child and parent attributes attach independently:

~~~carve
{*a {*b*}{.inner} c*}{.outer}
~~~

Strike substitution uses a separator visible in its own braced frame. A matched nested braced span hides its separators; an unmatched opener hides none. Each nested strike/substitution frame is classified independently. This clarifies a previously incomplete boundary rule and changes some existing substitution input, as shown below. Editorial insertion and deletion retain their meanings.

## Compatibility

Existing source containing nested explicit spans can change meaning. For example, the pinned implementation reads `*a {*b*} c*` as one strong span ending after `b`, followed by literal text. The new rule produces a strong parent containing a strong child and the trailing ` c`.

The measured pinned output for `*a {*b*} c*` is `<p><strong>a {*b</strong>} c*</p>`. Two further compatibility cases matter:

- `{*a {*b c*}` now leaves the outer opener literal and closes the inner strong span. Previously the outer strong contained literal `{*b c`.
- `{~a {*x~>y*} b~}` now produces strike containing a strong child whose text is `x~>y`. Previously the pinned implementation produced deletion and insertion around the separator. This is an explicit substitution-boundary change within the proposal.

An author who wants literal punctuation can escape it:

~~~carve
\{\*x\*\}
~~~

Escaping only the opening brace prevents a forced opener, but other punctuation can still participate in ordinary inline parsing. A canonical writer must escape all active punctuation needed to preserve literal text.

## Writing, import, and export

The native writer must preserve repeated emphasis nodes and their attributes. Canonically, every emphasis node with an ancestor or descendant of its own kind uses braces, even across intervening emphasis kinds. Both bare-parent and braced-parent strong examples therefore write as `{*outer {*inner*} tail*}`. Unrelated nodes keep their existing spelling rules. Importers must preserve newly representable relationships and stop reporting same-kind flattening for those relationships. Other unsupported shapes and depth-limit recovery keep their diagnostics.

HTML keeps both wrappers. Plain output keeps the text. Markdown and Djot export retain their existing target-specific contracts: native support does not prove that either foreign syntax can preserve every nested tree. Verify those targets separately and use their specified fallback or loss reporting where needed.

The definitions in [`resources/ast-schema.json`](https://github.com/markup-carve/carve/blob/main/resources/ast-schema.json) already permit inline children of these kinds, including children of the same kind. This change needs no new node or field and no schema-version bump for that relationship.

## Acceptance

The shared vectors cover all seven kinds, bare parents, three levels, an indirect repeated ancestor, independent attributes, opaque code, malformed outer input, braced boundaries, and literal controls. Each vector's `children` is the expected paragraph inline run. Compare semantic structure and attributes; test source positions and authored attribute order separately from canonical output. Expected ASTs were validated against the schema and rendered to verify the supplied HTML; their sources have not passed the proposed parser behavior. HTML equivalence alone does not establish AST preservation.

Implementation acceptance also requires native write/reparse preservation, formatting stability, source positions and source-preserving edits, links and other inline hosts, headings, lists, quotes, footnotes, table cells, and nesting-limit recovery. Further cases must cover escaped closers, consecutive attribute runs, and foreign export behavior. Depth-limit vectors supply a remaining inline-depth budget for the host context, not a new public parser option. An over-limit matched span stays literal as a whole, including its closer, so it cannot prematurely close its parent. Long malformed and deeply nested inputs must retain the delimiter-stack performance contract without repeated suffix searches.

Empty destinations, blank table rows, encoded code syntax, and unrelated importer fixes are outside this change. No changelog work is included.
