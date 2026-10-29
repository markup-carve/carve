## A marker folds only strictly between the item's base and content column

A list marker written under an OPEN item folds into that item's lead text only
where its column is STRICTLY BETWEEN the item's base column and its content
column. At the base column it starts a SIBLING; at or past the content column it
NESTS. Both of those open a real item, so a definition written on such a marker
is metadata and registers; inside the window the line is the open item's own
lead text and the reference stays literal (markup-carve/carve#1906).

The window WIDENS with the item, which is the property a corpus has to hold.
Under `- ` it is the single column 1; under `-   ` it is 1, 2 and 3:

| item hands out at | folds | opens an item |
| --- | --- | --- |
| 2 | 1 | 0, 2 |
| 4 | 1, 2, 3 | 0, 4 |

Both EDGES are pinned at both widths, and both directions of the error with
them: a reader that collects too little fails the rows where a marker at the
base or the content column must register, and one that collects too much fails
the rows inside the window. The columns alone do not separate the two readings -
column 2 opens an item under `- ` and folds under `-   ` - so the two widths have
to be pinned together, or a reader that answers by a fixed column passes both.

Under `- `, the base column. A sibling marker opens a real item, so its
definition is metadata.

::: compare

```carve
- lead
- [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Column 1, the whole of this item's window. The marker is lead text and the
reference stays literal.

::: compare

```carve
- lead
 - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Column 2, the content column. The marker nests and its definition registers.

::: compare

```carve
- lead
  - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Under `-   `, the base column again. Widening the item does not move this
edge.

::: compare

```carve
-   lead
- [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Column 2, which opened an item three rows above and is inside the window here.
This is the pair that separates the window from a fixed column.

::: compare

```carve
-   lead
  - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Column 3, the window's far edge - one column below the content column, and still
lead text.

::: compare

```carve
-   lead
   - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

Column 4, the content column. The marker nests and the definition registers.

::: compare

```carve
-   lead
    - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::

The base column is read from the COLUMN, not from the marker family. An ordered
marker there ends the bullet list and opens its own, so the definition is still
metadata.

::: compare

```carve
- lead
1. [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
</ul>
<ol>
  <li></li>
</ol>
<p>See <a href="/t">t</a>.</p>
```

:::

A folded marker does not become the owner the next line is measured against. The
second line is inside the window of the item that is still open and stays lead
text, so the third line is measured against that same item and stays text too.

::: compare

```carve
-   lead
 - prose
 - [t]: /t

See [t][].
```

```html
<ul>
  <li>lead</li>
  <li>prose</li>
  <li></li>
</ul>
<p>See <a href="/t">t</a>.</p>
```

:::
