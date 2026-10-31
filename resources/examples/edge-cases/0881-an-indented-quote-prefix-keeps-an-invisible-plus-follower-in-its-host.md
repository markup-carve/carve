---
page: edge-definitions
---

## An indented quote prefix keeps an invisible plus follower in its host

CARVE-P9-067 and the latest carve#4449 ruling (carve#4698). The normalized quote prefix of an accepted own-line `+` also places each invisible follower in that quote.

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
  <blockquote>
    <p>a</p>
    <p>b</p>
  </blockquote>
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
  <blockquote>
    <p>a</p>
    <p>b</p>
  </blockquote>
</blockquote>
````

:::

