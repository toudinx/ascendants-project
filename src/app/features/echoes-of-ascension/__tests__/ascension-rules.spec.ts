import { TestBed } from '@angular/core/testing';
import { AscensionRunStateService } from '../state/ascension-run-state.service';
import { AscensionRandomService } from '../services/ascension-random.service';
import { AscensionEchoDraftService } from '../services/ascension-echo-draft.service';
import { AscensionRoomGeneratorService } from '../services/ascension-room-generator.service';
import { AscensionBargainService } from '../services/ascension-bargain.service';

function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function nextRngValue(seed: number, counter: number): number {
  const mix = (seed + Math.imul(counter, 0x9e3779b9)) >>> 0;
  return mulberry32(mix);
}

function findCounter(seed: number, threshold: number): number {
  for (let i = 0; i < 5000; i += 1) {
    if (nextRngValue(seed, i) > threshold && nextRngValue(seed, i + 1) > threshold) {
      return i;
    }
  }
  return 0;
}

describe('Ascension rules', () => {
  let runState: AscensionRunStateService;
  let draftService: AscensionEchoDraftService;
  let roomGenerator: AscensionRoomGeneratorService;
  let bargainService: AscensionBargainService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AscensionRunStateService,
        AscensionRandomService,
        AscensionEchoDraftService,
        AscensionRoomGeneratorService,
        AscensionBargainService
      ]
    });
    runState = TestBed.inject(AscensionRunStateService);
    draftService = TestBed.inject(AscensionEchoDraftService);
    roomGenerator = TestBed.inject(AscensionRoomGeneratorService);
    bargainService = TestBed.inject(AscensionBargainService);
  });

  it('never offers duplicate echoes in a draft', () => {
    runState.createNewRun({
      seed: 12345,
      originPathId: 'Sentinel',
      runPathId: 'Ruin',
      floorIndex: 1
    });
    runState.patchState({ pickedEchoIds: ['aegis-lattice'] });
    const picked = new Set(runState.getSnapshot().pickedEchoIds);

    const offer = draftService.generateOffer();
    const echoOffer = offer.filter(item => item.kind === 'echo');
    const ids = echoOffer.map(item => item.echo.id);
    expect(new Set(ids).size).toBe(ids.length);
    echoOffer.forEach(item => expect(picked.has(item.echo.id)).toBeFalse());
  });

  it('applies pity to ensure a run path option appears', () => {
    runState.createNewRun({
      seed: 5511,
      originPathId: 'Sentinel',
      runPathId: 'Ruin',
      floorIndex: 2
    });
    runState.patchState({
      draftHistory: [
        { originOptions: 1, runOptions: 0 },
        { originOptions: 2, runOptions: 0 }
      ],
      pickedEchoIds: []
    });

    const offer = draftService.generateOffer();
    expect(offer.some(item => item.kind === 'echo' && item.echo.pathId === 'Ruin')).toBeTrue();
  });

  it('applies pity to ensure an origin path option appears', () => {
    runState.createNewRun({
      seed: 777,
      originPathId: 'Sentinel',
      runPathId: 'Ruin',
      floorIndex: 3
    });
    runState.patchState({
      draftHistory: [
        { originOptions: 0, runOptions: 1 },
        { originOptions: 0, runOptions: 2 }
      ],
      pickedEchoIds: []
    });

    const offer = draftService.generateOffer();
    expect(offer.some(item => item.kind === 'echo' && item.echo.pathId === 'Sentinel')).toBeTrue();
  });

  it('forces shop on floor 9 if no shop appeared', () => {
    runState.createNewRun({
      seed: 999,
      floorIndex: 9
    });
    runState.patchState({ shopVisited: false });
    const decision = roomGenerator.shouldSpawnShop(runState.getSnapshot());
    expect(decision.spawn).toBeTrue();
    expect(decision.forced).toBeTrue();
  });

  it('guarantees a bargain once the window expires', () => {
    const seed = 42424;
    const counter = findCounter(seed, 0.7);
    runState.createNewRun({
      seed,
      floorIndex: 4,
      originPathId: 'Sentinel',
      runPathId: 'Ruin'
    });
    runState.patchState({
      resonanceActive: true,
      resonanceId: 'prism-resonance',
      bargainPending: true,
      bargainWindow: 2,
      bargainsTaken: 0,
      bargainTakenForResonance: false,
      lastBargainFloor: null,
      randomCounter: counter
    });

    const floorPlan = roomGenerator.getFloorPlan(runState.getSnapshot().floorIndex);
    let decision = bargainService.shouldSpawnBargain(runState.getSnapshot(), floorPlan, false);
    expect(decision.spawn).toBeFalse();
    expect(decision.nextWindow).toBe(1);
    runState.patchState({ bargainWindow: decision.nextWindow, bargainPending: decision.pending });

    decision = bargainService.shouldSpawnBargain(runState.getSnapshot(), floorPlan, false);
    expect(decision.spawn).toBeFalse();
    expect(decision.nextWindow).toBe(0);
    runState.patchState({ bargainWindow: decision.nextWindow, bargainPending: decision.pending });

    decision = bargainService.shouldSpawnBargain(runState.getSnapshot(), floorPlan, false);
    expect(decision.spawn).toBeTrue();
  });
});
