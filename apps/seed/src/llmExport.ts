/**
 * llmExport.ts — Generate structured LLM prompt from collected seed data.
 */

import { seed as seedApi } from 'ultimatedarktower';
import { CHANGEABLE_FIELDS, type Session, type FieldMapping } from './types';

export function generateLLMPrompt(session: Session, fieldMappings: FieldMapping[]): string {
  const lines: string[] = [];

  lines.push('# Return to Dark Tower — Seed Analysis Data');
  lines.push('');
  lines.push(`Session: ${session.name}`);
  lines.push(`Date: ${new Date(session.created).toISOString().slice(0, 10)}`);
  lines.push('');

  // Baseline
  if (session.baseline) {
    lines.push('## Baseline Seed');
    lines.push(`Seed: ${session.baseline.seed}`);
    try {
      const decoded = seedApi.decodeSeed(session.baseline.seed);
      lines.push(
        `Decoded: ${decoded.tier1Foe}/${decoded.tier2Foe}/${decoded.tier3Foe} | ${decoded.adversary} | ${decoded.ally} | ${decoded.difficulty} | ${decoded.source} | ${decoded.playerCount}P | RNG=${decoded.rngSeed}`,
      );
    } catch {
      /* skip decode if invalid */
    }
    const dump = seedApi.dumpSeedChars(session.baseline.seed);
    lines.push(`Chars: ${dump.chars.map((c) => `${c.char}(${c.value})`).join(' ')}`);
    lines.push('');

    // Baseline configuration
    const config = session.baselineConfig;
    if (Object.keys(config).length > 0) {
      lines.push('### Baseline Configuration');
      for (const field of CHANGEABLE_FIELDS) {
        const val = config[field];
        if (val) lines.push(`- ${field}: ${val}`);
      }
      lines.push('');
    }
  }

  // Variants
  if (session.variants.length > 0) {
    lines.push('## Variants');
    lines.push('');
    lines.push('| # | Seed | Changed Field | Changed Value | Chars Changed |');
    lines.push('|---|------|--------------|---------------|--------------|');

    for (let i = 0; i < session.variants.length; i++) {
      const v = session.variants[i];
      const comp = session.baseline ? seedApi.compareSeedsRaw(session.baseline.seed, v.seed) : null;
      const charsChanged = comp ? comp.diffs.length : '?';
      lines.push(
        `| ${i + 1} | ${v.seed} | ${v.changedField ?? '?'} | ${v.changedValue ?? '?'} | ${charsChanged} |`,
      );
    }
    lines.push('');
  }

  // Character-level diffs
  if (session.baseline && session.variants.length > 0) {
    lines.push('## Character Diffs (vs. Baseline)');
    lines.push('');

    for (let i = 0; i < session.variants.length; i++) {
      const v = session.variants[i];
      const comp = seedApi.compareSeedsRaw(session.baseline.seed, v.seed);
      lines.push(
        `### Variant ${i + 1}: ${v.seed} (${v.changedField ?? '?'} → ${v.changedValue ?? '?'})`,
      );
      if (comp.diffs.length === 0) {
        lines.push('No character differences.');
      } else {
        lines.push(
          `Setup diffs (${comp.setupDiffs.length}): ${comp.setupDiffs.map((d) => `[${d.charIndex}]: ${d.char1}→${d.char2}`).join(', ') || 'none'}`,
        );
        lines.push(
          `RNG diffs (${comp.rngDiffs.length}): ${comp.rngDiffs.map((d) => `[${d.charIndex}]: ${d.char1}→${d.char2}`).join(', ') || 'none'}`,
        );
      }
      lines.push('');
    }
  }

  // Field mapping hypotheses
  if (fieldMappings.length > 0) {
    lines.push('## Current Field Mapping Hypotheses');
    lines.push('');
    lines.push('| Field | Bit Offset | Bit Length | Confidence |');
    lines.push('|-------|-----------|-----------|-----------|');
    for (const m of fieldMappings) {
      lines.push(`| ${m.name} | ${m.bitOffset} | ${m.bitLength} | ${m.confidence} |`);
    }
    lines.push('');
  }

  // Game events
  const events = session.events ?? [];
  if (events.length > 0) {
    lines.push('## Game Events (Post-Start Observations)');
    lines.push('');
    lines.push('| Month | Turn | Type | Quest Type | Foe | Kingdom | Companion | Notes |');
    lines.push('|-------|------|------|-----------|-----|---------|-----------|-------|');
    for (const e of events) {
      lines.push(
        `| ${e.month} | ${e.turn ?? ''} | ${e.type} | ${e.questType ?? ''} | ${e.foe ?? ''} | ${e.kingdom ?? ''} | ${e.companion ?? ''} | ${e.notes ?? ''} |`,
      );
    }
    lines.push('');
  }

  // All seeds with character values for pattern analysis
  lines.push('## All Seeds — Character Values');
  lines.push('');
  const allSeeds = [session.baseline, ...session.variants].filter(
    Boolean,
  ) as typeof session.variants;
  for (const entry of allSeeds) {
    const dump = seedApi.dumpSeedChars(entry.seed);
    const label =
      entry === session.baseline
        ? '(baseline)'
        : `(${entry.changedField ?? '?'}: ${entry.changedValue ?? '?'})`;
    lines.push(`${entry.seed} ${label}`);
    lines.push(
      `  Setup: ${dump.chars
        .slice(0, 6)
        .map((c) => `${c.char}=${c.value}`)
        .join(' ')}  RNG: ${dump.chars
        .slice(6)
        .map((c) => `${c.char}=${c.value}`)
        .join(' ')}`,
    );
  }
  lines.push('');

  lines.push('---');
  lines.push(
    'Please analyze the bit patterns above and identify which bit ranges correspond to which game setup fields.',
  );

  return lines.join('\n');
}
