import { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES, LIGHT_EFFECTS } from "ultimatedarktower";

type AudioEntry = { name: string; value: number; category: string };

// Sound name → index lookup (case-insensitive key → value)
export const soundNameToIndex = new Map<string, number>();
// Sound index → entry lookup
export const soundIndexToEntry = new Map<number, AudioEntry>();
// Sounds grouped by category
export const soundCategoryIndex = new Map<string, AudioEntry[]>();

for (const [, entry] of Object.entries(TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)) {
  soundNameToIndex.set(entry.name.toLowerCase(), entry.value);
  soundIndexToEntry.set(entry.value, entry);

  const categoryList = soundCategoryIndex.get(entry.category) ?? [];
  categoryList.push(entry);
  soundCategoryIndex.set(entry.category, categoryList);
}

// Light sequence name → value lookup
export const lightSequenceNameToValue = new Map<string, number>();
for (const [name, value] of Object.entries(TOWER_LIGHT_SEQUENCES as Record<string, number>)) {
  lightSequenceNameToValue.set(name.toLowerCase(), value);
}

// Light effect name → value lookup
export const lightEffectNameToValue = new Map<string, number>();
for (const [name, value] of Object.entries(LIGHT_EFFECTS as Record<string, number>)) {
  lightEffectNameToValue.set(name.toLowerCase(), value);
}

// Get all unique sound categories
export function getSoundCategories(): string[] {
  return [...soundCategoryIndex.keys()].sort();
}

// Get the full audio library as a serializable array
export function getAudioLibrary(): AudioEntry[] {
  return [...soundIndexToEntry.values()].sort((a, b) => a.value - b.value);
}
