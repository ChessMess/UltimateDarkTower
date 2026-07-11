/**
 * bitMapDisplay.ts — Character grid visualization component.
 *
 * Renders all 12 seed characters as colored cells with tooltips,
 * showing setup (chars 0–5) and RNG (chars 6–11) sections.
 */

import type { FieldMapping } from './types';
import type { seed as seedApi } from 'ultimatedarktower';

export interface BitMapOptions {
  chars: seedApi.CharInfo[];
  fieldMappings: FieldMapping[];
  changedChars?: seedApi.CharDiff[];
}

export class BitMapDisplay {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(options: BitMapOptions): void {
    const { chars, fieldMappings, changedChars } = options;
    this.container.innerHTML = '';

    const changedSet = new Set((changedChars ?? []).map((d) => d.charIndex));

    // Build mapping lookup: char index → field
    const charToField = new Map<number, FieldMapping>();
    for (const mapping of fieldMappings) {
      for (let i = mapping.bitOffset; i < mapping.bitOffset + mapping.bitLength; i++) {
        charToField.set(i, mapping);
      }
    }

    // Header
    const header = document.createElement('div');
    header.className = 'bitmap-header';
    header.textContent = `12 Characters — ${fieldMappings.length} mapped field${fieldMappings.length !== 1 ? 's' : ''}`;
    this.container.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'bitmap-grid';

    for (const charInfo of chars) {
      const cell = document.createElement('div');
      cell.className = 'bitmap-cell';
      cell.textContent = charInfo.char.toUpperCase();
      cell.dataset.position = String(charInfo.index);

      const field = charInfo.field ? charToField.get(charInfo.index) : undefined;
      const isChanged = changedSet.has(charInfo.index);
      const isSetup = charInfo.section === 'setup';

      if (isChanged) {
        cell.classList.add('bitmap-changed');
      } else if (field) {
        cell.classList.add(
          field.confidence === 'confirmed' ? 'bitmap-confirmed' : 'bitmap-suspected'
        );
      } else if (isSetup) {
        cell.classList.add('bitmap-unknown');
      } else {
        cell.classList.add('bitmap-rng');
      }

      // Tooltip
      const fieldLabel = charInfo.field ?? (isSetup ? 'unmapped' : 'RNG');
      cell.title = `Char ${charInfo.index}: '${charInfo.char}' (val ${charInfo.value})\nSection: ${charInfo.section}\nField: ${fieldLabel}${isChanged ? '\n⚡ Changed from baseline' : ''}`;

      grid.appendChild(cell);
    }

    this.container.appendChild(grid);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'bitmap-legend';
    legend.innerHTML = `
      <span class="legend-item"><span class="legend-swatch bitmap-unknown"></span>Setup</span>
      <span class="legend-item"><span class="legend-swatch bitmap-rng"></span>RNG</span>
      <span class="legend-item"><span class="legend-swatch bitmap-confirmed"></span>Confirmed</span>
      <span class="legend-item"><span class="legend-swatch bitmap-suspected"></span>Suspected</span>
      <span class="legend-item"><span class="legend-swatch bitmap-changed"></span>Changed</span>
    `;
    this.container.appendChild(legend);
  }

  clear(): void {
    this.container.innerHTML = '';
  }
}
