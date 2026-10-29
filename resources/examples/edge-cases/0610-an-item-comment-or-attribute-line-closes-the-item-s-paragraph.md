## An item comment or attribute line closes the item's paragraph

An item line under an item's paragraph starts the next item and reads its
content. A comment or block-attribute line there closes the paragraph, and an
unclosed fence on the next line opens in the note, where it runs to the end,
the note's own closer included. Bullet, ordered and nested items all read it:

:::::: compare

````carve
::: note
- para
- %% c
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
    <li></li>
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
- {#x}
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
    <li></li>
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
1. para
2. %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ol>
    <li>para</li>
    <li></li>
  </ol>
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
  - {#x}
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
      <ul>
        <li></li>
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

Item text keeps the paragraph open, and the fence line interrupts it all the
same:

:::::: compare

````carve
::: note
- para
- text
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
    <li>text</li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

Under a plain paragraph an item line is lazy text (PART 9 §10 I2) and reads no
content, so a comment there keeps the paragraph open too, quoted or not. The
fence interrupts that paragraph like any other:

:::::: compare

````carve
::: note
para
- %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <p>para
-</p>
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
> para
> - %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para
-</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
