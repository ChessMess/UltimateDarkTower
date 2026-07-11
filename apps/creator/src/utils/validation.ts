import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { validateRefs } from '@udtc/adapters';
import { validateGraph } from '@udtc/adapters';
import { scenarioSchema } from '@udtc/schema';
import type { ValidationResults } from '../types';

let _ajvValidate: ReturnType<Ajv['compile']> | null = null;

function getL1Validator(): ReturnType<Ajv['compile']> {
  if (!_ajvValidate) {
    const ajv = new Ajv({ strict: true, allErrors: true });
    addFormats(ajv);
    _ajvValidate = ajv.compile(scenarioSchema);
  }
  return _ajvValidate;
}

export function runValidation(doc: unknown): ValidationResults {
  // L1 — JSON schema
  const validateFn = getL1Validator();
  const l1Ok = validateFn(doc) as boolean;
  const l1Errors = l1Ok
    ? []
    : (validateFn.errors ?? []).map((e: { instancePath?: string; message?: string }) =>
        `${e.instancePath || '/'} ${e.message}`,
      );

  // L2 — reference resolution (only when L1 passes so doc shape is guaranteed)
  const l2Result = l1Ok ? validateRefs(doc) : { ok: false, errors: ['L1 must pass first'] };

  // L3 — graph semantics
  const l3Result = l1Ok ? validateGraph(doc) : { ok: false, errors: ['L1 must pass first'] };

  return {
    l1: { ok: l1Ok, errors: l1Errors },
    l2: { ok: l2Result.ok, errors: l2Result.errors },
    l3: { ok: l3Result.ok, errors: l3Result.errors },
    allOk: l1Ok && l2Result.ok && l3Result.ok,
  };
}
