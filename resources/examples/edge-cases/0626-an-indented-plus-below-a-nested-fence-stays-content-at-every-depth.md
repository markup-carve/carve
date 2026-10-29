## An indented plus below a nested fence stays content at every depth

::::::: compare

````carve
- - - ```
      x
    +
tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x
</code></pre>
          </li>
        </ul>
        +
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- - - ```
    +
tail
````

```html
<ul>
  <li>
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
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- - - ```
      x
    +
- y
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x
</code></pre>
          </li>
        </ul>
        +
      </li>
    </ul>
  </li>
  <li>y</li>
</ul>
```

:::::::

::::::: compare

````carve
- - - ```=html
      x
    +
tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            x
          </li>
        </ul>
        +
      </li>
    </ul>
  </li>
</ul>
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
        <pre><code>
</code></pre>
      </li>
    </ul>
    <p>+
tail</p>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- - - ```
      x


    +
tail
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>x

</code></pre>
          </li>
        </ul>
        <p>+</p>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::::::

::::::: compare

````carve
- 1. ```


  +
tail
````

```html
<ul>
  <li>
    <ol>
      <li>
        <pre><code>
</code></pre>
      </li>
    </ol>
    <p>+
tail</p>
  </li>
</ul>
```

:::::::

::::::: compare

````carve
- - [ ] ```js
        x

  +
tail
````

```html
<ul>
  <li>
    <ul class="task-list">
      <li><input type="checkbox" disabled> 
        <pre><code class="language-js">    x

</code></pre>
      </li>
    </ul>
    <p>+
tail</p>
  </li>
</ul>
```

:::::::
