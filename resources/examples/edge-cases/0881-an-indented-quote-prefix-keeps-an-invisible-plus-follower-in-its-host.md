---
page: edge-definitions
---

## An indented quote prefix keeps an invisible plus follower in its host

CARVE-P9-067 and the latest carve#4449 ruling (carve#4698). The normalized quote prefix of an accepted own-line `+` places its followers in the quote. Under CARVE-P0-005, an invisible follower keeps its quote marker, but its content is erased before the following line is laid out.

::: compare

````carve
> > a
 > +
 > {x}
 > b
````

````html
<blockquote>
  <blockquote>
    <p>a</p>
    <p x="">b</p>
  </blockquote>
</blockquote>
````

:::

::: compare

````carve
> > a
 > +
 > %% c
 > b
````

````html
<blockquote>
  <blockquote><p>a</p></blockquote>
  <p>b</p>
</blockquote>
````

:::

::: compare

````carve
> > a
 > +
 > [r]: /u
 > b
````

````html
<blockquote>
  <blockquote><p>a</p></blockquote>
  <p>b</p>
</blockquote>
````

:::

