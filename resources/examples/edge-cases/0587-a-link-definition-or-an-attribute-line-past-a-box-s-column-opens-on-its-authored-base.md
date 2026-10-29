## A link definition or an attribute line past a box's column opens on its authored base

A link definition or attribute line past a box's content column opens on its authored base (CARVE-P0-004, CARVE-P0-011, CARVE-P9-083), as a footnote definition there is hoisted (corpus 582).

:::: compare

````carve
- ::: box
    [r]: /u
  :::

see [x][r]
````

```html
<ul>
  <li>
    <div class="box">

    </div>
  </li>
</ul>
<p>see <a href="/u">x</a></p>
```

::::

:::: compare

````carve
- ::: box
    {.k}
    para
  :::
````

```html
<ul>
  <li>
    <div class="box">
      <p class="k">para</p>
    </div>
  </li>
</ul>
```

::::

The same definition at the box's own column already opens there.

:::: compare

````carve
- ::: box
  [r]: /u
  :::

see [x][r]
````

```html
<ul>
  <li>
    <div class="box">

    </div>
  </li>
</ul>
<p>see <a href="/u">x</a></p>
```

::::
