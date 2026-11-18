import { createPulse } from './pulse.js';
export const pulseDefinition = /* @__PURE__ */ Object.freeze({
  family: 'skeleton',
  phase: 'idle',
  runner: createPulse,
});
export const dissolveDefinition = /* @__PURE__ */ Object.freeze({
  family: 'skeleton',
  phase: 'handoff',
  dissolve: true,
});
