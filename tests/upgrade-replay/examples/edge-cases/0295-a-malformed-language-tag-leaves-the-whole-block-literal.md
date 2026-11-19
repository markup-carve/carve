## A malformed language tag leaves the whole block literal

The envelope is checked while parsing, so a candidate that misses it is not a
half-consumed attribute: the block fails and the braces stay in the text, which
is what a malformed attribute block does everywhere else (PART 9 §14). An
underscore, an empty subtag, a leading or trailing hyphen and a non-ASCII
letter each fail it.

::: compare

```carve
[a]{:en_US} [b]{:-en} [c]{:en-} [d]{:français}
```

```html
<p>[a]{:en_US} [b]{:-en} [c]{:en-} [d]{:français}</p>
```

:::

A subtag runs to eight characters. The ninth has nothing to match, so the block
fails there rather than truncating the tag.

::: compare

```carve
[a]{:abcdefgh} [b]{:abcdefghi}
```

```html
<p><span lang="abcdefgh">a</span> [b]{:abcdefghi}</p>
```

:::

The deferred braced-symbol spelling keeps its slot: a trailing `:` is not a
subtag character, so `{:name:}` stays literal under this production
(`docs/dismissed-syntax.md`).

::: compare

```carve
[x]{:tada:}
```

```html
<p>[x]{:tada:}</p>
```

:::

An attribute NAME still admits no colon, so a namespaced spelling stays literal
too - the language sigil leads its attribute, it does not appear inside one.

::: compare

```carve
[x]{xml:lang=en}
```

```html
<p>[x]{xml:lang=en}</p>
```

:::
