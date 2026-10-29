/**
 * Step — the progression contract, mirrored from greybox-godot/scripts/main.gd
 * (the oracle). Same order, same names, so the docs and the tests can talk
 * about one thing. Day 2 steps are listed but unreachable until M7+ (docs/23
 * §10: Day 2 ports after Day 1 acceptance).
 */
export const Step = {
  MEET_ROSA: 0,
  ENTER_BODEGA: 1,
  COLLECT: 2,
  RUSH: 3,
  CROSS: 4,
  CLAIM_CART: 5,
  NAME_CART: 6,
  SOLO: 7,
  CLIMB: 8,
  POSTCARD: 9,
  D2_WAKE: 10,
  D2_IDRIS: 11,
  D2_TASK: 12,
  D2_DELIVER: 13,
  D2_LUNCH: 14,
  D2_CLIMB2: 15,
  D2_POSTCARD: 16,
  DONE: 17,
} as const;

export type StepName = keyof typeof Step;
export const STEP_NAMES = Object.keys(Step) as StepName[];

export function stepName(step: number): StepName {
  return STEP_NAMES[step] ?? "MEET_ROSA";
}
