## A fence with no host prefix leaves an inline run

A fence opener inside a list item owns no flush-left body line. The closing backticks then open an unclosed fence after the document paragraph.

::: compare

````carve
- ```
x
```
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>x</p>
<pre><code></code></pre>
```

:::

::: compare

````carve
- ```
y
```
````

```html
<ul>
  <li>
    <pre><code></code></pre>
  </li>
</ul>
<p>y</p>
<pre><code></code></pre>
```

:::
