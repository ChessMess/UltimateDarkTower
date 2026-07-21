// The shared L1→L2→L3(→L4) validation pipeline for the Creator subsystem.
// L1 (JSON Schema) is compiled here ONCE and cached — recompiling AJV against a schema this
// size is the expensive part, and both the authoring (Creator) and playing (Player) apps hit
// this on every load/validate. Creator and Player used to carry parallel copies of this
// pipeline that had drifted (fresh AJV per call, different short-circuit rules, forked result
// types); this module is the single source of truth so they can never disagree again.

import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { validateRefs } from './validate-refs';
import { validateGraph } from './validate-graph';

export interface LayerResult {
  ok: boolean;
  errors: string[];
}

export interface ValidationResults {
  l1: LayerResult;
  l2: LayerResult;
  l3: LayerResult;
  allOk: boolean;
}

/** Result shape when an L4 runner is supplied (Player's engine-init structural check). */
export interface ValidationResultsL4 extends ValidationResults {
  l4: LayerResult;
}

/** Opt-in L4 check: runs only after L1–L3 pass. Player wraps `engine.init` here. */
export type L4Runner = (doc: unknown) => LayerResult;

export interface RunValidationOptions {
  l4?: L4Runner;
}

let _l1Validate: ReturnType<Ajv['compile']> | null = null;

function getL1Validator(): ReturnType<Ajv['compile']> {
  if (!_l1Validate) {
    const ajv = new Ajv({ strict: true, allErrors: true });
    addFormats(ajv);
    _l1Validate = ajv.compile(scenarioSchema);
  }
  return _l1Validate;
}

export function runScenarioValidation(doc: unknown): ValidationResults;
export function runScenarioValidation(
  doc: unknown,
  opts: RunValidationOptions & { l4: L4Runner },
): ValidationResultsL4;
export function runScenarioValidation(doc: unknown, opts?: RunValidationOptions): ValidationResults;
export function runScenarioValidation(
  doc: unknown,
  opts: RunValidationOptions = {},
): ValidationResults | ValidationResultsL4 {
  // L1 — JSON Schema
  const validateFn = getL1Validator();
  const l1Ok = validateFn(doc) as boolean;
  const l1Errors = l1Ok
    ? []
    : (validateFn.errors ?? []).map(
        (e: { instancePath?: string; message?: string }) =>
          `${e.instancePath || '/'} ${e.message ?? 'invalid'}`,
      );

  // L2 and L3 run INDEPENDENTLY whenever L1 passes (doc shape is guaranteed), so a malformed
  // document surfaces its reference AND graph problems in one pass. (Player used to short-circuit
  // L3 on an L2 failure, which is the drift this merge removes.)
  const l2 = l1Ok ? validateRefs(doc) : { ok: false, errors: ['L1 must pass first'] };
  const l3 = l1Ok ? validateGraph(doc) : { ok: false, errors: ['L1 must pass first'] };

  const coreOk = l1Ok && l2.ok && l3.ok;
  const results: ValidationResults = {
    l1: { ok: l1Ok, errors: l1Errors },
    l2: { ok: l2.ok, errors: l2.errors },
    l3: { ok: l3.ok, errors: l3.errors },
    allOk: coreOk,
  };

  if (!opts.l4) return results;

  // L4 only runs once the graph is known-valid — it simulates engine init, which presumes L1–L3.
  const l4 = coreOk ? opts.l4(doc) : { ok: false, errors: [] };
  return { ...results, l4, allOk: coreOk && l4.ok };
}
