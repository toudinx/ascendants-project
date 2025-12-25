import { Injectable, inject } from '@angular/core';
import { AscensionRunStateService } from '../state/ascension-run-state.service';

@Injectable({ providedIn: 'root' })
export class AscensionRandomService {
  private readonly state = inject(AscensionRunStateService);

  nextFloat(): number {
    const snapshot = this.state.getSnapshot();
    const seed = (snapshot.seed ?? 0) >>> 0;
    const counter = (snapshot.randomCounter ?? 0) >>> 0;
    const value = this.mulberry32(
      (seed + Math.imul(counter, 0x9e3779b9)) >>> 0
    );
    this.state.patchState({ randomCounter: counter + 1 });
    return value;
  }

  nextInt(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.nextFloat() * max);
  }

  private mulberry32(a: number): number {
    let t = (a + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
