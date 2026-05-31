export interface EffectResult {
  success: boolean;
  error?: string;
  // Specific effect flags
  isExtraTurn?: boolean;
  isUltimateAttack?: boolean;
  reviveComplete?: boolean;
  battlefieldRerolled?: boolean;
  damageDealt?: number;
  kiGained?: number;
  targetHealed?: number;
}
