/** Top-level grouping a category sits under on a component sheet. */
export type Section = 'Misc' | 'Tokens' | 'Cards' | 'Minis';
/** A single line-item. Only `count` is always present; the rest describe the item
 *  depending on its category (name, color, type, level, and/or description). */
export interface Component {
    name?: string;
    color?: string;
    type?: string;
    level?: number;
    description?: string;
    count: number;
}
/** A category (column-group) of components within an expansion. */
export interface Category {
    name: string;
    section: Section;
    components: Component[];
}
/** A boxed expansion (or the base game) made up of categorized components. */
export interface Expansion {
    name: string;
    categories: Category[];
}
export interface TokenDenomination {
    name: string;
    count: number;
}
export interface CofferTokenSet {
    resource: string;
    denominations: TokenDenomination[];
    total: number;
}
export interface TokenPack {
    tokens: Component[];
    total: number;
}
export interface SleeveType {
    name: string;
    purposes: string[];
}
export declare const expansions: Expansion[];
/** Expansions keyed by name. */
export declare const EXPANSIONS: Record<string, Expansion>;
export declare const coffers: CofferTokenSet[];
export declare const coffers2: TokenPack;
export declare const skullsPack: TokenPack;
export declare const sleeves: SleeveType[];
