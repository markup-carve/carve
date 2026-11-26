---
page: edge-links
---

## A cross-reference to a numbered caption drops the label's ids

The link text clones the caption label, and a clone drops every id at every depth, so no id appears twice; other attributes stay (carve#4554, carve#4723).

:::: compare

```carve
{#f}
| a |
^ *Fig*{#k} #

</#f>
```

```html
<table id="f">
  <caption><strong id="k">Fig</strong> 1</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p><a href="#f"><strong>Fig</strong> 1</a></p>
```

::::

:::: compare

```carve
{#f}
| a |
^ *Fig*{#k .c} #

</#f>
```

```html
<table id="f">
  <caption><strong id="k" class="c">Fig</strong> 1</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p><a href="#f"><strong class="c">Fig</strong> 1</a></p>
```

::::

:::: compare

````carve
{#f}
```
code
```
^ _F_{#k} #

</#f>
````

```html
<figure id="f">
  <pre><code>code
</code></pre>
  <figcaption><u id="k">F</u> 1</figcaption>
</figure>
<p><a href="#f"><u>F</u> 1</a></p>
```

::::
