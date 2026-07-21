import { getUDTReferenceLayer } from '@udtc/adapters';
import { asObj } from '../../utils/objectHelpers';
import type { ScenarioDoc } from '../../types';

// Standard-game selection option lists — resolved once at load, like NewScenarioDialog.
const udtRef = getUDTReferenceLayer();
const ADVERSARY_OPTIONS = udtRef.adversaryRoster.map((a) => ({ id: a.id, name: a.name }));
const ALLY_OPTIONS = udtRef.allies.map((name) => ({ id: name.toLowerCase(), name }));
// The seed tier lists (udtRef.tierNFoes) are display names, whereas foeById is keyed by id, so
// resolve names → canonical foe via a name→foe map. Option ids must be foe ids ("brigands"), not
// names, to match what scenarios store in setup.selections.foes.
const foeByName: Record<string, { id: string; name: string }> = {};
for (const f of Object.values(udtRef.foeById)) foeByName[f.name] = f;
const foeOptions = (names: readonly string[]) =>
  names.map((n) => ({ id: foeByName[n]?.id ?? n, name: foeByName[n]?.name ?? n }));
const TIER1_OPTIONS = foeOptions(udtRef.tier1Foes);
const TIER2_OPTIONS = foeOptions(udtRef.tier2Foes);
const TIER3_OPTIONS = foeOptions(udtRef.tier3Foes);

// Scenario-wide standard-game selections editor (shown when no node is selected). All fields are
// optional (schema 0.4.1) — a rule-variant scenario may leave them blank. The dropdowns commit
// immediately; the Main Goal commits on blur (a local draft avoids creating a quest keyed on the
// first character typed and prevents orphan-quest accretion on repeated clear/retype).
// Renders content only — the enclosing CollapsibleSection supplies the section chrome and title.
export function ScenarioSetupEditor({
  schemaDoc,
  labelStyle,
  inputStyle,
  updateSetupSelections,
  updateMainGoal,
}: {
  schemaDoc: ScenarioDoc;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  updateSetupSelections: (patch: {
    adversaryId?: string | null;
    allyId?: string | null;
    tier1FoeId?: string | null;
    tier2FoeId?: string | null;
    tier3FoeId?: string | null;
  }) => void;
  updateMainGoal: (title: string) => void;
}) {
  const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

  const selections = asObj(schemaDoc.setup['selections']) ?? {};
  const curAdversary = asStr(selections['adversaryId']);
  const curAlly = asStr(selections['allyId']);
  const curFoes = asObj(selections['foes']) ?? {};
  const curTier1 = asStr(curFoes['tier1']);
  const curTier2 = asStr(curFoes['tier2']);
  const curTier3 = asStr(curFoes['tier3']);
  const curGoalId = asStr(selections['mainGoalId']);
  const quests = asObj(asObj(schemaDoc.library)?.['quests']) ?? {};
  const curGoalName = curGoalId ? asStr(asObj(quests[curGoalId])?.['name']) : '';

  const marginedInput = { ...inputStyle, marginBottom: 8 };
  const dropdown = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: Array<{ id: string; name: string }>,
  ) => (
    <>
      <div style={labelStyle}>{label}</div>
      <select style={marginedInput} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— None —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <>
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', marginBottom: 8 }}>
        Optional standard-game selections. Leave blank for custom rules.
      </div>
      {dropdown(
        'Adversary',
        curAdversary,
        (v) => updateSetupSelections({ adversaryId: v }),
        ADVERSARY_OPTIONS,
      )}
      {dropdown('Ally', curAlly, (v) => updateSetupSelections({ allyId: v }), ALLY_OPTIONS)}
      {dropdown(
        'Tier 1 Foe',
        curTier1,
        (v) => updateSetupSelections({ tier1FoeId: v }),
        TIER1_OPTIONS,
      )}
      {dropdown(
        'Tier 2 Foe',
        curTier2,
        (v) => updateSetupSelections({ tier2FoeId: v }),
        TIER2_OPTIONS,
      )}
      {dropdown(
        'Tier 3 Foe',
        curTier3,
        (v) => updateSetupSelections({ tier3FoeId: v }),
        TIER3_OPTIONS,
      )}
      <div style={labelStyle}>Main Goal</div>
      {/* Uncontrolled + keyed on the committed name: typing stays local to the DOM (smooth, no
          per-keystroke quest churn) and commits once on blur. The key remounts the field with a
          fresh default only when the committed value changes externally (scenario load, clear). */}
      <input
        key={curGoalName}
        style={inputStyle}
        defaultValue={curGoalName}
        onBlur={(e) => {
          if (e.target.value.trim() !== curGoalName.trim()) updateMainGoal(e.target.value);
        }}
        placeholder="Defeat the Adversary"
      />
    </>
  );
}
