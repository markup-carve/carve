---
page: edge-definitions
---

## An attached colon frame stops at a description sibling

A colon frame attached to a description body ends at its next sibling, even when a closer follows later. A term is a sibling too, and an own-line continuation marker uses the same rule.

:::: compare

```carve
:: t
: +
:::
: b
:::
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>

    </div>
  </dd>
  <dd>b</dd>
</dl>
<div>

</div>
```

```carve
:: t
: +
:::
:: u
: v
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>

    </div>
  </dd>
  <dt>u</dt>
  <dd>v</dd>
</dl>
```

```carve
:: t
: a
+
:::
: b
:::
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <div>

    </div>
  </dd>
  <dd>b</dd>
</dl>
<div>

</div>
```

::::
