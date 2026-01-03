import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RunStateService } from '../run-state.service';
import { PlayerStateService } from '../player-state.service';
import { EnemyStateService } from '../enemy-state.service';
import { UiStateService } from '../ui-state.service';
import { ProfileStateService } from '../profile-state.service';
import { EnemyFactoryService } from '../enemy-factory.service';
import { RngService } from '../rng.service';
import { StorageService } from '../storage.service';
import { createDefaultProfileState } from '../../models/profile.model';
import { BattleEngineService } from '../battle-engine.service';

class RouterStub {
  url = '/';
  navigate = jasmine.createSpy('navigate');
}

class StorageServiceStub {
  load() {
    return createDefaultProfileState();
  }
  save() {}
}

describe('Run snapshot', () => {
  let run: RunStateService;
  let battle: BattleEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RunStateService,
        PlayerStateService,
        EnemyStateService,
        UiStateService,
        ProfileStateService,
        EnemyFactoryService,
        RngService,
        BattleEngineService,
        { provide: StorageService, useClass: StorageServiceStub },
        { provide: Router, useClass: RouterStub }
      ]
    });
    run = TestBed.inject(RunStateService);
    battle = TestBed.inject(BattleEngineService);
  });

  it('roundtrips a run snapshot', () => {
    run.startRun('A', 12345);
    const upgrade = run.availableUpgrades().find(option => !option.disabledReason);
    if (upgrade) {
      run.applyUpgrade(upgrade);
    }
    run.rerollUpgrades();

    const snapshot = run.exportRunSnapshot();
    run.resetToStart();
    run.importRunSnapshot(snapshot);
    battle.stopLoop();
    const snapshotAgain = run.exportRunSnapshot();

    expect(snapshotAgain.snapshotVersion).toBe(snapshot.snapshotVersion);
    expect(snapshotAgain.runSeed).toBe(snapshot.runSeed);
    expect(snapshotAgain.phase).toBe(snapshot.phase);
    expect(snapshotAgain.currentRoom).toBe(snapshot.currentRoom);
    expect(snapshotAgain.roomType).toBe(snapshot.roomType);
    expect(snapshotAgain.trackLevels).toEqual(snapshot.trackLevels);
    expect(snapshotAgain.availableUpgrades).toEqual(snapshot.availableUpgrades);
    expect(snapshotAgain.rerollsAvailable).toBe(snapshot.rerollsAvailable);
    expect(snapshotAgain.potions).toBe(snapshot.potions);
    expect(snapshotAgain.result).toBe(snapshot.result);
    expect(snapshotAgain.isFinalEvolution).toBe(snapshot.isFinalEvolution);
    expect(snapshotAgain.runUpgrades).toEqual(snapshot.runUpgrades);
    expect(snapshotAgain.loadout).toEqual(snapshot.loadout);
    expect(snapshotAgain.kaelis?.id).toBe(snapshot.kaelis?.id);
    expect(snapshotAgain.playerState?.attributes.hp).toBe(snapshot.playerState?.attributes.hp);
  });
});
