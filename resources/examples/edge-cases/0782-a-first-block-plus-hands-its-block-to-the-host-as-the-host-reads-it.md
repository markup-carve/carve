## A first-block plus hands its block to the host as the host reads it

A first-block `+` attaches one block (PART 9 SS17 L3, L4), and the host reads that block like any other body line. A lazy line under a note's first block is paragraph text in the note. A code fence the attached block leaves open runs to the end of the host and takes no extra empty payload line from the attachment.

::: compare

```carve
[^a]: +
tail
 flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>tail
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^a]: +
tail
flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>tail
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
> [^a]: +
> tail
>  flush

see[^a]
```

```html
<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>tail
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

```carve
[^a]: +
~s~
 flush

see[^a]
```

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><s>s</s>
flush<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
- +
  ```
  x
````

```html
<ul>
  <li>+
    <pre><code>x
</code></pre>
  </li>
</ul>
```

:::

::: compare

````carve
- foo
  - +
    ```
    x
    ``
````

```html
<ul>
  <li>foo
    <ul>
      <li>+
        <pre><code>x
``
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

`````carve
- a
  - ```
 +
````
`````

```html
<ul>
  <li>a
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>+</p>
<pre><code></code></pre>
```

:::

::: compare

````carve
[^a]: +
```
x

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre><code>x
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
- +
  ```
  x
  ```
  para
````

```html
<ul>
  <li>+
    <pre><code>x
</code></pre>
    para
  </li>
</ul>
```

:::

::: compare

````carve
- +
  ```
  x
- b
````

```html
<ul>
  <li>+
    <pre><code>x
</code></pre>
  </li>
  <li>b</li>
</ul>
```

:::

::: compare

````carve
- a
  - b
  +
  {.x}
  ```
 code
  ```
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <pre class="x"><code></code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>code</p>
<pre><code></code></pre>
```

:::

::: compare

````carve
- +
  {.x}
  ```
  x
````

```html
<ul>
  <li>+
    <pre class="x"><code>x
</code></pre>
  </li>
</ul>
```

:::

::: compare

````carve
[^a]: +
{.x}
```
x

see[^a]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <pre class="x"><code>x
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

::: compare

````carve
- a
  - b
  +
  ```
    code
  ```
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <pre><code>  code
</code></pre>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
- a
  - b
    - c
    +
    ```
      code
    ```
````

```html
<ul>
  <li>a
    <ul>
      <li>b
        <ul>
          <li>c
            <pre><code>  code
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

:::

::: compare

````carve
> - a
>   - b
>   +
>   ```
>     code
>   ```
````

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b
          <pre><code>  code
</code></pre>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::
