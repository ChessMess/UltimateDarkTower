---
'ultimatedarktowerboard': minor
'@udtc/assets': minor
---

New `makeTokenImageResolver(urls)` export on `ultimatedarktowerboard` — builds a
`resolveTokenImage` callback from a `'<group>/<file>' → URL` map, for consumers whose art comes
from a bundler (hashed filenames) rather than a static directory.

It runs the library's own resolution against a sentinel base and maps the result through the
supplied map, so the `OFFICIAL_2D_ICON` / `OFFICIAL_HERO_ART` / `OFFICIAL_QUEST_ART` tables stay
the single source of truth instead of being re-implemented in each consumer.

```ts
import { makeTokenImageResolver } from 'ultimatedarktowerboard';
import { tokenUrls, tokenArt } from '@udtc/assets/tokens';

new BoardStageView({ resolveTokenImage: makeTokenImageResolver(tokenUrls), tokenArt, ... });
```

**`assetBaseUrl` is unchanged and not deprecated** — it remains the right choice when self-hosting
art at a stable path.

Note it covers **images only**. 3D models still resolve through `defaultTokenModelPath`, which is
`assetBaseUrl`-driven, so supply those via `tokenArt.<kind>.<id>.model3d` (`@udtc/assets/tokens`
exports a ready-made `tokenArt` carrying the skull model). Replacing `assetBaseUrl` with only
`resolveTokenImage` would silently drop the skull GLB to a sprite billboard.

`@udtc/assets` gains its `./tokens` and `./board` entry points, holding the 84 unique token images
(previously three drifting copies), the skull GLB and both board variants. The board demo, Token
Art Forge, Token Designer and location-marker pages all now resolve art through the package.
