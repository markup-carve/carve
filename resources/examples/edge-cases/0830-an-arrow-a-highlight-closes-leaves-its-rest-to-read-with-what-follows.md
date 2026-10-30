---
page: edge-inline
---

## An arrow a highlight closes leaves its rest to read with what follows

An arrow whose `=` closes a highlight is gone (PART 9 §9). Its `>` reads with the next `=` as the comparison `>=`, whose `=` neither opens nor closes.

::::::: compare

````carve
=a<=>=b=
````

````html
<p><mark>a&lt;</mark>≥b=</p>
````

:::::::

The same for the doubled arrow.

::::::: compare

````carve
=a ==>=b=
````

````html
<p><mark>a =</mark>≥b=</p>
````

:::::::

Without a following `=` the rest stays text and a later pair forms.

::::::: compare

````carve
=a<=> =b=
````

````html
<p><mark>a&lt;</mark>&gt; <mark>b</mark></p>
````

:::::::

Another delimiter after the rest is unaffected.

::::::: compare

````carve
=a<=>*b*
````

````html
<p><mark>a&lt;</mark>&gt;<strong>b</strong></p>
````

:::::::
