## A link inside a span's label keeps its destination

The never-nest constraint binds a link's TEXT. A span's label is the same
bracket run, but a span is not a link, so a link written in a label nests into
nothing and its destination stands. Every link spelling is that same case: an
inline link, a reference link, an autolink, and a link under emphasis.

A link inside a LINK label still unwraps, at any depth, including one wrapped in
a span on the way down. An image is not a link and survives in either label.

::: compare

`````carve
[[t](/v)]{.c}
`````

`````html
<p><span class="c"><a href="/v">t</a></span></p>
`````

:::

::: compare

`````carve
[[t][r]]{.c}

[r]: /v
`````

`````html
<p><span class="c"><a href="/v">t</a></span></p>
`````

:::

::: compare

`````carve
[<https://e.com>]{.c}
`````

`````html
<p><span class="c"><a href="https://e.com">https://e.com</a></span></p>
`````

:::

::: compare

`````carve
[/[t](/v)/]{.c}
`````

`````html
<p><span class="c"><em><a href="/v">t</a></em></span></p>
`````

:::

::: compare

`````carve
[![a](/i)]{.c}
`````

`````html
<p><span class="c"><img src="/i" alt="a"></span></p>
`````

:::

An empty attribute block is a span too, so it holds a link on the same terms.

::: compare

`````carve
[[t](/v)]{}
`````

`````html
<p><span><a href="/v">t</a></span></p>
`````

:::

The link-label half, unchanged: the inner destination goes and the outer one
applies.

::: compare

`````carve
[[t](/v)](/u)
`````

`````html
<p><a href="/u">t</a></p>
`````

:::

::: compare

`````carve
[[[t](/v)]{.d}](/u)
`````

`````html
<p><a href="/u"><span class="d">t</span></a></p>
`````

:::

::: compare

`````carve
[![a](/i)](/u)
`````

`````html
<p><a href="/u"><img src="/i" alt="a"></a></p>
`````

:::
