## Leading attribute brace before an inline span stays literal

An unattached `{…}` attribute block that opens a line has nothing to its left to attach to, so it stays literal text; a following inline span still parses normally. The line is not consumed or dropped.

::: compare

```carve
{k=v}{+i+}
```

```html
<p>{k=v}<ins>i</ins></p>
```

:::

The braces of an unattached block are text like any other, so a code span or link that starts inside them runs past the `}`, and a lone brace inside a forced span is text too.

::: compare

```carve
x{.k title="`"} y

x{title="[a"}](u)

x{*a { b*} c
```

```html
<p>x{.k title=“<code>"} y</code></p>
<p>x{title=“<a href="u">a”}</a></p>
<p>x<strong>a { b</strong> c</p>
```

:::

A bare delimiter that opens nothing takes no block either: the characters stay content, so the run inside them reaches the end of the block. A delimiter that does close a span still takes the block.

::: compare

```carve
x*{title="`"} y

*x*{title="`"} y
```

```html
<p>x*{title=“<code>"} y</code></p>
<p><strong title="`">x</strong> y</p>
```

:::
