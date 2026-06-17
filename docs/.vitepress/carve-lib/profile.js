/*
 * Profile-based feature restriction (core, port of carve-php's Profile +
 * LinkPolicy + ProfileFilter).
 *
 * A Profile controls which markup *features* survive into the output,
 * independent of XSS sanitization (`sanitizeUrls`). It runs as an AST
 * transform between resolve() and render(), so it holds identically for the
 * HTML, Markdown, plain-text and ANSI renderers.
 *
 * The allow/deny lists, presets and resolution semantics match carve-php
 * byte-for-byte. They are expressed in the canonical snake_case node-type
 * vocabulary (see CANONICAL_*). carve-js AST nodes use different internal
 * `type` strings (kebab-case / variants); `canonicalType()` maps every
 * block/inline node to its canonical name before the allow/deny check.
 */
/**
 * Canonical block node-type vocabulary (snake_case). These are the strings a
 * profile's allow/deny lists use; they are portable across implementations.
 */
export const CANONICAL_BLOCK_TYPES = [
    'paragraph',
    'heading',
    'code_block',
    'block_quote',
    'list',
    'list_item',
    'table',
    'table_row',
    'table_cell',
    'thematic_break',
    'div',
    'raw_block',
    'footnote',
    'definition_list',
    'definition_term',
    'definition_description',
    'section',
    'line_block',
    'comment',
    'figure',
    'caption',
];
/** Canonical inline node-type vocabulary (snake_case). */
export const CANONICAL_INLINE_TYPES = [
    'text',
    'emphasis',
    'strong',
    'underline',
    'strike',
    'inline_extension',
    'mention',
    'code',
    'link',
    'image',
    'soft_break',
    'hard_break',
    'raw_inline',
    'escaped_text',
    'footnote_ref',
    'inline_footnote',
    'span',
    'superscript',
    'subscript',
    'highlight',
    'insert',
    'delete',
    'symbol',
    'math',
    'abbreviation',
];
const BLOCK_SET = new Set(CANONICAL_BLOCK_TYPES);
const INLINE_SET = new Set(CANONICAL_INLINE_TYPES);
/**
 * Map a carve-js internal `node.type` to its canonical snake_case name.
 *
 * Returns `undefined` for types that have no canonical mapping (e.g.
 * `crossref`, `caption-number`, `emoji`, `abbreviation-def`, `critic-*`);
 * such nodes are denied-by-default by the profile resolver, matching
 * carve-php's "unknown type -> denied" rule. The exception is `document`,
 * which the resolver always treats as allowed.
 */
export function canonicalType(type) {
    switch (type) {
        // ----- block -----
        case 'paragraph':
            return 'paragraph';
        case 'heading':
            return 'heading';
        case 'code-block':
            return 'code_block';
        case 'blockquote':
            return 'block_quote';
        case 'list':
            return 'list';
        case 'list-item':
            return 'list_item';
        case 'table':
            return 'table';
        case 'table-row':
            return 'table_row';
        case 'table-cell':
            return 'table_cell';
        case 'thematic-break':
            return 'thematic_break';
        case 'div':
            return 'div';
        // An admonition is a typed div; carve-php has no separate admonition node,
        // it is a Div. Treat it under the `div` feature for allow/deny purposes.
        case 'admonition':
            return 'div';
        case 'raw-block':
            return 'raw_block';
        case 'definition-list':
            return 'definition_list';
        case 'figure':
            return 'figure';
        case 'comment':
            return 'comment';
        // ----- inline -----
        case 'text':
            return 'text';
        case 'italic':
            return 'emphasis';
        case 'strong':
            return 'strong';
        case 'underline':
            return 'underline';
        case 'strike':
            return 'strike';
        case 'extension':
            return 'inline_extension';
        case 'mention':
            return 'mention';
        // carve-php treats `#tag` under the mention feature.
        case 'tag':
            return 'mention';
        case 'code':
            return 'code';
        case 'link':
            return 'link';
        // An angle autolink is a link.
        case 'autolink':
            return 'link';
        case 'image':
            return 'image';
        case 'soft-break':
            return 'soft_break';
        case 'hard-break':
            return 'hard_break';
        case 'raw-inline':
            return 'raw_inline';
        case 'footnote':
            // Inline footnote (`^[...]`) carries `inline`; a reference (`[^id]`)
            // does not. carve-php denies both under the footnote family, so the
            // mapping does not matter for allow/deny, but we distinguish so a
            // profile could allow one and not the other.
            return undefined; // handled specially in resolveType via node shape
        case 'span':
            return 'span';
        case 'super':
            return 'superscript';
        case 'sub':
            return 'subscript';
        case 'highlight':
            return 'highlight';
        case 'critic-insert':
            return 'insert';
        case 'critic-delete':
            return 'delete';
        case 'math':
            return 'math';
        case 'abbreviation':
            return 'abbreviation';
        default:
            // 'emoji', 'crossref', 'caption-number', 'abbreviation-def',
            // 'critic-substitute', 'critic-comment', 'bold-italic' (handled below)
            return undefined;
    }
}
/**
 * Link URL policy for Profile-based filtering. Controls which URLs are
 * allowed in links and images. Port of carve-php's LinkPolicy.
 */
export class LinkPolicy {
    allowedSchemes = null;
    deniedSchemes = ['javascript', 'vbscript', 'data', 'file'];
    allowedDomains = null;
    deniedDomains = [];
    allowExternal = true;
    allowInternal = true;
    relAttributes = [];
    /** Allow all URLs except dangerous schemes. */
    static unrestricted() {
        return new LinkPolicy();
    }
    /** Allow only internal links (relative URLs, fragments). */
    static internalOnly() {
        return new LinkPolicy().setAllowExternal(false);
    }
    /** Allow only links to specific domains. */
    static allowlist(domains) {
        return new LinkPolicy().setAllowedDomains(domains);
    }
    getAllowedSchemes() {
        return this.allowedSchemes;
    }
    setAllowedSchemes(schemes) {
        this.allowedSchemes = schemes !== null ? schemes.map((s) => s.toLowerCase()) : null;
        return this;
    }
    getDeniedSchemes() {
        return this.deniedSchemes;
    }
    setDeniedSchemes(schemes) {
        this.deniedSchemes = schemes.map((s) => s.toLowerCase());
        return this;
    }
    getAllowedDomains() {
        return this.allowedDomains;
    }
    setAllowedDomains(domains) {
        this.allowedDomains = domains;
        return this;
    }
    getDeniedDomains() {
        return this.deniedDomains;
    }
    setDeniedDomains(domains) {
        this.deniedDomains = domains;
        return this;
    }
    getAllowExternal() {
        return this.allowExternal;
    }
    setAllowExternal(allow) {
        this.allowExternal = allow;
        return this;
    }
    getAllowInternal() {
        return this.allowInternal;
    }
    setAllowInternal(allow) {
        this.allowInternal = allow;
        return this;
    }
    getRelAttributes() {
        return this.relAttributes;
    }
    setRelAttributes(attrs) {
        this.relAttributes = attrs;
        return this;
    }
    /** Add a rel attribute applied to all surviving links. */
    addRelAttribute(attr) {
        if (!this.relAttributes.includes(attr)) {
            this.relAttributes.push(attr);
        }
        return this;
    }
    /**
     * Check whether a URL is permitted by this policy.
     *
     * @param baseHost Current document's host (for external detection).
     */
    isUrlAllowed(url, baseHost = null) {
        url = url.trim();
        if (url === '')
            return true;
        // Fragment-only URLs are always internal.
        if (url.startsWith('#'))
            return this.allowInternal;
        // Protocol-relative URLs are absolute external URLs, not internal paths.
        if (url.startsWith('//'))
            return this.isProtocolRelativeUrlAllowed(url, baseHost);
        // Relative paths are internal.
        if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
            return this.allowInternal;
        }
        const colonPos = url.indexOf(':');
        if (colonPos !== -1) {
            const scheme = url.slice(0, colonPos).toLowerCase();
            if (this.deniedSchemes.includes(scheme))
                return false;
            if (this.allowedSchemes !== null && !this.allowedSchemes.includes(scheme))
                return false;
            // mailto: and tel: are considered internal for simplicity.
            if (scheme === 'mailto' || scheme === 'tel')
                return true;
            if (scheme === 'http' || scheme === 'https') {
                const host = parseHost(url);
                if (host !== null) {
                    if (this.isDomainDenied(host))
                        return false;
                    if (this.allowedDomains !== null && !this.isDomainAllowed(host))
                        return false;
                    if (!this.allowExternal) {
                        if (baseHost !== null && !this.isSameHost(host, baseHost))
                            return false;
                        if (baseHost === null)
                            return false;
                    }
                }
            }
        }
        return true;
    }
    isProtocolRelativeUrlAllowed(url, baseHost) {
        if (this.allowedSchemes !== null) {
            const schemes = this.allowedSchemes.map((s) => s.toLowerCase());
            if (!schemes.includes('http') && !schemes.includes('https'))
                return false;
        }
        const host = parseHost('https:' + url);
        if (host === null)
            return false;
        if (this.isDomainDenied(host))
            return false;
        if (this.allowedDomains !== null && !this.isDomainAllowed(host))
            return false;
        if (!this.allowExternal) {
            if (baseHost !== null && !this.isSameHost(host, baseHost))
                return false;
            if (baseHost === null)
                return false;
        }
        return true;
    }
    isDomainDenied(host) {
        host = host.toLowerCase();
        return this.deniedDomains.some((d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
    }
    isDomainAllowed(host) {
        if (this.allowedDomains === null)
            return true;
        host = host.toLowerCase();
        return this.allowedDomains.some((d) => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
    }
    isSameHost(a, b) {
        return a.toLowerCase() === b.toLowerCase();
    }
}
/**
 * Extract the host of an http(s) URL the way PHP's parse_url does for the
 * cases LinkPolicy needs (host only, no userinfo handling beyond `@`).
 * Returns null when no host can be determined.
 */
function parseHost(url) {
    // Match scheme://[authority]/...; authority ends at /, ?, or #.
    const m = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)/.exec(url);
    if (!m)
        return null;
    let authority = m[1];
    // Strip userinfo.
    const at = authority.lastIndexOf('@');
    if (at !== -1)
        authority = authority.slice(at + 1);
    // Strip port. IPv6 literals are in [..]; keep brackets out of scope (rare).
    const colon = authority.lastIndexOf(':');
    if (colon !== -1 && !authority.includes(']'))
        authority = authority.slice(0, colon);
    return authority === '' ? null : authority;
}
/**
 * Profile: feature restriction for a rendering context. Port of carve-php's
 * Profile, including the four presets (full / article / comment / minimal).
 */
export class Profile {
    static ACTION_STRIP = 'strip';
    static ACTION_TO_TEXT = 'to_text';
    static ACTION_ERROR = 'error';
    name = 'custom';
    description = '';
    featureReasons = {};
    allowedInline = null;
    allowedBlock = null;
    deniedInline = [];
    deniedBlock = [];
    linkPolicy = null;
    maxNesting = 0;
    maxLength = 0;
    disallowedAction = Profile.ACTION_TO_TEXT;
    /** All features enabled. Use only for trusted content. */
    static full() {
        const p = new Profile();
        p.name = 'full';
        p.description = 'All features enabled. Use only for trusted content.';
        return p;
    }
    /** Blog posts and articles: all formatting, no raw HTML. */
    static article() {
        const p = new Profile();
        p.name = 'article';
        p.description = 'Blog posts and articles. All formatting, no raw HTML.';
        p.denyBlock(['raw_block']).denyInline(['raw_inline']);
        p.featureReasons = {
            raw_block: 'Raw HTML blocks are disabled to prevent XSS attacks. Use djot markup instead.',
            raw_inline: 'Raw HTML is disabled to prevent XSS attacks. Use djot markup instead.',
        };
        return p;
    }
    /** User comments: basic formatting only, nofollow links. */
    static comment() {
        const p = new Profile();
        p.name = 'comment';
        p.description = 'User comments. Basic formatting only, nofollow links.';
        p.allowInline([
            'text',
            'emphasis',
            'strong',
            'underline',
            'strike',
            'inline_extension',
            'mention',
            'code',
            'link',
            'soft_break',
            'hard_break',
            'delete',
            'insert',
            'highlight',
            'superscript',
            'subscript',
        ])
            .allowBlock(['paragraph', 'list', 'list_item', 'block_quote', 'code_block'])
            .setLinkPolicy(LinkPolicy.unrestricted().addRelAttribute('nofollow').addRelAttribute('ugc'))
            .setMaxNesting(4);
        p.featureReasons = {
            heading: 'Headings are disabled in comments to prevent disrupting page structure.',
            image: 'Images are disabled to prevent spam, inappropriate content, and bandwidth abuse.',
            table: 'Tables are disabled as they are too complex for comment formatting.',
            footnote: 'Footnotes are disabled as they are unnecessary for comments.',
            footnote_ref: 'Footnotes are disabled as they are unnecessary for comments.',
            inline_footnote: 'Footnotes are disabled as they are unnecessary for comments.',
            raw_block: 'Raw HTML is disabled for security reasons.',
            raw_inline: 'Raw HTML is disabled for security reasons.',
            div: 'Custom containers are disabled in comments.',
            section: 'Sections are disabled in comments.',
            definition_list: 'Definition lists are disabled in comments.',
            definition_term: 'Definition lists are disabled in comments.',
            definition_description: 'Definition lists are disabled in comments.',
            thematic_break: 'Horizontal rules are disabled in comments.',
            line_block: 'Line blocks are disabled in comments.',
            span: 'Custom spans are disabled in comments.',
            symbol: 'Symbol markup is disabled in comments.',
            math: 'Math markup is disabled in comments.',
            abbreviation: 'Abbreviations are disabled in comments.',
        };
        return p;
    }
    /** Chat / micro-posts: non-destructive inline formatting, paragraphs and lists. */
    static minimal() {
        const p = new Profile();
        p.name = 'minimal';
        p.description =
            'Chat/micro-posts. Non-destructive inline formatting, paragraphs and lists.';
        p.allowInline([
            'text',
            'emphasis',
            'strong',
            'underline',
            'strike',
            'inline_extension',
            'mention',
            'code',
            'delete',
            'insert',
            'superscript',
            'subscript',
            'soft_break',
            'hard_break',
        ])
            .allowBlock(['paragraph', 'list', 'list_item'])
            .setMaxNesting(2);
        p.featureReasons = {
            link: 'Links are disabled in this minimal context.',
            highlight: 'Highlighting is disabled in this minimal context.',
            image: 'Images are disabled in this minimal context.',
            raw_inline: 'Raw HTML is disabled for security reasons.',
            footnote_ref: 'Footnotes are disabled in this minimal context.',
            inline_footnote: 'Footnotes are disabled in this minimal context.',
            span: 'Custom spans are disabled in this minimal context.',
            symbol: 'Symbols are disabled in this minimal context.',
            math: 'Math is disabled in this minimal context.',
            abbreviation: 'Abbreviations are disabled in this minimal context.',
            default: 'Only basic text formatting and lists are allowed in this context.',
        };
        return p;
    }
    getName() {
        return this.name;
    }
    getDescription() {
        return this.description;
    }
    /** Reason a node type is disallowed, or null if it is allowed / no reason. */
    getReasonDisallowed(canonical) {
        if (this.isTypeAllowed(canonical))
            return null;
        return this.featureReasons[canonical] ?? this.featureReasons['default'] ?? null;
    }
    getFeatureReasons() {
        return this.featureReasons;
    }
    setFeatureReason(canonical, reason) {
        this.featureReasons[canonical] = reason;
        return this;
    }
    /** Set allowed inline types (null = all allowed). */
    allowInline(types) {
        this.allowedInline = types;
        return this;
    }
    /** Set allowed block types (null = all allowed). */
    allowBlock(types) {
        this.allowedBlock = types;
        return this;
    }
    denyInline(types) {
        this.deniedInline = [...this.deniedInline, ...types];
        return this;
    }
    denyBlock(types) {
        this.deniedBlock = [...this.deniedBlock, ...types];
        return this;
    }
    getAllowedInline() {
        return this.allowedInline;
    }
    getAllowedBlock() {
        return this.allowedBlock;
    }
    getDeniedInline() {
        return this.deniedInline;
    }
    getDeniedBlock() {
        return this.deniedBlock;
    }
    getLinkPolicy() {
        return this.linkPolicy;
    }
    setLinkPolicy(policy) {
        this.linkPolicy = policy;
        return this;
    }
    getMaxNesting() {
        return this.maxNesting;
    }
    /** Set maximum block-container nesting depth (0 = unlimited). */
    setMaxNesting(max) {
        this.maxNesting = max;
        return this;
    }
    getMaxLength() {
        return this.maxLength;
    }
    /** Set maximum input length in bytes (0 = unlimited). */
    setMaxLength(max) {
        this.maxLength = max;
        return this;
    }
    getDisallowedAction() {
        return this.disallowedAction;
    }
    /** Set action for disallowed elements. */
    onDisallowed(action) {
        this.disallowedAction = action;
        return this;
    }
    /** Whether a canonical type string is allowed by this profile. */
    isTypeAllowed(canonical) {
        if (INLINE_SET.has(canonical))
            return this.isInlineAllowed(canonical);
        if (BLOCK_SET.has(canonical))
            return this.isBlockAllowed(canonical);
        if (canonical === 'document')
            return true;
        // Unknown types are denied by default.
        return false;
    }
    isInlineAllowed(type) {
        if (this.deniedInline.includes(type))
            return false;
        if (this.allowedInline !== null)
            return this.allowedInline.includes(type);
        return true;
    }
    isBlockAllowed(type) {
        if (this.deniedBlock.includes(type))
            return false;
        if (this.allowedBlock !== null)
            return this.allowedBlock.includes(type);
        return true;
    }
    /** Summary of what this profile allows/denies. */
    getSummary() {
        return {
            name: this.name,
            description: this.description,
            allowed_block: this.allowedBlock ?? 'all',
            allowed_inline: this.allowedInline ?? 'all',
            denied_block: this.deniedBlock,
            denied_inline: this.deniedInline,
        };
    }
}
/** Format a violation into a human-readable message (matches carve-php). */
export function formatProfileViolation(v) {
    let msg = `'${v.nodeType}' is not allowed: ${v.reason}`;
    if (v.reasonDescription !== null)
        msg += ` (${v.reasonDescription})`;
    return msg;
}
/** Thrown by applyProfile when the profile's action is `error`. */
export class ProfileViolationError extends Error {
    violations;
    constructor(violations) {
        super('Profile violations: ' + violations.map(formatProfileViolation).join('; '));
        this.violations = violations;
        this.name = 'ProfileViolationError';
    }
}
//# sourceMappingURL=profile.js.map