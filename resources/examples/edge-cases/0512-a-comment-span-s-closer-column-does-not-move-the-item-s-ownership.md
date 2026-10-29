## A comment span's closer column does not move the item's ownership

`CARVE-P9-053` recognizes a comment at every column and names both spellings: the
`%%` line form, and the `%%%` fence form "whose body and closer travel with its
opener". `CARVE-P0-013` adds that a `%%%` run closes the span at any column and
ends no container, because `comment_block_open` and `comment_block_close` each
carry a whitespace slot of their own. The column the ownership question is asked
of is therefore the OPENER's, and a closer written below the item's content
column answers as the same closer written at it.

The first three cases are the definition band
[carve#1909](https://github.com/markup-carve/carve/issues/1909) asked for and
never got. A link definition in the payload is consumed at either closer column
and a later reference stays literal. PART 9 §28 substitutes only where no closer
follows at all, and there the definition is live and the reference resolves,
which is what separates the two.

The next four are the same parameter read on the FOLLOWING line: at depth one, at
depth two, and on an ordered marker whose content column is 3. The payload line
is not prose, so it opens no paragraph for that follower to fold into, and the
closer leaves the span where the opener left it.

The last case is the owner table doing its own work. A follower at the outer
item's content column belongs to that item, which is a question about the
follower's column and never about the closer's.

A span spelled on the MARKER LINE is the last four. `CARVE-P0-007` makes the
marker line's content the item's first block and lists `- %% c` / `tail` as ending
the item, so a `%%%` span written there retains nothing for a below-column
follower either, at every closer column. The `%%` control closes the group.

::: compare

`````carve
- item
  %%%
  [r]: /url
%%%

[use][r]
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>[use][r]</p>
`````

:::

::: compare

`````carve
- item
  %%%
  [r]: /url
  %%%

[use][r]
`````

`````html
<ul>
  <li>item</li>
</ul>
<p>[use][r]</p>
`````

:::

::: compare

`````carve
- item
  %%%
  [r]: /url

[use][r]
`````

`````html
<ul>
  <li>item</li>
</ul>
<p><a href="/url">use</a></p>
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
    tail
  </li>
</ul>
`````

:::

::: compare

`````carve
- %%%
  hidden
  %%%
 tail
`````

`````html
<ul>
  <li></li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- %%%
  hidden
%%%
 tail
`````

`````html
<ul>
  <li></li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- %%%
  hidden
%%%
tail
`````

`````html
<ul>
  <li></li>
</ul>
<p>tail</p>
`````

:::

::: compare

`````carve
- %% c
 tail
`````

`````html
<ul>
  <li></li>
</ul>
<p>tail</p>
`````

:::
