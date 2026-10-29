## A closer below the container's column does not count

The fence opens whether or not a closer follows (§10 I4), and a line below the
content column ends it and the item. A flush-left run, or one a column short, is
not written inside the item, so it closes nothing there: it is read at document
level, where it opens an empty code block of its own (markup-carve/carve#2145).

::::: compare

````carve
- a
  ```
  b
 y
```
````

```html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

::::: compare

````carve
- a
  ```
  b
 y
 ```
````

```html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

A run past the content column is inside the item but is no closer either: a fence
delimiter sits exactly at its container's content column (CARVE-P2-006). The one
that counts is at the column, as in *A fence opened on a list marker line, body
below the content column*.

::::: compare

````carve
- a
  ```
  b
 y
   ```
````

```html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::::

A definition body reads the same way, on both sides.

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

With nothing else in play the flush-left run interrupts the description's
paragraph, since §10 I4 asks for no closer, and opens an empty code block at
document level, as it does under a list item.

::::: compare

````carve
:: t
: a
```
````

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<pre><code></code></pre>
```

:::::

CONTROL. With a closer after it the same run interrupts the same way, and the
fence opens a block at document level that ends at its closer.

::::: compare

````carve
:: t
: a
```
b
```
````

```html
<dl>
  <dt>t</dt>
  <dd>a</dd>
</dl>
<pre><code>b
</code></pre>
```

:::::
