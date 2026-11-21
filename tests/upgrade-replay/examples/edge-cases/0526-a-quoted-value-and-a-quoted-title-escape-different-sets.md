## A quoted value and a quoted title escape different sets

`quoted_value` reads `escaped_char`, a backslash plus ASCII punctuation, so the
set is not the closing quote alone: an escaped brace, an escaped backslash, an
escaped pipe and the other quote glyph all resolve to that character. Both quote
spellings read the same set, and a block-attribute line reads the same
`quoted_value` an inline block does.

`link_title` escapes its own closing quote and nothing else, so the two slots do
not share one helper. What they do agree on is the quote itself, in both
spellings, and `image_title = link_title` reads it the same way.

::: compare

`````carve
[x]{k="a\}b"}
`````

`````html
<p><span k="a}b">x</span></p>
`````

:::

::: compare

`````carve
[x]{k='a\}b'}
`````

`````html
<p><span k="a}b">x</span></p>
`````

:::

::: compare

`````carve
[x]{k="a\\b"}
`````

`````html
<p><span k="a\b">x</span></p>
`````

:::

::: compare

`````carve
[x]{k='a\\b'}
`````

`````html
<p><span k="a\b">x</span></p>
`````

:::

::: compare

`````carve
[x]{k="a\'b"}
`````

`````html
<p><span k="a&apos;b">x</span></p>
`````

:::

::: compare

`````carve
[x]{title="a\|b"}
`````

`````html
<p><span title="a|b">x</span></p>
`````

:::

::: compare

`````carve
{k="a\}b"}
p
`````

`````html
<p k="a}b">p</p>
`````

:::

::: compare

`````carve
[a](/u 't\'u')
`````

`````html
<p><a href="/u" title="t&apos;u">a</a></p>
`````

:::

::: compare

`````carve
[a](/u "t\"u")
`````

`````html
<p><a href="/u" title="t&quot;u">a</a></p>
`````

:::

::: compare

`````carve
![a](/i 't\'u')
`````

`````html
<img src="/i" alt="a" title="t&apos;u">
`````

:::
