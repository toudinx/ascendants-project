export interface AscensionSeedFixture {
  seed: number;
  note: string;
}

export const ASCENSION_DEV_SEEDS: AscensionSeedFixture[] = [
  { seed: 12345, note: 'Balanced start, early resonance unlock.' },
  { seed: 88421, note: 'Shop appears on floor 5.' },
  { seed: 47290, note: 'Bargain triggers quickly after resonance.' },
  { seed: 60601, note: 'Late shop, forced on floor 9.' },
  { seed: 90210, note: 'Echo variety with mixed paths.' }
];
