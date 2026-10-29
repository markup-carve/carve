## A language attribute and lang are one key

`{:TAG}` desugars before any merge runs, so writing it beside `lang=TAG` is a
repeated key and follows the rule every repeated key follows: the last value
wins and the slot stays where the key first appeared (§15 - accumulation).
There is no precedence between the two spellings; only their order matters.

::: compare

```carve
[a]{:fr lang=de} [b]{lang=de :fr}
```

```html
<p><span lang="de">a</span> <span lang="fr">b</span></p>
```

:::

The surviving value lands in the slot the FIRST of the two opened, which is
what makes the shorthand invisible to the serializer.

::: compare

```carve
[x]{k=1 :fr lang=de title=t}
```

```html
<p><span k="1" lang="de" title="t">x</span></p>
```

:::

Two shorthands collide the same way.

::: compare

```carve
[x]{:fr :de}
```

```html
<p><span lang="de">x</span></p>
```

:::

Across accumulated block-attribute lines the answer is the same, because the
desugaring happens before that merge too.

::: compare

```carve
{:fr}
{lang=de}
Text
```

```html
<p lang="de">Text</p>
```

:::

An UPPERCASE key is a different key. Attribute names are case-sensitive
(PART 11 §1), so `LANG` is an ordinary attribute that happens to spell a
reserved name differently - the same way `{KBD}` is not the semantic span
`{kbd}` (PART 9 §10). Only the exact lowercase `lang` is the language
attribute's other spelling.

::: compare

```carve
[a]{LANG=fr} [b]{lang=fr}
```

```html
<p><span LANG="fr">a</span> <span lang="fr">b</span></p>
```

:::

This pair is what the round-trip check needs to be able to fail. It compares
`toHtml(fmt(x))` against `toHtml(x)` over every document, and a writer that
folded the key case would rewrite `[a]{LANG=fr}` to `[a]{:fr}` and render
`lang="fr"` where the source asked for `LANG="fr"`. Every other corpus
document writes its attribute names in lower case, so the check could not
see it (carve#1137).
