import { RngService } from '../rng.service';

describe('RngService', () => {
  it('produces the same sequence for the same seed', () => {
    const rngA = new RngService();
    const rngB = new RngService();
    rngA.setSeed(12345);
    rngB.setSeed(12345);

    const sequenceA = [
      rngA.nextFloat(),
      rngA.nextInt(0, 100),
      rngA.chance(0.35),
      rngA.pick([1, 2, 3, 4]),
      rngA.nextFloat()
    ];
    const sequenceB = [
      rngB.nextFloat(),
      rngB.nextInt(0, 100),
      rngB.chance(0.35),
      rngB.pick([1, 2, 3, 4]),
      rngB.nextFloat()
    ];

    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces different sequences for different seeds', () => {
    const rngA = new RngService();
    const rngB = new RngService();
    rngA.setSeed(1);
    rngB.setSeed(2);

    const sequenceA = [rngA.nextFloat(), rngA.nextFloat(), rngA.nextFloat()];
    const sequenceB = [rngB.nextFloat(), rngB.nextFloat(), rngB.nextFloat()];

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('supports string seeds deterministically', () => {
    const rngA = new RngService();
    const rngB = new RngService();
    rngA.setSeed('ascension');
    rngB.setSeed('ascension');

    const sequenceA = [rngA.nextFloat(), rngA.nextInt(0, 10), rngA.nextFloat()];
    const sequenceB = [rngB.nextFloat(), rngB.nextInt(0, 10), rngB.nextFloat()];

    expect(sequenceA).toEqual(sequenceB);
  });
});
