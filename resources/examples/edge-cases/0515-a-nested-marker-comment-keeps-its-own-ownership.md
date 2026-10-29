## A nested marker comment keeps its own ownership

CARVE-P0-007 applies to a nested marker line too. The comment is the inner
item's first block and leaves no paragraph open. A closer below the outer
item's column cannot give that item a fresh comment's retention. The ordinary
follower is a document paragraph at every closer column (carve#2526).

The first pair moves only the closer. The line-comment control has the same
owner. The ordered pair checks a different content column.

::: compare

````carve
- a
  - %%%
    hidden
%%%
tail
````

````html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::

::: compare

````carve
- a
  - %%%
    hidden
    %%%
tail
````

````html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::

::: compare

````carve
- a
  - %% hidden
tail
````

````html
<ul>
  <li>a
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::

::: compare

````carve
1. a
   1. %%%
      hidden
%%%
tail
````

````html
<ol>
  <li>a
    <ol>
      <li></li>
    </ol>
  </li>
</ol>
<p>tail</p>
````

:::

::: compare

````carve
1. a
   1. %%%
      hidden
      %%%
tail
````

````html
<ol>
  <li>a
    <ol>
      <li></li>
    </ol>
  </li>
</ol>
<p>tail</p>
````

:::
