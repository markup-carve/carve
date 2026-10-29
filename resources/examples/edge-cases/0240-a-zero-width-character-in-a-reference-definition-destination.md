## A zero-width character in a reference definition destination

`link_destination` ends at Unicode whitespace, and a ZERO WIDTH NO-BREAK SPACE is not whitespace: it is an ordinary destination character. The same rule governs a reference definition, because the definition is built from that same production - so the character is neither skipped as the separator run nor read as the end of the destination.

The inline form was already pinned. This is the definition form, where two engines kept the character and one dropped it or truncated at it, because the host language's own whitespace class holds U+FEFF and the Unicode property does not.

::: compare

```carve
[r]: ﻿https://e.com/

see [x][r]
```

```html
<p>see <a href="﻿https://e.com/">x</a></p>
```

:::

Position does not change the answer: a definition is not truncated at a zero-width character in the middle of its destination either.

::: compare

```carve
[r]: https://e﻿.com/

see [x][r]
```

```html
<p>see <a href="https://e﻿.com/">x</a></p>
```

:::
