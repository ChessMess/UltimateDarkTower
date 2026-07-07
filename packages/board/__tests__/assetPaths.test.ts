import { lookupTokenArt, resolveTokenImageFor } from '../src/index';
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
    // Heroes have no convention art.
    expect(resolveTokenImageFor({ kind: 'hero', id: 'brutal-warlord' }, '2d', { assetBaseUrl: '/t/' })).toBeNull();
  });
});
