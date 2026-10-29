## A caption after a continuation marker fence stays with the fence

Caption variant 1

::: compare

````carve
- x
  ```
  x
  ```

  ^ cap
- c
````

```html
<ul>
  <li>x
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 2

::: compare

````carve
- x
  ```
  x
  ```
  ^ cap
- c
````

```html
<ul>
  <li>x
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 3

::: compare

````carve
- x
  ~~~
  x
  ~~~
  ^ cap
- c
````

```html
<ul>
  <li>x
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 4

::: compare

````carve
- - text
  ```
  x
  ```
  ^ cap
- c
````

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 5

::: compare

````carve
- x
+
```
x
```
^ cap
- c
````

```html
<ul>
  <li>x
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 6

::: compare

````carve
- +
```
x
```
^ cap
- c
````

```html
<ul>
  <li>
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Caption variant 7

::: compare

````carve
1. x
+
~~~
x
~~~
^ cap
2. c
````

```html
<ol>
  <li>x
    <figure>
      <pre><code>x
</code></pre>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ol>
```

:::

Caption variant 8

:::: compare

````carve
- x
+
::: figure
![a](b.png)
:::
^ cap
- c
````

```html
<ul>
  <li>x
    <figure class="carve-figure-group">
      <img src="b.png" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

::::

Caption variant 9

:::: compare

````carve
- x
+
::: figure [label]
hi
:::
^ cap
- c
````

```html
<ul>
  <li>x
    <div class="figure">
      <p class="div-label">label</p>
      <p>hi</p>
    </div>
  </li>
</ul>
<p>^ cap
- c</p>
```

::::

Caption variant 10

:::: compare

````carve
- x
+
::: figure "t"
hi
:::
^ cap
- c
````

```html
<ul>
  <li>x
    <div class="figure">
      <p class="admonition-title">t</p>
      <p>hi</p>
    </div>
  </li>
</ul>
<p>^ cap
- c</p>
```

::::
