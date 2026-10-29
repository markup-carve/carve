## Visible footnote headings

:::: compare

```carve
x[^n]

[^n]: # H

[H][]
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p><a href="#H">H</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
[^n]: # H

[H][]
```

```html
<p>[H][]</p>
```

::::

:::: compare

```carve
x[^n]

[^n]: # H

</#H>
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p><a href="#H">H</a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <h1 id="H">H</h1>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

::::

:::: compare

```carve
[^n]: # H

</#H>
```

```html
<p>&lt;/#H&gt;</p>
```

::::
