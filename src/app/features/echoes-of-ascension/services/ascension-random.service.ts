import { Injectable, inject } from '@angular/core';
import { RngService } from '../../../core/services/rng.service';
import { AscensionRunStateService } from '../state/ascension-run-state.service';

@Injectable({ providedIn: 'root' })
export class AscensionRandomService {
  private readonly rng = inject(RngService);
  private readonly state = inject(AscensionRunStateService);

  nextFloat(): number {
    const derivedSeed = this.nextSeed();
    return this.rng.fork('ascension', derivedSeed).nextFloat();
  }

  nextInt(max: number): number {
    if (max <= 0) return 0;
    return this.rng.fork('ascension', this.nextSeed()).nextInt(0, max - 1);
  }

  private nextSeed(): number {
    const snapshot = this.state.getSnapshot();
    const seed = (snapshot.seed ?? 0) >>> 0;
    const counter = (snapshot.randomCounter ?? 0) >>> 0;
    const derivedSeed = (seed + Math.imul(counter, 0x9e3779b9)) >>> 0;
    this.state.patchState({ randomCounter: counter + 1 });
    return derivedSeed;
  }
}
