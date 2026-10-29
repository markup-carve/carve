## Captions in list items do not create a paragraph gap

The caption slot permits zero or one blank line after its host. That blank does not loosen the enclosing list. Two blanks detach the caption; the resulting paragraph does loosen the list. These cases cover each captionable host. They also cover hosts after nested lists and hosts opened after a blank.

No blank before a table caption

::: compare

```carve
- | a |
  ^ cap
- c
```

```html
<ul>
  <li>
    <table>
      <caption>cap</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a table caption

::: compare

```carve
- | a |

  ^ cap
- c
```

```html
<ul>
  <li>
    <table>
      <caption>cap</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
  <li>c</li>
</ul>
```

:::

Two blanks detach a table caption

::: compare

```carve
- | a |


  ^ cap
- c
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

One blank before an image caption

::: compare

```carve
- ![a](b.png)

  ^ cap
- c
```

```html
<ul>
  <li>
    <figure>
      <img src="b.png" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a quote caption

::: compare

```carve
- > q

  ^ cap
- c
```

```html
<ul>
  <li>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a code listing caption

::: compare

````carve
- ```
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

One blank before an equation caption

::: compare

```carve
- $$`x`

  ^ cap
- c
```

```html
<ul>
  <li>
    <figure>
      <p><span class="math display" role="math">\[x\]</span></p>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a figure group caption

::: compare

```carve
- ::: figure
  ![a](b.png)
  :::

  ^ cap
- c
```

```html
<ul>
  <li>
    <figure class="carve-figure-group">
      <img src="b.png" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

Two blanks detach a figure group caption

::: compare

```carve
- ::: figure
  ![a](b.png)
  :::


  ^ cap
- c
```

```html
<ul>
  <li>
    <figure class="carve-figure-group">
      <img src="b.png" alt="a">
    </figure>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A quote after item prose still takes its caption

::: compare

```carve
- text
  > q

  ^ cap
- c
```

```html
<ul>
  <li>text
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

A caption after plain text is a second paragraph

::: compare

```carve
- text

  ^ cap
- c
```

```html
<ul>
  <li><p>text</p>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

An earlier caret paragraph does not loosen an attached quote

::: compare

```carve
- ^ cap
  > q

  ^ cap
- c
```

```html
<ul>
  <li>^ cap
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

A detached quote caption in a sublist does not loosen its parent

::: compare

```carve
- a
  - > q


    ^ cap
- c
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote><p>q</p></blockquote>
        <p>^ cap</p>
      </li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

A multi-line attached caption keeps the list tight

::: compare

```carve
- ^ cap
  > q

  ^ cap
  more
- c
```

```html
<ul>
  <li>^ cap
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap
more</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

An attached quote caption in a sublist keeps both lists tight

::: compare

```carve
- a
  - > q

    ^ cap
- c
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <figure>
          <blockquote><p>q</p></blockquote>
          <figcaption>cap</figcaption>
        </figure>
      </li>
    </ul>
  </li>
  <li>c</li>
</ul>
```

:::

A caret inside an open list-item fence stays code

::: compare

```carve
- ```
  x

  ^ cap
  ```
- c
```

```html
<ul>
  <li>
    <pre><code>x

^ cap
</code></pre>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a quote caption after a nested list

::: compare

```carve
- - text
  > q

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a figure group caption after a nested list

:::: compare

```carve
- - text
  ::: figure
  ![a](b.png)
  :::

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure class="carve-figure-group">
      <img src="b.png" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

::::

Item prose and a nested list before a quote caption

::: compare

```carve
- x
  - text
  > q

  ^ cap
- c
```

```html
<ul>
  <li>x
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

One blank before a table caption after a nested list

::: compare

```carve
- - text
  | a |

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <table>
      <caption>cap</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
  <li>c</li>
</ul>
```

:::

An ordered item holds a nested list before a quote caption

::: compare

```carve
1. - text
   > q

   ^ cap
2. c
```

```html
<ol>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ol>
```

:::

A quoted list holds a nested list before a quote caption

::: compare

```carve
> - - text
>   > q
>
>   ^ cap
> - c
```

```html
<blockquote>
  <ul>
    <li>
      <ul>
        <li>text</li>
      </ul>
      <figure>
        <blockquote><p>q</p></blockquote>
        <figcaption>cap</figcaption>
      </figure>
    </li>
    <li>c</li>
  </ul>
</blockquote>
```

:::

A blank opens a quote before its caption

::: compare

```carve
- text

  > q

  ^ cap
- c
```

```html
<ul>
  <li>text
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

:::

A blank opens a figure group before its caption

:::: compare

```carve
- text

  ::: figure
  ![a](b.png)
  :::

  ^ cap
- c
```

```html
<ul>
  <li>text
    <figure class="carve-figure-group">
      <img src="b.png" alt="a">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li>c</li>
</ul>
```

::::

A blank opens a table before its caption

::: compare

```carve
- text

  | a |

  ^ cap
- c
```

```html
<ul>
  <li>text
    <table>
      <caption>cap</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
  <li>c</li>
</ul>
```

:::

A blank opens the final quote before its caption

::: compare

```carve
- text

  > q

  ^ cap
```

```html
<ul>
  <li>text
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
</ul>
```

:::

A blank between sibling items still loosens the list

::: compare

```carve
- - text
  > q

  ^ cap

- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A second paragraph after the caption still loosens the list

::: compare

```carve
- - text
  > q

  ^ cap

  Body.
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>cap</figcaption>
    </figure>
    <p>Body.</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A caption line with no host above it is a paragraph and loosens the list

::: compare

```carve
- text

  | a |
  |b

  ^ cap
- c
```

```html
<ul>
  <li><p>text</p>
    <table>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    <p>|b</p>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A folded equation block leaves the caption line without a host and loosens the list

::: compare

```carve
- - text
  $$
  x
  $$

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text
$$
x
$$</li>
    </ul>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

A folded image leaves the caption line without a host and loosens the list

::: compare

```carve
- - text
  ![i](x.png)

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text
<img src="x.png" alt="i"></li>
    </ul>
    <p>^ cap</p>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

An image paragraph after a nested list loosens the list with a caption gap

::: compare

```carve
- - text

  ![i](x.png)

  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <img src="x.png" alt="i">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

An image paragraph after a nested list loosens the list without a caption gap

::: compare

```carve
- - text

  ![i](x.png)
  ^ cap
- c
```

```html
<ul>
  <li>
    <ul>
      <li>text</li>
    </ul>
    <figure>
      <img src="x.png" alt="i">
      <figcaption>cap</figcaption>
    </figure>
  </li>
  <li><p>c</p></li>
</ul>
```

:::
