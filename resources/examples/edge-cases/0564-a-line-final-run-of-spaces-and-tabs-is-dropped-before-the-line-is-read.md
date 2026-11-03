## A line-final run of spaces and tabs is dropped before the line is read

Line-final spaces and tabs are insignificant: they are dropped before anything
reads the line (`CARVE-P7-001` item 5, markup-carve/carve#2978). On an attribute
line that wraps, the run before the line break is no part of the separator.
The next line must still be indented past `{` (CARVE-P2-035), so the historical
column-0 examples below are paragraph text.

<!-- The first line ends in a SPACE. -->
A space before the line break is dropped; it does not supply continuation indentation.

::: compare

```carve
{.a 
.b}

paragraph
```

```html
<p>{.a
.b}</p>
<p>paragraph</p>
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
<p>{.a
.b}</p>
<p>paragraph</p>
```

:::
