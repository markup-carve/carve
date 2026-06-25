import type { CarveExtension } from './extension.js';
/**
 * Index terms (#91, Tier-3). Invisible `:index[term]` markers are collected
 * into a `::: index` block - a sorted `<ul class="index">` with one back-link
 * per occurrence. Reuses the `:name[…]` inline form; no new syntax. Off by
 * default, never corpus-pinned. See docs/extensions.md §8.
 */
export declare function index(): CarveExtension;
//# sourceMappingURL=index-terms.d.ts.map