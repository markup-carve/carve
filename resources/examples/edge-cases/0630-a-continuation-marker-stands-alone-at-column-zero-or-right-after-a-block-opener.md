## A continuation marker stands alone at column zero or right after a block opener

A `+` at column 0 of its quote level or first after the last opener on the same line attaches the next column-0 block. An indented `+` stays text or fence payload (markup-carve/carve#3421).

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
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::::::
::::::: compare

`````carve
  > +
q
`````

```html
<blockquote><p>q</p></blockquote>
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

The last opener is the nested item, so it takes the paragraph.

::::::: compare

`````carve
- - +
para
`````

```html
<ul>
  <li>
    <ul>
      <li>para</li>
    </ul>
  </li>
</ul>
```

:::::::

The quote opened inside the item takes the paragraph.

::::::: compare

`````carve
- > +
para
`````

```html
<ul>
  <li>
    <blockquote><p>para</p></blockquote>
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

An ordered outer item also gives the paragraph to its nested item.

::::::: compare

`````carve
1. - +
para
`````

```html
<ol>
  <li>
    <ul>
      <li>para</li>
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

The indented opener's `+` keeps today's reading: the nested item is empty and the paragraph is outside the list.

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
      <li>para</li>
    </ul>
  </li>
</ul>
```

:::::::
