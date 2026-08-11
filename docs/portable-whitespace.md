# Portable Whitespace

Carve is not required to follow every Djot whitespace rule. Carve 0.2 and Djot
now agree that blocks need block position after prose, but still differ in
container details. If you ever expect your
`.crv` files to be read by a Djot processor, it is worth writing them that way
from the start.

This costs nothing. Both portable forms below are also the CommonMark-safe
forms, so following this page does not trade Markdown compatibility for Djot
compatibility - it gives up neither.

::: tip
These are advisory. They are reported only when you ask for them:

```sh
carve lint --portable doc.crv
```
:::

## Leave a blank line before a block opener

In both Carve 0.2 and Djot, a block opener does not interrupt an open paragraph;
the opener folds into the paragraph as text.

```
Some text
# A heading
```

Both render one paragraph reading `Some text # A heading`. The same applies to
`>`, a code fence, `---`, a `:::` fence, a table, definitions, comments,
attributes, and extension blocks.

The portable form is a blank line:

```
Some text

# A heading
```

The same holds one level in, where the "paragraph" is a list item's content:

```
- a
  - b
```

Carve nests the second bullet; Djot reads it as a continuation line of the
first. A blank line between them nests in both.

A tight sublist marker that reaches its item's content column is Carve's
explicit structural exception; it nests without requiring a blank line.

Reported as `portable-blank-line-before-block`.

## Put a space after every `>`

Carve and Djot both require the space after `>` unless the marker is the whole
line. This is ordinary Carve, not just a portability convention.

```
>quote
```

Both render the literal text `>quote`. Write the space:

```
> quote
```

Nesting needs the same treatment on every marker. There is no `>>` shorthand;
write both markers explicitly:

```
> > q
```

Every marked line of the quote needs it, not just the opening one:

```
> ok
>bad
```

Both read that as one quoted paragraph `ok` followed by a lazy continuation
line `>bad`.

Two spaces after the marker, a lazy continuation line with no marker at all, and
a bare `>` separator line inside a quote are all valid.

A TAB after the marker is not. Carve's separator is the space character, so a
tab is content and the line is an ordinary paragraph; Djot accepts the tab and
opens the quote. The two engines disagree about the whole block, not about its
spacing:

```
>	q
```

The fence above holds a real tab. Carve renders that line as ordinary
paragraph text, marker and all; Djot renders a quoted `q`. Write a space.

## What this page does not cover

**Constructs Carve deliberately spells differently.** Emphasis delimiters are
swapped (`/italic/`, `*bold*`), `_x_` is underline rather than emphasis, and
sup/sub are braced-only. Those are on
[Divergence from Djot](/divergence-from-djot) and no whitespace rule recovers
them - a document using them is Carve, not Djot, by design.

**Definitions and comments.** Give them block position too. Without a blank,
their marker is literal paragraph content; `carve lint` reports likely missing
boundaries.

**Places where Carve is the stricter engine.** Djot accepts a block opener
indented one to three spaces; Carve requires column zero and reads the indented
line as paragraph text. A document that hits this is already rendering wrongly
in Carve, so it is a plain correctness problem rather than a portability one.
