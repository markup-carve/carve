## Fenced code language with punctuation

A language tag may contain punctuation (`c++`, `c#`, `f#`, `asp.net`). The language is still a single token, so in a multiword info (e.g. `js title="x"`) the rest is invalid metadata, which the opener drops.

::: compare

````carve
```c++
int main() {}
```
````

```html
<pre><code class="language-c++">int main() {}
</code></pre>
```

:::
