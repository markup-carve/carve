## A block at an item content column ends its paragraph before an unclosed fence

A link or footnote definition at a list item's content column ends the
item's paragraph (CARVE-P0-010), and so does any other block there
(CARVE-P0-011). The unclosed fence on the next line misses the item, so the
item closes and the fence opens in the note, where it runs to the end:
`::::`, the note's own closer and `after *b*` are fence content:
:::::: compare

````carve
::: note
- para
  [r]: /u
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>para</li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

A footnote definition does the same:

A footnote body takes a lazy line like every container (markup-carve/carve#3885), but a fence line interrupts instead of folding, so it ends the note and the item and opens in the admonition:
:::::: compare

````carve
::: note
- para
  [^f]: n
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>para</li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

A definition at an outer item's content column also ends the paragraph of
the sub-item above it (CARVE-P0-020):
:::::: compare

````carve
::: note
- a
  - para
  [r]: /u
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>a
      <ul>
        <li>para</li>
      </ul>
    </li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

A valid table row at the content column (PART 9 §10 I1) is a block there,
bare or in a quoted item:
:::::: compare

````carve
::: note
- para
  | t |
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>para
      <table>
        <tbody>
          <tr><td>t</td></tr>
        </tbody>
      </table>
    </li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

:::::: compare

````carve
::: note
> - para
>   | t |
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote>
    <ul>
      <li>para
        <table>
          <tbody>
            <tr><td>t</td></tr>
          </tbody>
        </table>
      </li>
    </ul>
  </blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

An attribute line and a heading at the content column leave no paragraph
open either:
:::::: compare

````carve
::: note
- para
  {#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>para</li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

:::::: compare

````carve
::: note
- para
  # H
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>para
      <h1 id="H">H</h1>
    </li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

One column short of the content column, the row misses the item and opens
a table in the note; the fence below it runs to the end:
:::::: compare

````carve
::: note
10. para
   | t |
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ol start="10">
    <li>para</li>
  </ol>
  <table>
    <tbody>
      <tr><td>t</td></tr>
    </tbody>
  </table>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
