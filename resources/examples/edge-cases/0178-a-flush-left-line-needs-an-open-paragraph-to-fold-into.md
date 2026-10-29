## A flush-left line needs an open paragraph to fold into

A lazy continuation folds into the innermost OPEN paragraph (PART 1 S4). Where
nothing is open, the unmatched containers close and the line is re-classified at
the top level - and an item whose last block is an EMPTY container has nothing
open, whatever column the next line starts at.

Pinned because no case had a container as an item's last block followed by a
flush-left line, so three engines gave three answers with every suite green
(carve#561, carve#572, carve#582).

An empty quote on the marker line opens no paragraph, so the item closes:

::: compare

```carve
. >
X
```

```html
<ol>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ol>
<p>X</p>
```

:::

The same with a bullet marker:

::: compare

```carve
- >
lazy
```

```html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
<p>lazy</p>
```

:::

CONTRAST: give the quote content and a paragraph IS open, so the line folds into
it and the item stays:

::: compare

```carve
- > q
lazy
```

```html
<ul>
  <li>
    <blockquote><p>q
lazy</p></blockquote>
  </li>
</ul>
```

:::

A sub-list is not special either. The item's last block is a list whose own last
item holds an open paragraph, so the flush-left line folds into THAT paragraph -
the same answer as when the sub-list is opened on its own line.

::: compare

```carve
- - a
b
```

```html
<ul>
  <li>
    <ul>
      <li>a
b</li>
    </ul>
  </li>
</ul>
```

:::

The line does not have to be flush left, and it does not have to look like prose.
One column in it reaches no content column - not the sub-list's, not the outer
item's - so it opens nothing and folds as text, marker and all.

::: compare

```carve
- - a
 - b
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
  <li>b</li>
</ul>
```

:::

A heading in that position folds the same way. Flush left it would be a heading,
and at the sub-list's own column the marker above would be a sibling item: the
fold is about reaching no column at all.

::: compare

```carve
- x
  - a
 # H
```

```html
<ul>
  <li>x
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

How FAR below the column it sits changes nothing. §24 C3 asks one question - does
the line reach the content column - and Rule B's "any indent" is scoped to where
a TOP-LEVEL list may open (C4), not to nesting. Here the sub-list's content
column is 6 and the outer item's is 4, so a marker at 2 reaches neither and
folds, exactly as it does one column in.

::: compare

```carve
-   x
    - a
  - b
```

```html
<ul>
  <li>x
    <ul>
      <li>a</li>
    </ul>
  </li>
  <li>b</li>
</ul>
```

:::
