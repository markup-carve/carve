## A link title crosses a soft wrap and an attribute value does not

`link_title` subtracts the closing quote alone, and `character` is any Unicode
character, so a newline is inside the run. `quoted_value` subtracts `newline`
and CARVE-P4-006 says so. The two slots are not one rule, and neither spelling
is the other's default.

`image_title = link_title` is one production defined by reference, so an image
title wraps on the same terms, and an escaped quote inside a wrapped title is
still the literal quote. A BLANK line is a different matter: it ends the
paragraph, so it ends the title with it. That case is pinned in
`tests/a-link-title-crosses-a-soft-wrap.test.mjs` rather than here, because the
declining bracket run it leaves behind reaches an engine position gap this rule
has nothing to do with (markup-carve/carve-php#2713).

::: compare

`````carve
[a](/u "t
u")
`````

`````html
<p><a href="/u" title="t
u">a</a></p>
`````

:::

::: compare

`````carve
[a](/u 't
u')
`````

`````html
<p><a href="/u" title="t
u">a</a></p>
`````

:::

::: compare

`````carve
![a](/i "t
u")
`````

`````html
<img src="/i" alt="a" title="t
u">
`````

:::

::: compare

`````carve
[a](/u "t\"
u")
`````

`````html
<p><a href="/u" title="t&quot;
u">a</a></p>
`````

:::

::: compare

`````carve
[a]{k="t
u"}
`````

`````html
<p>[a]{k=“t
u”}</p>
`````

:::

A reference definition does not follow. The bound there is the prose above
`reference_definition`, which puts both of its roles on one line, rather than the
production's closing `newline`: a wrapped title would satisfy that terminal with
the line break after it. So the definition declines and both lines are prose.

::: compare

`````carve
[a][r]

[r]: /u "t
u"
`````

`````html
<p>[a][r]</p>
<p>[r]: /u “t
u”</p>
`````

:::
