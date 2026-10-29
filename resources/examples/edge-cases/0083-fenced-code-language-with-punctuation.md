## Fenced code language with punctuation

A language tag may contain punctuation (`c++`, `c#`, `f#`, `asp.net`). The info string is still a single token, so a multiword or quoted info (e.g. `js title="x"`) is not a fence.

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
