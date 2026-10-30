---
page: edge-definitions
---

## The entry after a first-block plus description is its sibling

A first-block `: +` description is the definition-list twin of the list-item `- +` opener (CARVE-P2-016), so a `: ` line at the list's marker column after its attached block opens the next description, as it does after a plain `: a`. The same holds inside a list item and a quote, and a term line there starts the next entry (carve#4179).

:::: compare

```carve
:: t
: +
after
: b
```

```html
<dl>
  <dt>t</dt>
  <dd>after</dd>
  <dd>b</dd>
</dl>
```

::::

:::: compare

```carve
- x

  :: t
  : +
  after
  : b
```

```html
<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>after</dd>
      <dd>b</dd>
    </dl>
  </li>
</ul>
```

::::

:::: compare

```carve
> :: t
> : +
> > q
> : b
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <blockquote><p>q</p></blockquote>
    </dd>
    <dd>b</dd>
  </dl>
</blockquote>
```

::::

:::: compare

```carve
:: t
: +
after
:: u
: w
```

```html
<dl>
  <dt>t</dt>
  <dd>after</dd>
  <dt>u</dt>
  <dd>w</dd>
</dl>
```

::::
