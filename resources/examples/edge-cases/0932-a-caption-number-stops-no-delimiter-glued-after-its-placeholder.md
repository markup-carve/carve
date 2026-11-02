---
page: edge-inline
---

## A caption number stops no delimiter glued after its placeholder

CARVE-P2-022 (carve#4886). The number is assigned in the resolution pass, so it takes no part in reading the inline structure around the `#`: a delimiter right after the placeholder still opens.

::::: compare

````carve
![i](a.png)
^ Figure a#*b*
````

```html
<figure>
  <img src="a.png" alt="i">
  <figcaption>Figure a1<strong>b</strong></figcaption>
</figure>
```

:::::

::::: compare

````carve
![i](a.png)
^ Figure #=b=
````

```html
<figure>
  <img src="a.png" alt="i">
  <figcaption>Figure 1<mark>b</mark></figcaption>
</figure>
```

:::::

::::: compare

````carve
![i](a.png)
^ *a*#/b/
````

```html
<figure>
  <img src="a.png" alt="i">
  <figcaption><strong>a</strong>1<em>b</em></figcaption>
</figure>
```

:::::
