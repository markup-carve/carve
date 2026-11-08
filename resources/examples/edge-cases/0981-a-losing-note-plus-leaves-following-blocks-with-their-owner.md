---
page: edge-footnotes
---

## A losing note plus leaves following blocks with their owner

PART 9R R2 assigns the block after a losing note's `+` to the container where that losing line stands. A blank after the losing line does not erase the winner's continuation.

::: compare

````carve
[^n]: +
[^n]: +

  para

see[^n]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The losing definition can use another label; its label does not move the following list out of the earlier note.

::: compare

````carve
[^n]: +
[^m]: d1
[^m]: +
  - item

see[^n][^m]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <ul>
        <li>item</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A blank after a losing marker with another label still leaves the indented paragraph in the earlier note.

::: compare

````carve
[^n]: +
[^m]: d1
[^m]: +

  para

see[^n][^m]
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The same ownership holds in a quote.

::: compare

````carve
> [^n]: +
> [^n]: +
>
>   para

see[^n]
````

```html
<blockquote>

</blockquote>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>para<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A refused marker reads past later definitions without walking them, and they still register. A losing `+` inside that run takes nothing, so the paragraph below is read as if the losing line were not there.

::: compare

````carve
see[^a][^b]
[^b]: +
[^a]: +

[^a]: +
flush
````

```html
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<p>flush</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The same holds when the losing `+` follows a blank after the winning definition of another label.

::: compare

````carve
[^n]: +
[^m]: d1

[^m]: +
flush

see[^n][^m]
````

```html
<p>flush</p>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>d1<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

And in a quote.

::: compare

````carve
> see[^a][^b]
> [^b]: +
> [^a]: +
>
> [^a]: +
> flush
````

```html
<blockquote>
  <p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
  <p>flush</p>
</blockquote>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::
