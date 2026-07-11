/**
 * A `<select>` of board locations grouped by kingdom (PRD-02), optionally restricted to the
 * 16 building spaces. Shared by the placement palette and the inspector's move control.
 */
import { BUILDING_LOCATIONS, KINGDOMS, LOCATIONS } from './boardData';

export function LocationSelect({
  value,
  onChange,
  buildingsOnly = false,
  id,
}: {
  value: string;
  onChange: (location: string) => void;
  buildingsOnly?: boolean;
  id?: string;
}) {
  const pool = buildingsOnly ? BUILDING_LOCATIONS : LOCATIONS;
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {KINGDOMS.map((kingdom) => {
        const locs = pool.filter((l) => l.kingdom === kingdom);
        if (locs.length === 0) return null;
        return (
          <optgroup key={kingdom} label={kingdom}>
            {locs.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
                {l.building ? ` · ${l.building}` : ''}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
