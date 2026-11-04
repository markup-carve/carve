---
page: edge-lists
---

## A plus skips every invisible line its host keeps

CARVE-P9-067 (carve#5130). Between a `+` and its block, an invisible line the host keeps is skipped wherever it stands: at the marker column or at or past the host's content column. One the host's `invisible` field closes the host at still closes it and refuses the `+`.

A `%%%` span at the item's content column is a line the item keeps, so the `+` skips it and the first visible line decides, as it does after a `%%` line:

::: compare

````carve
- +
  %%%
  c
  %%%
text
````

```html
<ul>
  <li>text</li>
</ul>
```

:::

An attribute line there labels the attached block:

::: compare

````carve
- +
  {x}
text
````

```html
<ul>
  <li><p x="">text</p></li>
</ul>
```

:::

A footnote definition the item keeps is skipped the same way, so a fence at the marker column attaches:

::: compare

````carve
- +
  [^n]: x
```
z
```

r[^n]
````

```html
<ul>
  <li>
    <pre><code>z
</code></pre>
  </li>
</ul>
<p>r<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>x<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The first visible line still decides. At the content column it is refused, as `- +` / `  text` is:

::: compare

````carve
- +
  %%%
  c
  %%%
  text
````

```html
<ul>
  <li>text</li>
</ul>
```

:::

Below the content column an attribute line closes the item, so the `+` is refused and `{x}` labels the paragraph after the list:

::: compare

````carve
- +
 {x}
text
````

```html
<ul>
  <li></li>
</ul>
<p x="">text</p>
```

:::
