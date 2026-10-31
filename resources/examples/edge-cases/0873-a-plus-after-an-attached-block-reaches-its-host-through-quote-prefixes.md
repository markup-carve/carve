---
page: edge-definitions
---

## A plus after an attached block reaches its host through quote prefixes

CARVE-P9-067 (carve#4629). A second own-line `+` after the block a `+` attached reaches the same host when the lines carry quote prefixes, as it does without them: the space after an indented quote marker and a `>` blank line between the blocks are read through the prefixes.

:::::: compare

`````carve
> :: t
>   : p
>   +
>   b
>   +
>   c
`````

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <p>p</p>
      <p>b</p>
      <p>c</p>
    </dd>
  </dl>
</blockquote>
```

::::::

:::::: compare

`````carve
> - a
> +
> # h
>
> +
> # h
`````

```html
<blockquote>
  <ul>
    <li>a
      <h1 id="h">h</h1>
      <h1 id="h-2">h</h1>
    </li>
  </ul>
</blockquote>
```

::::::
