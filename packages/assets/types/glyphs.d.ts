// Hand-written, committed on purpose — see ../CLAUDE.md.
// TypeScript resolves this via the `types` condition (which must precede `default` in the
// exports map); Vite has no `types` condition and falls through to the raw `.ts`.
// Declaration files are exempt from the `rootDir` check, which is what lets an *emitting*
// package like `ultimatedarktowerdisplay` import a source-only package without TS6059.
export declare const glyphSvg: Record<
  'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce',
  string
>;
export declare const allGlyphsSvg: string;
export declare const glyphsPng: string;
