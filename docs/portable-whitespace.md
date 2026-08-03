# Portable Whitespace

Carve is not required to follow Djot's whitespace rules, and a document that
ignores this page is not wrong - it renders exactly as written. But Carve and
Djot disagree about whitespace in two places, and a document that keeps to the
Djot-shaped form in both is also valid Djot source. If you ever expect your
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

In Carve a visible block opener interrupts an open paragraph. In Djot it does
not - the opener folds into the paragraph as text.

```
Some text
# A heading
```

Carve renders a paragraph and a heading. Djot renders one paragraph reading
`Some text # A heading`. The same applies to `>`, a code fence, `---`, a
`:::` fence, a table, and a definition list.

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

A top-level list is the exception that needs nothing: a list marker does not
interrupt a paragraph in Carve either, so `Some text` followed by `- a` is a
single paragraph in both languages already.

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
a bare `>` separator line inside a quote are all valid. A tab immediately after
`>` is content, not the marker separator.

## What this page does not cover

**Constructs Carve deliberately spells differently.** Emphasis delimiters are
swapped (`/italic/`, `*bold*`), `_x_` is underline rather than emphasis, and
sup/sub are braced-only. Those are on
[Divergence from Djot](/divergence-from-djot) and no whitespace rule recovers
them - a document using them is Carve, not Djot, by design.

**Link reference definitions.** A `[b]: /url` line directly under a paragraph
diverges the same way, but it leaves no node in the tree for the linter to
anchor on, so `--portable` does not report it. Give it a blank line too.

(Abbreviation definitions and comment fences were once listed here as well.
They are not exceptions: both produce real nodes and both **are** reported.)

**Places where Carve is the stricter engine.** Djot accepts a block opener
indented one to three spaces; Carve requires column zero and reads the indented
line as paragraph text. A document that hits this is already rendering wrongly
in Carve, so it is a plain correctness problem rather than a portability one.
