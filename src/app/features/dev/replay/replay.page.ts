import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { ReplayLogService } from "../../../core/services/replay-log.service";
import { ReplayRunnerService } from "../../../core/services/replay-runner.service";
import { AscensionRunStateService } from "../../echoes-of-ascension/state/ascension-run-state.service";

@Component({
  selector: "app-replay-page",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./replay.page.html",
  styleUrls: ["./replay.page.scss"],
})
export class ReplayPageComponent {
  private readonly log = inject(ReplayLogService);
  private readonly runner = inject(ReplayRunnerService);
  private readonly runState = inject(AscensionRunStateService);

  readonly input = signal("");
  readonly loadError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly lastEventJson = computed(() => {
    const event = this.runner.last();
    return event ? JSON.stringify(event, null, 2) : "No events yet.";
  });

  load(): void {
    try {
      const events = this.log.importJson(this.input());
      this.runner.load(events);
      this.loadError.set(null);
      this.statusMessage.set(`Loaded ${events.length} events.`);
    } catch (error) {
      this.loadError.set(
        error instanceof Error ? error.message : "Failed to load replay."
      );
      this.statusMessage.set(null);
    }
  }

  start(): void {
    this.runner.start();
  }

  step(): void {
    this.runner.step();
  }

  runAll(): void {
    this.runner.runAll();
  }

  reset(): void {
    this.runner.reset();
    this.statusMessage.set("Replay reset.");
  }

  exportCurrent(): void {
    const json = this.log.exportJson();
    this.input.set(json);
    this.statusMessage.set("Exported replay JSON.");
    this.copyToClipboard(json);
  }

  get position(): number {
    return this.runner.position();
  }

  get total(): number {
    return this.runner.total();
  }

  get seed(): number {
    return this.runState.getSnapshot().seed ?? 0;
  }

  get roomType(): string {
    return this.runState.getSnapshot().roomType ?? "unknown";
  }

  get floorIndex(): number {
    return this.runState.getSnapshot().floorIndex ?? 0;
  }

  get error(): string | null {
    return this.runner.failure();
  }

  private copyToClipboard(value: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

