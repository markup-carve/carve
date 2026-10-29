## Include directive with no resolver renders literal

File inclusion (<code v-pre>{{ … }}</code>, PART 9 §19) is a processor-level directive that the core parser never recognizes. With no host resolver configured, the directive is left literal: a bare-path directive with no active inline markers renders verbatim, so nothing is expanded and no file I/O occurs.

::: compare

```carve
See {{ chapter-2.crv }} here.
```

```html
<p>See {{ chapter-2.crv }} here.</p>
```

:::
