## A marker-line opaque quote keeps overindented markers literal

Code and raw fences opened on the marker line preserve overindented quote markers
as item text while their tail remains fenced. Aligned markers, blank separators,
later fence openers and other quote heads are controls.

::: compare

`````carve
- > ```
  > x
  > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
y
</code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
    > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
y
</code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x

  > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x

    > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```
  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```

  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```

    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
  > y
  > ~~~
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
y
</code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
    > y
  > ~~~
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
y
</code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x

  > y
  > ~~~
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x

    > y
  > ~~~
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
  > ~~~
  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
  > ~~~
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
  > ~~~

  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ~~~
  > x
  > ~~~

    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
  > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      x
y
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
    > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      x
y
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x

  > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      x
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x

    > y
  > ```
`````

`````html
<ul>
  <li>
    <blockquote>
      x
    </blockquote>
    <blockquote>
      <p>y</p>
      <pre><code></code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
  > ```
  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      x
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
  > ```
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      x
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
  > ```

  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      x
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```=html
  > x
  > ```

    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      x
    </blockquote>
    <blockquote><p>y</p></blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > # H
  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <h1 id="H">H</h1>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > # H
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <h1 id="H">H</h1>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > | a |
  > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a</td></tr>
        </tbody>
      </table>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > | a |
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <table>
        <tbody>
          <tr><td>a</td></tr>
        </tbody>
      </table>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > p
  > ```
  > x
  > ```
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <p>p</p>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > p
  >
  > ```
  > x
  > ```
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <p>p</p>
      <pre><code>x
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > > ```
  > > x
  > > ```
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <pre><code>x
</code></pre>
      </blockquote>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > > ```
  > > x
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <pre><code>x
</code></pre>
      </blockquote>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ***
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <hr>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > %%%
  > x
    > y
  > %%%
`````

`````html
<ul>
  <li>
    <blockquote>

    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```
  > ~~~
  > z
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <pre><code>z
y
</code></pre>
    </blockquote>
  </li>
</ul>
`````

:::

::: compare

`````carve
- > ```
  > x
  > ```
  > ~~~
  > z
  > ~~~
    > y
`````

`````html
<ul>
  <li>
    <blockquote>
      <pre><code>x
</code></pre>
      <pre><code>z
</code></pre>
      <p>y</p>
    </blockquote>
  </li>
</ul>
`````

:::
