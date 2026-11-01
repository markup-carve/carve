## The doubled run is the canonical arrow, in both families

The single-line family was complete and the double-line family was not: `->`,
`<-` and `<->` all existed, `=>` existed, and there was no `<=` arrow, because
`<=` is the comparison. So `<=>` rendered `≤>`.

`<=` keeps ≤, which forces the left double arrow to grow a character, and once
it does the family is spelled at one width throughout. The single-hyphen forms
were deprecated first and are now removed (carve#4815), so `<-`, `->` and `<->`
stay text. `=>` was removed outright: `key => value` and `Some(x) => x` are ordinary prose
about code, and every one of them silently became ⇒.

::: compare

```carve
Canonical: <-- --> <--> and <== ==> <=>

Removed, now text: <- -> <->

Not an arrow: key => value stays literal, and p <= q is a comparison.
```

```html
<p>Canonical: ← → ↔ and ⇐ ⇒ ⇔</p>
<p>Removed, now text: &lt;- -&gt; &lt;-&gt;</p>
<p>Not an arrow: key =&gt; value stays literal, and p ≤ q is a comparison.</p>
```

:::
