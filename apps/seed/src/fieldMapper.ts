/**
 * fieldMapper.ts — Field mapping editor UI + persistence.
 */

import type { FieldMapping } from './types';
import type { SeedAnalyzer } from './seedAnalyzer';

export class FieldMapper {
  private container: HTMLElement;
  private analyzer: SeedAnalyzer;

  constructor(container: HTMLElement, analyzer: SeedAnalyzer) {
    this.container = container;
    this.analyzer = analyzer;
  }

  render(): void {
    const mappings = this.analyzer.getFieldMappings();
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'section-label';
    header.textContent = 'Field Mappings';
    this.container.appendChild(header);

    if (mappings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.textContent =
        'No field mappings yet. Add variants and use auto-suggest, or add manually.';
      this.container.appendChild(empty);
    } else {
      const table = document.createElement('table');
      table.className = 'mapping-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Field</th>
            <th>Offset</th>
            <th>Length</th>
            <th>Confidence</th>
            <th></th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');
      for (const m of mappings) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${m.name}</td>
          <td>${m.bitOffset}</td>
          <td>${m.bitLength}</td>
          <td><span class="confidence-badge confidence-${m.confidence}">${m.confidence}</span></td>
          <td><button class="btn-icon" data-remove="${m.name}" title="Remove mapping">&times;</button></td>
        `;
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      this.container.appendChild(table);

      // Wire remove buttons
      this.container.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.analyzer.removeFieldMapping((btn as HTMLElement).dataset.remove!);
          this.render();
        });
      });
    }

    // Add mapping form
    const form = document.createElement('div');
    form.className = 'mapping-form';
    form.innerHTML = `
      <input type="text" placeholder="Field name" class="input-sm" id="map-name" />
      <input type="number" placeholder="Offset" class="input-sm input-num" id="map-offset" min="0" max="61" />
      <input type="number" placeholder="Length" class="input-sm input-num" id="map-length" min="1" max="62" />
      <select class="input-sm" id="map-confidence">
        <option value="suspected">suspected</option>
        <option value="confirmed">confirmed</option>
        <option value="unknown">unknown</option>
      </select>
      <button class="btn-sm" id="map-add-btn">Add</button>
    `;
    this.container.appendChild(form);

    form.querySelector('#map-add-btn')!.addEventListener('click', () => {
      const name = (form.querySelector('#map-name') as HTMLInputElement).value.trim();
      const offset = parseInt((form.querySelector('#map-offset') as HTMLInputElement).value, 10);
      const length = parseInt((form.querySelector('#map-length') as HTMLInputElement).value, 10);
      const confidence = (form.querySelector('#map-confidence') as HTMLSelectElement)
        .value as FieldMapping['confidence'];
      if (!name || isNaN(offset) || isNaN(length)) return;
      this.analyzer.addFieldMapping({ name, bitOffset: offset, bitLength: length, confidence });
      this.render();
    });
  }
}
