## A table row or a definition under a paragraph ends it before an unclosed fence

A valid table row (PART 9 §10 I1) and a reference definition (I5) close the
paragraph above them, bare or inside a quote. An unclosed fence on the next
line opens in the note and runs to its end, so `::::`, the note's own closer
and `after *b*` are fence content:

:::::: compare

````carve
::: note
para
| t |
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <p>para</p>
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

The same holds for a quoted table row:

:::::: compare

````carve
::: note
> para
> | t |
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote>
    <p>para</p>
    <table>
      <tbody>
        <tr><td>t</td></tr>
      </tbody>
    </table>
  </blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

and for a quoted link definition, which renders nothing:

:::::: compare

````carve
::: note
> para
> [r]: /u
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

A pipe line without a closing pipe is not a table row (T2), so the quoted
paragraph stays open, and the fence line interrupts it:

:::::: compare

````carve
::: note
> para
> | t
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para
| t</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
