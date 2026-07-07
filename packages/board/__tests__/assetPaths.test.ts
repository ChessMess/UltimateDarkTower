import { lookupTokenArt, resolveTokenImageFor, HERO_BY_ID } from '../src/index';
import type { TokenArtConfig, TokenArtRef } from '../src/index';

const BRIGANDS: TokenArtRef = { kind: 'foe', id: 'Brigands' };

describe('lookupTokenArt', () => {
  const config: TokenArtConfig = {
    foe: { brigands: { image2d: '/2d.png' } }, // kebab key vs raw `Brigands` ref id
    hero: { 'brutal-warlord': { image2d: '/hero.png' } },
  };

  it('matches by raw id', () => {
    expect(lookupTokenArt({ foe: { Brigands: { image2d: '/x.png' } } }, BRIGANDS)?.image2d).toBe('/x.png');
  });

  it('matches by kebab slug when the raw id misses', () => {
    expect(lookupTokenArt(config, BRIGANDS)?.image2d).toBe('/2d.png');
  });

  it('returns undefined for an unknown kind or id', () => {
    expect(lookupTokenArt(config, { kind: 'foe', id: 'Dragons' })).toBeUndefined();
    expect(lookupTokenArt(config, { kind: 'marker', id: 'wasteland' })).toBeUndefined();
    expect(lookupTokenArt(undefined, BRIGANDS)).toBeUndefined();
  });
});

describe('resolveTokenImageFor', () => {
  it('prefers the per-token tokenArt override, selecting by view', () => {
    const tokenArt: TokenArtConfig = { foe: { Brigands: { image2d: '/2d.png', image3d: '/3d.png' } } };
    expect(resolveTokenImageFor(BRIGANDS, '2d', { tokenArt, assetBaseUrl: '/t/' })).toBe('/2d.png');
    expect(resolveTokenImageFor(BRIGANDS, '3d', { tokenArt, assetBaseUrl: '/t/' })).toBe('/3d.png');
  });

  it('falls the 3D view back to image2d when image3d is unset (one image drives both views)', () => {
    const tokenArt: TokenArtConfig = { foe: { Brigands: { image2d: '/2d.png' } } };
    const resolveTokenImage = jest.fn((_ref: TokenArtRef, view: string) => `/cb-${view}.png`);
    expect(resolveTokenImageFor(BRIGANDS, '3d', { tokenArt, resolveTokenImage, assetBaseUrl: '/t/' })).toBe('/2d.png');
    expect(resolveTokenImage).not.toHaveBeenCalled();
  });

  it('falls through to the callback for 3D only when neither image3d nor image2d is set', () => {
    const tokenArt: TokenArtConfig = { foe: { Brigands: {} } };
    const resolveTokenImage = jest.fn((_ref: TokenArtRef, view: string) => `/cb-${view}.png`);
    expect(resolveTokenImageFor(BRIGANDS, '3d', { tokenArt, resolveTokenImage, assetBaseUrl: '/t/' })).toBe('/cb-3d.png');
    expect(resolveTokenImage).toHaveBeenCalledWith(BRIGANDS, '3d');
  });

  it('uses the callback when there is no tokenArt entry', () => {
    const resolveTokenImage = (_ref: TokenArtRef, view: string): string => `/cb-${view}.png`;
    expect(resolveTokenImageFor(BRIGANDS, '2d', { resolveTokenImage, assetBaseUrl: '/t/' })).toBe('/cb-2d.png');
  });

  it('falls back to the default convention when nothing else applies', () => {
    // 2D prefers the official flat board-token icon for known foes; 3D keeps the portrait convention.
    expect(resolveTokenImageFor(BRIGANDS, '2d', { assetBaseUrl: '/t/' })).toBe('/t/foes/Foe-Token-L2-Brigands.png');
    expect(resolveTokenImageFor(BRIGANDS, '3d', { assetBaseUrl: '/t/' })).toBe('/t/foes/brigands.png');
    // A foe with no official-icon entry still uses the plain convention, even in 2D.
    expect(resolveTokenImageFor({ kind: 'foe', id: 'some-new-foe' }, '2d', { assetBaseUrl: '/t/' })).toBe('/t/foes/some-new-foe.png');
    // Adversaries get the same 2D-icon treatment (icons live under foes/); 3D uses adversaries/.
    const ASHSTRIDER: TokenArtRef = { kind: 'adversary', id: 'ashstrider' };
    expect(resolveTokenImageFor(ASHSTRIDER, '2d', { assetBaseUrl: '/t/' })).toBe('/t/foes/Adversary-Token-Ashstrider.png');
    expect(resolveTokenImageFor(ASHSTRIDER, '3d', { assetBaseUrl: '/t/' })).toBe('/t/adversaries/ashstrider.png');
    // No base URL → null (programmatic fallback).
    expect(resolveTokenImageFor(BRIGANDS, '2d', {})).toBeNull();
  });

  it('resolves roster hero portraits (same art both views); art-less heroes fall back', () => {
    const WARLORD: TokenArtRef = { kind: 'hero', id: 'brutal-warlord' };
    // A hero with a shipped portrait resolves the same file in 2D and 3D.
    expect(resolveTokenImageFor(WARLORD, '2d', { assetBaseUrl: '/t/' })).toBe('/t/heros/brutal-warlord-hero.png');
    expect(resolveTokenImageFor(WARLORD, '3d', { assetBaseUrl: '/t/' })).toBe('/t/heros/brutal-warlord-hero.png');
    expect(resolveTokenImageFor({ kind: 'hero', id: 'orphaned-scion' }, '2d', { assetBaseUrl: '/t/' })).toBe(
      '/t/heros/orphaned-scion.png',
    );
    // A roster hero with no shipped portrait yet → null (programmatic disc), no broken request.
    expect(resolveTokenImageFor({ kind: 'hero', id: 'relic-hunter' }, '2d', { assetBaseUrl: '/t/' })).toBeNull();
    // An instance/unknown id that isn't a roster hero → null too.
    expect(resolveTokenImageFor({ kind: 'hero', id: 'hero-1' }, '2d', { assetBaseUrl: '/t/' })).toBeNull();
  });

  it('handles the full hero roster (all expansions) without error', () => {
    // Every hero in UDT's roster — base + alliances + covenant + expeditions — must resolve to
    // either a `heros/*.png` portrait or null (disc fallback), never a malformed path or throw.
    // This is the compose-never-redefine guard: a hero added upstream is exercised here.
    for (const id of Object.keys(HERO_BY_ID)) {
      const url = resolveTokenImageFor({ kind: 'hero', id }, '2d', { assetBaseUrl: '/t/' });
      if (url !== null) expect(url).toMatch(/^\/t\/heros\/.+\.png$/);
    }
  });
});
