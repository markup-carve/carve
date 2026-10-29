## A refused marker leaves an open fence's blank payload

A refused `+` is text unless an open fence claims it as payload at its content column. A `+` at the fence content column stays payload (markup-carve/carve#3400, markup-carve/carve#3421).

::::::: compare

````carve
- ```
+
  x
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>+
x</p>
```

:::::::

::::::: compare

````carve
- ```
+

  x
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>+</p>
<p>x</p>
```

:::::::

::::::: compare

````carve
- ```
  a
+
  x
````

```html
<ul>
  <li>
    <pre><code>a
</code></pre>
  </li>
</ul>
<p>+
x</p>
```

:::::::

::::::: compare

````carve
- ```
  x
+

tail
````

```html
<ul>
  <li>
    <pre><code>x
</code></pre>
  </li>
</ul>
<p>+</p>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- - ```
  +

tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    +
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- ```
+

tail
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>+</p>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- ```=html
  x
+

tail
````

```html
<ul>
  <li>
    x
  </li>
</ul>
<p>+</p>
<p>tail</p>
```

:::::::
