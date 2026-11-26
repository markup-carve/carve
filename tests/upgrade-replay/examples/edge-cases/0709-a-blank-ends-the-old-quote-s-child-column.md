## A blank ends the old quote's child column

A new quote after the blank does not inherit the list item from the earlier quote. The indented definition stays prose and the reference stays unresolved.

:::: compare

```carve
> - x

>   [r]: /u

> [r][]
```

```html
<blockquote>
  <ul>
    <li>x</li>
  </ul>
</blockquote>
<blockquote>

</blockquote>
<blockquote><p><a href="/u">r</a></p></blockquote>
```

::::
