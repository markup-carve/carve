## A line-final run of spaces and tabs is dropped before the line is read

Line-final spaces and tabs are insignificant: they are dropped before anything
reads the line (`CARVE-P7-001` item 5, markup-carve/carve#2978). On an attribute
line that wraps, the run before the line break is no part of the separator, so
the block still closes on the next line.

<!-- The first line ends in a SPACE. -->
A space before the line break of a wrapped attribute line is dropped.

::: compare

```carve
{.a 
.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::

<!-- The first line ends in a TAB. -->
So is a tab, which would be content anywhere inside the line.

::: compare

```carve
{.a	
.b}

paragraph
```

```html
<p class="a b">paragraph</p>
```

:::
