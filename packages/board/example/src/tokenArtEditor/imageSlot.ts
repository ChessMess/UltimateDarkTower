// Image slot card — renders the 2D / 3D image picker card.
import { ICON, el, makeInput, slotHead, field, actions, fieldsWrap, emptyState } from './helpers';

export function imageSlot(
  name: string,
  tagClass: string,
  tag: string,
  value: string | undefined,
  fallback: string | undefined,
  onChange: (v: string | undefined) => void,
): HTMLElement {
  const slot = el('div', 'slot');
  const preview = el('div', 'slot-preview');
  const input = makeInput({
    value: value ?? '',
    placeholder: './tokens/…/art.png',
    list: 'imgAssets',
  });

  // Render an <img>; `isDefault` marks the convention fallback (dimmed + "default" tag, no is-set).
  const showImage = (src: string, isDefault: boolean): void => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.addEventListener('error', () => {
      preview.classList.remove('is-default');
      preview.replaceChildren(
        emptyState(isDefault ? 'no art file — fallback disc' : 'broken link'),
      );
    });
    preview.classList.toggle('is-default', isDefault);
    if (isDefault) {
      const tagEl = el('span', 'preview-tag');
      tagEl.textContent = 'default';
      preview.replaceChildren(img, tagEl);
    } else {
      preview.replaceChildren(img);
    }
  };

  const paint = (): void => {
    const v = input.value.trim();
    slot.classList.toggle('is-set', !!v);
    if (v) {
      showImage(v, false);
    } else if (fallback) {
      showImage(fallback, true);
    } else {
      preview.classList.remove('is-default');
      preview.replaceChildren(emptyState('no image set'));
    }
  };

  input.addEventListener('input', () => {
    onChange(input.value.trim() || undefined);
    paint();
  });

  slot.append(
    slotHead(ICON.img, name, tagClass, tag),
    preview,
    fieldsWrap(
      field('Image URL', input),
      actions(() => {
        input.value = '';
        onChange(undefined);
        paint();
      }),
    ),
  );
  paint();
  return slot;
}
