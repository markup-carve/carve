## A definition body's open code fence ends at a line below its column

A FENCED BODY IS NOT A PARAGRAPH (PART 1, CARVE-P0-013), in a definition body as
in a list item: a line below the body's column has no paragraph to fold into,
so the body ends there and the line is read at document level. The fence opens
whether or not a closer follows (§10 I4), the way *An item's fence is read once,
whatever block it follows* reads it (markup-carve/carve#2143).

::::: compare

````carve
:: t
: ```
 y
  ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code></code></pre>
  </dd>
</dl>
<p>y</p>
<pre><code></code></pre>
```

:::::

::::: compare

````carve
:: t
: ```
  b
 y
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>b
</code></pre>
  </dd>
</dl>
<p>y</p>
```

:::::

After a paragraph the fence opens too, and the body's own parse takes the same
answer. ` y` ends it, and the trailing run opens an empty code block after `y`.

::::: compare

````carve
:: t
: a
  ```
  b
 y
  ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code>b
</code></pre>
  </dd>
</dl>
<p>y</p>
<pre><code></code></pre>
```

:::::

CONTROL. A fence the body already closed leaves the paragraph after it open, so
the line folds into that paragraph as it does under a list item.

::::: compare

````carve
:: t
: ```
  b
  ```
  c
 y
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>b
</code></pre>
    <p>c
y</p>
  </dd>
</dl>
```

:::::

A later fence-shaped line is not this fence's closer either: ` y` has already
ended the fence and the body, and the trailing run opens its own empty code
block after `z`.

::::: compare

````carve
:: t
: a
  ```
  b
 y

z
  ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code>b
</code></pre>
  </dd>
</dl>
<p>y</p>
<p>z</p>
<pre><code></code></pre>
```

:::::
