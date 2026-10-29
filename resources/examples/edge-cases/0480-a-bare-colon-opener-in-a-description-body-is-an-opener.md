## A bare colon opener in a description body is an opener

A bare `:::` is closer-shaped, but in a definition body that closes nothing it
opens a container, as a typed `::: d` does: a `:::` opener is not guarded (§10
I4). An empty container leaves no paragraph open, so a line below the body's
column closes it (CARVE-P9-084, and *An empty unterminated container ends at a
flush-left line* for the typed spelling). The list-host spelling is a separate
question and is not decided here (markup-carve/carve#2147).

::::: compare

````carve
:: t
: :::
 y
  :::
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>

    </div>
  </dd>
</dl>
<p>y</p>
<div>

</div>
```

:::::

::::: compare

````carve
:: t
: :::
y
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>

    </div>
  </dd>
</dl>
<p>y</p>
```

:::::

After a paragraph it interrupts, whether a line follows it or not, and a pair
closed at once is closed.

::::: compare

````carve
:: t
: a
  :::
y
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <div>

    </div>
  </dd>
</dl>
<p>y</p>
```

:::::

::::: compare

````carve
:: t
: a
  :::
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <div>

    </div>
  </dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: :::
  :::
y
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>

    </div>
  </dd>
</dl>
<p>y</p>
```

:::::

CONTROL. A container that already holds a paragraph takes the line in as lazy
continuation. A `:::` inside an open code fence is code, not an opener, and
` y` below the column ends that fence and the body.

::::: compare

````carve
:: t
: :::
  a
 y
  :::
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <div>
      <p>a
y</p>
    </div>
  </dd>
</dl>
```

:::::

::::: compare

````carve
:: t
: a
  ```
  :::
 y
  ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code>:::
</code></pre>
  </dd>
</dl>
<p>y</p>
<pre><code></code></pre>
```

:::::
