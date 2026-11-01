---
page: edge-definitions
---

## Three blank lines end a description list

PART 9 §11 N1a (carve#4759). Three blank lines end a description list as they end a list: the term after the run opens a new description list.

:::::: compare

`````carve
:: t
: x



:: u
: v
`````

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
</dl>
<dl>
  <dt>u</dt>
  <dd>v</dd>
</dl>
```

::::::

Two blank lines remain ordinary spacing between entries.

:::::: compare

`````carve
:: t
: x


:: u
: v
`````

```html
<dl>
  <dt>t</dt>
  <dd>x</dd>
  <dt>u</dt>
  <dd>v</dd>
</dl>
```

::::::

A description after the run has no term above it and is a paragraph.

:::::: compare

`````carve
:: t



: d
`````

```html
<dl>
  <dt>t</dt>
</dl>
<p>: d</p>
```

::::::

An invisible line does not split the run, and the boundary holds inside a list item.

:::::: compare

`````carve
- o

  :: t
  : x

  %% c


  :: u
  : v
`````

```html
<ul>
  <li>o
    <dl>
      <dt>t</dt>
      <dd>x</dd>
    </dl>
    <dl>
      <dt>u</dt>
      <dd>v</dd>
    </dl>
  </li>
</ul>
```

::::::

A continuation at the description's body column after the run stays in that description.

:::::: compare

`````carve
:: t
: x



  more
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>x</p>
    <p>more</p>
  </dd>
</dl>
```

::::::
