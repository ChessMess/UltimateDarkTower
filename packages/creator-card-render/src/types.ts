// @udtc/card-render — shared card presentation for Creator and Player. Source-only, headless-safe
// to import from apps ONLY (never from @udtc/engine). Renders the 0.4.3 card templates.

/** The closed 3-value front template enum (mirrors schema $defs/cardAppearance.template). */
export type CardTemplate = 'classic' | 'fullArt' | 'textOnly';

/** Standard authoring card size — 5:7 poker ratio. All templates lay out at this fixed size and
 * scale to the requested display `width` via a transform wrapper. */
export const CARD_W = 750;
export const CARD_H = 1050;

/** Everything a single card FRONT needs to render. `artUrl` is a RESOLVED image (typically a data
 * URL): apps resolve resourceKeys against `library.resources.images` before constructing this —
 * this package never touches the scenario document or resolves keys. */
export interface CardFaceData {
  name: string;
  /** short category / advantage label rendered as a pill (e.g. the battle-card advantage) */
  tag?: string;
  /** primary body text */
  text?: string;
  /** italic flavor line under the body */
  flavor?: string;
  /** a resolved image URL (data: URL or http URL) for the card art; placeholder shown if absent */
  artUrl?: string;
  /** front template; defaults to 'classic' */
  template?: CardTemplate;
  /** hex accent color (#rrggbb) trimming the card; defaults to a neutral violet */
  accent?: string;
  /** presentational-only critical flag → red styling/ribbon */
  critical?: boolean;
}
