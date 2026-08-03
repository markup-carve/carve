# Portable Whitespace

Carve is not required to follow Djot's whitespace rules, and a document that
ignores this page is not wrong - it renders exactly as written. But Carve and
Djot disagree about how a blockquote marker is spaced, and a document that
keeps to the Djot-shaped form is also valid Djot source. If you ever expect
your `.crv` files to be read by a Djot processor, it is worth writing them
that way from the start.

This costs nothing. The recommended form - exactly one space after `>` - is
also the CommonMark-safe form, so following this page does not trade Markdown
compatibility for Djot compatibility - it gives up neither.

::: tip
This is advisory. It is reported only when you ask for it:

```sh
carve lint --portable doc.crv
```
:::

## Put a space after every `>`

Carve accepts a blockquote marker with nothing after it. Djot does not. See
[Divergence from Djot, section 5b](/divergence-from-djot#_5b-the-blockquote-marker-does-not-require-a-space)
for why Carve allows it; this page is about what to write instead if you want
the portable form.

```
>quote
```

Carve renders a blockquote; Djot renders the literal text `>quote`. Write the
space:

```
> quote
```

Nesting needs the same treatment on every marker, because Djot has no `>>`
marker at all - `>> q` is literal text there even though its inner marker is
spaced:

```
> > q
```

Every line of the quote needs it, not just the opening one. Carve strips an
unspaced marker on a continuation line; Djot keeps it as literal text:

```
> ok
>bad
```

Carve reads that as one paragraph `ok bad`; Djot reads it as `ok >bad`.

A tab after the marker, two spaces after it, a lazy continuation line with no
marker at all, and a bare `>` separator line inside a quote all parse
identically in Carve and Djot, so none of them needs changing for portability.
That is a Carve-versus-Djot claim only, not a CommonMark one: two spaces after
`>` is not CommonMark-identical, since CommonMark's marker consumes just one
of them and leaves the second as a leading space in the content. The
CommonMark-safe form is the single space recommended above.

Reported as `portable-quote-marker-space`.

## What this page does not cover

**Constructs Carve deliberately spells differently.** Emphasis delimiters are
swapped (`/italic/`, `*bold*`), `_x_` is underline rather than emphasis, and
sup/sub are braced-only. Those are covered elsewhere on
[Divergence from Djot](/divergence-from-djot) and no whitespace rule recovers
them - a document using them is Carve, not Djot, by design.

**A `>` marker followed by a fence opener on the same line.** A line like
`` >``` `` is not reported even though there is no space after the marker: the
linter treats that line as opening verbatim content, and does not scan inside
it for the marker-space check. It is a miss in the linter, not bad advice -
the recommended space is still correct and still worth writing.

**Places where Carve is the stricter engine.** Djot accepts a block opener at
any indentation - it has no indented-code-block rule to stop it. Carve requires
column zero and reads an indented line as paragraph text. A quote marker
indented that way is already rendering wrongly in Carve, so it is a plain
correctness problem rather than a portability one.
