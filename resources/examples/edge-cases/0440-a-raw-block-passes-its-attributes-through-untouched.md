## A raw block passes its attributes through untouched

A raw block is verbatim, and that includes attributes the renderer would never
write itself. Nothing inspects the payload, so an event handler survives exactly
as written - which is the property `docs/html-import.md` relies on when it calls
this shape unsafe for untrusted input.

It is also the shape that separates the two readings of a refused attribute on
the way back IN. Importing this HTML in `safe` mode rewrites the element and
drops the handler, while `roundtrip` keeps the element whole and preserves the
handler with it, so the same attribute is reported as dropped in one mode and
preserved in the other.

::: compare

````carve
```=html
<custom onclick="reveal()">t</custom>
```
````

````html
<custom onclick="reveal()">t</custom>
````

:::
