import { TestBed } from '@angular/core/testing';
import { ReplayRunnerService } from '../replay-runner.service';
import { ReplayLogService } from '../replay-log.service';
import { AscensionRunStateService } from '../../../features/echoes-of-ascension/state/ascension-run-state.service';
import { AscensionEchoDraftService } from '../../../features/echoes-of-ascension/services/ascension-echo-draft.service';
import { AscensionShopService } from '../../../features/echoes-of-ascension/services/ascension-shop.service';
import { AscensionBargainService } from '../../../features/echoes-of-ascension/services/ascension-bargain.service';
import { AscensionOrchestratorService } from '../../../features/echoes-of-ascension/services/ascension-orchestrator.service';
import { AscensionGeneratorService } from '../../../features/echoes-of-ascension/services/ascension-generator.service';
import { AscensionRoomGeneratorService } from '../../../features/echoes-of-ascension/services/ascension-room-generator.service';
import { AscensionRandomService } from '../../../features/echoes-of-ascension/services/ascension-random.service';
import { ASCENSION_PATHS } from '../../../features/echoes-of-ascension/content/configs/ascension-paths';
import { ASCENSION_POTIONS } from '../../../features/echoes-of-ascension/content/configs/ascension-potions';
import { ASCENSION_CONFIG } from '../../../features/echoes-of-ascension/content/configs/ascension.config';
import { roomToStage } from '../../../content/balance/balance.config';
import { ReplayEvent } from '../../models/replay.model';
import { ProfileStateService } from '../profile-state.service';
import { PlayerStateService } from '../player-state.service';
import { RngService } from '../rng.service';
import { StorageService } from '../storage.service';
import { createDefaultProfileState } from '../../models/profile.model';
import { AscensionDraftOption } from '../../../features/echoes-of-ascension/models/ascension-draft-option.model';

class StorageServiceStub {
  load() {
    return createDefaultProfileState();
  }
  save() {}
}

describe('ReplayRunnerService', () => {
  let runner: ReplayRunnerService;
  let runState: AscensionRunStateService;
  let draftService: AscensionEchoDraftService;
  let profile: ProfileStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReplayRunnerService,
        ReplayLogService,
        AscensionRunStateService,
        AscensionEchoDraftService,
        AscensionShopService,
        AscensionBargainService,
        AscensionOrchestratorService,
        AscensionGeneratorService,
        AscensionRoomGeneratorService,
        AscensionRandomService,
        ProfileStateService,
        PlayerStateService,
        RngService,
        { provide: StorageService, useClass: StorageServiceStub }
      ]
    });

    runner = TestBed.inject(ReplayRunnerService);
    runState = TestBed.inject(AscensionRunStateService);
    draftService = TestBed.inject(AscensionEchoDraftService);
    profile = TestBed.inject(ProfileStateService);
  });

  it('replays ascension events deterministically', () => {
    const events = buildReplayEvents(runState, draftService, profile);

    runner.load(events);
    runner.runAll();
    expect(runner.failure()).toBeNull();
    const snapshotA = runState.getSnapshot();

    runner.reset();
    runner.load(events);
    runner.runAll();
    expect(runner.failure()).toBeNull();
    const snapshotB = runState.getSnapshot();

    expect(snapshotB.seed).toBe(snapshotA.seed);
    expect(snapshotB.floorIndex).toBe(snapshotA.floorIndex);
    expect(snapshotB.roomType).toBe(snapshotA.roomType);
    expect(snapshotB.originPathId).toBe(snapshotA.originPathId);
    expect(snapshotB.runPathId).toBe(snapshotA.runPathId);
    expect(snapshotB.pickedEchoIds).toEqual(snapshotA.pickedEchoIds);
    expect(snapshotB.echoFragments).toBe(snapshotA.echoFragments);
    expect(snapshotB.hpMax).toBe(snapshotA.hpMax);
    expect(snapshotB.hpCurrent).toBe(snapshotA.hpCurrent);
    expect(snapshotB.runModifiers).toEqual(snapshotA.runModifiers);
    expect(snapshotB.randomCounter).toBe(snapshotA.randomCounter);
  });
});

function buildReplayEvents(
  runState: AscensionRunStateService,
  draftService: AscensionEchoDraftService,
  profile: ProfileStateService
): ReplayEvent[] {
  const originPathId = profile.activeKaelis().routeType ?? ASCENSION_PATHS[0]?.id ?? 'Sentinel';
  const runPathId =
    ASCENSION_PATHS.find(path => path.id !== originPathId)?.id ?? originPathId;
  const selectedPotionId = ASCENSION_POTIONS[0]?.id ?? 'vital-draught';
  const seed = 12345;
  const runModifiers = {
    ...(ASCENSION_POTIONS.find(potion => potion.id === selectedPotionId)?.runEffects ?? {})
  };
  const bonus = runModifiers.maxHpPercent ?? 0;
  const hpMax = Math.round(ASCENSION_CONFIG.baseHp * (1 + bonus / 100));

  runState.createNewRun({
    seed,
    floorIndex: 1,
    roomType: 'draft',
    originPathId,
    runPathId,
    selectedPotionId,
    hpMax,
    hpCurrent: hpMax
  });
  runState.patchState({
    echoFragments: 0,
    potionUsed: true,
    activePotionId: selectedPotionId,
    runModifiers
  });

  const offer = draftService.generateOffer();
  const choice = pickDraftOption(offer);

  runState.resetRun();

  return [
    {
      v: 1,
      t: 'runStart',
      payload: {
        seed,
        mode: 'ascension',
        originPathId,
        runPathId,
        selectedPotionId,
        hpMax,
        hpCurrent: hpMax,
        runModifiers,
        floorIndex: 1,
        roomType: 'draft'
      }
    },
    {
      v: 1,
      t: 'enterRoom',
      payload: {
        roomIndex: 1,
        roomType: 'draft',
        stage: roomToStage(1)
      }
    },
    {
      v: 1,
      t: 'draftPick',
      payload: {
        optionIndex: choice.index,
        pickedId: choice.pickedId
      }
    },
    {
      v: 1,
      t: 'enterRoom',
      payload: {
        roomIndex: 2,
        roomType: 'summary',
        stage: roomToStage(2)
      }
    }
  ];
}

function pickDraftOption(offer: AscensionDraftOption[]): { index: number; pickedId: string } {
  if (!offer.length) {
    throw new Error('Draft offer is empty.');
  }
  const index = offer.findIndex(option => option.kind === 'echo');
  const pickIndex = index >= 0 ? index : 0;
  const option = offer[pickIndex];
  if (option.kind === 'echo') {
    return { index: pickIndex, pickedId: option.echo.id };
  }
  return { index: pickIndex, pickedId: option.id };
}
