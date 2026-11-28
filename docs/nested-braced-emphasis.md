---
title: "Explicit same-kind emphasis nesting"
description: "Specification change, compatibility examples, and acceptance cases for nested braced emphasis."
---

# Explicit same-kind emphasis nesting

An emphasis node can hold a child of its own kind. This covers emphasis, strong, underline, strike, highlight, superscript, subscript, insertion and deletion. The rule started in 0.1 as a specification change (CARVE-P9-043, a right-to-left pass over braced pairs). Carve 0.2 replaced that procedure with one delimiter stack shared by bare and braced delimiters. This page describes the 0.2 rule and records what changed from the 0.1 proposal.

## Status

In 0.2 same-kind nesting is part of the core inline syntax (C2-I-051 for bare delimiters, C2-I-055 to C2-I-061 for braced ones). A kind nests in itself whether the delimiters are bare or braced. The writer rules that keep nested nodes apart are C2-W-069 and C2-W-070.

History: the 0.1 proposal landed in the specification on 2026-10-11 (carve#2904), with implementations in [carve-js#2710](https://github.com/markup-carve/carve-js/pull/2710) and [carve-php#3070](https://github.com/markup-carve/carve-php/pull/3070). Its right-to-left pairing pass, its substitution boundary rules and its literal bare child did not carry over into 0.2. The sections below say where each of them went.

## Native spelling

A braced child inside a parent of the same kind gives two nodes:

::: compare
```crv
{*outer {*inner*} tail*} and {^outer {^inner^} tail^}
```
```html
<p><strong>outer <strong>inner</strong> tail</strong> and <sup>outer <sup>inner</sup> tail</sup></p>
```
:::

In 0.2 a bare parent and a bare child nest too. The first two sources give the same tree as the braced strong above, and the third shows the same nesting for emphasis. `carve fmt` writes them as `{*outer {*inner*} tail*}` and `{/a {/b/} c/}`:

<!-- carve-sample {"fmtSkip":"shows non-canonical spellings of the same tree on purpose"} -->
::: compare
```crv
*outer {*inner*} tail*

*outer *inner* tail*

/a /b/ c/
```
```html
<p><strong>outer <strong>inner</strong> tail</strong></p>
<p><strong>outer <strong>inner</strong> tail</strong></p>
<p><em>a <em>b</em> c</em></p>
```
:::

This is a change from the 0.1 proposal, where a bare child of an active kind stayed literal, so `{*a *b* c*}` was one strong node with inner asterisks in its text. In 0.2 the same source is a strong node inside a strong node.

Doubled bare delimiters are still not delimiters (C2-I-049): `**x**` is literal text, and lint reports it as `markdown-strong-double-star`.

## Pairing on one stack

Bare and braced entries share one delimiter stack, and the scan runs left to right:

- A braced opener is `{` and a mark. It only opens. A braced closer is the mark and `}`. It only closes, and only while a braced opener of that mark is open; otherwise the mark is read by the bare rules and the brace is text (C2-I-057).
- A braced closer pairs with the nearest open braced opener of its mark. A braced token never pairs with a bare delimiter (C2-I-058).
- The first pair closed wins. When a pair closes, every entry opened after its opener is removed and becomes text, bare or braced (C2-I-059).
- A braced opener that finds no closer, or that is removed, is text, and its mark is not read again as a bare delimiter (C2-I-060).
- A braced opener glued to its own closer, such as `{**}`, forms nothing (C2-I-061).

There is no separate pass that records braced pairs before the forward scan, and a braced span is not an opaque boundary. A delimiter inside a braced span can close a span that opened outside it. The braced opener above it is then removed, and lint reports `braced-span-opener-as-text`:

<!-- carve-sample {"lint":"shows the braced-span-opener-as-text warning"} -->
::: compare
```crv
*bold {/note*/} more*
```
```html
<p><strong>bold {/note</strong>/} more*</p>
```
:::

Escape the inner delimiter to keep the braced span. `carve fmt` writes the same tree as `{*bold /note*/ more*}`:

<!-- carve-sample {"fmtSkip":"shows the escape an author adds, not the writer's spelling"} -->
::: compare
```crv
*bold {/note\*/} more*
```
```html
<p><strong>bold <em>note*</em> more</strong></p>
```
:::

Unmatched openers resolve the way the 0.1 proposal recorded. For `*a {*b c*`, the unmatched braced opener stays literal and the bare parent closes normally. An unmatched outer opener does not discard a matched inner span: `{*a {*b c*}` keeps the outer opener as text and the inner strong node.

<!-- carve-sample {"fmtSkip":"shows malformed input as authored; fmt writes the second line as {*a *b c*"} -->
::: compare
```crv
*a {*b c*

{*a {*b c*}
```
```html
<p><strong>a {*b c</strong></p>
<p>{*a <strong>b c</strong></p>
```
:::

Inside a braced parent, a bare opener of the same kind that never closes is removed when the braced pair closes: `{*a *b c*}` is one strong node with the text `a *b c`.

## Attributes

Child and parent attributes attach independently:

::: compare
```crv
{*a {*b*}{.inner} c*}{.outer}
```
```html
<p><strong class="outer">a <strong class="inner">b</strong> c</strong></p>
```
:::

## Strike and substitution

The 0.1 proposal spent a section on strike substitution: a `~>` separator was visible only in its own braced frame, and nested frames were classified one by one. 0.2 removed substitution. `~>` is text, a braced tilde is always strike, and a replacement is a deletion with an insertion glued to it (C2-I-062):

::: compare
```crv
{~a *x~>y* b~} and {-old-}{+new+}
```
```html
<p><s>a <strong>x~&gt;y</strong> b</s> and <del>old</del><ins>new</ins></p>
```
:::

The upgrade tool rewrites `{~old~>new~}` to `{-old-}{+new+}` (U-069). See [Upgrading to 0.2](./upgrade-0-2).

Insertion and deletion now nest like the other braced kinds: `{+a {+b+} c+}` is an insertion inside an insertion. The 0.1 proposal kept their own matching and recovery rules and did not admit repeated insertion or deletion wrappers.

## Compatibility

Measured differences between the 0.1 pin and 0.2:

- `*a {*b*} c*` was one strong span ending after `b`, followed by literal text: `<p><strong>a {*b</strong>} c*</p>`. 0.2 gives a strong parent containing a strong child and the trailing ` c`.
- `{*a *b* c*}` was one strong node with literal asterisks. 0.2 nests the bare child.
- `{~a {*x~>y*} b~}` produced deletion and insertion around the separator before the proposal. The proposal and 0.2 both give strike with a strong child whose text is `x~>y`; in 0.2 the reason is that `~>` is never a separator.

## Escaping

Escaping the brace prevents a forced opener, and that is all it does. The inner delimiters stay active, so `\{*x*}` is a literal brace around a bare strong span:

::: compare
```crv
\{*x*}
```
```html
<p>{<strong>x</strong>}</p>
```
:::

One backslash is therefore enough for a literal `{*` opener, and not enough for a whole literal `{*x*}`. To keep the span literal, escape the active opening mark too. The closing `*}` then has no open braced opener and no bare opener to close, so it is text:

::: compare
```crv
\{\*x*}
```
```html
<p>{*x*}</p>
```
:::

## Writing, import, and export

The native writer preserves repeated emphasis nodes and their attributes. Emphasis and strong are written bare where the bare delimiters would open and close at that position, and braced otherwise (C2-W-069). Every emphasis or strong node with an ancestor or descendant of its own kind is written braced, even across intervening kinds (C2-W-070). Both bare-parent and braced-parent strong examples therefore write as `{*outer {*inner*} tail*}`. A strong node inside emphasis inside strong keeps both strong nodes braced, while a lone kind in between stays bare:

::: compare
```crv
{/a *b {/c/} d* e/}
```
```html
<p><em>a <strong>b <em>c</em> d</strong> e</em></p>
```
:::

Underline, strike and highlight have no bare form in 0.2 and are always written braced (C2-W-071). Superscript, subscript, insertion and deletion likewise have one braced spelling (C2-W-116).

HTML keeps both wrappers. HTML import maps each `<em>`, `<strong>`, `<s>`, `<mark>`, `<u>`, `<sub>`, `<sup>`, `<ins>` and `<del>` to its own node (C2-M-044), so a nested pair of one element imports as two nodes. Plain output keeps the text. Markdown and Djot export are engine behavior, not part of the specification: native support does not prove that either foreign syntax can preserve every nested tree. Verify those targets separately and check the loss report where needed.

The 0.2 AST schema permits inline children of these kinds, including children of the same kind. Nesting needs no extra node or field.

## Depth limit

Bare and braced spans share one budget. Inline nesting stops at depth 200 in each inline content (C2-I-118). The depth of an opener is the number of entries open on the bracket stack and the delimiter stack together when it is read; the blocks around the content do not count. An opener read while 200 entries are open is text, is not pushed, and takes part in no pairing. A delimiter that can close is tested as a closer first, so it still closes at the limit. Long malformed and deeply nested inputs must keep the delimiter-stack performance contract without repeated suffix searches.

## Acceptance

The 0.1 proposal shipped 69 shared vectors covering all seven kinds of that proposal, bare parents, three levels, repeated ancestors, independent attributes, opacity, malformed and crossing input, literal controls, document hosts and depth budgets. Several of those expected results are different in 0.2 (bare children, opacity, substitution), so they are history, not 0.2 acceptance.

For 0.2, the clause cases and examples of the conformance suite are the oracle. An implementation should also check, beyond HTML equivalence:

- Direct parsing gives the expected node structure. HTML equivalence alone does not establish AST preservation.
- Canonical write and reparse give the same tree. Normalize `escaped_text` to text and coalesce adjacent text runs first: escaping the writer needs can change those source classifications without changing content. Keep emphasis kinds, child order, text values and semantic attributes exact.
- Formatting is stable, and source positions and source-preserving edits are right.
- Nesting works in links and other inline hosts, headings, list items, quotes, footnotes and table cells.
- Recovery at the depth limit follows C2-I-118.

**Specification (external):** [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-046 to C2-I-063, C2-I-118), [Writer](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md) (C2-W-069 to C2-W-071, C2-W-116), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md) (C2-M-044), [Upgrading](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md) (U-069).
