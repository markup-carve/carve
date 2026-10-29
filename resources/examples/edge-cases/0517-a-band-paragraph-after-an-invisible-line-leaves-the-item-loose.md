## A band paragraph after an invisible line leaves the item loose

A comment at the content column retains nothing, so the below-column followers
in the first two rows open document paragraphs (`CARVE-P0-009` X1,
`CARVE-P9-053`). The third row's content-column follower is the item's second
paragraph, and the blank-line separation makes the item loose (PART 9 §17 L1b).
The fourth row's comment fence also leaves the follower outside the item, and
the last row's below-column marker starts a separate list.

::: compare

````carve
- t

  %% c
 z
````

````html
<ul>
  <li>t</li>
</ul>
<p>z</p>
````

:::

::: compare

````carve
10. t

    %% c
   z
````

````html
<ol start="10">
  <li>t</li>
</ol>
<p>z</p>
````

:::

::: compare

````carve
10. t

    %% c
    z
````

````html
<ol start="10">
  <li><p>t</p>
    <p>z</p>
  </li>
</ol>
````

:::

::: compare

````carve
- t

  %%%
  c
  %%%
 z
````

````html
<ul>
  <li>t</li>
</ul>
<p>z</p>
````

:::

::: compare

````carve
- t

  %% c
 - b
- s
````

````html
<ul>
  <li><p>t</p></li>
  <li><p>b</p></li>
  <li><p>s</p></li>
</ul>
````

:::
