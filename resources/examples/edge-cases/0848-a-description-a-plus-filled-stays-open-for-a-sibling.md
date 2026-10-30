---
page: edge-containers
---

## A description a plus filled stays open for a sibling

A `+` decides where its block attaches and nothing else, so a `: ` line below the body column opens the next description at any column, after a paragraph or any other block (carve#4408).

A paragraph the `+` attached

::::::: compare

`````carve
:: t
: +
l
 : b
`````

`````html
<dl>
  <dt>t</dt>
  <dd>l</dd>
  <dd>b</dd>
</dl>
`````

:::::::

A heading the `+` attached

::::::: compare

`````carve
:: t
: +
# H
 : b
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <h1 id="H">H</h1>
  </dd>
  <dd>b</dd>
</dl>
`````

:::::::

A `+` past its term refuses a follower at column zero, and the sibling still opens

::::::: compare

`````carve
:: t
 : +
l
 : b
`````

`````html
<dl>
  <dt>t</dt>
  <dd>+
l</dd>
  <dd>b</dd>
</dl>
`````

:::::::

Through a quote's prefix

::::::: compare

`````carve
> :: t
> : +
> # H
>  : b
`````

`````html
<blockquote>
  <dl>
    <dt>t</dt>
    <dd>
      <h1 id="H">H</h1>
    </dd>
    <dd>b</dd>
  </dl>
</blockquote>
`````

:::::::
