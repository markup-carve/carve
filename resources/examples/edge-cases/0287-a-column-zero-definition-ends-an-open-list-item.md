## A column-zero definition ends an open list item

Column zero is the surrounding document's opener column. A link or footnote
definition there interrupts and closes the item, registers as document
metadata, and leaves the following block at document level. Only a nonzero
column below the item content column reaches no definition opener and folds as
literal text. At the content column the definition belongs to the item, as
category 228 pins. A comment remains the explicit exception: its invisibility
is accepted independently of column and does not itself close the item.

::: compare

```carve
1. x
[t](u)
_u_
[r]: /u
[t][r]
\#
```

```html
<ol>
  <li>x
<a href="u">t</a>
<u>u</u></li>
</ol>
<p><a href="/u">t</a>
#</p>
```

:::

::: compare

```carve
- a
[^f]: note
after[^f]
```

```html
<ul>
  <li>a</li>
</ul>
```

:::

::: compare

```carve
1. x
 [r]: /u
```

```html
<ol>
  <li>x</li>
</ol>
```

:::

::: compare

```carve
1. x
   [r]: /u
   [t][r]
```

```html
<ol>
  <li>x
    <a href="/u">t</a>
  </li>
</ol>
```

:::
