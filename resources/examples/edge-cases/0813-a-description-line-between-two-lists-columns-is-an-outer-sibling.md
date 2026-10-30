---
page: edge-definitions
---

## A description line between two lists' columns is an outer sibling

A `: ` description line is a sibling at any column once it misses the open body of the previous description (CARVE-P0-024 S3, ruling C of carve#4180). A line short of the outer description's body column misses both bodies, so it starts a description of the outer list and does not fold into the nested one (carve#4189).

:::: compare

```carve
:: t
: d
  :: u
  : v
 : e
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <dl>
      <dt>u</dt>
      <dd>v</dd>
    </dl>
  </dd>
  <dd>e</dd>
</dl>
```

::::

:::: compare

```carve
:: t
: d
  :: u
  : v

 : e
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <dl>
      <dt>u</dt>
      <dd>v</dd>
    </dl>
  </dd>
  <dd>e</dd>
</dl>
```

::::

:::: compare

```carve
- x

  :: t
  :  d
     :: u
     : v
    : e
```

```html
<ul>
  <li>x
    <dl>
      <dt>t</dt>
      <dd>
        <p>d</p>
        <dl>
          <dt>u</dt>
          <dd>v</dd>
        </dl>
      </dd>
      <dd>e</dd>
    </dl>
  </li>
</ul>
```

::::
