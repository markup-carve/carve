---
page: edge-lists
---

## A first-block plus whose next line misses the opener's marker column is a letter

PART 9 §17 L3 and CARVE-P9-067 (carve#4409, carve#4396; carve#4400, carve#4332, carve#4239). A first-block `+` attaches only a block at its innermost opener's marker column. A follower at another column is not pulled in: the `+` is a letter and the line is read as if the `+` were text.

:::::: compare

`````carve
- - +
```
  - y

w
`````

```html
<ul>
  <li>
    <ul>
      <li>+</li>
    </ul>
  </li>
</ul>
<pre><code>  - y

w
</code></pre>
```

::::::

:::::: compare

`````carve
:: s
: a

  * +
> q
`````

```html
<dl>
  <dt>s</dt>
  <dd>
    <p>a</p>
    <ul>
      <li>+</li>
    </ul>
  </dd>
</dl>
<blockquote><p>q</p></blockquote>
```

::::::

:::::: compare

`````carve
- a
  - +
   + y
    - z
`````

```html
<ul>
  <li>a
    <ul>
      <li>+
+ y
        <ul>
          <li>z</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

::::::
