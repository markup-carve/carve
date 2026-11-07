---
page: edge-lists
---

## Open-state lifetime boundaries

### term description

::: compare

````carve
:: t
: d
````

````html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
````

:::

### term nonmember

::: compare

````carve
- a
  :: t
  # H
  x
: d
````

````html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
    </dl>
    <h1 id="H">H</h1>
    x
: d
  </li>
</ul>
````

:::

### term blank nonmember

::: compare

````carve
- a
  :: t

  p
: d
````

````html
<ul>
  <li><p>a</p>
    <dl>
      <dt>t</dt>
    </dl>
    <p>p
: d</p>
  </li>
</ul>
````

:::

### description sibling

::: compare

````carve
:: t
: a
: b
````

````html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dd>b</dd>
</dl>
````

:::

### description next term

::: compare

````carve
:: t
: a
:: u
: b
````

````html
<dl>
  <dt>t</dt>
  <dd>a</dd>
  <dt>u</dt>
  <dd>b</dd>
</dl>
````

:::

### description marker column

::: compare

````carve
- a
  :: t
  : d
: x
````

````html
<ul>
  <li>a
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
  </li>
</ul>
<p>: x</p>
````

:::

### description after closure

::: compare

````carve
- a
  :: t
  : d

  p
: x
````

````html
<ul>
  <li><p>a</p>
    <dl>
      <dt>t</dt>
      <dd>d</dd>
    </dl>
    <p>p
: x</p>
  </li>
</ul>
````

:::

### item blank keep

::: compare

````carve
- a

  b
````

````html
<ul>
  <li><p>a</p>
    <p>b</p>
  </li>
</ul>
````

:::

### item missed line

::: compare

````carve
- a
  # H
b
````

````html
<ul>
  <li>a
    <h1 id="H">H</h1>
  </li>
</ul>
<p>b</p>
````

:::

### item sibling

::: compare

````carve
- a
- b
````

````html
<ul>
  <li>a</li>
  <li>b</li>
</ul>
````

:::

### stanza blank

::: compare

````carve
::: |
alpha

beta
:::
````

````html
<div class="line-block">
  <p>alpha</p>
  <p>beta</p>
</div>
````

:::

### stanza closer

::: compare

````carve
::: |
alpha
:::
tail
````

````html
<div class="line-block">
  <p>alpha</p>
</div>
<p>tail</p>
````

:::

### stanza host end

::: compare

````carve
- +
::: |
alpha
: z
````

````html
<ul>
  <li>
    <div class="line-block">
      <p>alpha<br>
: z</p>
    </div>
  </li>
</ul>
````

:::

### comment closer

::: compare

````carve
%%%
hidden
%%%
shown
````

````html
<p>shown</p>
````

:::

### comment owner miss

::: compare

````carve
- a
  %%%
  hidden
outside
````

````html
<ul>
  <li>a</li>
</ul>
<p>outside</p>
````

:::

### comment input end

::: compare

````carve
%%%
hidden
````

````html

````

:::

### attached code closer

::: compare

````carve
- +
```
a
```
tail
````

````html
<ul>
  <li>
    <pre><code>a
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

### attached code blank

::: compare

````carve
- +
```
a

  tail
````

````html
<ul>
  <li>
    <pre><code>a
</code></pre>
    <p>tail</p>
  </li>
</ul>
````

:::

### attached colon closer

::: compare

````carve
- +
::: note
inside
:::
tail
````

````html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>inside</p>
    </aside>
  </li>
</ul>
<p>tail</p>
````

:::

### attached colon blank

::: compare

````carve
- +
::: note
inside

  tail
````

````html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>inside</p>
    </aside>
    <p>tail</p>
  </li>
</ul>
````

:::

### attached other boundary

::: compare

````carve
> +
# H
tail
````

````html
<blockquote>
  <h1 id="H">H</h1>
</blockquote>
<p>tail</p>
````

:::

### pulled paragraph interrupt

::: compare

````carve
:: t
: +
p
  # H
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <p>p</p>
    <h1 id="H">H</h1>
  </dd>
</dl>
````

:::

### pulled paragraph lazy

::: compare

````carve
- +
p
q
````

````html
<ul>
  <li>p
q</li>
</ul>
````

:::

### quote marked blank

::: compare

````carve
> a
>
> b
````

````html
<blockquote>
  <p>a</p>
  <p>b</p>
</blockquote>
````

:::

### quote unmarked blank

::: compare

````carve
> a

> b
````

````html
<blockquote><p>a</p></blockquote>
<blockquote><p>b</p></blockquote>
````

:::

### quote nonmember

::: compare

````carve
> a
> # H
> b
````

````html
<blockquote>
  <p>a</p>
  <h1 id="H">H</h1>
  <p>b</p>
</blockquote>
````

:::

