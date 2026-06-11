// 3D-art slot card — the per-token 3D picker. A token's 3D view is, in precedence order: a GLB
// model (`model3d`), else a flat billboard image specific to 3D (`image3d`), else its 2D `image2d`
// as a billboard (the same image the 2D map uses, else the convention default). This one card edits
// BOTH overrides through a single URL field: a `.glb`/`.gltf` URL is saved as `model3d`, any image
// URL as `image3d`. They're mutually exclusive here (picking one clears the other), mirroring the
// renderer's precedence. With neither set it previews that fallback image, tagged "default". Any
// `scale`/`rotation`/`dracoDecoderPath` already in the JSON is preserved as model pass-through (not
// editable here) so the data round-trips unchanged.
import type { TokenArt, TokenModelRef } from '../../../src/index';
import { ICON, el, makeInput, slotHead, field, actions, fieldsWrap, emptyState } from './helpers';

// URLs ending in one of these read as a flat 3D image (→ `image3d`); anything else loads as a GLB
// model (→ `model3d`). Mirrors the dev plugin's IMAGE_EXT so the picker and the asset list agree.
const IMAGE_EXT = ['.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.avif'];
const isImageUrl = (u: string): boolean => {
  const path = u.split(/[?#]/)[0].toLowerCase();
  return IMAGE_EXT.some((ext) => path.endsWith(ext));
};

export function modelSlot(
  model: TokenModelRef | undefined,
  image3d: string | undefined,
  fallbackImage: string | undefined,
  onUpdate: (mutate: (draft: TokenArt) => void) => void,
): HTMLElement {
  const m = model === undefined ? undefined : typeof model === 'string' ? { url: model } : model;
  // Fields the card doesn't edit but must keep when rewriting `model3d`.
  const passthrough = {
    scale: m?.scale,
    rotation: m?.rotation,
    dracoDecoderPath: m && 'dracoDecoderPath' in m ? m.dracoDecoderPath : undefined,
  };

  const slot = el('div', 'slot');
  const preview = el('div', 'slot-preview');
  const url = makeInput({ value: m?.url ?? image3d ?? '', placeholder: './model.glb · ./art.png', list: 'modelAssets' });

  // Live model preview via Google's <model-viewer> (loaded from CDN in tokens.html). The element
  // only re-fetches when `src` changes.
  const viewer = document.createElement('model-viewer');
  viewer.className = 'model-view';
  for (const [k, v] of Object.entries({
    'camera-controls': '',
    'auto-rotate': '',
    'disable-zoom': '',
    'interaction-prompt': 'none',
    'shadow-intensity': '0.6',
    'environment-image': 'neutral',
    exposure: '1.05',
  })) {
    viewer.setAttribute(k, v);
  }
  const fileTag = el('span', 'preview-tag');
  let viewerSrc = '';
  let erroredSrc = '';
  viewer.addEventListener('error', () => {
    erroredSrc = viewerSrc;
    preview.classList.remove('has-model');
    preview.replaceChildren(emptyState('model failed to load'));
  });

  const commit = (): void => {
    const u = url.value.trim();
    onUpdate((d) => {
      // model3d / image3d are mutually exclusive in this card: one input drives both slots.
      if (!u) {
        d.model3d = undefined;
        d.image3d = undefined;
        return;
      }
      if (isImageUrl(u)) {
        d.image3d = u;
        d.model3d = undefined;
        return;
      }
      const next: { url: string; scale?: number; rotation?: { x?: number; y?: number; z?: number }; dracoDecoderPath?: string | null } = { url: u };
      if (passthrough.scale != null) next.scale = passthrough.scale;
      if (passthrough.rotation) next.rotation = passthrough.rotation;
      if (passthrough.dracoDecoderPath !== undefined) next.dracoDecoderPath = passthrough.dracoDecoderPath;
      d.model3d = next;
      d.image3d = undefined;
    });
    paint();
  };

  // Render a flat <img>: the convention fallback is dimmed + "default"; an explicit `image3d` shows
  // at full strength tagged with its filename.
  const showImage = (src: string, isDefault: boolean): void => {
    preview.classList.remove('has-model');
    const img = document.createElement('img');
    img.src = src;
    img.alt = '3D billboard';
    img.addEventListener('error', () => {
      preview.classList.remove('is-default');
      preview.replaceChildren(emptyState(isDefault ? 'no art file — fallback disc' : 'broken link'));
    });
    preview.classList.toggle('is-default', isDefault);
    const tagEl = el('span', 'preview-tag');
    tagEl.textContent = isDefault ? 'default' : (src.split('/').pop() ?? src);
    preview.replaceChildren(img, tagEl);
  };

  // Show the image2d/convention fallback billboard — what the 3D view renders with no override.
  const showFallback = (): void => {
    if (!fallbackImage) {
      preview.classList.remove('has-model', 'is-default');
      preview.replaceChildren(emptyState('no 3D art'));
      return;
    }
    showImage(fallbackImage, true);
  };

  const paint = (): void => {
    const u = url.value.trim();
    slot.classList.toggle('is-set', !!u);
    if (!u) {
      showFallback();
      return;
    }
    if (isImageUrl(u)) {
      showImage(u, false);
      return;
    }
    preview.classList.remove('is-default');
    if (viewerSrc !== u) {
      erroredSrc = '';
      viewerSrc = u;
      viewer.setAttribute('src', u);
    }
    if (erroredSrc === u) {
      preview.classList.remove('has-model');
      preview.replaceChildren(emptyState('model failed to load'));
      return;
    }
    fileTag.textContent = u.split('/').pop() ?? u;
    preview.classList.add('has-model');
    if (!preview.contains(viewer)) preview.replaceChildren(viewer, fileTag);
  };

  url.addEventListener('input', commit);

  slot.append(
    slotHead(ICON.model, '3D View', 'tag-3d', '3D'),
    preview,
    fieldsWrap(
      field('Model (.glb) or image URL', url),
      actions(() => {
        url.value = '';
        commit();
      }),
    ),
  );
  paint();
  return slot;
}
