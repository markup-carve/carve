---
page: edge-definitions
---

## A leading comment keeps a frame start for a quote

CARVE-P3-023 and the carve#4641 ruling (shape 3): an editorial frame, a substitution side and a span start content, so a quote there opens. An empty braced comment renders nothing and contributes no character, so a quote after a comment at the start of the frame still opens.

::: compare

````carve
x{+{%%}"q"+}
````

````html
<p>x<ins>“q”</ins></p>
````

:::

::: compare

````carve
x{-{%%}"q"-}
````

````html
<p>x<del>“q”</del></p>
````

:::

::: compare

````carve
x{~{%%}"a"~>{%%}"b"~}
````

````html
<p>x<del>“a”</del><ins>“b”</ins></p>
````

:::
