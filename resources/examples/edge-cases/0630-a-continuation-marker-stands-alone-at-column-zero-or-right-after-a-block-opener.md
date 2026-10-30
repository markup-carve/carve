## A continuation marker stands alone at column zero or right after a block opener

A `+` on its own line at an open marker column, or last on a line of openers, attaches a follower at that marker column, read through the prefixes of the quotes around it. Any other `+` is a letter, or fence payload at a fence's content column (markup-carve/carve#3421, carve#4409).

::::::: compare

`````carve
- a
  - b
  +
para
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+
para</li>
    </ul>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
- a
  - b
+
para
`````

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    para
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
> - a
>   - b
> +
> para
`````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b</li>
      </ul>
      para
    </li>
  </ul>
</blockquote>
```

:::::::
::::::: compare

`````carve
> > q
> > +
> > - s
`````

```html
<blockquote>
  <blockquote><p>q
+
- s</p></blockquote>
</blockquote>
```

:::::::
::::::: compare

`````carve
> q
>   +
> para
`````

```html
<blockquote><p>q
+
para</p></blockquote>
```

:::::::
::::::: compare

`````carve
- a
  - ```
    x
    +
    ```
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code>x
+
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
- a
  - b
  +
> q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
+</li>
    </ul>
  </li>
</ul>
<blockquote><p>q</p></blockquote>
```

:::::::
::::::: compare

`````carve
- a
  - b
  +
  > q
`````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <blockquote><p>q</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
- - - ```
      x
    +
tail
`````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x
</code></pre>
          </li>
        </ul>
        +
tail
      </li>
    </ul>
  </li>
</ul>
```

:::::::
::::::: compare

`````carve
  > +
q
`````

```html
<blockquote><p>+
q</p></blockquote>
```

:::::::
::::::: compare

`````carve
>>+
q
`````

```html
<p>&gt;&gt;+
q</p>
```

:::::::

::::::: compare

`````carve
>+
q
`````

```html
<p>&gt;+
q</p>
```

:::::::

The last opener is the nested item, whose marker column is 2, so the line at column 0 folds into the refused `+`.

::::::: compare

`````carve
- - +
para
`````

```html
<ul>
  <li>
    <ul>
      <li>+
para</li>
    </ul>
  </li>
</ul>
```

:::::::

The quote opened inside the item owns the `+`. Its marker column is 2, so the line folds into the refused `+`.

::::::: compare

`````carve
- > +
para
`````

```html
<ul>
  <li>
    <blockquote><p>+
para</p></blockquote>
  </li>
</ul>
```

:::::::

The item opened inside the quote takes the paragraph.

::::::: compare

`````carve
> - +
> para
`````

```html
<blockquote>
  <ul>
    <li>para</li>
  </ul>
</blockquote>
```

:::::::

An ordered outer item reads the same: its nested item owns the `+` and refuses column 0.

::::::: compare

`````carve
1. - +
para
`````

```html
<ol>
  <li>
    <ul>
      <li>+
para</li>
    </ul>
  </li>
</ol>
```

:::::::

A later column-0 marker belongs to the outer item, not the nested item.

::::::: compare

`````carve
- a
  - b
+
para
`````

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
    para
  </li>
</ul>
```

:::::::

The indented opener's `+` is refused at column 0, and the line folds into it.

::::::: compare

`````carve
- a
  - +
para
`````

```html
<ul>
  <li>a
    <ul>
      <li>+
para</li>
    </ul>
  </li>
</ul>
```

:::::::
