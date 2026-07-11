export { validateL1 } from './validate';
export type { ValidationResult } from './validate';
export type { ValidScenario } from './types';
import scenarioSchemaJson from './scenario.schema.json';
export const scenarioSchema = scenarioSchemaJson as Record<string, unknown>;
