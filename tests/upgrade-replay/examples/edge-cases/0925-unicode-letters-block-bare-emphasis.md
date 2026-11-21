---
page: edge-inline
---

## Unicode letters block bare emphasis

Bare emphasis cannot open or close within Unicode words. The braced form can emphasize text inside a word.

:::: compare

```carve
Москва/Питер/Киев
日本/中国/韩国
снейк_кейс_тут
ä/ö/ü
𐐀*x* and *x*𐐁
日本{/中国/}韩国
```

```html
<p>Москва/Питер/Киев
日本/中国/韩国
снейк_кейс_тут
ä/ö/ü
𐐀*x* and *x*𐐁
日本<em>中国</em>韩国</p>
```

::::
