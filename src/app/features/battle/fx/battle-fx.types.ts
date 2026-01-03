export type ActorSide = "player" | "enemy";
export interface Point {
  x: number;
  y: number;
}
export type AfterglowFieldKey = "burn" | "poison" | "bleed" | "rune";

export type AnchorPoint = Point;

export interface ActorAnchorSet {
  origin: AnchorPoint;
  impact: AnchorPoint;
  foot?: AnchorPoint;
}

export type BattleFxAnchors = Record<ActorSide, ActorAnchorSet>;

export type BattleFxEvent =
  | {
      kind: "attackStart";
      attacker: ActorSide;
      style: "melee" | "ranged" | "cast";
    }
  | {
      kind: "projectile";
      attacker: ActorSide;
      from: Point;
      to: Point;
      projectileKey?: string;
      projectileScale?: number;
    }
  | {
      kind: "slash";
      attacker: ActorSide;
      from: Point;
      to: Point;
      scale?: number;
      crit?: boolean;
      angleOffset?: number;
    }
  | {
      kind: "impact";
      target: ActorSide;
      amount: number;
      crit?: boolean;
      dot?: boolean;
      stacks?: number;
      tier?: 1 | 2 | 3 | 4;
      combo?: boolean;
      style?: "melee" | "ranged" | "cast";
    }
  | {
      kind: "field";
      target: ActorSide;
      at: Point;
      fieldKey: AfterglowFieldKey;
      tier?: 1 | 2 | 3 | 4;
      durationMs?: number;
    }
  | {
      kind: "hitReaction";
      target: ActorSide;
      crit?: boolean;
      micro?: boolean;
    }
  | {
      kind: "shake";
      intensity: number;
      durationMs: number;
    }
  | {
      kind: "floatText";
      target: ActorSide;
      amount: number;
      crit?: boolean;
      dot?: boolean;
      stacks?: number;
      at: Point;
    };
