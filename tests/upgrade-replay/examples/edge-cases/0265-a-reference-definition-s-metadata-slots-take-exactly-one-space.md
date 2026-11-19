## A reference definition's metadata slots take exactly one space

The definition line carries two of the four slots carve#912 narrowed:
`link_title` before the quoted title, and `[space, attributes]` before the
trailing attribute block. Both are padding -- the definition is already a
definition at `[a]: /url` -- and both are spelled as exactly one space.

With two spaces the title is not a title, and the leftover quoted run is what
the line then fails on: the definition is anchored at end of line (carve#911),
so the whole line is an ordinary paragraph and the reference does not resolve.

::: compare

```carve
[a]: /u  "T"

[a][]
```

```html
<p>[a]: /u  “T”</p>
<p>[a][]</p>
```

:::

The attribute block answers the same way, and note where it does NOT go: the
zero-space case is a different shape, because `[a]: /u{.c}` glues the braces to
the destination and gives `href="/u{.c}"`. Two spaces end the destination
instead, so the block is left over and the production fails on it.

When these two documents were written under carve#912 the leftover was silently
dropped and the line stayed a definition, which is the outcome PART 7 names as
the one to avoid. carve#911 anchored the line, and this is the fallback the
clause promises.

::: compare

```carve
[a]: /u  {.c}

[a][]
```

```html
<p>[a]: /u  {.c}</p>
<p>[a][]</p>
```

:::

The CONTROLS. One space carries the title, and one space carries the
attributes:

::: compare

```carve
[a]: /u "T"

[a][]
```

```html
<p><a href="/u" title="T">a</a></p>
```

:::

::: compare

```carve
[a]: /u {.c}

[a][]
```

```html
<p><a href="/u" class="c">a</a></p>
```

:::
