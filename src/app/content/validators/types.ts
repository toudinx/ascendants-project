export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export interface WithScoresReport extends ValidationReport {
  damageScore?: number;
  survivabilityScore?: number;
}
