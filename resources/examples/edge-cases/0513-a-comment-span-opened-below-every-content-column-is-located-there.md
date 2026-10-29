## A comment span opened below every content column is located there

`CARVE-P9-053` names the `%%%` form as the one "whose body and closer travel with
its opener", so the column that answers for the line after the span is the
OPENER's. `CARVE-P0-013` lets the closing run stand at any column and end no
container, which is what makes the two halves separable at all. carve#2527 read
that rule for an opener at the item's content column. An opener written below
every open container's content column opens no span in the item collector, so its
closer used to arrive as a fresh comment and answer with the column it was
written at.

The first three cases are one document at three closer columns: below the content
column, at it, and past it. A comment consumed below the content column retains
the item for a noninterrupting follower, so `tail` stays in the item in all
three.

The fourth is an ordered marker, whose content column is 3. The fifth is two
levels in, where one opener sits below both content columns and the follower
belongs to the inner item. The sixth widens the run to five, because a closer
matches on run length and never on indentation. The seventh is the `%%` line form
at the same column, which has always answered this way and is the spelling the
fence form now agrees with.

The last case is a BLOCK OPENER rather than a follower: an unterminated code fence
at the item's content column. The span closed the item's paragraph, so the fence
opens a code block, and `tail` supplies no prefix to the fence's host and leaves
the list (`CARVE-P0-013`, ruled on markup-carve/carve#2973). The span written at
the content column answers the same.

::: compare

`````carve
- item
 %%%
 hidden
%%%
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- item
 %%%
 hidden
  %%%
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- item
 %%%
 hidden
   %%%
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
1. item
  %%%
  hidden
   %%%
tail
`````

`````html
<ol>
  <li>item</li>
</ol>
<p>tail</p>
`````

:::

::: compare

`````carve
- a
  - item
 %%%
 hidden
    %%%
tail
`````

`````html
<ul>
  <li>a
    <ul>
      <li>item</li>
    </ul>
  </li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- item
 %%%%%
 hidden
  %%%%%
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- item
 %% c
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- item
 %%%
 hidden
  %%%
  ```
tail
`````

`````html
<ul>
  <li>item</li>
</ul>
<pre><code>tail
</code></pre>
`````

:::
