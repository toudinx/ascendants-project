import { BALANCE_CONFIG, BalanceStage, ENEMY_STAT_TABLE, EnemyEncounterKind, PLAYER_POWER_CURVE_BY_ROOM } from '../balance/balance.config';
import { ValidationReport } from './types';

const STAGES: BalanceStage[] = ['early', 'mid', 'late'];
const ENCOUNTER_KINDS: EnemyEncounterKind[] = ['normal', 'elite', 'boss'];

export function validateBalanceConfig(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const totalRooms = BALANCE_CONFIG.run.totalRooms;

  if (!PLAYER_POWER_CURVE_BY_ROOM.length) {
    warnings.push('Player power curve is empty; all rooms will use the fallback multiplier.');
  } else if (PLAYER_POWER_CURVE_BY_ROOM.length <= totalRooms) {
    warnings.push(
      `Player power curve has ${PLAYER_POWER_CURVE_BY_ROOM.length} entries for ${totalRooms} rooms; rooms beyond the last entry will use the fallback multiplier.`
    );
  }

  STAGES.forEach(stage => {
    const stageStats = ENEMY_STAT_TABLE[stage];
    if (!stageStats) {
      errors.push(`Enemy stat table missing stage "${stage}".`);
      return;
    }
    ENCOUNTER_KINDS.forEach(kind => {
      const stats = stageStats[kind];
      if (!stats) {
        errors.push(`Enemy stat table missing "${kind}" stats for stage "${stage}".`);
        return;
      }
      if (stats.hp <= 0) {
        errors.push(`Enemy ${stage}/${kind} HP must be greater than zero.`);
      }
      if (stats.attack <= 0) {
        errors.push(`Enemy ${stage}/${kind} attack must be greater than zero.`);
      }
      if (stats.posture <= 0) {
        errors.push(`Enemy ${stage}/${kind} posture must be greater than zero.`);
      }
    });
  });

  return { errors, warnings };
}
