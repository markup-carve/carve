## An abbreviation definition is recognized only at document level

`*[TERM]: expansion` defines an abbreviation in every container, with document scope (CARVE-P12-026, carve#4865). Escape the line to show it. The section title names the reading carve#4865 replaced and stays as the corpus id.

::: compare

```carve
> *[HTML]: Hyper Text

The HTML spec.
```

```html
<blockquote>

</blockquote>
<p>The <abbr title="Hyper Text">HTML</abbr> spec.</p>
```

:::

Escape the line to show it.

::: compare

```carve
> \*[HTML]: Hyper Text

The HTML spec.
```

```html
<blockquote><p>*[HTML]: Hyper Text</p></blockquote>
<p>The HTML spec.</p>
```

:::
