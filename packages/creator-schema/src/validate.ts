/// <reference types="node" />

import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

export type ValidationResult = { ok: boolean; errors: unknown[] | null };

let _validate: ReturnType<Ajv['compile']> | null = null;

function getValidator(): ReturnType<Ajv['compile']> {
  if (!_validate) {
    const ajv = new Ajv({ strict: true, allErrors: true });
    addFormats(ajv);
    const schema = JSON.parse(readFileSync(join(__dirname, 'scenario.schema.json'), 'utf8'));
    _validate = ajv.compile(schema);
  }
  return _validate;
}

export function validateL1(doc: unknown): ValidationResult {
  const validate = getValidator();
  const ok = validate(doc) as boolean;
  return { ok, errors: ok ? null : (validate.errors ?? null) };
}
