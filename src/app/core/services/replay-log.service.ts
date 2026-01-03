import { Injectable, signal } from "@angular/core";
import {
  ReplayEvent,
  ReplayEventType,
  ReplayRunMode
} from "../models/replay.model";

const SUPPORTED_VERSION = 1;
const EVENT_TYPES: ReplayEventType[] = [
  "runStart",
  "enterRoom",
  "draftPick",
  "shopBuy",
  "bargainPick",
  "serviceUse",
  "battleStart",
  "battleEnd"
];
const RUN_MODES: ReplayRunMode[] = ["ascension", "run"];
const SERVICE_KEYS = ["q", "w", "e"];

@Injectable({ providedIn: "root" })
export class ReplayLogService {
  private enabled = true;
  private readonly events = signal<ReplayEvent[]>([]);

  clear(): void {
    this.events.set([]);
  }

  append(event: ReplayEvent): void {
    if (!this.enabled) return;
    this.events.update((current) => [...current, event]);
  }

  getEvents(): ReplayEvent[] {
    return [...this.events()];
  }

  exportJson(): string {
    return JSON.stringify(this.events(), null, 2);
  }

  importJson(json: string): ReplayEvent[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (error) {
      throw new Error("Replay JSON is not valid JSON.");
    }

    const events = Array.isArray(parsed)
      ? parsed
      : (parsed as { events?: unknown }).events;

    if (!Array.isArray(events)) {
      throw new Error("Replay JSON must be an array of events.");
    }

    const normalized = events as ReplayEvent[];
    const errors: string[] = [];
    normalized.forEach((event, index) => {
      if (!event || typeof event !== "object") {
        errors.push(`Event ${index} is not an object.`);
        return;
      }
      if (event.v !== SUPPORTED_VERSION) {
        errors.push(
          `Event ${index} has unsupported version ${String(event.v)}.`
        );
      }
      if (!EVENT_TYPES.includes(event.t)) {
        errors.push(`Event ${index} has unknown type "${String(event.t)}".`);
      }
      if (!event.payload || typeof event.payload !== "object") {
        errors.push(`Event ${index} is missing payload data.`);
        return;
      }

      this.validatePayload(event, index, errors);
    });

    if (errors.length) {
      throw new Error(`Replay validation failed: ${errors[0]}`);
    }

    return normalized;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private validatePayload(event: ReplayEvent, index: number, errors: string[]): void {
    switch (event.t) {
      case "runStart": {
        const payload = event.payload as { seed?: unknown; mode?: unknown };
        if (typeof payload.seed !== "number" || Number.isNaN(payload.seed)) {
          errors.push(`Event ${index} runStart seed must be a number.`);
        }
        if (
          payload.mode !== undefined &&
          !RUN_MODES.includes(payload.mode as ReplayRunMode)
        ) {
          errors.push(`Event ${index} runStart mode is invalid.`);
        }
        return;
      }
      case "enterRoom": {
        const payload = event.payload as {
          roomIndex?: unknown;
          roomType?: unknown;
          stage?: unknown;
        };
        if (typeof payload.roomIndex !== "number") {
          errors.push(`Event ${index} enterRoom roomIndex must be a number.`);
        }
        if (typeof payload.roomType !== "string") {
          errors.push(`Event ${index} enterRoom roomType must be a string.`);
        }
        if (typeof payload.stage !== "string") {
          errors.push(`Event ${index} enterRoom stage must be a string.`);
        }
        return;
      }
      case "draftPick": {
        const payload = event.payload as {
          optionIndex?: unknown;
          pickedId?: unknown;
        };
        if (typeof payload.optionIndex !== "number") {
          errors.push(`Event ${index} draftPick optionIndex must be a number.`);
        }
        if (typeof payload.pickedId !== "string") {
          errors.push(`Event ${index} draftPick pickedId must be a string.`);
        }
        return;
      }
      case "shopBuy": {
        const payload = event.payload as {
          optionIndex?: unknown;
          boughtId?: unknown;
        };
        if (typeof payload.optionIndex !== "number") {
          errors.push(`Event ${index} shopBuy optionIndex must be a number.`);
        }
        if (typeof payload.boughtId !== "string") {
          errors.push(`Event ${index} shopBuy boughtId must be a string.`);
        }
        return;
      }
      case "bargainPick": {
        const payload = event.payload as { optionIndex?: unknown };
        if (typeof payload.optionIndex !== "number") {
          errors.push(`Event ${index} bargainPick optionIndex must be a number.`);
        }
        return;
      }
      case "serviceUse": {
        const payload = event.payload as { key?: unknown };
        if (typeof payload.key !== "string") {
          errors.push(`Event ${index} serviceUse key must be a string.`);
        } else if (!SERVICE_KEYS.includes(payload.key.toLowerCase())) {
          errors.push(`Event ${index} serviceUse key must be q, w, or e.`);
        }
        return;
      }
      case "battleStart": {
        const payload = event.payload as { enemyId?: unknown };
        if (payload.enemyId !== undefined && typeof payload.enemyId !== "string") {
          errors.push(`Event ${index} battleStart enemyId must be a string.`);
        }
        return;
      }
      case "battleEnd": {
        const payload = event.payload as { result?: unknown };
        if (payload.result !== "victory" && payload.result !== "defeat") {
          errors.push(`Event ${index} battleEnd result must be victory or defeat.`);
        }
      }
    }
  }
}

