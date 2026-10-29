## A dropped raw block takes no line in the container that holds it

PART 9 §20 emits a raw block verbatim when its format matches the output format
and drops it otherwise. PART 10 §4 keeps a blank-line body slot for a container
that renders NOTHING, and otherwise every block element takes one line, so a
container holding one visible block and one dropped block has no line left to
spend on the dropped one.

Five of the pairs are list items. The raw block sits beside a visible paragraph
in the first and alone in the second; the rest put it two levels down, inside a
quote, and between two paragraphs. A colon div and a footnote body follow, and in
the footnote the backlink joins the paragraph the drop leaves last. The control
comes last: `=html` matches the output format, so its payload is placed at the
item's column like any other block (carve#2556).

::: compare

````carve
- a

  ```=latex
  \x
  ```
````

````html
<ul>
  <li>a</li>
</ul>
````

:::

::: compare

````carve
- ```=latex
  \x
  ```
````

````html
<ul>
  <li></li>
</ul>
````

:::

::: compare

````carve
- a

  - b

    ```=latex
    \x
    ```
````

````html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
````

:::

::: compare

````carve
> - a
>
>   ```=latex
>   \x
>   ```
````

````html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
</blockquote>
````

:::

::: compare

````carve
- a

  ```=latex
  \x
  ```

  c
````

````html
<ul>
  <li><p>a</p>
    <p>c</p>
  </li>
</ul>
````

:::

:::: compare

````carve
:::
a

```=latex
\x
```
:::
````

````html
<div>
  <p>a</p>
</div>
````

::::

::: compare

````carve
x[^1]

[^1]: a

    ```=latex
    \x
    ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
- a

  ```=html
  <x>
  ```
````

````html
<ul>
  <li>a
    <x>
  </li>
</ul>
````

:::
