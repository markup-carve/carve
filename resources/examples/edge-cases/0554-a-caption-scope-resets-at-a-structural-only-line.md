## A caption scope resets at a structural-only line

A caption attaches to a host. A line that is empty once its block structural
prefix is removed - a bare `>` - carries layout and no content, so it is not one
of the blanks the one-blank caption allowance counts. Where it changes the open
container it ends the scope above it, and the container it opens holds nothing a
caption could be about (`CARVE-P9-080`, markup-carve/carve#2892).

A bare `>` between a table and a `^ ` line used to count as blank, so the quote
it opened became a captioned figure and the caption bound to a host nobody wrote
it under. Neither the table nor the empty quote is captioned now; the `^ ` line
has no captionable block above it and is ordinary paragraph text.

::: compare

````carve
| a |

>

^ cap
````

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<blockquote>

</blockquote>
<p>^ cap</p>
```

Adjacency does not change the answer: the quote is empty either way.

````carve
>
^ cap
````

```html
<blockquote>

</blockquote>
<p>^ cap</p>
```

The control. A quote with content still captions, and a bare `>` INSIDE it is
not a container change, so a trailing one does not detach the caption.

````carve
> q
>

^ cap
````

```html
<figure>
  <blockquote><p>q</p></blockquote>
  <figcaption>cap</figcaption>
</figure>
```

:::
