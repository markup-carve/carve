import type { CarveExtension } from './extension.js';
/**
 * Map of element type (snake_case, as in carve-php's DefaultAttributesExtension)
 * to the default attributes to apply. A `class` value is merged with any
 * existing classes; any other key is only set when the node does not already
 * have it.
 */
export type DefaultAttributesMap = Record<string, Record<string, string>>;
/** Options for the {@link defaultAttributes} extension. */
export interface DefaultAttributesOptions {
    /** Element type (snake_case) -> default attributes. */
    defaults?: DefaultAttributesMap;
}
/**
 * Apply configured default attributes to nodes by type, ported from carve-php's
 * DefaultAttributesExtension. Useful for adding CSS classes, lazy-loading, etc.
 *
 * A `beforeRender` transform. A `class` default is merged with any existing
 * classes; any other attribute is only set when the node does not already
 * carry it. Element types use carve-php's snake_case names (e.g. `code_block`,
 * `block_quote`); the carve-js AST equivalents are bridged via {@link TYPE_MAP}.
 *
 * Coverage matches carve-php's actual behavior: the sub-structural types
 * `list_item`, `table_cell`, and `table_row` are NOT targetable (carve-php does
 * not apply defaults to them either), and a `div` default also covers
 * admonitions. An unknown type key is a no-op.
 *
 * ```ts
 * carveToHtml('![x](a.jpg)', {
 *   extensions: [defaultAttributes({ defaults: { image: { loading: 'lazy' } } })],
 * })
 * // <img src="a.jpg" alt="x" loading="lazy">
 * ```
 */
export declare function defaultAttributes(opts?: DefaultAttributesOptions): CarveExtension;
//# sourceMappingURL=default-attributes.d.ts.map