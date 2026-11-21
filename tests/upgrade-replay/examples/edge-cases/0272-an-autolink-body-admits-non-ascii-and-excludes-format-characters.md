## An autolink body admits non-ASCII and excludes format characters

`url_char` was an enumerated ASCII set, so read as written an autolink admitted
no non-ASCII at all - and two engines linked internationalized domains anyway
(markup-carve/carve#860). The rule now reads: outside ASCII, `url_char` admits
any character that is not whitespace and not a FORMAT character
(General_Category Cf).

The deciding asymmetry is that the same destination written as an inline link
already links everywhere, because `link_destination` admits
`unicode_url_char`. One destination cannot answer two ways on the character set
depending on which spelling the author reached for.

::: compare

```carve
<https://例.jp/>
```

```html
<p><a href="https://例.jp/">https://例.jp/</a></p>
```

:::

A non-ASCII PATH links on the same terms:

::: compare

```carve
<https://example.com/café>
```

```html
<p><a href="https://example.com/café">https://example.com/café</a></p>
```

:::

And so does a non-ASCII character that is not a LETTER. This is the row that
separates the rule from "Unicode letters are letters": the executable spec's
`urlChar` used ohm's built-in `letter`, which is Unicode-aware, so it linked
`café` for free and left a currency sign, a CJK comma or an emoji literal.

::: compare

```carve
<https://example.com/€10>
```

```html
<p><a href="https://example.com/€10">https://example.com/€10</a></p>
```

:::

### A format character is not a URL character

The exclusion is the half that is new rather than permissive. A format
character is invisible by definition, so a host carrying one renders as the
host WITHOUT it and links somewhere else - a spoofing surface, not an authoring
convenience. The next document has a U+FEFF BYTE ORDER MARK between the `e` and
the `.com`, and it is not an autolink:

::: compare

```carve
<https://e﻿.com/>
```

```html
<p>&lt;https://e﻿.com/&gt;</p>
```

:::

A LEADING one, before the scheme, is literal too - there for a different
reason, since a scheme starts with a letter and this is not one:

::: compare

```carve
<﻿https://e.com/>
```

```html
<p>&lt;﻿https://e.com/&gt;</p>
```

:::

A U+200B ZERO WIDTH SPACE is a format character as well, despite the name -
Unicode moved it out of the space categories in 4.0.1. Spelling the rule as a
PROPERTY is what makes these two documents answer alike: a host language whose
own whitespace class happens to hold U+FEFF gets the first one right for the
wrong reason and this one wrong.

::: compare

```carve
<https://e​.com/>
```

```html
<p>&lt;https://e​.com/&gt;</p>
```

:::

A U+00A0 NO-BREAK SPACE is excluded by the OTHER half of the rule - it is
whitespace - and was already the answer under both readings:

::: compare

```carve
<https://e .com/>
```

```html
<p>&lt;https://e&nbsp;.com/&gt;</p>
```

:::

### What did not change

CONTROL. The ASCII exclusions are untouched. `"`, `\`, a backtick, `{`, `}`,
`|`, `^`, `<` and `>` are still not `url_char`s, and all four artifacts already
agreed on them - which is why the rule is spelled `unicode_url_char -
format_char` rather than "any non-whitespace, non-control character". The
latter would re-admit these nine and move every implementation on a question
nobody asked. (The straight quotes additionally pick up smart-quote typography,
which is what makes the output curly.)

::: compare

```carve
<https://example.com/"q">
```

```html
<p>&lt;https://example.com/“q”&gt;</p>
```

:::

CONTROL. `link_destination` is a different production and is unchanged, so a
format character in an INLINE destination is still an ordinary destination
character. The pair below and the interior-BOM autolink above are the same
character in the same position, answering differently because the two
spellings are two productions:

::: compare

```carve
[t](https://e﻿.com/)
```

```html
<p><a href="https://e﻿.com/">t</a></p>
```

:::

CONTROL. Only the BODY admits non-ASCII. A `scheme` is
`letter, {letter | digit | '+' | '-' | '.'}` and `letter` is the enumerated
ASCII alphabet, so a scheme written in another script opens no autolink. The
executable spec accepted one until this landed, for the same reason it linked
`café`: ohm's `letter` is Unicode-aware.

::: compare

```carve
<例://example.com/>
```

```html
<p>&lt;例://example.com/&gt;</p>
```

:::
