import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from "@angular/core";

@Component({
  selector: "wow-burst",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="active"
      class="pointer-events-none fixed inset-0 z-50 overflow-hidden transition-opacity duration-300"
      [class.opacity-0]="!visible"
      [class.opacity-100]="visible"
    >
      <div
        class="absolute inset-0 bg-gradient-to-br from-[#8A7CFF]/20 via-transparent to-[#E28FE8]/16 blur-2xl"
      ></div>
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="burst-core"></div>
      </div>
      <div class="absolute inset-0">
        <div
          *ngFor="let particle of particles"
          class="burst-particle"
          [style.left.%]="particle.x"
          [style.top.%]="particle.y"
          [style.--tx.px]="particle.tx"
          [style.--ty.px]="particle.ty"
        ></div>
      </div>
    </div>
  `,
})
export class WowBurstComponent implements OnChanges, OnDestroy {
  @Input() trigger = false;
  @Input() duration = 1200;

  visible = false;
  active = false;
  particles = Array.from({ length: 14 }, (_, i) => ({
    x: 10 + ((i * 6) % 70),
    y: 10 + ((i * 11) % 70),
    tx: Math.random() * 120 - 60,
    ty: Math.random() * 120 - 40,
  }));
  private timer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["trigger"]?.currentValue) {
      this.play();
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private play(): void {
    this.active = true;
    requestAnimationFrame(() => (this.visible = true));
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.visible = false;
      setTimeout(() => (this.active = false), 200);
    }, this.duration);
  }
}
