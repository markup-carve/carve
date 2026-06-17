import type { AnyNode, Attrs, Document } from './ast.js';
/** Action taken on a disallowed node. */
export type DisallowedAction = 'strip' | 'to_text' | 'error';
/**
 * Canonical block node-type vocabulary (snake_case). These are the strings a
 * profile's allow/deny lists use; they are portable across implementations.
 */
export declare const CANONICAL_BLOCK_TYPES: readonly ["paragraph", "heading", "code_block", "block_quote", "list", "list_item", "table", "table_row", "table_cell", "thematic_break", "div", "raw_block", "footnote", "definition_list", "definition_term", "definition_description", "section", "line_block", "comment", "figure", "caption"];
/** Canonical inline node-type vocabulary (snake_case). */
export declare const CANONICAL_INLINE_TYPES: readonly ["text", "emphasis", "strong", "underline", "strike", "inline_extension", "mention", "code", "link", "image", "soft_break", "hard_break", "raw_inline", "escaped_text", "footnote_ref", "inline_footnote", "span", "superscript", "subscript", "highlight", "insert", "delete", "symbol", "math", "abbreviation"];
/**
 * Map a carve-js internal `node.type` to its canonical snake_case name.
 *
 * Returns `undefined` for types that have no canonical mapping (e.g.
 * `crossref`, `caption-number`, `emoji`, `abbreviation-def`, `critic-*`);
 * such nodes are denied-by-default by the profile resolver, matching
 * carve-php's "unknown type -> denied" rule. The exception is `document`,
 * which the resolver always treats as allowed.
 */
export declare function canonicalType(type: string): string | undefined;
/**
 * Link URL policy for Profile-based filtering. Controls which URLs are
 * allowed in links and images. Port of carve-php's LinkPolicy.
 */
export declare class LinkPolicy {
    private allowedSchemes;
    private deniedSchemes;
    private allowedDomains;
    private deniedDomains;
    private allowExternal;
    private allowInternal;
    private relAttributes;
    /** Allow all URLs except dangerous schemes. */
    static unrestricted(): LinkPolicy;
    /** Allow only internal links (relative URLs, fragments). */
    static internalOnly(): LinkPolicy;
    /** Allow only links to specific domains. */
    static allowlist(domains: string[]): LinkPolicy;
    getAllowedSchemes(): string[] | null;
    setAllowedSchemes(schemes: string[] | null): this;
    getDeniedSchemes(): string[];
    setDeniedSchemes(schemes: string[]): this;
    getAllowedDomains(): string[] | null;
    setAllowedDomains(domains: string[] | null): this;
    getDeniedDomains(): string[];
    setDeniedDomains(domains: string[]): this;
    getAllowExternal(): boolean;
    setAllowExternal(allow: boolean): this;
    getAllowInternal(): boolean;
    setAllowInternal(allow: boolean): this;
    getRelAttributes(): string[];
    setRelAttributes(attrs: string[]): this;
    /** Add a rel attribute applied to all surviving links. */
    addRelAttribute(attr: string): this;
    /**
     * Check whether a URL is permitted by this policy.
     *
     * @param baseHost Current document's host (for external detection).
     */
    isUrlAllowed(url: string, baseHost?: string | null): boolean;
    private isProtocolRelativeUrlAllowed;
    private isDomainDenied;
    private isDomainAllowed;
    private isSameHost;
}
/**
 * Profile: feature restriction for a rendering context. Port of carve-php's
 * Profile, including the four presets (full / article / comment / minimal).
 */
export declare class Profile {
    static readonly ACTION_STRIP: DisallowedAction;
    static readonly ACTION_TO_TEXT: DisallowedAction;
    static readonly ACTION_ERROR: DisallowedAction;
    private name;
    private description;
    private featureReasons;
    private allowedInline;
    private allowedBlock;
    private deniedInline;
    private deniedBlock;
    private linkPolicy;
    private maxNesting;
    private maxLength;
    private disallowedAction;
    /** All features enabled. Use only for trusted content. */
    static full(): Profile;
    /** Blog posts and articles: all formatting, no raw HTML. */
    static article(): Profile;
    /** User comments: basic formatting only, nofollow links. */
    static comment(): Profile;
    /** Chat / micro-posts: non-destructive inline formatting, paragraphs and lists. */
    static minimal(): Profile;
    getName(): string;
    getDescription(): string;
    /** Reason a node type is disallowed, or null if it is allowed / no reason. */
    getReasonDisallowed(canonical: string): string | null;
    getFeatureReasons(): Record<string, string>;
    setFeatureReason(canonical: string, reason: string): this;
    /** Set allowed inline types (null = all allowed). */
    allowInline(types: string[] | null): this;
    /** Set allowed block types (null = all allowed). */
    allowBlock(types: string[] | null): this;
    denyInline(types: string[]): this;
    denyBlock(types: string[]): this;
    getAllowedInline(): string[] | null;
    getAllowedBlock(): string[] | null;
    getDeniedInline(): string[];
    getDeniedBlock(): string[];
    getLinkPolicy(): LinkPolicy | null;
    setLinkPolicy(policy: LinkPolicy | null): this;
    getMaxNesting(): number;
    /** Set maximum block-container nesting depth (0 = unlimited). */
    setMaxNesting(max: number): this;
    getMaxLength(): number;
    /** Set maximum input length in bytes (0 = unlimited). */
    setMaxLength(max: number): this;
    getDisallowedAction(): DisallowedAction;
    /** Set action for disallowed elements. */
    onDisallowed(action: DisallowedAction): this;
    /** Whether a canonical type string is allowed by this profile. */
    isTypeAllowed(canonical: string): boolean;
    private isInlineAllowed;
    private isBlockAllowed;
    /** Summary of what this profile allows/denies. */
    getSummary(): {
        name: string;
        description: string;
        allowed_block: string[] | 'all';
        allowed_inline: string[] | 'all';
        denied_block: string[];
        denied_inline: string[];
    };
}
/** A recorded profile violation (surfaced when action = error). */
export interface ProfileViolation {
    /** Canonical node type that was disallowed. */
    nodeType: string;
    /** Machine reason: element_not_allowed | max_nesting_exceeded | link_not_allowed | image_not_allowed. */
    reason: string;
    /** Human-readable feature reason from the profile, if any. */
    reasonDescription: string | null;
}
/** Format a violation into a human-readable message (matches carve-php). */
export declare function formatProfileViolation(v: ProfileViolation): string;
/** Thrown by applyProfile when the profile's action is `error`. */
export declare class ProfileViolationError extends Error {
    readonly violations: ProfileViolation[];
    constructor(violations: ProfileViolation[]);
}
export type { Attrs };
export type { AnyNode, Document };
//# sourceMappingURL=profile.d.ts.map