## A tab after a heading, quote or caption marker leaves the line as prose

The definition markers already pin this rule; the block markers are the same one and nothing covered them. A tab after `#`, `>` or `^` is not the marker's separator, so no block opens.

::: compare

```carve
#	Heading

>	quoted
```

```html
<p>#	Heading</p>
<p>&gt;	quoted</p>
```

:::

The caption marker needs a block to attach to before the rule is observable at all - on its own line it is prose either way. Directly under an image, a space makes a `<figure>` and a tab does not.

::: compare

```carve
![Moon](m.jpg)
^	Figure 1
```

```html
<p><img src="m.jpg" alt="Moon">
^	Figure 1</p>
```

:::
