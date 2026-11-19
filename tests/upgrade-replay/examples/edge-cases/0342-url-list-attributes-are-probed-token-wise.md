## URL-list attributes are probed token-wise

`srcset`, `imagesrcset` and `ping` carry a LIST of URLs rather than one, so the scheme probe runs on every token of the value as well as on its head, and any hit blanks the WHOLE value (PART 9 §25). The point is that a dangerous scheme gets the SAME answer wherever in the list it sits: reading position one and vouching for the rest is not a defense, it is a coincidence.

A `javascript:` candidate in the FIRST `srcset` position blanks the attribute:

::: compare no-render

```carve
![a](safe.png){srcset="javascript:alert(1) 1x, safe.png 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

The same two candidates in the other order blank it identically. This is the pair the rule exists for -- before it, the second spelling rendered verbatim in carve-js, carve-php and carve-rs alike (carve#1320):

::: compare no-render

```carve
![a](safe.png){srcset="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

`imagesrcset` has the same candidate-list grammar and gets the same treatment, so it is pinned rather than left to follow by analogy:

::: compare no-render

```carve
![a](safe.png){imagesrcset="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" imagesrcset="">
```

:::

A candidate needs no space after the comma to be a candidate, so the comma has to count as a separator in `srcset` -- a whitespace-only split would read `1x,javascript:alert(1)` as one descriptor and miss it:

::: compare no-render

```carve
![a](safe.png){srcset="safe.png 1x,javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

`ping` is a space-separated list of URLs the user agent POSTs to on activation, and a non-leading token blanks it just the same:

::: compare no-render

```carve
[y](safe.html){ping="safe.html javascript:alert(1)"}
```

```html
<p><a href="safe.html" ping="">y</a></p>
```

:::

`attributionsrc` is the fourth member and the one that is not in the HTML Standard's own attribute index. It comes from the Attribution Reporting API, browsers ship it, and it sends a request to every URL in the list, so the criterion reaches it wherever it was specified:

::: compare no-render

```carve
[y](safe.html){attributionsrc="https://example.com/s javascript:alert(1)"}
```

```html
<p><a href="safe.html" attributionsrc="">y</a></p>
```

:::

THE SEPARATORS ARE PER ATTRIBUTE, and this pair is where that shows. `ping`'s grammar holds no comma, so a lone URL carrying one in its path is one token and survives:

::: compare no-render

```carve
[y](safe.html){ping="https://example.com/a,data:x"}
```

```html
<p><a href="safe.html" ping="https://example.com/a,data:x">y</a></p>
```

:::

The same URL in `srcset` is blanked, because there a comma really does end a candidate and the split cannot tell this one from a boundary. That over-blanks a URL nobody would write, and reading it exactly would mean asking three engines for the HTML candidate-list algorithm byte for byte; the shape is pinned so they cannot each answer it differently:

::: compare no-render

```carve
![a](safe.png){srcset="https://example.com/a,data:x 1x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::

The name is matched case-insensitively, like the `on` prefix, and the element still carries the author's spelling. Matching the exact bytes would leave `SRCSET` unprobed:

::: compare no-render

```carve
![a](safe.png){SRCSET="safe.png 1x, javascript:alert(1) 2x"}
```

```html
<img src="safe.png" alt="a" SRCSET="">
```

:::

PROSE ATTRIBUTES ARE NOT TOKENIZED, and this pair is the reason the rule names a closed set instead of testing every value for scheme-shaped tokens. `title`, `alt` and `aria-label` legitimately carry colons, and a blanket check would refuse ordinary text:

::: compare no-render

```carve
[z](safe.html){title="See: RFC 3986, http://example.com"}
```

```html
<p><a href="safe.html" title="See: RFC 3986, http://example.com">z</a></p>
```

:::

THE TOKEN PASS IS ADDITIVE, and this pair is what says so out loud. The four names keep the leading-scheme probe on the WHOLE value too, so a value is blanked when EITHER the whole value probes dangerous OR any token does. Every case above blanks under both readings, which is why this one exists: the value-wide probe strips the ASCII whitespace the SPLIT breaks on, so `java script:alert(1)` is two harmless tokens -- `java` carries no scheme and `script` is not denylisted -- and one denied value. An implementation that ran the token pass INSTEAD of the value-wide probe would deny less here than the leading rule denied before this rule existed, and every other document in this section would still pass:

::: compare no-render

```carve
[y](safe.html){ping="java script:alert(1)"}
```

```html
<p><a href="safe.html" ping="">y</a></p>
```

:::

The comma-separated half of the set is pinned separately, because its split is the one an implementation spells on its own: an additive value-wide probe wired into the `ping` branch and forgotten in the `srcset` branch is a reachable state, and it renders this verbatim:

::: compare no-render

```carve
![a](safe.png){srcset="java script:alert(1) 1x, safe.png 2x"}
```

```html
<img src="safe.png" alt="a" srcset="">
```

:::
